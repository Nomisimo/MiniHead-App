# Architecture

## Core Decision: Serve from ESP, not from the internet

**Why not GitHub Pages / Netlify?**
Browsers block `fetch('http://local-device')` from HTTPS pages (Mixed Content policy). All free static hosts force HTTPS. No workaround exists in standard browsers.

**Solution:** The PWA is served from the ESP Leader's LittleFS filesystem over HTTP on the local network. The phone opens `http://minihead.local` → adds to Home Screen → app is cached by Service Worker → runs offline from cache.

No external server. No internet required after first load. No mixed content issues.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | Vanilla HTML / CSS / ES6 JS | No build step needed; files can be uploaded directly to ESP LittleFS |
| Styling | CSS custom properties + mobile-first | No framework dependency |
| Offline | Service Worker + Cache API | Standard PWA; works on iOS 11.3+, Android Chrome |
| Install | Web App Manifest | "Add to Home Screen" on iOS/Android |
| Live updates | Polling (3s /api/status, 5s /api/heads) | ESP has no SSE yet; polling is sufficient for lighting |
| Discovery | mDNS → manual IP fallback | ESP broadcasts `minihead.local` via mDNS |

**No React, no Vue, no build pipeline.** Files are uploaded as-is to ESP LittleFS.

---

## File Structure

```
src/
├── index.html          ← single app shell; all screens rendered by JS
├── manifest.json       ← PWA: name, icons, display:standalone, theme_color
├── sw.js               ← service worker: pre-cache all app files on install
├── icons/
│   ├── icon-192.png    ← PWA icon (192×192)
│   └── icon-512.png    ← PWA icon (512×512)  ← use assets from PNG/ folder
├── css/
│   ├── app.css         ← CSS variables, reset, typography, dark/light themes
│   ├── layout.css      ← bottom nav, screen container, responsive grid
│   └── controls.css    ← faders (touch), color swatches, head cards, cue list
└── js/
    ├── main.js         ← boot sequence, router, global state
    ├── api.js          ← all fetch() calls to ESP — single source of truth
    ├── connect.js      ← connection/discovery screen
    ├── controls.js     ← global color + pan/tilt faders
    ├── heads.js        ← head list, individual control, identify
    ├── cues.js         ← cue list, create/edit/delete/fire
    └── sequencer.js    ← sequencer start/stop/status
```

---

## Screens

### 1 — Connect
Shown on first open or when ESP unreachable.
- Auto-tries `http://minihead.local/api/status`
- Shows spinner during attempt (timeout 3s)
- If fail: text input for manual IP (e.g. `192.168.1.42`)
- Saves last successful IP to `localStorage`
- On success: navigates to Controls screen

### 2 — Controls (home)
Global control of all heads simultaneously.
- RGBW color pickers (4 vertical sliders, touch-draggable)
- Pan fader (horizontal, 0–270°)
- Tilt fader (horizontal, 0–270°)
- Buttons: Blackout, Rainbow, Demo
- Animation speed slider (0.1×–3.0×)
- Targets: "All" selected by default; tap individual heads to narrow scope

### 3 — Heads
List of all discovered heads.
- Each card: name, IP, fixID, role (Leader/Follower), status color
- Tap card → expand to individual control (same faders as Controls, scoped to this head)
- Long-press → Identify (flashes LED white)
- Edit: set name, set fixture ID

### 4 — Cues
- Scrollable list of saved cues
- Tap → fire cue immediately
- Long-press → edit / delete
- "+" button → create new cue (captures current state)
- Drag handle → reorder

### 5 — Sequencer
- Select cues and order for sequence
- Set interval (ms)
- Loop toggle
- Start / Stop button
- Shows currently active step

---

## Connection Flow

```
App starts
    │
    ├─ Read localStorage: savedIP
    │
    ├─ try fetch(savedIP + '/api/status', {timeout: 3s})
    │       │
    │       ├─ OK → connected, go to Controls
    │       │
    │       └─ fail → try 'http://minihead.local/api/status'
    │                   │
    │                   ├─ OK → save IP, go to Controls
    │                   │
    │                   └─ fail → show Connect screen (manual input)
    │
    └─ Background watchdog: poll /api/status every 3s
           On fail × 2: show "Disconnected" banner
           On recover: hide banner, refresh head list
```

---

## Touch Controls — Fader Design

Faders are the core interaction. They must work reliably on touch:

- Use `touchstart`, `touchmove`, `touchend` events (not mouse events)
- `touch-action: none` on fader element to prevent scroll interference
- Minimum touch target: 44px height per Apple HIG / Google Material
- Visual: tall vertical sliders for RGBW, wide horizontal for Pan/Tilt
- Show numeric value while dragging
- Send command on `touchend` (not on every `touchmove` — reduces UDP traffic)
- Debounce: don't send if value unchanged

---

## Offline Behavior

Service worker caches all app files on first install. Subsequent opens load from cache instantly.

API calls (fetch to ESP) are never cached — they always need a live ESP.

When ESP is unreachable:
- App opens from cache (shows UI)
- "Disconnected" banner appears at top
- Controls are disabled (grayed out)
- Auto-retries every 5s

---

## Firmware Dependency

The ESP firmware needs one addition to serve LittleFS files. Add this to `wifi_control.h` **before** the existing `onNotFound` handler:

```cpp
// Serve PWA files from LittleFS
server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
```

This replaces the current single-file HTML approach for the root route. The existing API routes (`/api/*`) are registered first and take priority — static file serving only handles unmatched routes.

Also needed in `config.h` / `core.h` setup: `LittleFS.begin(true)` — already done in `storage_begin()`.

See the [MiniHead firmware repo](https://github.com/Nomisimo/MiniHead) for the full firmware context.

---

## PWA Manifest (key fields)

```json
{
  "name": "MiniHead",
  "short_name": "MiniHead",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#ff6b00",
  "orientation": "portrait",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## iOS vs Android Notes

**iOS (Safari only for PWA install)**
- "Share → Add to Home Screen" — Chrome on iOS does NOT support this
- Service worker storage: ~50MB
- No install banner — user must find the Share button
- Consider a first-launch nudge: "For best experience: Share → Add to Home Screen"

**Android (Chrome)**
- Auto "Install App" prompt appears after 2 visits
- Full service worker support
- Background sync available (not needed here)
