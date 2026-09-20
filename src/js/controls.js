// controls.js — global color + pan/tilt + actions
import { api } from './api.js';
import { createVerticalFader, createHorizontalFader } from './fader.js';

let _targets = ['*'];
let _heads   = [];

// Module-level fader refs — exposed via getControlState()
let _faderR = null, _faderG = null, _faderB = null, _faderW = null;
let _faderPan = null, _faderTilt = null;

export function getControlState() {
  if (!_faderR) return null;
  return {
    r: _faderR.getValue(), g: _faderG.getValue(),
    b: _faderB.getValue(), w: _faderW.getValue(),
    pan: _faderPan.getValue(), tilt: _faderTilt.getValue(),
    targets: [..._targets],
  };
}

export function initControls() {
  const screen = document.getElementById('screen-controls');
  screen.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = '<h2 class="screen-title">Control</h2>';

  // Target chips
  const chipsLabel = document.createElement('div');
  chipsLabel.className = 'section-label';
  chipsLabel.textContent = 'Targets';

  const chips = document.createElement('div');
  chips.className = 'target-chips';
  chips.id = 'ctrl-chips';
  _renderChips(chips);

  // RGBW faders
  const rgbwLabel = document.createElement('div');
  rgbwLabel.className = 'section-label';
  rgbwLabel.textContent = 'Color';

  const faderGroup = document.createElement('div');
  faderGroup.className = 'fader-group';

  _faderR = createVerticalFader({ label: 'R', value: 0, dataAttr: 'R', onChange: () => _sendColor() });
  _faderG = createVerticalFader({ label: 'G', value: 0, dataAttr: 'G', onChange: () => _sendColor() });
  _faderB = createVerticalFader({ label: 'B', value: 0, dataAttr: 'B', onChange: () => _sendColor() });
  _faderW = createVerticalFader({ label: 'W', value: 0, dataAttr: 'W', onChange: () => _sendColor() });

  faderGroup.append(_faderR, _faderG, _faderB, _faderW);

  function _sendColor() {
    const r = _faderR.getValue(), g = _faderG.getValue();
    const b = _faderB.getValue(), w = _faderW.getValue();
    api.send(`R:${r},G:${g},B:${b},W:${w}`, _targets).catch(console.warn);
  }

  // Pan / Tilt
  const ptLabel = document.createElement('div');
  ptLabel.className = 'section-label';
  ptLabel.textContent = 'Position';

  _faderPan  = createHorizontalFader({
    label: 'Pan',  value: 135, min: 0, max: 270, unit: '°',
    onChange: v => api.send(`PAN:${v}`, _targets).catch(console.warn)
  });
  _faderTilt = createHorizontalFader({
    label: 'Tilt', value: 135, min: 0, max: 270, unit: '°',
    onChange: v => api.send(`TILT:${v}`, _targets).catch(console.warn)
  });

  // Actions
  const actLabel = document.createElement('div');
  actLabel.className = 'section-label';
  actLabel.textContent = 'Actions';

  const actionRow = document.createElement('div');
  actionRow.className = 'action-row';

  let rainbowOn = false, demoOn = false;

  const btnBlackout = document.createElement('button');
  btnBlackout.className = 'btn';
  btnBlackout.textContent = 'Blackout';
  btnBlackout.addEventListener('click', () => {
    api.blackout().catch(console.warn);
    _faderR.setValue(0); _faderG.setValue(0);
    _faderB.setValue(0); _faderW.setValue(0);
  });

  const btnRainbow = document.createElement('button');
  btnRainbow.className = 'btn';
  btnRainbow.textContent = 'Rainbow';
  btnRainbow.addEventListener('click', () => {
    rainbowOn = !rainbowOn;
    btnRainbow.classList.toggle('btn--active', rainbowOn);
    api.rainbow(rainbowOn).catch(console.warn);
  });

  const btnDemo = document.createElement('button');
  btnDemo.className = 'btn';
  btnDemo.textContent = 'Demo';
  btnDemo.addEventListener('click', () => {
    demoOn = !demoOn;
    btnDemo.classList.toggle('btn--active', demoOn);
    api.demo(demoOn).catch(console.warn);
  });

  actionRow.append(btnBlackout, btnRainbow, btnDemo);

  // Store Cue
  const btnStore = document.createElement('button');
  btnStore.className = 'btn btn--full store-cue-btn';
  btnStore.textContent = '+ Store as Cue';
  btnStore.addEventListener('click', async () => {
    const name = prompt('Cue name:');
    if (name === null) return;

    const r = _faderR.getValue(), g = _faderG.getValue();
    const b = _faderB.getValue(), w = _faderW.getValue();
    const pan = _faderPan.getValue(), tilt = _faderTilt.getValue();

    // Convert MAC targets → fixIDs (cue system uses integer fixIDs)
    let fixTargets = [0]; // 0 = all
    if (!_targets.includes('*') && _targets.length > 0) {
      const ids = _targets
        .map(mac => { const h = _heads.find(h => (h.mac || h.ip) === mac); return h ? (h.fixID || 0) : 0; })
        .filter(id => id > 0);
      if (ids.length > 0) fixTargets = ids;
    }

    try {
      await api.createCue({ name: name.trim() || 'Cue', r, g, b, w, pan, tilt, fixTargets });
      btnStore.textContent = '✓ Stored';
      setTimeout(() => { btnStore.textContent = '+ Store as Cue'; }, 1500);
    } catch (e) {
      alert('Could not store cue: ' + e.message);
    }
  });

  // Speed
  const speedLabel = document.createElement('div');
  speedLabel.className = 'section-label';
  speedLabel.textContent = 'Animation Speed';

  const speedRow = document.createElement('div');
  speedRow.className = 'speed-row';

  const speedInput = document.createElement('input');
  speedInput.type  = 'range';
  speedInput.min   = '0.1';
  speedInput.max   = '3.0';
  speedInput.step  = '0.1';
  speedInput.value = '1.0';

  const speedVal = document.createElement('span');
  speedVal.className   = 'speed-val';
  speedVal.textContent = '1.0×';

  speedInput.addEventListener('input', () => {
    speedVal.textContent = parseFloat(speedInput.value).toFixed(1) + '×';
  });
  speedInput.addEventListener('change', () => {
    api.animSpeed(parseFloat(speedInput.value)).catch(console.warn);
  });

  speedRow.append(speedInput, speedVal);

  screen.append(
    header,
    chipsLabel, chips,
    rgbwLabel, faderGroup,
    ptLabel, _faderPan, _faderTilt,
    actLabel, actionRow,
    btnStore,
    speedLabel, speedRow
  );

  _refreshHeads(chips);
  setInterval(() => _refreshHeads(chips), 5000);
}

async function _refreshHeads(chips) {
  try {
    const data = await api.heads();
    _heads = data.heads || data || [];
    _renderChips(chips);
  } catch (_) {}
}

function _renderChips(chips) {
  chips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'chip' + (_targets.includes('*') ? ' selected' : '');
  allChip.textContent = 'All';
  allChip.addEventListener('click', () => { _targets = ['*']; _renderChips(chips); });
  chips.appendChild(allChip);

  _heads.forEach(h => {
    const chip = document.createElement('button');
    const mac  = h.mac || h.ip;
    chip.className   = 'chip' + (_targets.includes(mac) ? ' selected' : '');
    chip.textContent = h.name || mac;
    chip.addEventListener('click', () => {
      if (_targets.includes('*')) _targets = [];
      const idx = _targets.indexOf(mac);
      if (idx >= 0) _targets.splice(idx, 1);
      else _targets.push(mac);
      if (_targets.length === 0) _targets = ['*'];
      _renderChips(chips);
    });
    chips.appendChild(chip);
  });
}
