// main.js — boot, router, watchdog
// Imports all screen modules and wires up navigation.

import { autoConnect, api } from './api.js';
import { initConnect }      from './connect.js';
import { initControls }     from './controls.js';
import { initHeads }        from './heads.js';
import { initCues }         from './cues.js';
import { initSequencer }    from './sequencer.js';

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.warn);
}

// ── Router ────────────────────────────────────────────────────────
const screens = ['controls', 'heads', 'cues', 'sequencer'];
let _activeScreen = 'controls';

export function showScreen(name) {
  screens.forEach(s => {
    document.getElementById(`screen-${s}`).hidden = (s !== name);
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });
  _activeScreen = name;
}

// ── Boot ──────────────────────────────────────────────────────────
async function boot() {
  const screenConnect = document.getElementById('screen-connect');
  const app           = document.getElementById('app');

  // Show connect screen while discovering
  screenConnect.hidden = false;
  app.hidden = true;

  // Wire up connect screen
  initConnect({
    onConnected: () => {
      screenConnect.hidden = true;
      app.hidden = false;
      showScreen('controls');
      startWatchdog();
    }
  });

  // Wire up bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });

  // Init all screens (they render their content lazily)
  initControls();
  initHeads();
  initCues();
  initSequencer();

  // Try auto-connect
  try {
    await autoConnect();
    screenConnect.hidden = true;
    app.hidden = false;
    showScreen('controls');
    startWatchdog();
  } catch (_) {
    // connect.js handles the UI — show manual input
    document.getElementById('connect-status').textContent = 'MiniHead not found on this network.';
    document.querySelector('.connect-manual').hidden = false;
  }
}

// ── Connection watchdog ───────────────────────────────────────────
let _watchdogFailCount = 0;
const FAIL_THRESHOLD   = 2;

function startWatchdog() {
  setInterval(async () => {
    try {
      await api.status();
      if (_watchdogFailCount >= FAIL_THRESHOLD) {
        document.getElementById('banner-disconnected').hidden = true;
      }
      _watchdogFailCount = 0;
    } catch (_) {
      _watchdogFailCount++;
      if (_watchdogFailCount >= FAIL_THRESHOLD) {
        document.getElementById('banner-disconnected').hidden = false;
      }
    }
  }, 3000);
}

boot();
