# General Settings Toggles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "General" preferences card (four toggle switches) under the settings panels that changes launcher behaviour — open in new/current tab, open in background, show/hide the popup search box, show/hide app labels — persisted in a `prefs` store and applied by the popup on open.

**Architecture:** A new `src/lib/prefs.js` module (mirroring `storage.js`) load/saves a `prefs` object under its own storage key, merged over defaults. The options page renders the toggles and saves changes; the popup reads prefs on open and applies them (tab behaviour + show/hide via CSS). The `apps` data and drag/catalog features are untouched.

**Tech Stack:** Vanilla JavaScript (ES modules), `browser.storage.local`, HTML/CSS, `node:test` + `node:assert`.

## Global Constraints

- Manifest V3; ES module syntax; `browser.*` promise-based API.
- No third-party runtime or test dependencies — standard library only.
- Tests use `node:test` + `node:assert`.
- Preferences live under a NEW storage key `prefs`, separate from `apps`; the `apps` shape is unchanged.
- `DEFAULT_PREFS = { openInNewTab: true, openInBackground: false, showSearch: true, showLabels: true }`.
- Loading merges the stored object over `DEFAULT_PREFS` (missing keys fall back to defaults).
- Toggling saves immediately (no Save button); prefs are applied by the popup on open.
- **Open in background** applies only when **Open in new tab** is on; its toggle is disabled when new-tab is off.
- **Show search box** off hides ONLY the `#search` input; the gear/settings button stays visible.
- No user-supplied string via `innerHTML`. Do not modify the `apps` data shape.

---

### Task 1: Preferences store (`prefs.js`)

**Files:**
- Create: `src/lib/prefs.js`
- Test: `test/prefs.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PREFS_KEY = 'prefs'`
  - `DEFAULT_PREFS = { openInNewTab: true, openInBackground: false, showSearch: true, showLabels: true }`
  - `loadPrefs(area?) -> Promise<prefs>` — stored object merged over `DEFAULT_PREFS`.
  - `savePrefs(prefs, area?) -> Promise<void>`
  - `setPref(key, value, area?) -> Promise<prefs>` — load, set one key, save, return the new prefs.
  - `area` defaults to the live `browser.storage.local`; tests inject a mock.

- [ ] **Step 1: Write the failing tests** — `test/prefs.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREFS_KEY, DEFAULT_PREFS, loadPrefs, savePrefs, setPref } from '../src/lib/prefs.js';

function mockArea(initial = {}) {
  const store = { ...initial };
  return {
    store,
    async get(key) { return key in store ? { [key]: store[key] } : {}; },
    async set(obj) { Object.assign(store, obj); },
  };
}

test('loadPrefs returns defaults when nothing stored', async () => {
  const area = mockArea();
  assert.deepEqual(await loadPrefs(area), DEFAULT_PREFS);
});

test('loadPrefs merges a partial stored object over defaults', async () => {
  const area = mockArea({ [PREFS_KEY]: { showLabels: false } });
  const prefs = await loadPrefs(area);
  assert.equal(prefs.showLabels, false);
  assert.equal(prefs.openInNewTab, true);
  assert.equal(prefs.showSearch, true);
});

test('savePrefs then loadPrefs round-trips', async () => {
  const area = mockArea();
  const next = { openInNewTab: false, openInBackground: true, showSearch: false, showLabels: false };
  await savePrefs(next, area);
  assert.deepEqual(await loadPrefs(area), next);
  assert.deepEqual(area.store[PREFS_KEY], next);
});

test('setPref changes one key, persists, leaves the others', async () => {
  const area = mockArea();
  const next = await setPref('showSearch', false, area);
  assert.equal(next.showSearch, false);
  assert.equal(next.openInNewTab, true);
  assert.deepEqual((await loadPrefs(area)).showSearch, false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/prefs.test.js`
Expected: FAIL — cannot find module `../src/lib/prefs.js`.

- [ ] **Step 3: Implement** — `src/lib/prefs.js`:

```js
export const PREFS_KEY = 'prefs';

export const DEFAULT_PREFS = {
  openInNewTab: true,
  openInBackground: false,
  showSearch: true,
  showLabels: true,
};

function defaultArea() {
  if (typeof browser !== 'undefined' && browser.storage) return browser.storage.local;
  if (typeof chrome !== 'undefined' && chrome.storage) return chrome.storage.local;
  throw new Error('No extension storage area available');
}

export async function loadPrefs(area = defaultArea()) {
  const result = await area.get(PREFS_KEY);
  return { ...DEFAULT_PREFS, ...(result[PREFS_KEY] ?? {}) };
}

export async function savePrefs(prefs, area = defaultArea()) {
  await area.set({ [PREFS_KEY]: prefs });
}

export async function setPref(key, value, area = defaultArea()) {
  const prefs = await loadPrefs(area);
  const next = { ...prefs, [key]: value };
  await savePrefs(next, area);
  return next;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/prefs.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all files green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prefs.js test/prefs.test.js
git commit -m "feat: add prefs store (load/save/setPref with defaults)"
```

---

### Task 2: "General" toggles card in settings

**Files:**
- Modify: `src/options.html`
- Modify: `src/options.css`
- Modify: `src/options.js`

**Interfaces:**
- Consumes: `loadPrefs`, `setPref`, `DEFAULT_PREFS` (`lib/prefs.js`).
- Produces: the four toggle inputs (`#pref-new-tab`, `#pref-background`, `#pref-search`, `#pref-labels`) and their persistence wiring. No exports.

**Note:** DOM glue — verified via the import smoke test + manual checklist.

