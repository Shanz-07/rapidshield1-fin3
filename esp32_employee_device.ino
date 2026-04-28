/*
  RapidShield — Employee Speaker Device (NON-BLOCKING BUZZER)
  =============================================================
  Uses a passive buzzer with millis()-based non-blocking timing.
  No delay() calls in the main loop — button is always responsive.

  Wiring:
    Passive Buzzer:
      (+) → GPIO 22
      (-) → GND

    SOS Button:
      One leg → GPIO 4
      Other leg → GND (internal pull-up used)

    Status LED:
      GPIO 2 (built-in LED on most DevKits)

  Alert Flow:
    1. UDP ALERT received → 5-second loud alarm buzzer
    2. After 5s → stop buzzer, switch to gentle warning beep every 2s
    3. SOS Button long-press (≥1s hold) → HTTP POST to RPi5 (dispatches SMS)
       → special confirmation buzzer plays
    4. UDP CLEAR received → all buzzer activity stops immediately
*/

#include <WiFi.h>
#include <WiFiUdp.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION — Change per device
// ═══════════════════════════════════════════════════════════════

#define DEVICE_ID "SPK_EMP_01"

const char* WIFI_SSID = "RapidShield_Net";
const char* WIFI_PASS = "rapidshield2025";

const char* RPI_IP = "192.168.4.1";
const int RPI_SOS_PORT = 8080;
const int UDP_PORT = 9999;

// ═══════════════════════════════════════════════════════════════
// PIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════

#define BUZZER_PIN 22
#define SOS_BUTTON_PIN 4
#define STATUS_LED_PIN 2

// ═══════════════════════════════════════════════════════════════
// TIMING CONSTANTS
// ═══════════════════════════════════════════════════════════════

#define INITIAL_ALARM_DURATION_MS   5000    // 5-second loud alarm on alert
#define WARNING_BEEP_INTERVAL_MS    2000    // Gentle beep every 2 seconds
#define WARNING_BEEP_DURATION_MS    150     // Each warning beep lasts 150ms
#define WARNING_BEEP_FREQ           1200    // Warning beep frequency (Hz)
#define SOS_HOLD_THRESHOLD_MS       1000    // 1 second hold = SOS trigger
#define SOS_COOLDOWN_MS             5000    // Prevent rapid SOS re-triggers

// ═══════════════════════════════════════════════════════════════
// ALARM SOUND DEFINITIONS — Per crisis type
// ═══════════════════════════════════════════════════════════════

// Each alarm pattern is a sequence of {frequency, duration_ms} pairs
// terminated by {0, 0}. Total should be ≤ 5000ms.
struct BuzzerNote {
    int freq;
    int durationMs;
};

// Fire: rapid high-pitched alternating
const BuzzerNote ALARM_FIRE[] = {
    {2500, 200}, {0, 100}, {2500, 200}, {0, 100},
    {2500, 200}, {0, 100}, {2500, 200}, {0, 100},
    {2500, 200}, {0, 100}, {2500, 200}, {0, 100},
    {2500, 200}, {0, 100}, {2500, 200}, {0, 100},
    {2500, 200}, {0, 100}, {2500, 200}, {0, 100},
    {2500, 200}, {0, 100}, {2500, 200}, {0, 100},
    {2500, 200}, {0, 100}, {2500, 200}, {0, 100},
    {2500, 200}, {0, 100}, {2500, 200}, {0, 100},
    {0, 0}
};

// Explosion: long low drone alternating
const BuzzerNote ALARM_EXPLOSION[] = {
    {500, 600}, {0, 200}, {500, 600}, {0, 200},
    {500, 600}, {0, 200}, {500, 600}, {0, 200},
    {500, 600}, {0, 200},
    {0, 0}
};

// Flood: rising siren sweep
const BuzzerNote ALARM_FLOOD[] = {
    {400, 100}, {500, 100}, {600, 100}, {700, 100},
    {800, 100}, {900, 100}, {1000, 100}, {1100, 100},
    {1200, 100}, {0, 200},
    {400, 100}, {500, 100}, {600, 100}, {700, 100},
    {800, 100}, {900, 100}, {1000, 100}, {1100, 100},
    {1200, 100}, {0, 200},
    {400, 100}, {500, 100}, {600, 100}, {700, 100},
    {800, 100}, {900, 100}, {1000, 100}, {1100, 100},
    {1200, 100}, {0, 200},
    {0, 0}
};

