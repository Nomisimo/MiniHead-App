// Service Worker — MiniHead PWA
// Cache-first for app shell. API calls never cached.

const CACHE = 'minihead-v3';

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

// Cache each file individually — a missing icon must not fail the whole install.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(APP_FILES.map(url =>
        cache.add(url).catch(err => console.warn('[SW] cache miss:', url, err))
      ))
    )
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
//   navigate    → always serve cached index.html so app opens after server is gone
//   rest        → cache first, fallback to network
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE)
        .then(cache => cache.match('/index.html'))
        .then(r => r || fetch(e.request))
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE)
      .then(cache => cache.match(e.request))
      .then(cached => cached || fetch(e.request))
  );
});
