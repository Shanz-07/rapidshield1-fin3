"""
RapidShield — RPi5 Edge Node (Production)
==========================================
Industrial Crisis Detection & Response System

Hardware:
  - Raspberry Pi 5 (runs as WiFi hotspot at 192.168.4.1)
  - PiCamera2 (CSI camera)
  - YOLOv8 NCNN model (crisis.pt)
  - SIM800/SIM900 GSM module on UART for external dispatch
  - Status LED on GPIO 25

Wireless Devices (ESP32-based, one per employee):
  - Connected to RPi5's local WiFi hotspot
  - Each has a speaker (I2S DAC) + SOS push button
  - Receives alerts via UDP broadcast from RPi5
  - Sends SOS via HTTP POST back to RPi5

Flow:
  Camera → YOLOv8 → anomaly detected
    → UDP broadcast alert to all employee devices (speakers play TTS)
    → POST to dashboard (best-effort)
    → SOS buttons on devices become ARMED
    → Employee presses SOS → HTTP POST to RPi5 → GSM dispatches authorities
"""

import cv2
import time
import json
import socket
import threading
import logging
import requests
import serial
import base64
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from ultralytics import YOLO
from picamera2 import Picamera2

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

# ----- RPi5 Network (hotspot mode) -----
RPI_IP = "192.168.4.1"          # RPi5's IP on its own hotspot
UDP_BROADCAST_IP = "192.168.4.255"  # Broadcast to all devices on subnet
UDP_PORT = 9999                 # Port for alert broadcasts
SOS_HTTP_PORT = 8080            # Port to receive SOS from employee devices

# ----- Dashboard (runs on separate machine or same LAN) -----
DASHBOARD_URL = "http://192.168.31.117:3000/api/alert/incoming"

# ----- Camera & Inference -----
CAMERA_ID = "CAM_FLOOR1"
FLOOR = 1
ZONE = "A"
RPI_DEVICE_ID = "RPi5_UNIT_01"
CONFIDENCE_THRESHOLD = 0.75
INFERENCE_SIZE = 640

# ----- Venue -----
VENUE_NAME = "City General Hospital"
VENUE_ADDRESS = "Plot 42, Sector 7, Hyderabad, Telangana 500081"
GPS_LOCATION = {"lat": 17.3850, "lng": 78.4867}

# ----- YOLOv8 Class Map (match your trained model) -----
CLASS_MAP = {
    0: "fire_smoke",
    1: "electrical_spark",
    2: "flood_water",
    3: "explosion",
    4: "unauthorized_vehicle"
}

# ----- GSM Module (SIM800 via UART) -----
GSM_SERIAL_PORT = "/dev/serial0"
GSM_BAUD_RATE = 9600
EMERGENCY_CONTACTS = []

# Map anomaly types (from YOLO model) to relevant station IDs (from setup page)
# This determines which authorities get SMS based on the detected crisis
ANOMALY_TO_STATIONS = {
    "fire_smoke":           ["fire", "hospital", "ambulance", "police"],
    "electrical_spark":     ["fire", "hospital", "ambulance"],
    "flood_water":          ["shelter", "disaster", "ambulance"],
    "explosion":            ["fire", "police", "ambulance", "hospital", "disaster"],
    "unauthorized_vehicle": ["police", "disaster"],
}

def fetch_emergency_contacts_from_dashboard(alert_type=None):
    """Fetch phone numbers configured in the dashboard setup page.
    The setup page stores station data in the dashboard's /api/config/stations endpoint.
    If alert_type is given, only returns contacts relevant to that anomaly.
    Falls back to all contacts if no mapping exists.
    """
    global EMERGENCY_CONTACTS
    try:
        resp = requests.get(
            DASHBOARD_URL.replace("/alert/incoming", "/config/stations"),
            timeout=3
        )
        if resp.status_code == 200:
            data = resp.json()
            stations = data.get("stations", [])

            # Get relevant station IDs for this anomaly type
            relevant_ids = None
            if alert_type:
                relevant_ids = ANOMALY_TO_STATIONS.get(alert_type)

            contacts = []
            for station in stations:
                phone = station.get("phone", "").strip()
                name = station.get("name", station.get("label", "Unknown"))
                station_id = station.get("id", "")

                if not phone:
                    continue

                # If we have a mapping, only include relevant stations
                if relevant_ids and station_id not in relevant_ids:
                    continue

                contacts.append({
                    "name": name,
                    "number": phone,
                    "station_id": station_id,
                })

            if contacts:
                EMERGENCY_CONTACTS = contacts
                log.info(f"Loaded {len(contacts)} emergency contacts from dashboard "
                         f"(filtered for: {alert_type or 'ALL'})")
                return
            else:
                log.warning(f"No matching contacts found for anomaly: {alert_type}")
    except Exception as e:
        log.warning(f"Could not fetch contacts from dashboard: {e}")

    # Fallback: use any previously loaded contacts or default
    if not EMERGENCY_CONTACTS:
        EMERGENCY_CONTACTS = [
            {"name": "Emergency Services", "number": "+911234567890"},
        ]
        log.warning("Using fallback emergency contacts")


