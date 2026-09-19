// connect.js — connection/discovery screen
import { connectTo } from './api.js';

export function initConnect({ onConnected }) {
  const btn    = document.getElementById('connect-btn');
  const input  = document.getElementById('connect-ip');
  const status = document.getElementById('connect-status');
  const hint   = document.getElementById('connect-ios-hint');

  // Show iOS install hint in Safari
  const isIOS    = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
  if (isIOS && isSafari) {
    hint.hidden = false;
  }

  btn.addEventListener('click', async () => {
    const ip = input.value.trim();
    if (!ip) return;
    status.textContent = 'Connecting…';
    btn.disabled = true;
    try {
      await connectTo(ip);
      onConnected();
    } catch (_) {
      status.textContent = `Could not reach "${ip}". Check IP and try again.`;
      btn.disabled = false;
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn.click();
  });
}
