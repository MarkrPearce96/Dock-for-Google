# Appearance Settings (Dark Mode + Grid Columns) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Theme (Light / Dark / Follow system) and Grid Columns (3/4/5) preference — theming both the popup and settings via CSS variables, widening the popup for more columns — with dropdowns in the settings General card.

**Architecture:** A new `src/lib/theme.js` resolves + applies the theme (`data-theme` attribute + `color-scheme`, live-updating for "system"). `DEFAULT_PREFS` gains `theme` and `gridColumns`. Both stylesheets are refactored so colours come from CSS custom properties with a `[data-theme="dark"]` override. The popup grid uses `--cols`. Popup and settings apply the prefs on load; settings adds two dropdowns.

**Tech Stack:** Vanilla JavaScript (ES modules), CSS custom properties, `prefers-color-scheme` / `matchMedia`, `node:test` + `node:assert`.

## Global Constraints

- Manifest V3; ES modules; `browser.*` promise-based API; no third-party deps.
- Tests use `node:test` + `node:assert`.
- `theme`: `'light' | 'dark' | 'system'` (default `'system'`). `gridColumns`: `3 | 4 | 5` (default `3`), stored in the existing `prefs` object.
- One theme applies to BOTH popup and settings. `'system'` resolves via `prefers-color-scheme` and live-updates on OS-appearance change.
- Grid columns apply to the POPUP grid only; the popup widens to `40 + cols*100` px (340/440/540). Settings grids stay 3-wide.
- CSS colours come from custom properties; a `[data-theme="dark"]` block overrides them. `--accent` (`#4f46e5`) and `--danger` (`#c5221f`) are theme-constant.
- `resolveTheme` is pure and unit-tested; `applyTheme` and the CSS/HTML/JS wiring are DOM glue (manual verification).
- Do not change the `apps` data shape or the drag/catalog/toggle features.

---

### Task 1: Theme module (`theme.js`)

**Files:**
- Create: `src/lib/theme.js`
- Test: `test/theme.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `resolveTheme(pref, prefersDark) -> 'light' | 'dark'` — `'dark'`/`'light'` return themselves; `'system'` returns `prefersDark ? 'dark' : 'light'`; anything else → `'light'`. Pure.
  - `applyTheme(pref, root = document.documentElement) -> void` — sets `root.dataset.theme` and `root.style.colorScheme` to the effective theme; while `pref === 'system'`, keeps a single `matchMedia('(prefers-color-scheme: dark)')` `change` listener attached to re-apply live; removes it for non-system prefs. DOM glue.

- [ ] **Step 1: Write the failing tests** — `test/theme.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme } from '../src/lib/theme.js';

test('explicit light/dark resolve to themselves', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('light', false), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('dark', true), 'dark');
});

test('system resolves from prefersDark', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
});

