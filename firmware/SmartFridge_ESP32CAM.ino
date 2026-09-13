/*
 * =================================================================================
 * SMART FRIDGE — ESP32-CAM (AI Thinker OV2640) FIRMWARE
 * =================================================================================
 * Features:
 *   - Live MJPEG video streaming at /stream
 *   - High-resolution single snapshot at /capture
 *   - Flash LED toggle at /flash?state=1 or /flash?state=0
 *   - Device health status at /status (JSON)
 *   - CORS enabled for seamless integration with Smart Fridge Web App
 * =================================================================================
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ---------------------------------------------------------------------------------
// 1. WI-FI CREDENTIALS — Replace with your Wi-Fi or Phone Hotspot details
// ---------------------------------------------------------------------------------
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// ---------------------------------------------------------------------------------
// 2. CAMERA PIN DEFINITIONS — AI THINKER ESP32-CAM
// ---------------------------------------------------------------------------------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Built-in Flashlight LED
#define FLASH_LED_PIN      4

// HTTP Server Handles
httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\nAccess-Control-Allow-Origin: *\r\n\r\n";

bool flashState = false;

// ---------------------------------------------------------------------------------
// HANDLER: /status (JSON for web app health check)
// ---------------------------------------------------------------------------------
static esp_err_t status_handler(httpd_req_t *req) {
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    
    char json_response[256];
    snprintf(json_response, sizeof(json_response),
             "{\"device\":\"SmartFridge_ESP32CAM\",\"status\":\"online\",\"ip\":\"%s\",\"flash\":%s,\"rssi\":%d}",
             WiFi.localIP().toString().c_str(),
             flashState ? "true" : "false",
             WiFi.RSSI());
             
    return httpd_resp_send(req, json_response, strlen(json_response));
}

// ---------------------------------------------------------------------------------
// HANDLER: /capture (Single JPEG Snapshot)
// ---------------------------------------------------------------------------------
static esp_err_t capture_handler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;

    fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Camera capture failed");
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return res;
}

// ---------------------------------------------------------------------------------
// HANDLER: /flash (Toggle LED)
// ---------------------------------------------------------------------------------
static esp_err_t flash_handler(httpd_req_t *req) {
    char*  buf;
    size_t buf_len;
    char param[32];

    buf_len = httpd_req_get_url_query_len(req) + 1;
    if (buf_len > 1) {
        buf = (char*)malloc(buf_len);
        if (httpd_req_get_url_query_str(req, buf, buf_len) == ESP_OK) {
            if (httpd_query_key_value(buf, "state", param, sizeof(param)) == ESP_OK) {
                if (strcmp(param, "1") == 0 || strcmp(param, "true") == 0) {
                    digitalWrite(FLASH_LED_PIN, HIGH);
                    flashState = true;
                } else {
                    digitalWrite(FLASH_LED_PIN, LOW);
                    flashState = false;
                }
            }
        }
        free(buf);
    }

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    char res[64];
    snprintf(res, sizeof(res), "{\"flash\":%s}", flashState ? "true" : "false");
    return httpd_resp_send(req, res, strlen(res));
}

// ---------------------------------------------------------------------------------
// HANDLER: /stream (MJPEG Live Stream)
// ---------------------------------------------------------------------------------
static esp_err_t stream_handler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len = 0;
    uint8_t * _jpg_buf = NULL;
    char * part_buf[64];

    res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
    if (res != ESP_OK) {
        return res;
    }
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    while (true) {
        fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Camera frame capture failed");
            res = ESP_FAIL;
        } else {
            _jpg_buf_len = fb->len;
            _jpg_buf = fb->buf;
        }
        if (res == ESP_OK) {
            size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);
            res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
        }
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        }
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
        }
        if (fb) {
            esp_camera_fb_return(fb);
            fb = NULL;
            _jpg_buf = NULL;
        } else if (_jpg_buf) {
            free(_jpg_buf);
            _jpg_buf = NULL;
        }
        if (res != ESP_OK) {
            break;
        }
    }
    return res;
}

// ---------------------------------------------------------------------------------
// SERVER INITIALIZATION
// ---------------------------------------------------------------------------------
void startCameraServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;

    httpd_uri_t status_uri = {
        .uri       = "/status",
        .method    = HTTP_GET,
        .handler   = status_handler,
        .user_ctx  = NULL
    };

    httpd_uri_t capture_uri = {
        .uri       = "/capture",
        .method    = HTTP_GET,
        .handler   = capture_handler,
        .user_ctx  = NULL
    };

    httpd_uri_t flash_uri = {
        .uri       = "/flash",
        .method    = HTTP_GET,
        .handler   = flash_handler,
        .user_ctx  = NULL
    };

    httpd_uri_t stream_uri = {
        .uri       = "/stream",
        .method    = HTTP_GET,
        .handler   = stream_handler,
        .user_ctx  = NULL
    };

    Serial.printf("Starting web server on port: '%d'\n", config.server_port);
    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(camera_httpd, &status_uri);
        httpd_register_uri_handler(camera_httpd, &capture_uri);
        httpd_register_uri_handler(camera_httpd, &flash_uri);
        httpd_register_uri_handler(camera_httpd, &stream_uri);
    }
}

// ---------------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    Serial.setDebugOutput(true);
    Serial.println("\n--- SMART FRIDGE ESP32-CAM BOOTING ---");

    pinMode(FLASH_LED_PIN, OUTPUT);
    digitalWrite(FLASH_LED_PIN, LOW); // LED off initially

    // Configure Camera Pins
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    // High quality with PSRAM, safe baseline without PSRAM
    if (psramFound()) {
        config.frame_size = FRAMESIZE_SVGA; // 800x600 for sharp barcodes
        config.jpeg_quality = 12;            // 0-63, lower means higher quality
        config.fb_count = 2;
    } else {
        config.frame_size = FRAMESIZE_VGA;  // 640x480
        config.jpeg_quality = 15;
        config.fb_count = 1;
    }

    // Initialize the camera
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x\n", err);
        return;
    }

    // Connect to Wi-Fi
    Serial.printf("Connecting to Wi-Fi SSID: %s\n", ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWi-Fi Connected successfully!");
    Serial.print("Camera Stream Ready! Access at: http://");
    Serial.println(WiFi.localIP());

    // Flash light blink to indicate ready
    digitalWrite(FLASH_LED_PIN, HIGH);
    delay(200);
    digitalWrite(FLASH_LED_PIN, LOW);

    // Start HTTP services
    startCameraServer();
}

// ---------------------------------------------------------------------------------
// LOOP
// ---------------------------------------------------------------------------------
void loop() {
    delay(10000); // Server runs asynchronously in background tasks
}
