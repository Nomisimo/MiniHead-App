// sequencer.js — cue sequencer: select, interval, loop, start/stop
import { api } from './api.js';

let _pollTimer = null;

export function initSequencer() {
  const screen = document.getElementById('screen-sequencer');
  screen.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = '<h2 class="screen-title">Sequencer</h2>';

  // Settings card
  const card = document.createElement('div');
  card.className = 'card';

  // Interval
  const intRow = document.createElement('div');
  intRow.className = 'row';
  intRow.style.marginBottom = '12px';
  intRow.innerHTML = `
    <label style="flex:1;font-size:14px;color:var(--text-dim)">Interval (ms)</label>
    <input id="seq-interval" type="number" min="100" max="60000" value="2000"
           style="width:100px">`;

  // Loop toggle
  const loopRow = document.createElement('div');
  loopRow.className = 'row';
  loopRow.style.marginBottom = '12px';
  loopRow.innerHTML = `
    <label style="flex:1;font-size:14px;color:var(--text-dim)">Loop</label>
    <input id="seq-loop" type="checkbox" checked style="width:20px;height:20px;accent-color:var(--accent)">`;

  card.append(intRow, loopRow);

  // Start/Stop button
  const btnRow = document.createElement('div');
  btnRow.style.padding = '0 16px 10px';

  const btnStart = document.createElement('button');
  btnStart.className = 'btn btn--primary btn--full';
  btnStart.id = 'seq-start-btn';
  btnStart.textContent = '▶ Start';

  btnRow.appendChild(btnStart);

  // Cue selection
  const cueLabel = document.createElement('div');
  cueLabel.className = 'section-label';
  cueLabel.textContent = 'Cue Order';

  const cueList = document.createElement('div');
  cueList.id = 'seq-cue-list';

  // Status
  const statusBar = document.createElement('div');
  statusBar.id = 'seq-status';
  statusBar.style.cssText = 'text-align:center;font-size:12px;color:var(--text-dim);padding:8px 16px;';

  screen.append(header, card, btnRow, cueLabel, cueList, statusBar);

  _loadCues(cueList);

  btnStart.addEventListener('click', async () => {
    const status = await api.seqStatus().catch(() => null);
    if (status && status.running) {
      await api.seqStop().catch(console.warn);
      btnStart.textContent = '▶ Start';
      btnStart.classList.remove('btn--active');
      clearInterval(_pollTimer);
      statusBar.textContent = '';
    } else {
      const selectedIds = _getSelectedIds(cueList);
      if (selectedIds.length === 0) { alert('Select at least one cue.'); return; }
      const interval = parseInt(document.getElementById('seq-interval').value) || 2000;
      const loop     = document.getElementById('seq-loop').checked;
      await api.seqStart(selectedIds, interval, loop).catch(console.warn);
      btnStart.textContent = '⏹ Stop';
      btnStart.classList.add('btn--active');
      _startPoll(cueList, statusBar);
    }
  });

  // Check current status on open
  api.seqStatus().then(s => {
    if (s && s.running) {
      btnStart.textContent = '⏹ Stop';
      btnStart.classList.add('btn--active');
      _startPoll(cueList, statusBar);
    }
  }).catch(() => {});
}

async function _loadCues(cueList) {
  let cues = [];
  try {
    const data = await api.getCues();
    cues = data.cues || data || [];
  } catch (_) {}

  cueList.innerHTML = '';
  if (cues.length === 0) {
    cueList.innerHTML = '<p class="empty-state">No cues available.</p>';
    return;
  }

  cues.forEach((cue, i) => {
    const step = document.createElement('div');
    step.className = 'seq-step';
    step.dataset.id = cue.id;

    const num = document.createElement('div');
    num.className = 'seq-step-num';
    num.textContent = i + 1;

    const label = document.createElement('div');
    label.style.flex = '1';
    label.style.fontSize = '14px';
    label.textContent = cue.name || `Cue ${cue.id}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.style.cssText = 'width:20px;height:20px;accent-color:var(--accent)';

    step.append(num, label, cb);
    cueList.appendChild(step);
  });
}

function _getSelectedIds(cueList) {
  const ids = [];
  cueList.querySelectorAll('.seq-step').forEach(step => {
    const cb = step.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) ids.push(parseInt(step.dataset.id));
  });
  return ids;
}

function _startPoll(cueList, statusBar) {
  clearInterval(_pollTimer);
  _pollTimer = setInterval(async () => {
    const s = await api.seqStatus().catch(() => null);
    if (!s) return;
    if (!s.running) {
      clearInterval(_pollTimer);
      document.getElementById('seq-start-btn').textContent = '▶ Start';
      document.getElementById('seq-start-btn').classList.remove('btn--active');
      statusBar.textContent = '';
    } else {
      statusBar.textContent = 'Running…';
    }
  }, 1000);
}
