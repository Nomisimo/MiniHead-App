# ESP HTTP API Reference

Base URL: `http://<esp-ip>` (e.g. `http://minihead.local` or `http://192.168.1.42`)

All POST/PUT bodies are JSON (`Content-Type: application/json`).
All responses are JSON unless noted.
CORS headers are set on all responses (`Access-Control-Allow-Origin: *`).

---

## Status & Info

### `GET /api/status`
Current node status.
```json
{
  "connected": true,
  "port": "WiFi",
  "ip": "192.168.1.42",
  "apMode": false,
  "apPasswordSet": false,
  "rainbowActive": false,
  "demoActive": false,
  "animSpeed": 1.0
}
```

### `GET /api/version`
```json
{ "version": "4.2" }
```

### `GET /api/ports`
```json
[{ "port": "WiFi", "description": "ESP32 @ 192.168.1.42" }]
```

---

## Heads (Peers)

### `GET /api/heads`
All known heads including this node. Role is `"LEADER"` or `"FOLLOWER"`.
```json
[
  {
    "mac": "AA:BB:CC:DD:EE:FF",
    "ip": "192.168.1.42",
    "name": "Head 1",
    "fixID": 1,
    "role": "LEADER",
    "mode": "UDP",
    "priority": 100,
    "active": true
  }
]
```

### `GET /api/fixtures`
Fixture→head mapping.

### `POST /api/heads/:mac/identify`
Flashes the head's LED white briefly so you can find it physically. No body.
```json
{ "status": "ok" }
```

### `POST /api/heads/:mac/name`
```json
{ "name": "Stage Left" }
```

### `POST /api/heads/:mac/fixid`
```json
{ "fixID": 3 }
```

---

## Send Commands

### `POST /api/send`
Send a control command to specific targets or all heads.

`targets` is an array of MAC addresses. Use `"*"` for all heads. Omit `targets` (or empty array) to target all.

```json
{
  "command": "R:255,G:128,B:0,W:0,PAN:90,TILT:45",
  "targets": ["*"]
}
```

**Command format:** comma-separated `KEY:VALUE` pairs.

| Key | Range | Description |
|-----|-------|-------------|
| `R` | 0–255 | Red |
| `G` | 0–255 | Green |
| `B` | 0–255 | Blue |
| `W` | 0–255 | White |
| `PAN` | 0–270 | Pan angle in degrees |
| `TILT` | 0–270 | Tilt angle in degrees |

Keys are case-insensitive. Any subset is valid — e.g. `"PAN:90,TILT:45"` moves without changing color.

Special commands (sent as the full `command` value):
- `"BLACKOUT"` — all LEDs off, stops animations
- `"RAINBOW:1"` / `"RAINBOW:0"` — toggle rainbow
- `"DEMO:1"` / `"DEMO:0"` — toggle demo mode
- `"SPEED:1.5"` — animation speed (0.1–3.0)

### `POST /api/blackout`
Shortcut — blackout all heads. No body.

### `POST /api/rainbow`
```json
{ "on": true }
```

### `POST /api/demo`
```json
{ "on": true }
```

### `POST /api/animation/speed`
```json
{ "speed": 1.5 }
```

---

## Cues

### `GET /api/cues`
```json
[
  {
    "id": 1234567890,
    "name": "Blue wash",
    "r": 0, "g": 0, "b": 255, "w": 0,
    "pan": 90, "tilt": 45,
    "fixTargets": [0]
  }
]
```
`fixTargets: [0]` means all heads. Otherwise array of fixture IDs.

### `POST /api/cues`
Create cue.
```json
{
  "name": "Blue wash",
  "r": 0, "g": 0, "b": 255, "w": 0,
  "pan": 90, "tilt": 45,
  "fixTargets": [0]
}
```
Returns `{ "status": "ok", "cue": { ...full cue object... } }`

### `POST /api/cues/:id`
Fire cue — sends it to all its target heads immediately. No body.
```json
{ "status": "ok", "command": "fired", "response": "OK" }
```

### `PUT /api/cues/:id`
Update a cue's fixture targets.
```json
{ "fixTargets": [1, 2] }
```

### `DELETE /api/cues/:id`
Delete cue.

### `PUT /api/cues/reorder`
Reorder cues. `order` is the full list of IDs in the new order.
```json
{ "order": [3, 1, 2] }
```

---

## Sequencer

### `POST /api/sequencer/start`
```json
{
  "cue_ids": [1, 2, 3],
  "interval_ms": 2000,
  "loop": true
}
```

### `POST /api/sequencer/stop`
No body.

### `GET /api/sequencer/status`
```json
{ "running": true }
```

---

## Config

### `POST /api/config/name`
Set this node's display name.
```json
{ "name": "Head 1" }
```

### `POST /api/config/fixid`
Set this node's fixture ID.
```json
{ "fixID": 1 }
```

---

## Log Config

### `GET /api/logconfig`
```json
{
  "artnetFrames": false,
  "artnetEvents": true,
  "discoveryBeacons": false,
  "discoveryEvents": true,
  "udpVerbose": true
}
```

### `POST /api/logconfig`
Update log config. Any subset of fields.

---

## WiFi / AP

### `POST /api/connect`
Trigger WiFi reconnect.

### `POST /api/disconnect`

### `POST /api/ap/password`
Set AP hotspot password (min 8 chars, or empty string to remove password).
```json
{ "password": "mypassword" }
```

---

## Notes

- Leader election: only the node with role `"LEADER"` has active API handlers. Follower nodes redirect browsers to the leader.
- Multi-head commands: send to `"*"` — the leader forwards via UDP to all followers internally.
- No SSE endpoint currently. Poll `/api/status` every 3s and `/api/heads` every 5s for live updates.
- All values for R/G/B/W are 0–255. PAN/TILT are 0–270 degrees (servo range of the MiniHead hardware).
