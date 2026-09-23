// Generates src/sw.js using Workbox.
// Workbox runtime is inlined — no CDN dependency, works fully offline.
//
// Run: node build.js
// Or:  npm run build

const { generateSW } = require('workbox-build');

generateSW({
  globDirectory: 'src',
  globPatterns: [
    '*.html',
    '*.json',
    'css/*.css',
    'js/*.js',
    'icons/*.png',
  ],
  globIgnores: ['sw.js'],
  swDest: 'src/sw.js',

  // Bundle Workbox runtime directly into sw.js — no CDN import needed.
  // The SW works fully offline without any external dependency.
  inlineWorkboxRuntime: true,
  sourcemap: false,

  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,

  // SPA: serve cached /index.html for any navigate request that misses
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/api\//],

  runtimeCaching: [
    {
      // ESP API calls — always go to network, never cache
      // Matches /api/ on any origin (covers direct-to-follower calls too)
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
  ],
}).then(({ count, size }) => {
  console.log(`SW built: ${count} files precached (${(size / 1024).toFixed(1)} KB total)`);
}).catch(err => {
  console.error('SW build failed:', err);
  process.exit(1);
});
