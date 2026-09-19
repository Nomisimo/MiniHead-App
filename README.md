# MiniHead App

Mobile PWA to control MiniHead ESP32 moving lights from any phone — no PC, no server, no internet required after install.

## What it does

- Controls all MiniHead fixtures on the local network
- Runs as an installed app on iOS and Android (Add to Home Screen)
- Works fully offline once installed — reconnects to ESP automatically when on the same WiFi
- Served directly from the ESP32 Leader's LittleFS filesystem

## How it works

```
Online (one-time, installs the app)
    ↓
Installed PWA on phone (cached offline)
    ↓  HTTP fetch()
ESP32 Leader  (HTTP server :80, served from LittleFS)
    ↓  UDP  (internal, invisible to app)
All other ESP32 heads
```

The phone talks only HTTP to the Leader ESP. The ESP handles all UDP discovery and command forwarding internally. No Flask server, no PC needed.

## Docs

- [Architecture](docs/architecture.md) — technical decisions, stack, screens, connection flow
- [ESP API Reference](docs/esp-api.md) — all HTTP endpoints the app uses
- [Deployment](docs/deployment.md) — how to get app files onto the ESP

## Related

- [MiniHead Firmware + PC App](https://github.com/Nomisimo/MiniHead) — ESP32 firmware and Python desktop app