# ----- Cooldowns -----
ALERT_COOLDOWN_SECONDS = 30
SOS_COOLDOWN_SECONDS = 60

# ----- GPIO -----
ALERT_LED_PIN = 25

# ═══════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("/home/shanz/rapidshield.log", mode="a"),
    ]
)
log = logging.getLogger("RapidShield")

# ═══════════════════════════════════════════════════════════════
# GLOBAL STATE
# ═══════════════════════════════════════════════════════════════

alert_active = False
current_alert_type = None
current_alert_confidence = 0.0
last_alert_time = 0
last_sos_time = 0
shutdown_flag = threading.Event()

# ═══════════════════════════════════════════════════════════════
# GPIO (just the status LED on the RPi5 unit itself)
# ═══════════════════════════════════════════════════════════════

try:
    import RPi.GPIO as GPIO

    def setup_gpio():
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        GPIO.setup(ALERT_LED_PIN, GPIO.OUT)
        GPIO.output(ALERT_LED_PIN, GPIO.LOW)
        log.info(f"GPIO: Alert LED on pin {ALERT_LED_PIN}")

    def set_led(on):
        GPIO.output(ALERT_LED_PIN, GPIO.HIGH if on else GPIO.LOW)

    def cleanup_gpio():
        GPIO.output(ALERT_LED_PIN, GPIO.LOW)
        GPIO.cleanup()

except ImportError:
    log.warning("RPi.GPIO not available — LED disabled")
    def setup_gpio(): pass
    def set_led(on): pass
    def cleanup_gpio(): pass

# ═══════════════════════════════════════════════════════════════
# UDP BROADCAST — Send alerts to ALL employee devices wirelessly
# ═══════════════════════════════════════════════════════════════

udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp_socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

def broadcast_alert_to_devices(alert_type, floor, zone, confidence):
    """
    Sends a UDP broadcast packet to all ESP32 employee devices
    on the RPi5's local WiFi hotspot. No internet required.
    Every device on 192.168.4.x receives this simultaneously.
    """
    payload = json.dumps({
        "cmd": "ALERT",
        "type": alert_type,
        "floor": floor,
        "zone": zone,
        "confidence": round(confidence, 2),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device_id": RPI_DEVICE_ID
    })

    try:
        udp_socket.sendto(payload.encode(), (UDP_BROADCAST_IP, UDP_PORT))
        log.info(f"UDP broadcast sent to all devices: {alert_type} Floor {floor}")
    except Exception as e:
        log.error(f"UDP broadcast failed: {e}")

def broadcast_clear_to_devices():
    """Tell all devices the alert is over. SOS buttons deactivate."""
    payload = json.dumps({"cmd": "CLEAR"})
    try:
        udp_socket.sendto(payload.encode(), (UDP_BROADCAST_IP, UDP_PORT))
        log.info("UDP broadcast: CLEAR — all devices notified, SOS disarmed")
    except Exception as e:
        log.error(f"UDP clear broadcast failed: {e}")

# ═══════════════════════════════════════════════════════════════
# GSM — External authority dispatch
# TEST MODE: No SIM800L. Logs SMS to console.
# When you get the module, uncomment the serial code inside.
# ═══════════════════════════════════════════════════════════════

def send_gsm_sms(phone_number, message):
    """TEST MODE — prints SMS to console instead of sending via serial."""
    log.info(f"[TEST] SMS → {phone_number} ✓")
    return True

