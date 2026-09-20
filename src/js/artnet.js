// artnet.js — ArtNet status + per-head patch management
import { api } from './api.js';

const DMX_FOOTPRINT = 8; // channels per head (R G B W Pan Tilt Speed Dim)

export function initArtnet() {
  const screen = document.getElementById('screen-artnet');
  screen.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = '<h2 class="screen-title">ArtNet</h2>';

  // Status card
  const statusCard = document.createElement('div');
  statusCard.className = 'card';
  statusCard.id = 'artnet-status-card';
  statusCard.innerHTML = '<p style="color:var(--text-dim);font-size:13px">Loading…</p>';

  // Patch list label
  const patchLabel = document.createElement('div');
  patchLabel.className = 'section-label';
  patchLabel.textContent = 'Patch';

  // Per-head patch list
  const patchList = document.createElement('div');
  patchList.id = 'artnet-patch-list';

  // Bulk auto-patch card
  const bulkLabel = document.createElement('div');
  bulkLabel.className = 'section-label';
  bulkLabel.textContent = 'Auto-Patch';

  const bulkCard = _makeBulkCard();

  screen.append(header, statusCard, patchLabel, patchList, bulkLabel, bulkCard);

  _refresh(statusCard, patchList);

  window.addEventListener('screen-shown', e => {
    if (e.detail.screen === 'artnet') _refresh(statusCard, patchList);
  });
}

async function _refresh(statusCard, patchList) {
  // ArtNet status
  try {
    const s = await api.artnetStatus();
    _renderStatus(statusCard, s);
  } catch (_) {
    statusCard.innerHTML = '<p style="color:var(--text-dim);font-size:13px">ArtNet plugin not active or not reachable.</p>';
  }

  // Per-head patches (fetch from each head's IP directly)
  try {
    const headsData = await api.heads();
    const heads = Array.isArray(headsData) ? headsData : (headsData.heads || []);
    _renderPatchList(patchList, heads);
  } catch (_) {
    patchList.innerHTML = '<p class="empty-state">No heads found.</p>';
  }
}

function _renderStatus(card, s) {
  const active = s.active;
  card.innerHTML = `
    <div class="row" style="margin-bottom:8px">
      <span style="font-size:13px;font-weight:600">Status</span>
      <span class="badge ${active ? 'badge--good' : 'badge--dim'}">${active ? 'Active' : 'Inactive'}</span>
    </div>
    ${active ? `
    <div class="artnet-vals">
      <div class="artnet-val"><span style="color:#e53e3e">R</span> ${s.r ?? '–'}</div>
      <div class="artnet-val"><span style="color:#38a169">G</span> ${s.g ?? '–'}</div>
      <div class="artnet-val"><span style="color:#4299e1">B</span> ${s.b ?? '–'}</div>
      <div class="artnet-val"><span style="color:#ecc94b">W</span> ${s.w ?? '–'}</div>
      <div class="artnet-val">Pan ${s.pan ?? '–'}</div>
      <div class="artnet-val">Tilt ${s.tilt ?? '–'}</div>
    </div>` : ''}`;
}

function _renderPatchList(list, heads) {
  list.innerHTML = '';
  if (heads.length === 0) {
    list.innerHTML = '<p class="empty-state">No heads discovered.</p>';
    return;
  }
  heads.forEach(h => list.appendChild(_makePatchRow(h)));
}

