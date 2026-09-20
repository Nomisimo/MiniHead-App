# Architecture

## Deployment Model

The app is installed via a temporary PC web server (not served from the ESP). The Service Worker caches all app files on first visit. After that, the app opens from cache with no server running — it connects directly to the ESP over local HTTP.

```
Install (one-time):
  python3 -m http.server 8080  →  Safari caches all files  →  Add to Home Screen

Runtime:
  SW Cache (phone storage)
       ↓  loads app shell instantly
  Browser JS
       ↓  HTTP fetch() on local WiFi
  ESP Leader (:80)
       ↓  UDP (internal)
  All other ESP heads
```

**Why not GitHub Pages / Netlify?**
Browsers block `fetch('http://local-device')` from HTTPS pages (Mixed Content policy). All free static hosts force HTTPS. There's no workaround in standard browsers.

**Why not serve from ESP LittleFS?**
The PC server approach is simpler: faster iteration (no Arduino IDE upload), no LittleFS size pressure, app updates without touching the firmware.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | Vanilla HTML / CSS / ES6 modules | No build step; files deployed as-is |
| Styling | CSS custom properties, dark/light theme | No framework dependency |
| Offline | Service Worker + Cache API (v6) | Standard PWA; works on iOS 11.3+, Android Chrome |
| Install | Web App Manifest + Add to Home Screen | Standalone mode, no browser chrome |
| Screen routing | `hidden` attribute + custom event | No framework; each screen is a `<div>` |
| Data refresh | `screen-shown` CustomEvent + polling | Modules refresh when their tab is opened |
| Discovery | mDNS (`minihead.local`) → saved IP → manual | Firmware broadcasts mDNS; app persists last IP |

No React, no Vue, no build pipeline.

---

## File Structure

```
src/
├── index.html          ← app shell; all 5 screens as <div>s, nav built inline
├── manifest.json       ← PWA: name, display:standalone, theme_color, orientation
├── sw.js               ← Service Worker: cache-first v6, immediate skipWaiting
├── css/
│   ├── app.css         ← CSS variables, reset, dark/light themes, base components
│   ├── layout.css      ← bottom nav, screen container, connect screen
│   └── controls.css    ← faders, chips, head cards, cue list, ArtNet styles
└── js/
    ├── main.js         ← boot, router (showScreen + screen-shown event), watchdog
    ├── api.js          ← all fetch() calls to ESP — single source of truth
    ├── connect.js      ← connection screen: auto-connect, manual IP input
    ├── controls.js     ← RGBW+pan/tilt faders, Store Cue, target chip selection
    ├── heads.js        ← head list, individual control, identify, fixID, manual add
    ├── cues.js         ← cue list: fire, create, delete
    ├── sequencer.js    ← sequencer: cue selection, interval, start/stop
    ├── artnet.js       ← ArtNet status, per-head patch editor, auto-patch tool
    └── fader.js        ← reusable touch faders (vertical RGBW + horizontal Pan/Tilt)
```

---

## Screens

### Connect (always visible until connected)
- Auto-tries saved IP → `http://minihead.local` → fails to manual input
- Saves successful IP to `localStorage`
- "Add to Home Screen" hint shown on iOS Safari

### Controls (tab 1 — home after connect)
- Module-level fader refs exported via `getControlState()`
- Target chips: "All" (`targets: ['*']`) or per-head MAC chips
- **Store as Cue**: captures fader values, converts MAC targets → fixIDs, POSTs to `/api/cues`
- Heads list refreshed every 5s for chip labels

### Heads (tab 2)
- Fetches `/api/heads` every 8s and on `screen-shown` event
- Manually-added IPs stored in `localStorage` under `minihead_manual_ips`; merged into list
- Expand panel: name edit, fixID edit (both saved to ESP)
- Identify flashes LED on/off via `/api/heads/{mac}/identify {on:true}` then auto-off at 1500ms

### Cues (tab 3)
- Refreshes on `screen-shown` event (fixes empty list bug when loaded before connection)
- `fixTargets: [0]` = all heads; otherwise array of integer fixIDs