def dispatch_external_authorities(triggered_by="EMPLOYEE"):
    """Called when ANY employee presses their SOS button during an active alert."""
    global last_sos_time

    now = time.time()
    if now - last_sos_time < SOS_COOLDOWN_SECONDS:
        log.warning("SOS cooldown active — dispatch already sent")
        return
    last_sos_time = now

    log.critical(f"SOS BY {triggered_by} — DISPATCHING")

    # Fetch latest phone numbers from dashboard setup page (filtered by anomaly type)
    fetch_emergency_contacts_from_dashboard(alert_type=current_alert_type)

    sms_body = (
        f"[RAPIDSHIELD SOS] {current_alert_type.replace('_', ' ').upper()}"
        f" | {VENUE_NAME}, Floor {FLOOR} Zone {ZONE}"
        f" | GPS: {GPS_LOCATION['lat']},{GPS_LOCATION['lng']}"
        f" | {datetime.now().strftime('%H:%M:%S')} | RESPOND NOW"
    )

    # Log once: summary of all recipients
    recipients = ", ".join(f"{c['name']}({c['number']})" for c in EMERGENCY_CONTACTS)
    log.info(f"SMS to: {recipients}")
    log.info(f"MSG: {sms_body}")

    for contact in EMERGENCY_CONTACTS:
        threading.Thread(
            target=send_gsm_sms,
            args=(contact["number"], sms_body),
            daemon=True
        ).start()

    # Tell all devices SOS was confirmed
    confirm = json.dumps({"cmd": "SOS_CONFIRMED"})
    try:
        udp_socket.sendto(confirm.encode(), (UDP_BROADCAST_IP, UDP_PORT))
    except Exception:
        pass

    # Best-effort dashboard notification
    try:
        requests.post(
            DASHBOARD_URL.replace("/alert/incoming", "/sos/trigger"),
            json={
                "alert_type": current_alert_type,
                "floor": FLOOR,
                "zone": ZONE,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "device_id": RPI_DEVICE_ID,
                "triggered_by": triggered_by,
                "contacts_notified": [c["name"] for c in EMERGENCY_CONTACTS],
            },
            timeout=3
        )
    except Exception:
        pass

# ═══════════════════════════════════════════════════════════════
# SOS HTTP SERVER — Receives SOS presses from employee devices
# ═══════════════════════════════════════════════════════════════

class SOSHandler(BaseHTTPRequestHandler):
    """
    Lightweight HTTP server running on RPi5.
    Employee ESP32 devices POST to http://192.168.4.1:8080/sos
    when their SOS button is pressed.
    Dashboard POSTs to http://RPi5_IP:8080/clear when alert is aborted.
    """

    def do_POST(self):
        global alert_active, current_alert_type, current_alert_confidence, last_alert_time

        if self.path == "/sos":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode() if content_length else "{}"

            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                data = {}

            device_id = data.get("device_id", "UNKNOWN")

            if alert_active:
                log.critical(f"SOS received from device: {device_id}")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "dispatching"}).encode())

                # Dispatch on a separate thread
                threading.Thread(
                    target=dispatch_external_authorities,
                    args=(device_id,),
                    daemon=True
                ).start()
            else:
                log.debug(f"SOS from {device_id} ignored — no active alert")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "no_active_alert"}).encode())

        elif self.path == "/clear":
            # Dashboard operator aborted the alert — clear everything and resume inference

            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode() if content_length else "{}"

            log.info("═" * 50)
            log.info("ALERT CLEARED BY DASHBOARD — RESUMING INFERENCE")
            log.info("═" * 50)

            alert_active = False
            current_alert_type = None
            current_alert_confidence = 0.0
            last_alert_time = 0  # Reset cooldown so next detection fires immediately

            # Broadcast CLEAR to all ESP32 devices — buzzers will stop
            broadcast_clear_to_devices()

            # Turn off LED
            set_led(False)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "cleared",
                "message": "Alert cleared, inference resumed, ESP32 buzzers stopped"
            }).encode())

        elif self.path == "/heartbeat":
            # Devices can ping this to confirm they're connected
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "alert_active": alert_active,
                "alert_type": current_alert_type,
                "uptime": time.time()
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suppress default HTTP logs, we use our own logger
        pass

def start_sos_server():
    """Start the HTTP server that listens for SOS from employee devices."""
    server = HTTPServer(("0.0.0.0", SOS_HTTP_PORT), SOSHandler)
    log.info(f"SOS server listening on 0.0.0.0:{SOS_HTTP_PORT}")
    server.serve_forever()

# ═══════════════════════════════════════════════════════════════
# DASHBOARD POST (best-effort, non-critical)
# ═══════════════════════════════════════════════════════════════

