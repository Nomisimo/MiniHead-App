# Deployment — Installing and Updating the App

The app is served from a temporary PC web server for the initial install. After that it lives in the phone's Service Worker cache and no server is needed.

---

## Initial Install

### 1 — Start the temporary server

From the repo root on your PC:

```bash
cd src/
python3 -m http.server 8080
```

This serves `src/` at `http://<your-pc-ip>:8080`. The server only needs to run during the install and future updates.

### 2 — Find your PC's local IP

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows (PowerShell)
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi).IPAddress
```

### 3 — Open in Safari on iPhone

> Chrome on iOS cannot install PWAs. Use Safari only.

Go to `http://<your-pc-ip>:8080`. The page loads and the Service Worker begins caching all app files in the background. This takes about 5 seconds.

### 4 — Add to Home Screen

Wait 5 seconds, then: **Share → Add to Home Screen → Add**

### 5 — Stop the server

The app is now fully cached. Stop the server with `Ctrl+C`. The home screen icon opens the app directly from cache, no server required.

---

## Android

Same steps, but in Chrome. Chrome shows an "Install App" banner automatically. If Chrome blocks the HTTP origin:

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add `http://<your-pc-ip>:8080`
3. Relaunch Chrome

---

## Updating the App

When you pull new changes from the repo:

1. Start the server again:
   ```bash
   cd src/
   python3 -m http.server 8080
   ```
2. Open `http://<your-pc-ip>:8080` in Safari on iPhone
3. Wait 5 seconds (new Service Worker installs and caches updated files)
4. Pull down to reload once — the new version is now active
5. Stop the server

The update flow is automatic: the browser detects the changed `sw.js`, installs the new Service Worker, which immediately takes over and caches all the new files.

---

## If the App Breaks After Deleting Website Data

Deleting website data in iOS Settings → Safari removes the Service Worker and its cache. The home screen icon still exists but the app has nothing to load. To reinstall, simply run the server and open the URL again (steps 1–5 above).

---

## Service Worker Cache Lifetime

iOS evicts Service Worker caches after roughly 7 days without use when storage is under pressure. As a Home Screen PWA (installed via "Add to Home Screen") it receives a larger storage budget and keeps the cache longer. Regular use — even just opening the app once a week — keeps the cache alive indefinitely.

---

## File Size Budget

The app has no significant size constraints — it runs from browser cache, not from ESP LittleFS. All JS and CSS are plain text and total well under 100KB. No minification needed.

---

## Development Workflow

```bash
cd src/
python3 -m http.server 8080
```

Open `http://localhost:8080`. On `localhost` over HTTP the Service Worker is not active — the browser loads files directly from the server. This is intentional and makes development faster (no cache invalidation needed). Set the ESP IP manually in the Connect screen.

Changes to JS/CSS/HTML are visible on the next browser reload, no build step required.

---

## Previous Approach (Deprecated)

An earlier version of this app was designed to be served from the ESP's LittleFS filesystem. That approach was abandoned because:

- LittleFS upload is a slow workflow (requires Arduino IDE + plugin, full reupload for any change)
- The 1.5MB LittleFS partition is tight once cues/config JSON files accumulate
- The PC server approach is simpler and keeps the app decoupled from the firmware

The `src/` files **can** still be served from LittleFS if desired (the firmware's `serveStatic` handler supports it), but this is no longer the recommended workflow.
