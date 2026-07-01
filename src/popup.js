import { seedIfEmpty } from './lib/storage.js';
import { filterApps } from './lib/apps.js';
import { resolveIcon } from './lib/icons.js';

const grid = document.getElementById('grid');
const emptyMsg = document.getElementById('empty');
const search = document.getElementById('search');
const settingsBtn = document.getElementById('open-settings');

let allApps = [];

function render(apps) {
  grid.textContent = '';
  emptyMsg.hidden = allApps.length !== 0;
  for (const app of apps) {
    const button = document.createElement('button');
    button.className = 'app';
    button.addEventListener('click', () => {
      browser.tabs.create({ url: app.url });
      window.close();
    });

    const img = document.createElement('img');
    img.src = resolveIcon(app);
    img.alt = '';
    img.addEventListener('error', () => {
      img.src =
        'data:image/svg+xml,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="8" fill="#4f46e5"/><text x="20" y="27" font-size="20" fill="#fff" text-anchor="middle" font-family="sans-serif">${(app.name[0] || '?').toUpperCase()}</text></svg>`
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
  allApps = await seedIfEmpty();
  render(allApps);
}

init();