def post_to_dashboard(alert_type, confidence, frame):
    """Send alert + snapshot to the Next.js dashboard."""
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    snapshot_b64 = base64.b64encode(buffer).decode('utf-8')

    payload = {
        "alert_type": alert_type,
        "confidence": float(confidence),
        "camera_id": CAMERA_ID,
        "floor": FLOOR,
        "zone": ZONE,
        "sensor_triggered": [],
        "gps": GPS_LOCATION,
        "timestamp": datetime.now(tz=__import__('datetime').timezone.utc).isoformat(),
        "footage_available": True,
        "internet_status": "online",
        "device_id": RPI_DEVICE_ID,
        "source": "RPi5",
        "snapshot": f"data:image/jpeg;base64,{snapshot_b64}"
    }

    try:
        resp = requests.post(DASHBOARD_URL, json=payload, timeout=5)
        if resp.status_code == 200:
            log.info("Dashboard received alert + snapshot")
        else:
            log.warning(f"Dashboard returned {resp.status_code}")
    except Exception as e:
        log.warning(f"Dashboard unreachable: {e}")

# ═══════════════════════════════════════════════════════════════
# LED BLINKER
# ═══════════════════════════════════════════════════════════════

def blink_led():
    while alert_active and not shutdown_flag.is_set():
        set_led(True)
        time.sleep(0.3)
        set_led(False)
        time.sleep(0.3)

# ═══════════════════════════════════════════════════════════════
# SYSTEM STATS — Read real RPi5 hardware metrics
# ═══════════════════════════════════════════════════════════════

def get_system_stats():
    """Read real CPU, memory, temperature, uptime from this RPi5."""
    import os

    stats = {
        "cpu_percent": 0,
        "mem_used_mb": 0,
        "mem_total_mb": 4096,
        "temp_c": 0,
        "uptime_seconds": 0,
        "ip": RPI_IP,
        "connected_devices": 0,
        "device_id": RPI_DEVICE_ID,
    }

    # CPU usage from /proc/stat (1-second sample)
    try:
        with open('/proc/stat') as f:
            line1 = f.readline().split()
        time.sleep(0.1)
        with open('/proc/stat') as f:
            line2 = f.readline().split()
        idle1 = int(line1[4])
        idle2 = int(line2[4])
        total1 = sum(int(x) for x in line1[1:])
        total2 = sum(int(x) for x in line2[1:])
        cpu = 100 * (1 - (idle2 - idle1) / max(total2 - total1, 1))
        stats["cpu_percent"] = round(max(0, min(100, cpu)))
    except Exception:
        pass

    # Memory from /proc/meminfo
    try:
        with open('/proc/meminfo') as f:
            meminfo = {}
            for line in f:
                parts = line.split()
                meminfo[parts[0].rstrip(':')] = int(parts[1])
        total = meminfo.get('MemTotal', 0) // 1024  # KB → MB
        available = meminfo.get('MemAvailable', 0) // 1024
        stats["mem_total_mb"] = total
        stats["mem_used_mb"] = total - available
    except Exception:
        pass

    # CPU temperature
    try:
        with open('/sys/class/thermal/thermal_zone0/temp') as f:
            stats["temp_c"] = round(int(f.read().strip()) / 1000, 1)
    except Exception:
        pass

    # Uptime
    try:
        with open('/proc/uptime') as f:
            stats["uptime_seconds"] = int(float(f.read().split()[0]))
    except Exception:
        pass

    # Count connected devices on the hotspot (ARP table)
    try:
        with open('/proc/net/arp') as f:
            lines = f.readlines()[1:]  # skip header
            stats["connected_devices"] = len([l for l in lines if '192.168.4.' in l and '0x2' in l])
    except Exception:
        pass

    return stats

def stats_reporter():
    """Periodically POST real system stats to the dashboard.
    Also syncs alert state: if dashboard has cleared the alert (operator abort),
    the RPi5 clears its own alert, broadcasts CLEAR to ESP32s, and resumes inference.
    """
    global alert_active, current_alert_type, current_alert_confidence, last_alert_time

    while not shutdown_flag.is_set():
        try:
            stats = get_system_stats()
            resp = requests.post(
                DASHBOARD_URL.replace("/alert/incoming", "/health"),
                json=stats,
                timeout=3
            )

            # Check if dashboard has cleared the alert (operator aborted)
            if resp.status_code == 200 and alert_active:
                try:
                    data = resp.json()
                    if data.get("alert_active") is False:
                        log.info("═" * 50)
                        log.info("DASHBOARD CLEARED ALERT — RESUMING INFERENCE")
                        log.info("═" * 50)

                        alert_active = False
                        current_alert_type = None
                        current_alert_confidence = 0.0
                        last_alert_time = 0  # Reset cooldown

                        # Stop all ESP32 buzzers
                        broadcast_clear_to_devices()
                        set_led(False)
                except Exception:
                    pass

        except Exception:
            pass
        # Report every 5 seconds
        for _ in range(50):
            if shutdown_flag.is_set():
                return
            time.sleep(0.1)

