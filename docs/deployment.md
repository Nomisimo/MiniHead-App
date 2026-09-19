# Deployment — Getting the App onto the ESP

The app lives in `src/`. These files need to be uploaded to the ESP32's LittleFS partition.

---

## Step 1 — Firmware change (one-time, in MiniHead repo)

Add static file serving to the ESP firmware. In `Firmware/MiniHead/main/core/wifi/wifi_control.h`, add this line to `setupRoutes()` **before** the `onNotFound` handler:

```cpp
server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
```

This makes the ESP serve any file from LittleFS at its matching URL path. Existing `/api/*` routes take priority. The service worker (`/sw.js`) and manifest (`/manifest.json`) must be served from the root.

LittleFS is already mounted via `storage_begin()` in `core.h` — no further firmware changes needed.

---

## Step 2 — Place files in the Arduino data folder

Arduino's LittleFS upload tool reads from a `data/` folder inside the sketch directory.

Copy (or symlink) the contents of `src/` into:
```
MiniHead/Firmware/MiniHead/main/data/
```

Structure:
```
main/data/
├── index.html
├── manifest.json
├── sw.js
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── css/
│   ├── app.css
│   ├── layout.css
│   └── controls.css
└── js/
    ├── main.js
    ├── api.js
    ├── connect.js
    ├── controls.js
    ├── heads.js
    ├── cues.js
    └── sequencer.js
```

---

## Step 3 — Upload via Arduino IDE

1. Open `main.ino` in Arduino IDE 2
2. Select board: `ESP32C3 Dev Module` (or your board)
3. Select the correct port
4. Menu: **Tools → ESP32 Sketch Data Upload**

> If the menu item is missing, install the **LittleFS upload plugin** for Arduino IDE 2:
> https://github.com/lorol/arduino-esp32fs-plugin

This uploads the `data/` folder contents to the LittleFS partition without touching the firmware.

---

## Step 4 — Verify

Open `http://minihead.local` on your phone (same WiFi as the ESP).
The app should load. Add to Home Screen.

---

## Updating the App

For app-only changes (no firmware changes): repeat Steps 2–3 only. The firmware stays unchanged.

---

## File Size Budget

The ESP32-C3 Super Mini has a 4MB flash. The default partition table allocates ~1.5MB to LittleFS. Keep total app size under 1MB to leave room for future files (cues.json, discovery.json, etc. are also stored in LittleFS).

Minify JS and CSS if needed. Icons should be ≤50KB each.

---

## Development Workflow

For local development without uploading to ESP every time:

```bash
# Serve src/ locally, proxy /api/* to the real ESP
cd src/
python3 -m http.server 3000
```

Then open `http://localhost:3000` and set the ESP IP manually in the Connect screen. The service worker is not active on localhost over HTTP — that's fine for development.

Or use a simple dev server with proxy (any Node.js static server with proxy support).