function _makePatchRow(h) {
  const row = document.createElement('div');
  row.className = 'artnet-patch-row card';
  row.style.marginBottom = '8px';

  const nameRow = document.createElement('div');
  nameRow.className = 'row';
  nameRow.style.marginBottom = '8px';
  nameRow.innerHTML = `
    <span style="font-weight:600;font-size:14px">${h.name || h.ip}</span>
    <span style="font-size:12px;color:var(--text-dim)">Fix ${h.fixID ?? '–'}</span>`;

  const fields = document.createElement('div');
  fields.className = 'row';
  fields.style.gap = '8px';

  const univInput = document.createElement('input');
  univInput.type        = 'number';
  univInput.placeholder = 'Universe';
  univInput.min         = '0';
  univInput.max         = '32767';
  univInput.style.flex  = '1';

  const addrInput = document.createElement('input');
  addrInput.type        = 'number';
  addrInput.placeholder = 'Start Addr';
  addrInput.min         = '1';
  addrInput.max         = '512';
  addrInput.style.flex  = '1';

  const saveBtn = document.createElement('button');
  saveBtn.className   = 'btn';
  saveBtn.textContent = 'Save';
  saveBtn.style.flexShrink = '0';

  // Fetch existing patch for this head directly
  _fetchHeadPatch(h.ip).then(patch => {
    if (patch) {
      univInput.value = patch.universe ?? '';
      addrInput.value = patch.startAddr ?? '';
    }
  });

  saveBtn.addEventListener('click', async () => {
    const universe  = parseInt(univInput.value);
    const startAddr = parseInt(addrInput.value);
    if (isNaN(universe) || isNaN(startAddr)) return;
    try {
      await _saveHeadPatch(h.ip, universe, startAddr);
      saveBtn.textContent = '✓';
      setTimeout(() => { saveBtn.textContent = 'Save'; }, 1500);
    } catch (e) {
      alert('Patch save failed: ' + e.message);
    }
  });

  fields.append(univInput, addrInput, saveBtn);

  const univ = document.createElement('div');
  univ.style.cssText = 'font-size:11px;color:var(--text-dim);margin-top:2px';
  univInput.addEventListener('input', _updateUnivHint.bind(null, univInput, addrInput, univ));
  addrInput.addEventListener('input',  _updateUnivHint.bind(null, univInput, addrInput, univ));

  row.append(nameRow, fields, univ);
  return row;
}

function _updateUnivHint(univInput, addrInput, hint) {
  const u = parseInt(univInput.value);
  const a = parseInt(addrInput.value);
  if (!isNaN(u) && !isNaN(a)) {
    hint.textContent = `Universe ${u} · Ch ${a}–${a + DMX_FOOTPRINT - 1}`;
  }
}

async function _fetchHeadPatch(ip) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(`http://${ip}/api/artnet/patch`, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function _saveHeadPatch(ip, universe, startAddr) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(`http://${ip}/api/artnet/patch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ universe, startAddr }),
      signal:  ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

function _makeBulkCard() {
  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <p style="font-size:13px;color:var(--text-dim);margin:0 0 10px">
      Auto-assign addresses to all heads in order of Fix ID.
    </p>
    <div class="row" style="gap:8px;margin-bottom:8px">
      <div style="flex:1">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">Universe</div>
        <input id="bulk-universe"  type="number" min="0" max="32767" value="0" style="width:100%">
      </div>
      <div style="flex:1">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">Start Addr</div>
        <input id="bulk-start"    type="number" min="1" max="512"   value="1" style="width:100%">
      </div>
      <div style="flex:1">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">First Fix ID</div>
        <input id="bulk-firstfix" type="number" min="1" max="255"   value="1" style="width:100%">
      </div>
    </div>`;

  const applyBtn = document.createElement('button');
  applyBtn.className   = 'btn btn--primary btn--full';
  applyBtn.textContent = 'Apply Auto-Patch to All Heads';

  applyBtn.addEventListener('click', async () => {
    const universe  = parseInt(document.getElementById('bulk-universe').value)  ?? 0;
    const startAddr = parseInt(document.getElementById('bulk-start').value)     ?? 1;
    const firstFix  = parseInt(document.getElementById('bulk-firstfix').value)  ?? 1;

    let heads = [];
    try {
      const d = await api.heads();
      heads = Array.isArray(d) ? d : (d.heads || []);
    } catch (_) { alert('Could not fetch heads.'); return; }

    if (heads.length === 0) { alert('No heads found.'); return; }

    applyBtn.disabled = true;
    applyBtn.textContent = 'Patching…';

    const sorted = [...heads].sort((a, b) => (a.fixID || 99) - (b.fixID || 99));
    let errors = 0;
    for (let i = 0; i < sorted.length; i++) {
      const h    = sorted[i];
      let   addr = startAddr + i * DMX_FOOTPRINT;
      let   uni  = universe;
      while (addr + DMX_FOOTPRINT - 1 > 512) { uni++; addr -= 512; }
      try {
        await _saveHeadPatch(h.ip, uni, addr);
      } catch (_) { errors++; }
    }

    applyBtn.disabled = false;
    applyBtn.textContent = errors ? `Done (${errors} failed)` : '✓ Patched';
    setTimeout(() => { applyBtn.textContent = 'Apply Auto-Patch to All Heads'; }, 2500);
  });

  card.appendChild(applyBtn);
  return card;
}
