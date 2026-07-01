import Sortable from './lib/Sortable.esm.js';
import { seedIfEmpty, saveApps } from './lib/storage.js';
import { addApp, addAppAt, removeApp, makeApp } from './lib/appList.js';
import { SEED_APPS, filterApps, catalogAvailable } from './lib/apps.js';
import { resolveIcon } from './lib/icons.js';

const availableGrid = document.getElementById('available-grid');
const availableEmpty = document.getElementById('available-empty');
const availablePanel = availableGrid.closest('.panel');
const myGrid = document.getElementById('my-grid');
const myEmpty = document.getElementById('my-empty');
const search = document.getElementById('search');
const createBtn = document.getElementById('create-custom');
const restoreBtn = document.getElementById('restore-defaults');
const form = document.getElementById('custom-form');
const nameInput = document.getElementById('add-name');
const urlInput = document.getElementById('add-url');
const iconInput = document.getElementById('add-icon');
const addError = document.getElementById('add-error');
const cancelBtn = document.getElementById('cancel-custom');

let apps = [];

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function persist(next) {
  apps = next;
  await saveApps(apps);
  render();
}

function fallbackIcon(name) {
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="8" fill="#4f46e5"/><text x="20" y="27" font-size="20" fill="#fff" text-anchor="middle" font-family="sans-serif">${(name?.[0] || '?').toUpperCase()}</text></svg>`
    )
  );
}

function makeIcon(app) {
  const img = document.createElement('img');
  img.src = resolveIcon(app);
  img.alt = '';
  img.addEventListener('error', () => { img.src = fallbackIcon(app.name); });
  return img;
}

function makeLabel(text) {
  const span = document.createElement('span');
  span.className = 'tile-label';
  span.textContent = text;
  return span;
}

function makeAvailableTile(entry) {
  const btn = document.createElement('button');
  btn.className = 'tile';
  btn.type = 'button';
  btn.title = `Add ${entry.name}`;
  btn.__entry = entry;
  btn.append(makeIcon(entry), makeLabel(entry.name));
  btn.addEventListener('click', () => persist(addApp(apps, entry)));
  return btn;
}

function makeMyTile(app) {
  const tile = document.createElement('div');
  tile.className = 'tile mine';
  tile.dataset.id = app.id;

  const remove = document.createElement('button');
  remove.className = 'remove';
  remove.type = 'button';
  remove.textContent = '×';
  remove.title = `Remove ${app.name}`;
  remove.addEventListener('click', () => persist(removeApp(apps, app.id)));

  tile.append(makeIcon(app), makeLabel(app.name), remove);
  return tile;
}

function render() {
  myGrid.textContent = '';
  apps.forEach((app) => myGrid.append(makeMyTile(app)));
  myEmpty.hidden = apps.length !== 0;

  const allAvailable = catalogAvailable(SEED_APPS, apps);
  const available = filterApps(allAvailable, search.value);
  availableGrid.textContent = '';
  available.forEach((entry) => availableGrid.append(makeAvailableTile(entry)));
  if (available.length !== 0) {
    availableEmpty.hidden = true;
  } else {
    availableEmpty.hidden = false;
    availableEmpty.textContent = allAvailable.length === 0
      ? 'All caught up — create a custom shortcut for anything else.'
      : 'No apps match your search.';
  }
}

// --- Drag-and-drop via SortableJS ---

// Reorder within My shortcuts: rebuild `apps` from the new DOM order.
function reorderFromDom() {
  const ids = [...myGrid.querySelectorAll('.tile.mine')].map((t) => t.dataset.id);
  const byId = new Map(apps.map((a) => [a.id, a]));
  persist(ids.map((id) => byId.get(id)).filter(Boolean));
}

// A catalog app was dragged into My shortcuts: insert it at the drop position.
function onAddToMy(evt) {
  const entry = evt.item.__entry;
  let index = 0;
  for (const child of myGrid.children) {
    if (child === evt.item) break;
    if (child.classList.contains('mine')) index += 1;
  }
  evt.item.remove();
  if (entry) persist(addAppAt(apps, entry, index));
  else render();
}

// A shortcut was dropped onto the Available panel (Remove zone): delete it.
function onDropToRemove(evt) {
  const id = evt.item.dataset.id;
  evt.item.remove();
  if (id) persist(removeApp(apps, id));
  else render();
}

new Sortable(myGrid, {
  group: { name: 'apps', pull: true, put: true },
  animation: 200,
  draggable: '.tile.mine',
  filter: '.remove',
  preventOnFilter: false,
  onStart: () => availablePanel.classList.add('removing'),
  onEnd: () => availablePanel.classList.remove('removing', 'remove-hot'),
  onMove: (evt) => {
    availablePanel.classList.toggle('remove-hot', evt.to === availableGrid);
    return true;
  },
  onUpdate: reorderFromDom,
  onAdd: onAddToMy,
});

new Sortable(availableGrid, {
  group: { name: 'apps', pull: true, put: true },
  animation: 200,
  sort: false,
  draggable: '.tile',
  onAdd: onDropToRemove,
});

search.addEventListener('input', render);

createBtn.addEventListener('click', () => {
  form.hidden = false;
  nameInput.focus();
});

cancelBtn.addEventListener('click', () => {
  form.hidden = true;
  form.reset();
  addError.hidden = true;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  addError.hidden = true;
  if (!isValidUrl(urlInput.value)) {
    addError.textContent = 'Enter a valid http(s) URL.';
    addError.hidden = false;
    return;
  }
  await persist(addApp(apps, {
    name: nameInput.value,
    url: urlInput.value,
    iconUrl: iconInput.value,
  }));
  form.reset();
  form.hidden = true;
});

restoreBtn.addEventListener('click', async () => {
  if (confirm('Replace your shortcuts with the default apps? This cannot be undone.')) {
    await persist(SEED_APPS.map(makeApp));
  }
});

async function init() {
  try {
    apps = await seedIfEmpty();
  } catch (e) {
    console.error('App Launcher: storage unavailable, using in-memory defaults', e);
    apps = SEED_APPS.map(makeApp);
  }
  render();
}

init();
