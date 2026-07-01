import { seedIfEmpty, saveApps } from './lib/storage.js';
import { addApp, updateApp, removeApp, moveApp } from './lib/appList.js';
import { resolveIcon } from './lib/icons.js';

const listEl = document.getElementById('list');
const form = document.getElementById('add-form');
const nameInput = document.getElementById('add-name');
const urlInput = document.getElementById('add-url');
const iconInput = document.getElementById('add-icon');
const addError = document.getElementById('add-error');

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
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="28" height="28" rx="6" fill="#4f46e5"/><text x="14" y="19" font-size="14" fill="#fff" text-anchor="middle" font-family="sans-serif">${(name[0] || '?').toUpperCase()}</text></svg>`
    )
  );
}

function makeRow(app, index) {
  const li = document.createElement('li');
  li.className = 'row';

  const img = document.createElement('img');
  img.src = resolveIcon(app);
  img.alt = '';
  img.addEventListener('error', () => { img.src = fallbackIcon(app.name); });

  const meta = document.createElement('div');
  meta.className = 'meta display';
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = app.name;
  const url = document.createElement('div');
  url.className = 'url';
  url.textContent = app.url;
  meta.append(name, url);

  // Inline edit fields
  const edit = document.createElement('div');
  edit.className = 'edit-fields';
  const eName = document.createElement('input');
  eName.type = 'text';
  eName.value = app.name;
  const eUrl = document.createElement('input');
  eUrl.type = 'url';
  eUrl.value = app.url;
  const eIcon = document.createElement('input');
  eIcon.type = 'url';
  eIcon.placeholder = 'Custom icon URL (optional)';
  eIcon.value = app.iconUrl ?? '';
  const eError = document.createElement('p');
  eError.className = 'error';
  eError.hidden = true;
  const save = document.createElement('button');
  save.textContent = 'Save';
  save.addEventListener('click', async () => {
    if (!isValidUrl(eUrl.value)) {
      eError.textContent = 'Enter a valid http(s) URL.';
      eError.hidden = false;
      return;
    }
    await persist(updateApp(apps, app.id, {
      name: eName.value,
      url: eUrl.value,
      iconUrl: eIcon.value,
    }));
  });
  edit.append(eName, eUrl, eIcon, eError, save);

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'actions';
  const up = mkBtn('↑', () => persist(moveApp(apps, app.id, 'up')), index === 0);
  const down = mkBtn('↓', () => persist(moveApp(apps, app.id, 'down')), index === apps.length - 1);
  const editBtn = mkBtn('Edit', () => li.classList.toggle('editing'), false);
  const del = mkBtn('Delete', () => persist(removeApp(apps, app.id)), false);
  actions.append(up, down, editBtn, del);

  li.append(img, meta, edit, actions);
  return li;
}

function mkBtn(label, onClick, disabled) {
  const b = document.createElement('button');
  b.className = 'secondary';
  b.textContent = label;
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

function render() {
  listEl.textContent = '';
  apps.forEach((app, i) => listEl.append(makeRow(app, i)));
}

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
});

async function init() {
  apps = await seedIfEmpty();
  render();
}

init();