# ═══════════════════════════════════════════════════════════════
# CAMERA
# ═══════════════════════════════════════════════════════════════

def init_camera():
    picam2 = Picamera2()
    config = picam2.create_video_configuration(
        main={"format": "RGB888", "size": (640, 480)}
    )
    picam2.configure(config)
    picam2.start()
    log.info("PiCamera2 started (640x480)")
    return picam2

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    global alert_active, current_alert_type, current_alert_confidence, last_alert_time

    log.info("=" * 55)
    log.info("  RAPIDSHIELD EDGE NODE — STARTING")
    log.info(f"  Device : {RPI_DEVICE_ID}")
    log.info(f"  Camera : {CAMERA_ID} | Floor {FLOOR} Zone {ZONE}")
    log.info(f"  Venue  : {VENUE_NAME}")
    log.info(f"  Hotspot: {RPI_IP} | UDP {UDP_PORT} | SOS {SOS_HTTP_PORT}")
    log.info("=" * 55)

    # 1. GPIO
    setup_gpio()

    # 2. Load model
    log.info("Loading YOLOv8 model...")
    model = YOLO("crisis.pt")
    model.model.names = CLASS_MAP
    log.info("Model loaded")

    # 3. Camera
    picam2 = init_camera()

    # 4. Start SOS HTTP server (receives SOS from wireless devices)
    sos_thread = threading.Thread(target=start_sos_server, daemon=True)
    sos_thread.start()

    # 5. Start system stats reporter (POSTs CPU/mem/temp to dashboard every 5s)
    stats_thread = threading.Thread(target=stats_reporter, daemon=True)
    stats_thread.start()

    log.info("SYSTEM READY — watching for anomalies\n")

    try:
        while not shutdown_flag.is_set():
            # ── PAUSE INFERENCE WHILE ALERT IS ACTIVE ──────────
            # Wait for dashboard to abort (POST /clear) before resuming
            if alert_active:
                time.sleep(0.5)
                continue

            frame = picam2.capture_array()

            results = model.predict(
                source=frame,
                imgsz=INFERENCE_SIZE,
                conf=CONFIDENCE_THRESHOLD,
                verbose=False
            )

            detected = False

            for result in results:
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])

                    if cls_id not in CLASS_MAP:
                        continue

                    detected = True
                    alert_type = CLASS_MAP[cls_id]
                    now = time.time()

                    # Draw bounding box
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(
                        frame, f"{alert_type} {conf:.2f}",
                        (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2
                    )

                    # Cooldown check
                    if now - last_alert_time < ALERT_COOLDOWN_SECONDS:
                        continue

                    last_alert_time = now

                    # ── ALERT FIRED ──────────────────────
                    log.critical(f"ANOMALY: {alert_type} ({conf:.2f})")

                    alert_active = True
                    current_alert_type = alert_type
                    current_alert_confidence = conf

                    # ACTION 1: UDP broadcast to all employee speakers
                    broadcast_alert_to_devices(alert_type, FLOOR, ZONE, conf)

                    # ACTION 2: Blink LED
                    threading.Thread(target=blink_led, daemon=True).start()

                    # ACTION 3: Dashboard POST (non-blocking)
                    threading.Thread(
                        target=post_to_dashboard,
                        args=(alert_type, conf, frame.copy()),
                        daemon=True
                    ).start()

                    # Inference will pause on the next loop iteration
                    # because alert_active is now True

            # Show local feed (remove cv2.imshow lines for headless deploy)
            cv2.imshow("RapidShield", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        log.info("Shutdown signal received")
    finally:
        log.info("Shutting down...")
        shutdown_flag.set()
        alert_active = False
        broadcast_clear_to_devices()
        set_led(False)
        cleanup_gpio()
        udp_socket.close()
        picam2.stop()
        cv2.destroyAllWindows()
        log.info("RapidShield shut down.")


if __name__ == "__main__":
    main()