- [ ] **Step 1: Add the General card** — in `src/options.html`, insert this block immediately AFTER the `</div>` that closes `<div class="panels">` and BEFORE `<dialog id="custom-dialog" ...>`:

```html
    <section class="card general">
      <h2>General</h2>
      <label class="toggle"><span>Open apps in a new tab</span><input id="pref-new-tab" type="checkbox" /></label>
      <label class="toggle"><span>Open in the background</span><input id="pref-background" type="checkbox" /></label>
      <label class="toggle"><span>Show the search box</span><input id="pref-search" type="checkbox" /></label>
      <label class="toggle"><span>Show app labels</span><input id="pref-labels" type="checkbox" /></label>
    </section>
```

- [ ] **Step 2: Add toggle styles** — append to `src/options.css`:

```css
/* General preferences card */
.general .toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  cursor: pointer;
}
.general .toggle:has(input:disabled) { color: #9aa0a6; cursor: default; }
.toggle input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  flex: none;
  width: 40px;
  height: 22px;
  margin: 0;
  border-radius: 999px;
  background: #ccc;
  position: relative;
  cursor: pointer;
  transition: background 150ms ease;
}
.toggle input[type="checkbox"]::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 150ms ease;
}
.toggle input[type="checkbox"]:checked { background: #4f46e5; }
.toggle input[type="checkbox"]:checked::after { transform: translateX(18px); }
.toggle input[type="checkbox"]:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 3: Wire the toggles in `src/options.js`** — add the import at the top (with the other imports):

```js
import { loadPrefs, setPref, DEFAULT_PREFS } from './lib/prefs.js';
```

Add these element lookups (near the other `document.getElementById` consts):

```js
const prefNewTab = document.getElementById('pref-new-tab');
const prefBackground = document.getElementById('pref-background');
const prefSearch = document.getElementById('pref-search');
const prefLabels = document.getElementById('pref-labels');
```

Add this function and its call at the END of the file (after `init();`):

```js
function syncBackgroundDisabled() {
  prefBackground.disabled = !prefNewTab.checked;
}

async function initPrefs() {
  let prefs;
  try {
    prefs = await loadPrefs();
  } catch (e) {
    console.error('App Launcher: prefs unavailable, using defaults', e);
    prefs = DEFAULT_PREFS;
  }
  prefNewTab.checked = prefs.openInNewTab;
  prefBackground.checked = prefs.openInBackground;
  prefSearch.checked = prefs.showSearch;
  prefLabels.checked = prefs.showLabels;
  syncBackgroundDisabled();

  prefNewTab.addEventListener('change', () => {
    setPref('openInNewTab', prefNewTab.checked);
    syncBackgroundDisabled();
  });
  prefBackground.addEventListener('change', () => setPref('openInBackground', prefBackground.checked));
  prefSearch.addEventListener('change', () => setPref('showSearch', prefSearch.checked));
  prefLabels.addEventListener('change', () => setPref('showLabels', prefLabels.checked));
}

initPrefs();
```

- [ ] **Step 4: Import-resolution smoke test**

Run:
```
node --input-type=module -e "import('./src/options.js').catch(e => { if (/browser|document|window/.test(String(e))) { console.log('OK'); process.exit(0);} console.error(e); process.exit(1); })"
```
Expected: prints `OK`.

- [ ] **Step 5: Full suite still green**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/options.html src/options.css src/options.js
git commit -m "feat: add General toggles card wired to the prefs store"
```

- [ ] **Step 7: Manual check (after rebuild):** the General card shows four switches reflecting stored prefs; flipping one persists (reopen settings); "Open in the background" greys out when "Open apps in a new tab" is off.

---

### Task 3: Apply prefs in the popup

**Files:**
- Overwrite: `src/popup.js`
- Modify: `src/popup.css`

**Interfaces:**
- Consumes: `loadPrefs`, `DEFAULT_PREFS` (`lib/prefs.js`); existing `seedIfEmpty`, `filterApps`, `SEED_APPS`, `makeApp`, `resolveIcon`.
- Produces: prefs-driven popup behaviour. No exports.

**Note:** DOM glue — verified via the import smoke test + manual checklist.

- [ ] **Step 1: Overwrite `src/popup.js`**

```js
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
let prefs = DEFAULT_PREFS;

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
    prefs = DEFAULT_PREFS;
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
```

- [ ] **Step 2: Add the no-labels rule** — append to `src/popup.css`:

```css
body.no-labels .app span { display: none; }
```

- [ ] **Step 3: Import-resolution smoke test**

Run:
```
node --input-type=module -e "import('./src/popup.js').catch(e => { if (/browser|document|window/.test(String(e))) { console.log('OK'); process.exit(0);} console.error(e); process.exit(1); })"
```
Expected: prints `OK`.

- [ ] **Step 4: Full suite still green**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/popup.js src/popup.css
git commit -m "feat: apply prefs in the popup (tab behaviour, hide search/labels)"
```

- [ ] **Step 6: Manual check (after rebuild):** with new-tab off, clicking an app navigates the current tab; with background on, the new tab opens without focus; hiding the search box removes the search field (gear stays); hiding labels removes the names — each takes effect the next time the popup opens.

---

## Notes for the implementer

- Run each task's tests before committing; never commit red tests.
- Keep the popup's existing behaviour identical when all prefs are at their defaults (openInNewTab true, others default) — this must not regress the launcher.
- `prefs` is a separate storage key; do not touch the `apps` list or the drag/catalog code.
- The Xcode project folder-references `src/`, and `prefs.js` lives in the folder-referenced `lib/`, so a plain rebuild bundles it — no converter re-run needed.
