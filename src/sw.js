// Service Worker — MiniHead PWA
// Caches all app files on install so the UI loads offline.
// API calls (/api/*) are never cached — always need live ESP.

const CACHE = 'minihead-v2';

const APP_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/css/app.css',
  '/css/layout.css',
  '/css/controls.css',
  '/js/main.js',
  '/js/api.js',
  '/js/connect.js',
  '/js/fader.js',
  '/js/controls.js',
  '/js/heads.js',
  '/js/cues.js',
  '/js/sequencer.js',
];

// Pre-cache all app files on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_FILES))
  );
  self.skipWaiting();
});

// Remove old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   /api/*      → network only (never cache)
//   navigate    → always serve cached index.html (works after server is gone)
//   rest        → cache first, fallback to network
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(r => r || fetch(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
