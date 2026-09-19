// ESP HTTP API client — single source of truth for all network calls.
// Import and use in all other modules: import { api } from './api.js'

// Set MOCK = true to develop UI without a real ESP.
const MOCK = false;

// --- Connection state ---

let _baseUrl = '';  // e.g. 'http://192.168.1.42' or 'http://minihead.local'

export function setBaseUrl(url) {
  _baseUrl = url.replace(/\/$/, '');
}

export function getBaseUrl() {
  return _baseUrl;
}

// Core fetch wrapper — throws on network error or non-2xx response.
async function _fetch(method, path, body) {
  const opts = {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  };
  const res = await fetch(_baseUrl + path, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  return res.json();
}

// --- API methods ---

export const api = {

  // Status & discovery
  status:   ()      => _fetch('GET',  '/api/status'),
  version:  ()      => _fetch('GET',  '/api/version'),

  // Heads
  heads:    ()      => _fetch('GET',  '/api/heads'),
  fixtures: ()      => _fetch('GET',  '/api/fixtures'),
  identify:    (mac) => _fetch('POST', `/api/heads/${mac}/identify`, { on: true }),
  identifyOff: (mac) => _fetch('POST', `/api/heads/${mac}/identify`, { on: false }),
  setName:  (mac, name)   => _fetch('POST', `/api/heads/${mac}/name`,  { name }),
  setFixID: (mac, fixID)  => _fetch('POST', `/api/heads/${mac}/fixid`, { fixID }),

  // Commands
  send: (command, targets = ['*']) =>
    _fetch('POST', '/api/send', { command, targets }),

  blackout:   ()        => _fetch('POST', '/api/blackout'),
  rainbow:    (on)      => _fetch('POST', '/api/rainbow',          { on }),
  demo:       (on)      => _fetch('POST', '/api/demo',             { on }),
  animSpeed:  (speed)   => _fetch('POST', '/api/animation/speed',  { speed }),

  // Cues
  getCues:    ()        => _fetch('GET',    '/api/cues'),
  createCue:  (cue)     => _fetch('POST',   '/api/cues', cue),
  fireCue:    (id)      => _fetch('POST',   `/api/cues/${id}/fire`),
  updateCue:  (id, data)=> _fetch('PUT',    `/api/cues/${id}/update`, data),
  deleteCue:  (id)      => _fetch('DELETE', `/api/cues/${id}`),
  reorderCues:(order)   => _fetch('PUT',    '/api/cues/reorder', { order }),

  // Sequencer
  seqStart:   (cueIds, intervalMs, loop) =>
    _fetch('POST', '/api/sequencer/start', { cue_ids: cueIds, interval_ms: intervalMs, loop }),
  seqStop:    ()        => _fetch('POST', '/api/sequencer/stop'),
  seqStatus:  ()        => _fetch('GET',  '/api/sequencer/status'),
};

// --- Connection helpers ---

const STORAGE_KEY = 'minihead_ip';
const MDNS_HOST   = 'http://minihead.local';

// Try to connect: saved IP → mDNS → fail
export async function autoConnect() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    setBaseUrl(saved);
    try { await api.status(); return saved; } catch (_) {}
  }
  setBaseUrl(MDNS_HOST);
  try {
    await api.status();
    localStorage.setItem(STORAGE_KEY, MDNS_HOST);
    return MDNS_HOST;
  } catch (_) {}
  throw new Error('ESP not found');
}

// Connect to a specific IP (manual entry)
export async function connectTo(ip) {
  const url = ip.startsWith('http') ? ip : `http://${ip}`;
  setBaseUrl(url);
  await api.status();  // throws if unreachable
  localStorage.setItem(STORAGE_KEY, url);
  return url;
}

export function forgetConnection() {
  localStorage.removeItem(STORAGE_KEY);
  _baseUrl = '';
}
