// fader.js — reusable vertical and horizontal touch faders

/**
 * Create a vertical fader (RGBW).
 * @param {object} opts
 *   label, value (0-255), color, onChange(value)
 * @returns HTMLElement
 */
export function createVerticalFader({ label, value = 0, dataAttr, onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'fader-wrap';
  if (dataAttr) wrap.dataset.ch = dataAttr;

  const labelEl = document.createElement('div');
  labelEl.className = 'fader-label';
  labelEl.textContent = label;

  const track = document.createElement('div');
  track.className = 'fader-track';

  const fill = document.createElement('div');
  fill.className = 'fader-fill';

  const thumb = document.createElement('div');
  thumb.className = 'fader-thumb';

  const valueEl = document.createElement('div');
  valueEl.className = 'fader-value';

  track.append(fill, thumb);
  wrap.append(labelEl, track, valueEl);

  let _val = value;

  function update(v) {
    _val = Math.max(0, Math.min(255, Math.round(v)));
    const pct = (_val / 255) * 100;
    fill.style.height  = pct + '%';
    thumb.style.bottom = pct + '%';
    valueEl.textContent = _val;
  }

  update(value);

  function getValFromTouch(e) {
    const rect = track.getBoundingClientRect();
    const y    = e.touches[0].clientY;
    const frac = 1 - (y - rect.top) / rect.height;
    return frac * 255;
  }

  track.addEventListener('touchstart', e => {
    e.preventDefault();
    update(getValFromTouch(e));
  }, { passive: false });

  track.addEventListener('touchmove', e => {
    e.preventDefault();
    update(getValFromTouch(e));
  }, { passive: false });

  track.addEventListener('touchend', e => {
    e.preventDefault();
    onChange(_val);
  }, { passive: false });

  // Mouse fallback for desktop testing
  let mouseDown = false;
  track.addEventListener('mousedown', e => {
    mouseDown = true;
    const rect = track.getBoundingClientRect();
    update((1 - (e.clientY - rect.top) / rect.height) * 255);
  });
  window.addEventListener('mousemove', e => {
    if (!mouseDown) return;
    const rect = track.getBoundingClientRect();
    update((1 - (e.clientY - rect.top) / rect.height) * 255);
  });
  window.addEventListener('mouseup', () => {
    if (mouseDown) { mouseDown = false; onChange(_val); }
  });

  wrap.getValue = () => _val;
  wrap.setValue = v => update(v);

  return wrap;
}

/**
 * Create a horizontal fader (Pan / Tilt).
 */
export function createHorizontalFader({ label, value = 0, min = 0, max = 270, unit = '°', onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'hfader-wrap';

  const header = document.createElement('div');
  header.className = 'hfader-header';

  const labelEl = document.createElement('div');
  labelEl.className = 'hfader-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('div');
  valueEl.className = 'hfader-value';

  header.append(labelEl, valueEl);

  const track = document.createElement('div');
  track.className = 'hfader-track';

  const fill = document.createElement('div');
  fill.className = 'hfader-fill';

  const thumb = document.createElement('div');
  thumb.className = 'hfader-thumb';

  track.append(fill, thumb);
  wrap.append(header, track);

  let _val = value;

  function update(v) {
    _val = Math.max(min, Math.min(max, Math.round(v)));
    const pct = ((_val - min) / (max - min)) * 100;
    fill.style.width  = pct + '%';
    thumb.style.left  = pct + '%';
    valueEl.textContent = _val + unit;
  }

  update(value);

  function getValFromTouch(e) {
    const rect = track.getBoundingClientRect();
    const x    = e.touches[0].clientX;
    const frac = (x - rect.left) / rect.width;
    return min + frac * (max - min);
  }

  track.addEventListener('touchstart', e => {
    e.preventDefault();
    update(getValFromTouch(e));
  }, { passive: false });

  track.addEventListener('touchmove', e => {
    e.preventDefault();
    update(getValFromTouch(e));
  }, { passive: false });

  track.addEventListener('touchend', e => {
    e.preventDefault();
    onChange(_val);
  }, { passive: false });

  let mouseDown = false;
  track.addEventListener('mousedown', e => {
    mouseDown = true;
    const rect = track.getBoundingClientRect();
    update(min + ((e.clientX - rect.left) / rect.width) * (max - min));
  });
  window.addEventListener('mousemove', e => {
    if (!mouseDown) return;
    const rect = track.getBoundingClientRect();
    update(min + ((e.clientX - rect.left) / rect.width) * (max - min));
  });
  window.addEventListener('mouseup', () => {
    if (mouseDown) { mouseDown = false; onChange(_val); }
  });

  wrap.getValue = () => _val;
  wrap.setValue = v => update(v);

  return wrap;
}
