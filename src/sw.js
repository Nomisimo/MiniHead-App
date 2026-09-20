// Service Worker — MiniHead PWA
// Cache-first for app shell. API calls always go to network.

const CACHE = 'minihead-v6';

const APP_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/css/layout.css',
  '/css/controls.css',
  '/js/main.js',
  '/js/api.js',
  '/js/connect.js',
  '/js/controls.js',
  '/js/fader.js',
  '/js/heads.js',
  '/js/cues.js',
  '/js/sequencer.js',
  '/js/artnet.js',
];

// Take over immediately so the old SW stops handling requests ASAP.
// Background-cache all app files after claiming.
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(
        APP_FILES.map(url =>
          fetch(url, { cache: 'no-cache' })
            .then(res => { if (res.ok) return cache.put(url, res); })
            .catch(() => {})
        )
      )
    )
  );
});

// Delete old caches, claim all clients immediately.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   /api/*   → network only, return 503 JSON on failure
//   all else → cache first; on network miss re-cache; offline: index.html for navigate
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = request.url;

  if (url.includes('/api/')) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response('{"error":"offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      } catch (_) {
        if (request.mode === 'navigate') {
          const fallback = await cache.match('/index.html') || await cache.match('/');
          return fallback || new Response('<h1>Offline</h1>', {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        // For non-navigate (scripts, styles): propagate the error so the
        // browser reports a clean network failure rather than a bad response.
        throw _;
      }
    })
  );
});