test('unknown pref falls back to light', () => {
  assert.equal(resolveTheme('purple', true), 'light');
  assert.equal(resolveTheme(undefined, true), 'light');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/theme.test.js`
Expected: FAIL — cannot find module `../src/lib/theme.js`.

- [ ] **Step 3: Implement** — `src/lib/theme.js`:

```js
export function resolveTheme(pref, prefersDark) {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  if (pref === 'system') return prefersDark ? 'dark' : 'light';
  return 'light';
}

let mediaQuery = null;
let systemListener = null;

function media() {
  if (mediaQuery) return mediaQuery;
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }
  return mediaQuery;
}

export function applyTheme(pref, root = document.documentElement) {
  const mq = media();
  const effective = resolveTheme(pref, mq ? mq.matches : false);
  root.dataset.theme = effective;
  root.style.colorScheme = effective;

  if (!mq) return;
  if (systemListener) {
    mq.removeEventListener('change', systemListener);
    systemListener = null;
  }
  if (pref === 'system') {
    systemListener = (e) => {
      const eff = resolveTheme('system', e.matches);
      root.dataset.theme = eff;
      root.style.colorScheme = eff;
    };
    mq.addEventListener('change', systemListener);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/theme.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.js test/theme.test.js
git commit -m "feat: add theme module (resolveTheme + applyTheme)"
```

---

### Task 2: Add `theme` + `gridColumns` to prefs

**Files:**
- Modify: `src/lib/prefs.js`
- Modify: `test/prefs.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `DEFAULT_PREFS` gains `theme: 'system'` and `gridColumns: 3`.

- [ ] **Step 1: Update the round-trip test** — in `test/prefs.test.js`, the round-trip test currently saves a 4-key object; it must include all six keys. Replace its `next` object:

```js
  const next = {
    openInNewTab: false,
    openInBackground: true,
    showSearch: false,
    showLabels: false,
    theme: 'dark',
    gridColumns: 5,
  };
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/prefs.test.js`
Expected: FAIL — the round-trip `deepEqual` fails because `DEFAULT_PREFS` does not yet contain `theme`/`gridColumns`, so `loadPrefs` returns an object missing those keys and the saved 6-key object doesn't round-trip.

- [ ] **Step 3: Add the keys** — in `src/lib/prefs.js`, extend `DEFAULT_PREFS`:

```js
export const DEFAULT_PREFS = {
  openInNewTab: true,
  openInBackground: false,
  showSearch: true,
  showLabels: true,
  theme: 'system',
  gridColumns: 3,
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/prefs.test.js`
Expected: PASS (all prefs tests).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all files green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prefs.js test/prefs.test.js
git commit -m "feat: add theme and gridColumns to default prefs"
```

---

### Task 3: Theme the popup + apply columns

**Files:**
- Overwrite: `src/popup.css`
- Overwrite: `src/popup.js`

**Interfaces:**
- Consumes: `applyTheme` (`lib/theme.js`); `loadPrefs`, `DEFAULT_PREFS` (`lib/prefs.js`); existing popup imports.
- Produces: a themed, variable-column popup. No exports.

**Note:** DOM glue — verified via the import smoke test + manual checklist.

- [ ] **Step 1: Overwrite `src/popup.css`**

```css
* { box-sizing: border-box; }
:root {
  --bg: #fff;
  --fg: #202124;
  --muted: #5f6368;
  --border: #eee;
  --hover: #f1f3f4;
  --accent: #4f46e5;
}
[data-theme="dark"] {
  --bg: #1c1c1e;
  --fg: #e8eaed;
  --muted: #9aa0a6;
  --border: #3a3a3c;
  --hover: #3a3a3c;
}
body {
  width: 340px;
  margin: 0;
  padding: 8px;
  font-family: -apple-system, system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px 12px;
  border-bottom: 1px solid var(--border);
}
#search {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  padding: 6px 4px;
  background: transparent;
  color: var(--fg);
}
#open-settings {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--muted);
}
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), 1fr);
  gap: 8px;
  padding: 12px 4px;
}
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border: none;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.app:hover { background: var(--hover); }
.app img { width: 40px; height: 40px; object-fit: contain; border-radius: 9px; }
.app span {
  font-size: 13px;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body.no-labels .app span { display: none; }
.empty { text-align: center; color: var(--muted); padding: 24px 8px; }
```

- [ ] **Step 2: Overwrite `src/popup.js`**

```js
import { seedIfEmpty } from './lib/storage.js';
import { filterApps, SEED_APPS } from './lib/apps.js';
import { makeApp } from './lib/appList.js';
import { resolveIcon } from './lib/icons.js';
import { loadPrefs, DEFAULT_PREFS } from './lib/prefs.js';
import { applyTheme } from './lib/theme.js';

const grid = document.getElementById('grid');
const emptyMsg = document.getElementById('empty');
const search = document.getElementById('search');
const settingsBtn = document.getElementById('open-settings');

let allApps = [];
let prefs = { ...DEFAULT_PREFS };

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
```

- [ ] **Step 3: Smoke test**

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
git add src/popup.css src/popup.js
git commit -m "feat: theme the popup and apply grid columns"
```

- [ ] **Step 6: Manual check (after rebuild):** popup honours the theme (dark when set/system-dark) and column count (4/5 widens it and fits more per row).

---

### Task 4: Theme the settings + Appearance dropdowns

**Files:**
- Overwrite: `src/options.css`
- Modify: `src/options.html`
- Modify: `src/options.js`

**Interfaces:**
- Consumes: `applyTheme` (`lib/theme.js`); existing `loadPrefs`/`savePrefs`/`DEFAULT_PREFS`.
- Produces: a themed settings page with Theme + Columns dropdowns (`#pref-theme`, `#pref-columns`). No exports.

**Note:** DOM glue — verified via the import smoke test + manual checklist.

- [ ] **Step 1: Overwrite `src/options.css`** (colour-variable refactor + dark block; `color-scheme: light` removed — the theme drives it; select styling added)

```css
* { box-sizing: border-box; }
:root {
  --bg: #f8f9fa;
  --fg: #202124;
  --muted: #5f6368;
  --card: #fff;
  --border: #e0e0e0;
  --hover: #f1f3f4;
  --field-bg: #fff;
  --field-border: #ccc;
  --secondary-bg: #e8eaed;
  --secondary-fg: #202124;
  --accent: #4f46e5;
  --danger: #c5221f;
  --danger-bg: #fce8e6;
  --danger-border: #f28b82;
}
[data-theme="dark"] {
  --bg: #1c1c1e;
  --fg: #e8eaed;
  --muted: #9aa0a6;
  --card: #2c2c2e;
  --border: #3a3a3c;
  --hover: #3a3a3c;
  --field-bg: #3a3a3c;
  --field-border: #4a4a4c;
  --secondary-bg: #3a3a3c;
  --secondary-fg: #e8eaed;
  --danger-bg: #4a2b2b;
}
body {
  font-family: -apple-system, system-ui, sans-serif;
  color: var(--fg);
  background: var(--bg);
  margin: 0;
  padding: 24px;
}
main { max-width: 760px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 4px; }
.subtitle { color: var(--muted); font-size: 13px; margin: 0 0 20px; }

.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .panels { grid-template-columns: 1fr; } }

.panel {
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 520px;
}
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.panel-head h2 { font-size: 15px; margin: 0; }
#search {
  flex: 1;
  max-width: 170px;
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid var(--field-border);
  border-radius: 999px;
  background: var(--field-bg);
  color: var(--fg);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  flex: 1;
  align-content: start;
}
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border: none;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  color: inherit;
  -webkit-user-select: none;
  user-select: none;
}
.tile:hover { background: var(--hover); }
.tile img { width: 40px; height: 40px; object-fit: contain; border-radius: 9px; pointer-events: none; }
.tile-label {
  font-size: 12px; text-align: center; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.tile.mine { cursor: grab; }
.tile.mine:active { cursor: grabbing; }
.tile.dragging { opacity: 0.5; }
.tile.drag-over { box-shadow: inset 0 0 0 2px var(--accent); }
.tile .remove {
  position: absolute;
  top: 2px; right: 2px;
  width: 18px; height: 18px;
  padding: 0;
  border: none; border-radius: 50%;
  background: var(--secondary-bg); color: var(--muted);
  font-size: 12px; line-height: 18px;
  text-align: center;
  cursor: pointer;
  display: none;
}
.tile.mine:hover .remove { display: block; }

.empty { color: var(--muted); font-size: 13px; text-align: center; padding: 24px 8px; margin: auto 0; }

.panel-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

button {
  font-size: 14px; padding: 8px 14px; border: none; border-radius: 8px;
  background: var(--accent); color: #fff; cursor: pointer;
}
button.secondary { background: var(--secondary-bg); color: var(--secondary-fg); }

.card {
  background: var(--card); border: 1px solid var(--border); border-radius: 12px;
  padding: 16px; margin-top: 16px; display: flex; flex-direction: column; gap: 10px;
}
.card h2 { font-size: 15px; margin: 0; }
label { display: flex; flex-direction: column; font-size: 13px; gap: 4px; }
input[type=text], input[type=url], input[type=search] {
  font-size: 14px; padding: 8px; border: 1px solid var(--field-border); border-radius: 8px;
  background: var(--field-bg); color: var(--fg);
}
.error { color: var(--danger); font-size: 13px; margin: 0; }
.form-actions { display: flex; gap: 8px; }

/* Create-custom-shortcut modal */
.modal {
  border: none;
  border-radius: 14px;
  padding: 0;
  width: min(420px, calc(100vw - 40px));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  background: var(--card);
  color: var(--fg);
}
.modal::backdrop { background: rgba(0, 0, 0, 0.4); }
.modal form { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.modal h2 { margin: 0 0 4px; font-size: 17px; }
.modal .form-actions { justify-content: flex-end; margin-top: 4px; }

/* SortableJS drag states */
.tile.mine { touch-action: none; }
.sortable-ghost { opacity: 0.35; }
.sortable-drag { opacity: 0.9; }
.sortable-chosen { cursor: grabbing; }
body.sorting .tile:hover { background: transparent; }

/* Available panel becomes a Remove drop zone while dragging a shortcut. */
.panel.removing #available-grid,
.panel.removing #search,
.panel.removing .panel-head h2 { opacity: 0; }
.panel.removing::after {
  content: "Drop here to remove";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 2px dashed var(--border);
  font-size: 15px;
  color: var(--muted);
  pointer-events: none;
}
.panel.removing.remove-hot { background: var(--danger-bg); }
.panel.removing.remove-hot::after { border-color: var(--danger-border); color: var(--danger); }

/* General preferences card */
.general .toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  cursor: pointer;
}
.general .toggle:has(input:disabled) { color: var(--muted); cursor: default; }
.general .toggle select {
  font-size: 14px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--field-border);
  background: var(--field-bg);
  color: var(--fg);
  cursor: pointer;
}
.toggle input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  flex: none;
  width: 40px;
  height: 22px;
  margin: 0;
  border-radius: 999px;
  background: var(--field-border);
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
.toggle input[type="checkbox"]:checked { background: var(--accent); }
.toggle input[type="checkbox"]:checked::after { transform: translateX(18px); }
.toggle input[type="checkbox"]:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 2: Add the Appearance dropdowns** — in `src/options.html`, inside the `<section class="card general">`, add these two rows AFTER the four existing `<label class="toggle">…</label>` rows (before `</section>`):

```html
      <label class="toggle"><span>Theme</span>
        <select id="pref-theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">Follow system</option>
        </select>
      </label>
      <label class="toggle"><span>Columns (popup)</span>
        <select id="pref-columns">
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </label>
```

- [ ] **Step 3: Wire the dropdowns in `src/options.js`**

Add the import (with the other imports):
```js
import { applyTheme } from './lib/theme.js';
```

Add the two element lookups (near `prefLabels`):
```js
const prefTheme = document.getElementById('pref-theme');
const prefColumns = document.getElementById('pref-columns');
```

Inside `initPrefs()`, AFTER `syncBackgroundDisabled();` and BEFORE the existing `function save() {`-block/change handlers, add:
```js
  applyTheme(prefs.theme);
  prefTheme.value = prefs.theme;
  prefColumns.value = String(prefs.gridColumns);
```

Then, alongside the existing checkbox `change` handlers inside `initPrefs()`, add these two:
```js
  prefTheme.addEventListener('change', () => {
    prefs.theme = prefTheme.value;
    applyTheme(prefs.theme);
    save();
  });
  prefColumns.addEventListener('change', () => {
    prefs.gridColumns = Number(prefColumns.value);
    save();
  });
```

(`save()` is the existing helper that calls `savePrefs(prefs).catch(...)`.)

- [ ] **Step 4: Smoke test**

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
git add src/options.css src/options.html src/options.js
git commit -m "feat: theme the settings page and add Theme/Columns dropdowns"
```

- [ ] **Step 7: Manual check (after rebuild):** the settings page themes to Dark and Follow-system (flips live when the Mac appearance changes); the Theme/Columns dropdowns reflect and persist the stored values; all existing toggles/drag still work in both themes.

---

## Notes for the implementer

- Run each task's tests before committing; never commit red tests.
- Keep everything working at defaults (`theme: 'system'`, `gridColumns: 3`) — a system-light Mac must look exactly like today.
- `theme.js` and `prefs.js` live in the folder-referenced `lib/`, so a plain Xcode rebuild bundles them — no converter re-run needed.
- Do not touch the `apps` data shape or the drag/catalog/toggle logic.
