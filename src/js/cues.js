// cues.js — cue list: fire, create, edit, delete, reorder
import { api } from './api.js';

export function initCues() {
  const screen = document.getElementById('screen-cues');
  screen.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = '<h2 class="screen-title">Cues</h2>';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn--primary';
  addBtn.textContent = '+ New';
  addBtn.addEventListener('click', () => _showCreateDialog(list));
  header.appendChild(addBtn);

  const list = document.createElement('div');
  list.id = 'cue-list';

  screen.append(header, list);
  _render(list);
}

async function _render(list) {
  let cues = [];
  try {
    const data = await api.getCues();
    cues = data.cues || data || [];
  } catch (_) {
    list.innerHTML = '<p class="empty-state">Could not load cues.</p>';
    return;
  }

  if (cues.length === 0) {
    list.innerHTML = '<p class="empty-state">No cues yet. Tap + New to capture the current state.</p>';
    return;
  }

  list.innerHTML = '';
  cues.forEach(cue => list.appendChild(_makeItem(cue, list)));
}

function _makeItem(cue, list) {
  const item = document.createElement('div');
  item.className = 'cue-item';
  item.dataset.id = cue.id;

  const name = document.createElement('div');
  name.className = 'cue-name';
  name.textContent = cue.name || `Cue ${cue.id}`;

  const actions = document.createElement('div');
  actions.className = 'cue-actions';

  const btnFire = document.createElement('button');
  btnFire.className = 'btn btn--icon btn--primary';
  btnFire.title = 'Fire';
  btnFire.textContent = '▶';
  btnFire.addEventListener('click', () => {
    api.fireCue(cue.id).catch(console.warn);
    // Visual feedback
    item.style.borderColor = 'var(--good)';
    setTimeout(() => item.style.borderColor = '', 600);
  });

  const btnEdit = document.createElement('button');
  btnEdit.className = 'btn btn--icon';
  btnEdit.title = 'Edit';
  btnEdit.textContent = '✏️';
  btnEdit.addEventListener('click', () => _showEditDialog(cue, list));

  const btnDel = document.createElement('button');
  btnDel.className = 'btn btn--icon btn--danger';
  btnDel.title = 'Delete';
  btnDel.textContent = '🗑';
  btnDel.addEventListener('click', async () => {
    if (!confirm(`Delete "${cue.name || 'Cue ' + cue.id}"?`)) return;
    await api.deleteCue(cue.id).catch(console.warn);
    _render(list);
  });

  actions.append(btnFire, btnEdit, btnDel);
  item.append(name, actions);
  return item;
}

function _showCreateDialog(list) {
  const name = prompt('Cue name:');
  if (name === null) return;
  api.createCue({ name: name || 'New Cue' })
    .then(() => _render(list))
    .catch(console.warn);
}

function _showEditDialog(cue, list) {
  const name = prompt('Rename cue:', cue.name || '');
  if (name === null) return;
  api.updateCue(cue.id, { name })
    .then(() => _render(list))
    .catch(console.warn);
}
