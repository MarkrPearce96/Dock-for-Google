import { seedIfEmpty, saveApps } from './lib/storage.js';
import { filterApps, SEED_APPS, draftFromTab } from './lib/apps.js';
import { makeApp, addApp } from './lib/appList.js';
import { resolveIcon } from './lib/icons.js';
import { loadPrefs, DEFAULT_PREFS } from './lib/prefs.js';
import { applyTheme } from './lib/theme.js';

const grid = document.getElementById('grid');
const emptyMsg = document.getElementById('empty');
const search = document.getElementById('search');
const settingsBtn = document.getElementById('open-settings');
const addPageBtn = document.getElementById('add-page');
const addForm = document.getElementById('add-form');
const addName = document.getElementById('add-name');
const addUrl = document.getElementById('add-url');
const addIcon = document.getElementById('add-icon');
const addError = document.getElementById('add-error');
const addCancel = document.getElementById('add-cancel');
const addNote = document.getElementById('add-note');

let allApps = [];
let prefs = { ...DEFAULT_PREFS };

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function applyColumns(n) {
  const cols = [3, 4, 5].includes(n) ? n : 3;
  document.documentElement.style.setProperty('--cols', cols);
  document.body.style.width = `${40 + cols * 100}px`;
}

function openApp(url) {
  if (prefs.openInNewTab) {
    browser.tabs.create({ url, active: !prefs.openInBackground });
  } else {
    browser.tabs.update({ url });
  }
  window.close();
}

function render(apps) {
  grid.textContent = '';
  if (allApps.length === 0) {
    emptyMsg.textContent = 'No apps yet — open Settings to add some.';
    emptyMsg.hidden = false;
  } else if (apps.length === 0) {
    emptyMsg.textContent = 'No apps match your search.';
    emptyMsg.hidden = false;
  } else {
    emptyMsg.hidden = true;
  }
  for (const app of apps) {
    const button = document.createElement('button');
    button.className = 'app';
    button.addEventListener('click', () => openApp(app.url));

    const img = document.createElement('img');
    img.src = resolveIcon(app);
    img.alt = '';
    img.addEventListener('error', () => {
      img.src =
        'data:image/svg+xml,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="8" fill="#4f46e5"/><text x="20" y="27" font-size="20" fill="#fff" text-anchor="middle" font-family="sans-serif">${(app.name?.[0] || '?').toUpperCase()}</text></svg>`
        );
    });

    const label = document.createElement('span');
    label.textContent = app.name;

    button.append(img, label);
    grid.append(button);
  }
}

function showAddForm(draft) {
  addName.value = draft.name;
  addUrl.value = draft.url;
  addIcon.value = draft.iconUrl;
  addError.hidden = true;
  addNote.hidden = true;
  grid.hidden = true;
  emptyMsg.hidden = true;
  addForm.hidden = false;
  addName.focus();
}

function hideAddForm() {
  addForm.hidden = true;
  addForm.reset();
  addError.hidden = true;
  grid.hidden = false;
  render(filterApps(allApps, search.value));
}

search.addEventListener('input', () => {
  addNote.hidden = true;
  render(filterApps(allApps, search.value));
});

settingsBtn.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

addPageBtn.addEventListener('click', async () => {
  addNote.hidden = true;
  let tab = null;
  try {
    [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  } catch (e) {
    tab = null;
  }
  const draft = draftFromTab(tab);
  if (!draft) {
    addNote.textContent = "Can't add this page.";
    addNote.hidden = false;
    return;
  }
  showAddForm(draft);
});

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addError.hidden = true;
  if (!isValidUrl(addUrl.value)) {
    addError.textContent = 'Enter a valid http(s) URL.';
    addError.hidden = false;
    return;
  }
  allApps = addApp(allApps, {
    name: addName.value,
    url: addUrl.value,
    iconUrl: addIcon.value,
  });
  await saveApps(allApps);
  hideAddForm();
});

addCancel.addEventListener('click', () => hideAddForm());

addForm.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideAddForm();
});

async function init() {
  try {
    prefs = await loadPrefs();
  } catch (e) {
    console.error('App Launcher: prefs unavailable, using defaults', e);
    prefs = { ...DEFAULT_PREFS };
  }
  applyTheme(prefs.theme);
  applyColumns(prefs.gridColumns);
  if (!prefs.showSearch) search.style.display = 'none';
  document.body.classList.toggle('no-labels', !prefs.showLabels);

  try {
    allApps = await seedIfEmpty();
  } catch (e) {
    console.error('App Launcher: storage unavailable, using in-memory defaults', e);
    allApps = SEED_APPS.map(makeApp);
  }
  render(allApps);
}

init();