### Sequencer (tab 4)
- Refreshes cue list on `screen-shown` event
- Start/Stop toggle; polls `/api/sequencer/status` every 1s when running

### ArtNet (tab 5)
- Fetches `/api/artnet/status` from leader for live status
- Fetches `/api/artnet/patch` **directly from each head's IP** for per-head patch data
- Saves patches directly to each head's IP via `POST http://{head.ip}/api/artnet/patch`
- Auto-patch: walks heads sorted by fixID, assigns sequential DMX addresses (8ch footprint default)

---

## Connection Flow

```
App starts (boot())
    │
    ├─ Show Connect screen
    ├─ initControls / initHeads / initCues / initSequencer / initArtnet
    │    (modules register screen-shown listener; data calls fail silently — not connected yet)
    │
    └─ await autoConnect()
           │
           ├─ try localStorage savedIP + GET /api/status
           │       OK → setBaseUrl, go to Controls
           │
           ├─ try http://minihead.local + GET /api/status
           │       OK → save IP, go to Controls
           │
           └─ fail → show Connect screen (manual input)

On tab switch (showScreen):
    │
    └─ dispatch CustomEvent('screen-shown', { detail: { screen: name } })
           └─ each module refreshes its data for that screen

Background watchdog (every 3s):
    ├─ GET /api/status
    ├─ OK  → hide disconnected banner
    └─ fail × 2 → show disconnected banner
```

---

## Service Worker (sw.js)

**Cache version:** `minihead-v6`

**Install strategy:**
- `self.skipWaiting()` called immediately at the start of the install event — old SW stops handling requests as soon as the new one installs, not after caching completes
- All app files pre-cached individually with per-file `.catch(() => {})` — a missing file never kills the install
- `clients.claim()` in activate takes over all open pages immediately

**Fetch strategy:**
- `/api/*` → network only; return `{"error":"offline"}` (503) if unreachable
- All other requests → cache-first; on miss fetch from network and update cache
- Navigate failures (offline) → serve cached `/index.html` as fallback
- Non-navigate failures (offline scripts/styles) → throw (clean network error, not a bad response body that would confuse module loader)

**Registration:** `{ updateViaCache: 'none' }` ensures the browser always checks for a new SW on navigation.

---

## Touch Controls — Fader Design

- `touchstart` / `touchmove` / `touchend` events with `e.preventDefault()` to block scroll
- `touch-action: none` on the fader element
- Mouse events as fallback for desktop/dev
- Commands sent on `touchend` to avoid flooding the ESP; 30ms debounce on individual head faders
- Minimum 44px touch target height (Apple HIG)

---

## Command Format

The ESP command parser accepts comma-separated `KEY:VALUE` pairs:
```
R:255,G:0,B:0,W:0,PAN:135,TILT:90
```
Any subset of keys is valid. Keys are case-insensitive. This is the format used by both `/api/send` and internally by the cue system.

---

## Cue Targets vs. Send Targets

The app uses **two different targeting systems**:

| Context | Format | Example |
|---|---|---|
| `POST /api/send` → `targets` | Array of MAC strings or `["*"]` | `["AA:BB:CC:DD:EE:FF"]` |
| Cue `fixTargets` | Array of integer fixIDs or `[0]` for all | `[1, 3]` |

When "Store as Cue" is pressed, the app converts MAC targets → fixIDs using the current heads list. Targets without a known fixID default to `[0]` (all).

---

## iOS vs Android Notes

**iOS (Safari only)**
- "Share → Add to Home Screen" required for PWA install; Chrome on iOS cannot do this
- SW cache quota: ~50MB as a browser page; more as a Home Screen app
- `window.onerror` with empty filename/lineno = iOS-internal error (share sheet snapshot) — not our code; filtered out

**Android (Chrome)**
- Auto "Install App" prompt after 2 qualifying visits
- Full SW support including background sync (not used here)
- HTTP PWA install requires the `unsafely-treat-insecure-origin-as-secure` flag
