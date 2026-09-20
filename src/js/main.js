// main.js — boot, router, watchdog

import { autoConnect, api } from './api.js';
import { initConnect }      from './connect.js';
import { initControls }     from './controls.js';
import { initHeads }        from './heads.js';
import { initCues }         from './cues.js';
import { initSequencer }    from './sequencer.js';

// ── Error overlay — shows uncaught JS errors on device (debug) ────
window.addEventListener('error', e => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c00;color:#fff;padding:12px;font-size:13px;z-index:9999;white-space:pre-wrap;word-break:break-all';
  el.textContent = `JS ERROR: ${e.message}\n${e.filename}:${e.lineno}`;
  document.body.appendChild(el);
});
window.addEventListener('unhandledrejection', e => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#900;color:#fff;padding:12px;font-size:13px;z-index:9999;white-space:pre-wrap;word-break:break-all';
  el.textContent = `UNHANDLED: ${e.reason}`;
  document.body.appendChild(el);
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.warn);
}

// ── Router ────────────────────────────────────────────────────────
const screens = ['controls', 'heads', 'cues', 'sequencer'];

export function showScreen(name) {
  screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    el.hidden = (s !== name);
    el.style.overflowY = (s === name) ? 'auto' : 'hidden';
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });
}

// ── Boot ──────────────────────────────────────────────────────────
async function boot() {
  const screenConnect = document.getElementById('screen-connect');
  const app           = document.getElementById('app');

  screenConnect.hidden = false;
  app.hidden = true;

  initConnect({
    onConnected: () => {
      screenConnect.hidden = true;
      app.hidden = false;
      showScreen('controls');
      startWatchdog();
    }
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });

  initControls();
  initHeads();
  initCues();
  initSequencer();

  try {
    await autoConnect();
    screenConnect.hidden = true;
    app.hidden = false;
    showScreen('controls');
    startWatchdog();
  } catch (_) {
    document.getElementById('connect-status').textContent = 'MiniHead not found — enter IP below.';
    document.querySelector('.connect-manual').hidden = false;
  }
}

// ── Watchdog ──────────────────────────────────────────────────────
let _failCount = 0;

function startWatchdog() {
  setInterval(async () => {
    try {
      await api.status();
      if (_failCount >= 2) document.getElementById('banner-disconnected').hidden = true;
      _failCount = 0;
    } catch (_) {
      if (++_failCount >= 2) document.getElementById('banner-disconnected').hidden = false;
    }
  }, 3000);
}

boot();