// Electrical: crackling random bursts
const BuzzerNote ALARM_ELECTRICAL[] = {
    {1800, 50}, {0, 30}, {2100, 50}, {0, 30},
    {1900, 50}, {0, 30}, {2200, 50}, {0, 30},
    {2000, 50}, {0, 30}, {1850, 50}, {0, 30},
    {2100, 50}, {0, 30}, {1950, 50}, {0, 200},
    {1800, 50}, {0, 30}, {2100, 50}, {0, 30},
    {1900, 50}, {0, 30}, {2200, 50}, {0, 30},
    {2000, 50}, {0, 30}, {1850, 50}, {0, 30},
    {2100, 50}, {0, 30}, {1950, 50}, {0, 200},
    {1800, 50}, {0, 30}, {2100, 50}, {0, 30},
    {1900, 50}, {0, 30}, {2200, 50}, {0, 30},
    {0, 0}
};

// Generic: standard alarm
const BuzzerNote ALARM_GENERIC[] = {
    {1500, 300}, {0, 200}, {1500, 300}, {0, 200},
    {1500, 300}, {0, 200}, {1500, 300}, {0, 200},
    {1500, 300}, {0, 200}, {1500, 300}, {0, 200},
    {1500, 300}, {0, 200}, {1500, 300}, {0, 200},
    {1500, 300}, {0, 200}, {1500, 300}, {0, 200},
    {0, 0}
};

// SOS confirmation: ascending triple tone
const BuzzerNote SOS_CONFIRM_PATTERN[] = {
    {800, 200}, {0, 50}, {1200, 200}, {0, 50}, {1600, 400},
    {0, 100},
    {800, 200}, {0, 50}, {1200, 200}, {0, 50}, {1600, 400},
    {0, 0}
};

// ═══════════════════════════════════════════════════════════════
// GLOBALS
// ═══════════════════════════════════════════════════════════════

WiFiUDP udp;

// Alert state
bool alertActive = false;
String currentAlertType = "";
int currentFloor = 0;
String currentZone = "";

// Non-blocking buzzer state machine
enum BuzzerState {
    BUZZER_IDLE,            // No sound
    BUZZER_INITIAL_ALARM,   // Playing the 5-second loud alarm pattern
    BUZZER_WARNING_BEEP,    // Gentle repeating beep while alert active
    BUZZER_SOS_CONFIRM      // Playing SOS confirmation sound
};

BuzzerState buzzerState = BUZZER_IDLE;
const BuzzerNote* currentPattern = nullptr;
int patternIndex = 0;
unsigned long noteStartTime = 0;
unsigned long alarmStartTime = 0;        // When the initial alarm started
unsigned long lastWarningBeepTime = 0;   // Last time we did a warning beep
bool warningBeepActive = false;          // Is a warning beep currently sounding

// SOS button state
bool buttonWasPressed = false;
unsigned long buttonPressStart = 0;
unsigned long lastSOSSent = 0;
bool sosTriggered = false;               // Set after SOS dispatched (prevents re-trigger until release)

// ═══════════════════════════════════════════════════════════════
// BUZZER — Low-level PWM control
// ═══════════════════════════════════════════════════════════════

void setupBuzzer() {
    ledcAttach(BUZZER_PIN, 2000, 8);  // pin, initial freq, 8-bit resolution
    Serial.println("[BUZZER] Passive buzzer on GPIO 22");
}

void buzzerToneOn(int frequency) {
    if (frequency > 0) {
        ledcWriteTone(BUZZER_PIN, frequency);
    } else {
        ledcWriteTone(BUZZER_PIN, 0);
    }
}

void buzzerOff() {
    ledcWriteTone(BUZZER_PIN, 0);
}

// ═══════════════════════════════════════════════════════════════
// PATTERN PLAYER — Non-blocking, driven by loop()
// ═══════════════════════════════════════════════════════════════

const BuzzerNote* getAlarmPattern(String alertType) {
    if (alertType == "fire_smoke") return ALARM_FIRE;
    if (alertType == "explosion") return ALARM_EXPLOSION;
    if (alertType == "flood_water") return ALARM_FLOOD;
    if (alertType == "electrical_spark") return ALARM_ELECTRICAL;
    return ALARM_GENERIC;
}

void startAlarmPattern(String alertType) {
    currentPattern = getAlarmPattern(alertType);
    patternIndex = 0;
    alarmStartTime = millis();
    noteStartTime = millis();
    buzzerState = BUZZER_INITIAL_ALARM;

    // Start the first note
    if (currentPattern[0].freq > 0) {
        buzzerToneOn(currentPattern[0].freq);
    } else {
        buzzerOff();
    }

    Serial.printf("\n[ALERT] *** %s *** — Floor %d Zone %s\n",
                  alertType.c_str(), currentFloor, currentZone.c_str());
    Serial.println("[ALERT] 5-SECOND ALARM ACTIVE — SOS BUTTON IS ARMED\n");
}

void startSOSConfirmPattern() {
    currentPattern = SOS_CONFIRM_PATTERN;
    patternIndex = 0;
    noteStartTime = millis();
    buzzerState = BUZZER_SOS_CONFIRM;

    if (currentPattern[0].freq > 0) {
        buzzerToneOn(currentPattern[0].freq);
    } else {
        buzzerOff();
    }
}

