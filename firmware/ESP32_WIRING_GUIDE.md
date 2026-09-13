# 🔌 ESP32-CAM Wiring & Flashing Guide

This guide details how to program and connect your **ESP32-CAM (AI Thinker + OV2640)** using the **FT232RL USB-to-TTL** converter module.

---

## 1. Wiring for Flashing (Programming Mode)

Connect the **FT232RL Programmer** to the **ESP32-CAM** using Female-to-Female jumper wires:

| FT232RL Pin | ESP32-CAM Pin | Purpose |
| :--- | :--- | :--- |
| **VCC (set jumper to 5V)** | **5V** | Power supply |
| **GND** | **GND** | Common ground |
| **TXD** | **U0R (RX)** | Serial Receive |
| **RXD** | **U0T (TX)** | Serial Transmit |
| *(None)* | **GPIO 0 ➔ GND** | ⚠️ **Must be connected to GND to enter Bootloader/Flash mode!** |

> [!IMPORTANT]
> **GPIO 0 must be connected to GND** before plugging the USB cable into your laptop. This puts the ESP32-CAM into flashing mode.

---

## 2. Arduino IDE Settings

1. Open **Arduino IDE** (or VS Code with Arduino extension).
2. Install the ESP32 board package:
   * Go to **File ➔ Preferences**.
   * Add to *Additional Boards Manager URLs*:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   * Go to **Tools ➔ Board ➔ Boards Manager**, search for `esp32` by Espressif and click **Install**.
3. Select the Board Configuration:
   * **Board:** `AI Thinker ESP32-CAM`
   * **CPU Frequency:** `240MHz (WiFi/BT)`
   * **Flash Frequency:** `80MHz`
   * **Flash Mode:** `QIO`
   * **Partition Scheme:** `Huge APP (3MB No OTA/1MB SPIFFS)`
   * **Upload Speed:** `115200`
   * **Port:** Select the COM port corresponding to your FT232RL.

---

## 3. Uploading the Code

1. Open [`firmware/SmartFridge_ESP32CAM.ino`](file:///c:/Users/haris/smart-fridge/firmware/SmartFridge_ESP32CAM.ino).
2. Edit lines 20-21 with your local Wi-Fi or Phone Hotspot credentials:
   ```cpp
   const char* ssid = "YourWiFiName";
   const char* password = "YourWiFiPassword";
   ```
3. Click the **Upload** button (`➔`) in Arduino IDE.
4. When you see `Connecting........_____.....` in the console:
   * Press the tiny **RST (Reset)** button on the back of the ESP32-CAM once.
5. Wait for the upload to reach `100% Done`.

---

## 4. Running the Camera (Operating Mode)

1. **Unplug GPIO 0 from GND** (disconnect that single wire).
2. Open the **Serial Monitor** in Arduino IDE (set to `115200 baud`).
3. Press the **RST** button on the ESP32-CAM.
4. You will see:
   ```text
   --- SMART FRIDGE ESP32-CAM BOOTING ---
   Connecting to Wi-Fi SSID: YourWiFiName
   ....
   Wi-Fi Connected successfully!
   Camera Stream Ready! Access at: http://192.168.1.50
   Starting web server on port: '80'
   ```
5. Copy the IP address (e.g. `http://192.168.1.50`).
6. Open your Smart Fridge web app at `http://localhost:5173/scan`, switch to **ESP32-CAM Wi-Fi Mode**, and paste this IP address. The camera stream will show up immediately!
