import time
import requests

DASHBOARD_HEALTH_URL = "http://localhost:3000/api/health"
RPI_DEVICE_ID = "RPi5_UNIT_01"

def main():
    print(f"Starting mock RPi5 Edge Node ({RPI_DEVICE_ID})...")
    uptime = 0
    while True:
        stats = {
            "cpu_percent": 42,
            "mem_used_mb": 1200,
            "mem_total_mb": 4096,
            "temp_c": 52.0,
            "uptime_seconds": uptime,
            "ip": "192.168.1.104",
            "connected_devices": 3,
            "device_id": RPI_DEVICE_ID,
        }
        try:
            resp = requests.post(DASHBOARD_HEALTH_URL, json=stats, timeout=3)
            print(f"Sent health ping. Status: {resp.status_code}")
        except Exception as e:
            print(f"Failed to connect to dashboard: {e}")
        
        uptime += 5
        time.sleep(5)

if __name__ == "__main__":
    main()
