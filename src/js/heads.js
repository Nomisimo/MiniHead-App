// heads.js — head list with individual control and identify
import { api } from './api.js';
import { createVerticalFader, createHorizontalFader } from './fader.js';

let _expanded = null; // mac of currently expanded head

export function initHeads() {
  const screen = document.getElementById('screen-heads');
  screen.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = '<h2 class="screen-title">Heads</h2>';

  const list = document.createElement('div');
  list.id = 'heads-list';

  screen.append(header, list);
  _render(list);
  setInterval(() => _render(list), 5000);
}

async function _render(list) {
  let heads = [];
  try {
    const data = await api.heads();
    heads = data.heads || data || [];
  } catch (_) {
    list.innerHTML = '<p class="empty-state">Could not reach ESP.</p>';
    return;
  }

  if (heads.length === 0) {
    list.innerHTML = '<p class="empty-state">No heads discovered yet.</p>';
    return;
  }

  // Preserve expanded state across re-renders
  list.innerHTML = '';
  heads.forEach(h => list.appendChild(_makeCard(h)));
}

function _makeCard(h) {
  const mac      = h.mac || h.ip;
  const isLeader = h.role === 'leader';
  const isOnline = h.online !== false;

  const card = document.createElement('div');
  card.className = 'head-card';

  // Header row
  const hdr = document.createElement('div');
  hdr.className = 'head-card-header';

  const dot = document.createElement('div');
  dot.className = 'head-status-dot ' + (isOnline ? 'online' : 'offline');

  const info = document.createElement('div');
  info.className = 'head-card-info';
  info.innerHTML = `<div class="head-name">${h.name || mac}</div>
    <div class="head-meta">${h.ip || mac} · Fix ${h.fixID ?? '–'} · ${isLeader ? 'Leader' : 'Follower'}</div>`;

  const btnID = document.createElement('button');
  btnID.className = 'btn btn--icon';
  btnID.title = 'Identify';
  btnID.textContent = '⚡';
  btnID.addEventListener('click', e => {
    e.stopPropagation();
    api.identify(mac).catch(console.warn);
  });

  hdr.append(dot, info, btnID);
  card.appendChild(hdr);

  // Toggle expand on header click
  hdr.addEventListener('click', () => {
    const expand = card.querySelector('.head-card-expand');
    if (_expanded === mac) {
      _expanded = null;
      expand.remove();
    } else {
      _expanded = mac;
      // Remove any other open expand
      document.querySelectorAll('.head-card-expand').forEach(el => el.remove());
      card.appendChild(_makeExpand(h, mac));
    }
  });

  // Restore expand if it was open
  if (_expanded === mac) {
    card.appendChild(_makeExpand(h, mac));
  }

  return card;
}

function _makeExpand(h, mac) {
  const expand = document.createElement('div');
  expand.className = 'head-card-expand';

  // Name editor
  const nameRow = document.createElement('div');
  nameRow.className = 'row';
  nameRow.style.cssText = 'padding: 10px 0 4px; gap: 8px;';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Name';
  nameInput.value = h.name || '';

  const nameBtn = document.createElement('button');
  nameBtn.className = 'btn';
  nameBtn.textContent = 'Save';
  nameBtn.style.flexShrink = '0';
  nameBtn.addEventListener('click', () => {
    api.setName(mac, nameInput.value.trim()).catch(console.warn);
  });

  nameRow.append(nameInput, nameBtn);

  // Individual faders
  const colorLabel = document.createElement('div');
  colorLabel.className = 'section-label';
  colorLabel.style.padding = '10px 0 4px';
  colorLabel.textContent = 'Color';

  const faderGroup = document.createElement('div');
  faderGroup.className = 'fader-group';
  faderGroup.style.cssText = 'padding: 0; height: 160px;';

  let sendPending = null;
  const sendColor = () => {
    clearTimeout(sendPending);
    sendPending = setTimeout(() => {
      const r = fR.getValue(), g = fG.getValue();
      const b = fB.getValue(), w = fW.getValue();
      api.send(`COLOR:${r},${g},${b},${w}`, [mac]).catch(console.warn);
    }, 30);
  };

  const fR = createVerticalFader({ label: 'R', value: 0, dataAttr: 'R', onChange: sendColor });
  const fG = createVerticalFader({ label: 'G', value: 0, dataAttr: 'G', onChange: sendColor });
  const fB = createVerticalFader({ label: 'B', value: 0, dataAttr: 'B', onChange: sendColor });
  const fW = createVerticalFader({ label: 'W', value: 0, dataAttr: 'W', onChange: sendColor });

  faderGroup.append(fR, fG, fB, fW);

  const fPan  = createHorizontalFader({
    label: 'Pan', value: 135, min: 0, max: 270, unit: '°',
    onChange: v => api.send(`PAN:${v}`, [mac]).catch(console.warn)
  });
  const fTilt = createHorizontalFader({
    label: 'Tilt', value: 135, min: 0, max: 270, unit: '°',
    onChange: v => api.send(`TILT:${v}`, [mac]).catch(console.warn)
  });

  expand.append(nameRow, colorLabel, faderGroup, fPan, fTilt);
  return expand;
}
