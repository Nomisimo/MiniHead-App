// controls.js — global color + pan/tilt + actions
import { api } from './api.js';
import { createVerticalFader, createHorizontalFader } from './fader.js';

let _targets = ['*']; // '*' = all
let _heads   = [];

export function initControls() {
  const screen = document.getElementById('screen-controls');
  screen.innerHTML = '';

  // Header
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

  // RGBW section
  const rgbwLabel = document.createElement('div');
  rgbwLabel.className = 'section-label';
  rgbwLabel.textContent = 'Color';

  const faderGroup = document.createElement('div');
  faderGroup.className = 'fader-group';

  const faderR = createVerticalFader({ label: 'R', value: 0, dataAttr: 'R', onChange: v => _sendColor() });
  const faderG = createVerticalFader({ label: 'G', value: 0, dataAttr: 'G', onChange: v => _sendColor() });
  const faderB = createVerticalFader({ label: 'B', value: 0, dataAttr: 'B', onChange: v => _sendColor() });
  const faderW = createVerticalFader({ label: 'W', value: 0, dataAttr: 'W', onChange: v => _sendColor() });

  faderGroup.append(faderR, faderG, faderB, faderW);

  function _sendColor() {
    const r = faderR.getValue(), g = faderG.getValue();
    const b = faderB.getValue(), w = faderW.getValue();
    api.send(`R:${r},G:${g},B:${b},W:${w}`, _targets).catch(console.warn);
  }

  // Pan / Tilt
  const ptLabel = document.createElement('div');
  ptLabel.className = 'section-label';
  ptLabel.textContent = 'Position';

  const faderPan  = createHorizontalFader({
    label: 'Pan',  value: 135, min: 0, max: 270, unit: '°',
    onChange: v => api.send(`PAN:${v}`, _targets).catch(console.warn)
  });
  const faderTilt = createHorizontalFader({
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
    faderR.setValue(0); faderG.setValue(0);
    faderB.setValue(0); faderW.setValue(0);
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

  // Speed
  const speedLabel = document.createElement('div');
  speedLabel.className = 'section-label';
  speedLabel.textContent = 'Animation Speed';

  const speedRow = document.createElement('div');
  speedRow.className = 'speed-row';

  const speedInput = document.createElement('input');
  speedInput.type = 'range';
  speedInput.min  = '0.1';
  speedInput.max  = '3.0';
  speedInput.step = '0.1';
  speedInput.value = '1.0';

  const speedVal = document.createElement('span');
  speedVal.className = 'speed-val';
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
    ptLabel, faderPan, faderTilt,
    actLabel, actionRow,
    speedLabel, speedRow
  );

  // Refresh heads periodically for target chips
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
  allChip.addEventListener('click', () => {
    _targets = ['*'];
    _renderChips(chips);
  });
  chips.appendChild(allChip);

  _heads.forEach(h => {
    const chip = document.createElement('button');
    const mac  = h.mac || h.ip;
    chip.className = 'chip' + (_targets.includes(mac) ? ' selected' : '');
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
