// heads.js — head list with individual control, identify, fixID and manual add
import { api } from './api.js';
import { createVerticalFader, createHorizontalFader } from './fader.js';

let _expanded   = null;
let _manualIPs  = [];
let _list       = null;

try { _manualIPs = JSON.parse(localStorage.getItem('minihead_manual_ips') || '[]'); } catch (_) {}

export function initHeads() {
  const screen = document.getElementById('screen-heads');
  screen.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = '<h2 class="screen-title">Heads</h2>';

  const btnAdd = document.createElement('button');
  btnAdd.className = 'btn';
  btnAdd.textContent = '+ Add IP';
  btnAdd.addEventListener('click', async () => {
    const ip = prompt('Head IP address (e.g. 192.168.1.42):');
    if (!ip) return;
    const clean = ip.trim().replace(/^https?:\/\//, '');
    if (!_manualIPs.includes(clean)) {
      _manualIPs.push(clean);
      try { localStorage.setItem('minihead_manual_ips', JSON.stringify(_manualIPs)); } catch (_) {}
    }
    _render(_list);
  });
  header.appendChild(btnAdd);

  _list = document.createElement('div');
  _list.id = 'heads-list';

  screen.append(header, _list);
  _render(_list);
  setInterval(() => _render(_list), 8000);

  window.addEventListener('screen-shown', e => {
    if (e.detail.screen === 'heads') _render(_list);
  });
}

async function _render(list) {
  let heads = [];
  try {
    const data = await api.heads();
    heads = Array.isArray(data) ? data : (data.heads || []);
  } catch (_) {
    if (_manualIPs.length === 0) {
      list.innerHTML = '<p class="empty-state">Could not reach ESP.</p>';
      return;
    }
  }

  // Merge manually-added IPs not already in the API response
  const knownIPs = new Set(heads.map(h => h.ip));
  for (const ip of _manualIPs) {
    if (!knownIPs.has(ip)) {
      heads.push({ ip, mac: ip, name: ip, online: false, _manual: true });
    }
  }

  if (heads.length === 0) {
    list.innerHTML = '<p class="empty-state">No heads discovered yet.</p>';
    return;
  }

  list.innerHTML = '';
  heads.forEach(h => list.appendChild(_makeCard(h)));
}

function _makeCard(h) {
  const mac      = h.mac || h.ip;
  const isLeader = h.role === 'LEADER';
  const isOnline = h.online !== false;

  const card = document.createElement('div');
  card.className = 'head-card';

  const hdr = document.createElement('div');
  hdr.className = 'head-card-header';

  const dot = document.createElement('div');
  dot.className = 'head-status-dot ' + (isOnline ? 'online' : 'offline');

  const info = document.createElement('div');
  info.className = 'head-card-info';
  info.innerHTML = `<div class="head-name">${h.name || mac}</div>
    <div class="head-meta">${h.ip || mac} · Fix ${h.fixID ?? '–'} · ${h._manual ? 'Manual' : isLeader ? 'Leader' : 'Follower'}</div>`;

  const btnID = document.createElement('button');
  btnID.className = 'btn btn--icon';
  btnID.title = 'Identify';
  btnID.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>`;
  btnID.addEventListener('click', e => {
    e.stopPropagation();
    api.identify(mac).catch(console.warn);
    setTimeout(() => api.identifyOff(mac).catch(console.warn), 1500);
  });

  hdr.append(dot, info, btnID);
  card.appendChild(hdr);

  hdr.addEventListener('click', () => {
    const existing = card.querySelector('.head-card-expand');
    if (_expanded === mac) {
      _expanded = null;
      if (existing) existing.remove();
    } else {
      _expanded = mac;
      document.querySelectorAll('.head-card-expand').forEach(el => el.remove());
      card.appendChild(_makeExpand(h, mac));
    }
  });

  if (_expanded === mac) card.appendChild(_makeExpand(h, mac));

  // Remove button for manually-added heads
  if (h._manual) {
    const btnRemove = document.createElement('button');
    btnRemove.className = 'btn btn--icon btn--danger';
    btnRemove.title = 'Remove';
    btnRemove.innerHTML = '×';
    btnRemove.style.cssText = 'font-size:18px;line-height:1';
    btnRemove.addEventListener('click', e => {
      e.stopPropagation();
      _manualIPs = _manualIPs.filter(ip => ip !== h.ip);
      try { localStorage.setItem('minihead_manual_ips', JSON.stringify(_manualIPs)); } catch (_) {}
      _render(_list);
    });
    hdr.insertBefore(btnRemove, btnID);
  }

  return card;
}

function _makeExpand(h, mac) {
  const expand = document.createElement('div');
  expand.className = 'head-card-expand';

  // Name editor
  const nameRow = document.createElement('div');
  nameRow.className = 'row';
  nameRow.style.cssText = 'padding:10px 0 4px;gap:8px;';

  const nameInput = document.createElement('input');
  nameInput.type        = 'text';
  nameInput.placeholder = 'Name';
  nameInput.value       = h.name || '';

  const nameBtn = document.createElement('button');
  nameBtn.className   = 'btn';
  nameBtn.textContent = 'Save';
  nameBtn.style.flexShrink = '0';
  nameBtn.addEventListener('click', () => {
    api.setName(mac, nameInput.value.trim()).catch(console.warn);
  });

  nameRow.append(nameInput, nameBtn);

  // Fix ID editor
  const fixRow = document.createElement('div');
  fixRow.className = 'row';
  fixRow.style.cssText = 'padding:4px 0;gap:8px;';

  const fixLabel = document.createElement('label');
  fixLabel.textContent = 'Fix ID';
  fixLabel.style.cssText = 'flex:1;font-size:14px;color:var(--text-dim)';

  const fixInput = document.createElement('input');
  fixInput.type        = 'number';
  fixInput.placeholder = '1';
  fixInput.value       = h.fixID || '';
  fixInput.min         = '1';
  fixInput.max         = '255';
  fixInput.style.width = '72px';

  const fixBtn = document.createElement('button');
  fixBtn.className   = 'btn';
  fixBtn.textContent = 'Set';
  fixBtn.style.flexShrink = '0';
  fixBtn.addEventListener('click', () => {
    const id = parseInt(fixInput.value);
    if (id > 0) api.setFixID(mac, id).catch(console.warn);
  });

  fixRow.append(fixLabel, fixInput, fixBtn);

  // Individual RGBW faders
  const colorLabel = document.createElement('div');
  colorLabel.className = 'section-label';
  colorLabel.style.padding = '10px 0 4px';
  colorLabel.textContent = 'Color';

  const faderGroup = document.createElement('div');
  faderGroup.className = 'fader-group';
  faderGroup.style.cssText = 'padding:0;height:160px;';

  let sendPending = null;
  const sendColor = () => {
    clearTimeout(sendPending);
    sendPending = setTimeout(() => {
      const r = fR.getValue(), g = fG.getValue();
      const b = fB.getValue(), w = fW.getValue();
      api.send(`R:${r},G:${g},B:${b},W:${w}`, [mac]).catch(console.warn);
    }, 30);
  };

  const fR = createVerticalFader({ label: 'R', value: 0, dataAttr: 'R', onChange: sendColor });
  const fG = createVerticalFader({ label: 'G', value: 0, dataAttr: 'G', onChange: sendColor });
  const fB = createVerticalFader({ label: 'B', value: 0, dataAttr: 'B', onChange: sendColor });
  const fW = createVerticalFader({ label: 'W', value: 0, dataAttr: 'W', onChange: sendColor });

  faderGroup.append(fR, fG, fB, fW);

  const fPan  = createHorizontalFader({
    label: 'Pan',  value: 135, min: 0, max: 270, unit: '°',
    onChange: v => api.send(`PAN:${v}`, [mac]).catch(console.warn)
  });
  const fTilt = createHorizontalFader({
    label: 'Tilt', value: 135, min: 0, max: 270, unit: '°',
    onChange: v => api.send(`TILT:${v}`, [mac]).catch(console.warn)
  });

  expand.append(nameRow, fixRow, colorLabel, faderGroup, fPan, fTilt);
  return expand;
}