// Called every loop() iteration — advances the buzzer pattern
void updateBuzzer() {
    unsigned long now = millis();

    switch (buzzerState) {
        case BUZZER_IDLE:
            // Nothing to do
            break;

        case BUZZER_INITIAL_ALARM: {
            // Check if 5 seconds total have elapsed
            if (now - alarmStartTime >= INITIAL_ALARM_DURATION_MS) {
                buzzerOff();
                buzzerState = BUZZER_WARNING_BEEP;
                lastWarningBeepTime = now;
                warningBeepActive = false;
                Serial.println("[BUZZER] Initial alarm complete — switching to warning beep mode");
                break;
            }

            // Advance through the pattern notes
            if (currentPattern && currentPattern[patternIndex].durationMs > 0) {
                if (now - noteStartTime >= (unsigned long)currentPattern[patternIndex].durationMs) {
                    patternIndex++;
                    if (currentPattern[patternIndex].durationMs == 0) {
                        // Pattern ended, loop it (still within 5s window)
                        patternIndex = 0;
                    }
                    noteStartTime = now;
                    if (currentPattern[patternIndex].freq > 0) {
                        buzzerToneOn(currentPattern[patternIndex].freq);
                    } else {
                        buzzerOff();
                    }
                }
            }
            break;
        }

        case BUZZER_WARNING_BEEP: {
            if (!alertActive) {
                buzzerOff();
                buzzerState = BUZZER_IDLE;
                break;
            }

            if (warningBeepActive) {
                // Currently sounding — check if beep duration elapsed
                if (now - lastWarningBeepTime >= WARNING_BEEP_DURATION_MS) {
                    buzzerOff();
                    warningBeepActive = false;
                    lastWarningBeepTime = now;
                }
            } else {
                // Silent — check if interval has elapsed
                if (now - lastWarningBeepTime >= WARNING_BEEP_INTERVAL_MS) {
                    buzzerToneOn(WARNING_BEEP_FREQ);
                    warningBeepActive = true;
                    lastWarningBeepTime = now;
                }
            }
            break;
        }

        case BUZZER_SOS_CONFIRM: {
            // Play through the SOS confirmation pattern
            if (currentPattern && currentPattern[patternIndex].durationMs > 0) {
                if (now - noteStartTime >= (unsigned long)currentPattern[patternIndex].durationMs) {
                    patternIndex++;
                    if (currentPattern[patternIndex].durationMs == 0) {
                        // Pattern finished — go back to warning beep if alert still active
                        buzzerOff();
                        if (alertActive) {
                            buzzerState = BUZZER_WARNING_BEEP;
                            lastWarningBeepTime = now;
                            warningBeepActive = false;
                        } else {
                            buzzerState = BUZZER_IDLE;
                        }
                        break;
                    }
                    noteStartTime = now;
                    if (currentPattern[patternIndex].freq > 0) {
                        buzzerToneOn(currentPattern[patternIndex].freq);
                    } else {
                        buzzerOff();
                    }
                }
            }
            break;
        }
    }
}

// Force-stop everything
void stopAllBuzzer() {
    buzzerOff();
    buzzerState = BUZZER_IDLE;
    currentPattern = nullptr;
    warningBeepActive = false;
}

// ═══════════════════════════════════════════════════════════════
// WiFi
// ═══════════════════════════════════════════════════════════════

void connectWiFi() {
    Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
        digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WIFI] Connected — IP: %s\n", WiFi.localIP().toString().c_str());
        digitalWrite(STATUS_LED_PIN, HIGH);
        delay(500);
        digitalWrite(STATUS_LED_PIN, LOW);
    } else {
        Serial.println("\n[WIFI] FAILED — will retry");
    }
}

// ═══════════════════════════════════════════════════════════════
// SOS — HTTP POST to RPi5 (triggers SMS dispatch to authorities)
// ═══════════════════════════════════════════════════════════════

void sendSOS() {
    Serial.println("[SOS] >>> SENDING SOS TO RPi5 — EXTERNAL AUTHORITIES WILL BE NOTIFIED <<<");

    // Rapid LED blink to confirm press
    for (int i = 0; i < 5; i++) {
        digitalWrite(STATUS_LED_PIN, HIGH);
        delay(50);
        digitalWrite(STATUS_LED_PIN, LOW);
        delay(50);
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[SOS] WiFi not connected — cannot dispatch");
        return;
    }

    HTTPClient http;
    String url = String("http://") + RPI_IP + ":" + RPI_SOS_PORT + "/sos";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    String body = "{\"device_id\":\"" + String(DEVICE_ID) + "\"}";
    int code = http.POST(body);

    if (code == 200) {
        String response = http.getString();
        Serial.printf("[SOS] RPi5 confirmed: %s\n", response.c_str());
        // Play confirmation buzzer (non-blocking)
        startSOSConfirmPattern();
        Serial.println("[SOS] Confirmation buzzer playing — help is on the way!");
    } else {
        Serial.printf("[SOS] FAILED — HTTP %d\n", code);
    }

    http.end();
}

