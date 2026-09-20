# MiniHead App

Mobile PWA for controlling MiniHead ESP32 moving lights from your phone — no internet required after install.

## How it works

The app is installed **once** via a temporary web server on your PC. After that it lives in your phone's browser cache and talks directly to the ESP over your local WiFi. No server stays running. No internet needed.

```
Install (one-time):
  PC serves src/ on port 8080
        ↓
  Safari opens it → Service Worker caches all files → Add to Home Screen
        ↓
  Server can be stopped — app runs offline from cache

After install:
  Home Screen icon → loads from SW cache
        ↓  HTTP fetch()
  ESP32 Leader (HTTP server :80)
        ↓  UDP  (internal, invisible to app)
  All other ESP32 heads
```

---

## Install on iPhone

1. Connect your phone and PC to the same WiFi as the ESP
2. In this repo's `src/` folder, start the server:
   ```bash
   cd src/
   python3 -m http.server 8080
   ```
3. Find your PC's local IP — on macOS:
   ```bash
   ipconfig getifaddr en0
   ```
4. On iPhone, open **Safari** and go to `http://<your-pc-ip>:8080`
5. Wait ~5 seconds (Service Worker installs and caches all files)
6. Tap **Share → Add to Home Screen**
7. Stop the server — the app now works offline from the home screen icon

> **Only Safari on iOS can install PWAs.** Chrome on iOS does not support "Add to Home Screen" for PWAs.

## Install on Android

Same steps 1–5, then tap the **Install App** banner Chrome shows automatically.

If Chrome blocks the HTTP origin, enable it via:
`chrome://flags/#unsafely-treat-insecure-origin-as-secure` → add `http://<your-pc-ip>:8080`

## Update the app

Run the server again, open the URL in Safari, wait 5 seconds for the new version to be cached, reload once. The update takes effect on the next open.

---

## Screens

### Control
Global control for all heads at once (or a selected subset):
- **RGBW faders** — four vertical touch sliders
- **Pan / Tilt** — horizontal touch sliders (0–270°)
- **Blackout / Rainbow / Demo** — one-tap actions
- **Animation Speed** — 0.1× to 3.0×
- **Target chips** — tap to select "All" or individual heads
- **Store as Cue** — saves current fader state + targets as a named cue

### Heads
All discovered heads on the network:
- Status dot (online/offline), name, IP, Fix ID, Leader/Follower role
- Tap a card → expand for individual RGBW + Pan/Tilt faders scoped to that head
- **Set Name** — rename the head (saved on the ESP)
- **Set Fix ID** — assign an integer fixture ID (used by the cue system and ArtNet patch)
- **Identify ⚡** — flashes the head's LED white so you can find it physically
- **+ Add IP** — manually add a head by IP if auto-discovery doesn't find it

### Cues
Saved lighting snapshots (color + position + targets), stored on the ESP:
- Tap **▶** to fire a cue immediately
- **+ New** — create a blank cue
- **Store as Cue** button in Controls captures current state as a cue
- Delete button per cue

### Sequencer
Step through cues automatically on the ESP's timer:
- Select which cues to include (checkboxes)
- Set **interval** (ms between steps) and **Loop** toggle
- Start / Stop

### ArtNet
Configure DMX-over-network (Art-Net plugin must be enabled in `config.h`):
- **Status** — shows whether Art-Net is receiving data, and the live RGBW/Pan/Tilt channel values
- **Patch per head** — set Universe and Start Address for each head (saved directly to each ESP)
- **Auto-Patch** — auto-assign sequential addresses to all heads sorted by Fix ID, based on a configurable start address

---

## Connecting to the ESP

On first open the app tries (in order):
1. Last saved IP from `localStorage`
2. `http://minihead.local` (mDNS)
3. Manual IP input if both fail

A watchdog polls `/api/status` every 3 seconds. A "Disconnected" banner appears if the ESP goes unreachable and hides automatically when it comes back.

---

## Offline behavior

All app files are cached by the Service Worker on install. The app opens instantly even with no network.

ESP API calls (`/api/*`) are never cached — controls silently fail when the ESP is unreachable. The "Disconnected" banner shows within ~6 seconds.

**Cache lifetime:** iOS evicts Service Worker caches after roughly 7 days without use under storage pressure. As a Home Screen app it gets more storage budget. Regular use keeps the cache alive indefinitely.

---

## Development

```bash
cd src/
python3 -m http.server 8080
# Open http://localhost:8080 in a browser
# Set the ESP IP manually in the Connect screen
```

The Service Worker is inactive on `localhost` over HTTP — that's fine for development. All JS is plain ES6 modules; no bundler or build step needed.

---

## Docs

- [Architecture](docs/architecture.md) — technical decisions, file structure, connection flow
- [ESP API Reference](docs/esp-api.md) — all HTTP endpoints the app uses
- [Deployment](docs/deployment.md) — detailed install and update instructions

## Related

- [MiniHead Firmware + PC App](https://github.com/Nomisimo/MiniHead) — ESP32 firmware and Python desktop app

---

*Vibe coded with [Claude Code](https://claude.ai/code)*
