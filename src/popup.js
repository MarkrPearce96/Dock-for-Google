import { seedIfEmpty } from './lib/storage.js';
import { filterApps, SEED_APPS } from './lib/apps.js';
import { makeApp } from './lib/appList.js';
import { resolveIcon } from './lib/icons.js';
import { loadPrefs, DEFAULT_PREFS } from './lib/prefs.js';

const grid = document.getElementById('grid');
const emptyMsg = document.getElementById('empty');
const search = document.getElementById('search');
const settingsBtn = document.getElementById('open-settings');

let allApps = [];
let prefs = { ...DEFAULT_PREFS };

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

search.addEventListener('input', () => {
  render(filterApps(allApps, search.value));
});

settingsBtn.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

async function init() {
  try {
    prefs = await loadPrefs();
  } catch (e) {
    console.error('App Launcher: prefs unavailable, using defaults', e);
    prefs = { ...DEFAULT_PREFS };
  }
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