// ═══════════════════════════════════════════════════════════════
// SOS BUTTON — Non-blocking long-press detection
// ═══════════════════════════════════════════════════════════════

void handleSOSButton() {
    bool buttonPressed = (digitalRead(SOS_BUTTON_PIN) == LOW);
    unsigned long now = millis();

    if (buttonPressed) {
        if (!buttonWasPressed) {
            // Button just pressed — start timing
            buttonWasPressed = true;
            buttonPressStart = now;
            sosTriggered = false;
        } else if (!sosTriggered && (now - buttonPressStart >= SOS_HOLD_THRESHOLD_MS)) {
            // Button held long enough — trigger SOS
            if (alertActive && (now - lastSOSSent > SOS_COOLDOWN_MS)) {
                sosTriggered = true;
                lastSOSSent = now;
                Serial.println("[SOS] Long press detected — dispatching SOS!");
                sendSOS();
            } else if (!alertActive) {
                sosTriggered = true;  // Prevent re-logging
                Serial.println("[SOS] No active alert — button ignored");
            }
        }
        // While button is held, do nothing more (buzzer continues normally)
    } else {
        // Button released
        if (buttonWasPressed) {
            buttonWasPressed = false;
            sosTriggered = false;
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// UDP HANDLER — Process incoming commands from RPi5
// ═══════════════════════════════════════════════════════════════

void handleUDP() {
    int packetSize = udp.parsePacket();
    if (packetSize <= 0) return;

    char buffer[512];
    int len = udp.read(buffer, sizeof(buffer) - 1);
    buffer[len] = '\0';

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, buffer);
    if (err) return;

    String cmd = doc["cmd"].as<String>();

    if (cmd == "ALERT") {
        currentAlertType = doc["type"].as<String>();
        currentFloor = doc["floor"].as<int>();
        currentZone = doc["zone"].as<String>();
        alertActive = true;

        digitalWrite(STATUS_LED_PIN, HIGH);

        // Start the 5-second alarm (non-blocking)
        startAlarmPattern(currentAlertType);

    } else if (cmd == "CLEAR") {
        alertActive = false;
        currentAlertType = "";
        digitalWrite(STATUS_LED_PIN, LOW);

        // STOP ALL BUZZER ACTIVITY IMMEDIATELY
        stopAllBuzzer();

        Serial.println("[OK] Alert cleared — buzzer stopped, SOS disarmed");

        // Short confirmation tone
        buzzerToneOn(800);
        // We'll turn this off after a brief moment using a one-shot timer approach
        // For simplicity, a tiny blocking delay here is acceptable (not in the critical path)
        delay(200);
        buzzerOff();

    } else if (cmd == "SOS_CONFIRMED") {
        Serial.println("[SOS] Help is on the way!");
        startSOSConfirmPattern();
    }
}

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("=========================================");
    Serial.println("  RAPIDSHIELD EMPLOYEE DEVICE (v2.0)");
    Serial.printf("  ID: %s\n", DEVICE_ID);
    Serial.println("  NON-BLOCKING BUZZER + LONG-PRESS SOS");
    Serial.println("=========================================");

    pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
    pinMode(STATUS_LED_PIN, OUTPUT);
    digitalWrite(STATUS_LED_PIN, LOW);

    setupBuzzer();
    connectWiFi();

    udp.begin(UDP_PORT);
    Serial.printf("[UDP] Listening on port %d\n", UDP_PORT);

    // Boot beep (blocking OK here, one-time only)
    buzzerToneOn(1000);
    delay(200);
    buzzerToneOn(1500);
    delay(200);
    buzzerOff();

    Serial.println("[READY] Waiting for alerts...\n");
}

// ═══════════════════════════════════════════════════════════════
// LOOP — Fully non-blocking
// ═══════════════════════════════════════════════════════════════

void loop() {
    // 1. Handle incoming UDP packets (ALERT / CLEAR / SOS_CONFIRMED)
    handleUDP();

    // 2. Update buzzer state machine (non-blocking)
    updateBuzzer();

    // 3. Handle SOS button (non-blocking long-press detection)
    handleSOSButton();

    // 4. Reconnect WiFi if dropped
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WIFI] Lost — reconnecting...");
        connectWiFi();
        if (WiFi.status() == WL_CONNECTED) {
            udp.begin(UDP_PORT);
        }
    }

    // Tiny yield to prevent watchdog reset
    delay(1);
}
