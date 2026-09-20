// Service Worker — MiniHead PWA
// Cache-first for app shell. API calls always go to network.

const CACHE = 'minihead-v4';

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
];

// Pre-cache: fetch each file individually and store manually.
// cache.add() rejects on ANY error — instead, fetch + put so a
// 404 icon never kills the whole install.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(
        APP_FILES.map(url =>
          fetch(url, { cache: 'no-cache' })
            .then(res => { if (res.ok) return cache.put(url, res); })
            .catch(() => {})
        )
      )
    ).then(() => self.skipWaiting())
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
//   /api/*   → network only, return empty 503 on failure
//   all else → cache first; fallback to network; navigate falls back to index.html
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = request.url;

  // Never cache API calls
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

  // Cache-first for all app shell files
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(cached => {
        if (cached) return cached;

        // Not in cache — try network and update cache
        return fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => {
          // Network failed — for navigation, serve index.html as fallback
          if (request.mode === 'navigate') {
            return cache.match('/index.html')
              || cache.match('/')
              || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
          }
          return new Response('', { status: 503 });
        });
      })
    )
  );
});
