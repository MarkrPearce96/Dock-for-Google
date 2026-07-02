# "Add this page" from the Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "+" button to the popup that opens a form pre-filled with the current page's title/URL/favicon, so the page can be added to shortcuts in one click.

**Architecture:** A new pure, unit-tested `draftFromTab(tab)` helper derives the prefilled values (or `null` for non-http pages). The popup gains a "+" button and an inline add form; `popup.js` queries the active tab (`browser.tabs.query`), prefills, validates, and saves via the existing `addApp`/`saveApps`. `manifest.json` gains the `activeTab` permission.

**Tech Stack:** Vanilla JavaScript (ES modules), WebExtension `tabs`/`activeTab`, `browser.storage.local`, `node:test` + `node:assert`.

## Global Constraints

- Manifest V3; ES modules; `browser.*` promise-based API; no third-party deps.
- Tests use `node:test` + `node:assert`.
- New permission: `manifest.json` `permissions` becomes `["storage", "activeTab"]`.
- `draftFromTab(tab) -> { name, url, iconUrl } | null`: `url` must match `^https?:` (else `null`); `name = (tab.title||'').trim()` or the URL hostname if empty; `iconUrl = tab.favIconUrl || ''`. Pure.
- The popup form validates http/https on Add (same as Settings). Non-http active tab → an inline "Can't add this page." note, nothing added.
- Adding is allowed even if a similar URL already exists (consistent with the existing custom-add). No `innerHTML` with page/user data.
- Do not change the Settings page, catalog, or other features.

---

### Task 1: `draftFromTab` helper

**Files:**
- Modify: `src/lib/apps.js`
- Test: `test/apps.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `draftFromTab(tab) -> { name: string, url: string, iconUrl: string } | null`.

- [ ] **Step 1: Add failing tests** — append to `test/apps.test.js`, and add `draftFromTab` to the existing import from `../src/lib/apps.js`:

```js
test('draftFromTab builds a draft from an http(s) tab', () => {
  const d = draftFromTab({ url: 'https://poni.com/x', title: 'PoniPack', favIconUrl: 'https://poni.com/f.ico' });
  assert.deepEqual(d, { name: 'PoniPack', url: 'https://poni.com/x', iconUrl: 'https://poni.com/f.ico' });
});

test('draftFromTab falls back to hostname when title is empty', () => {
  const d = draftFromTab({ url: 'https://sub.example.com/p', title: '   ', favIconUrl: '' });
  assert.equal(d.name, 'sub.example.com');
  assert.equal(d.iconUrl, '');
});

test('draftFromTab returns null for non-http(s) pages', () => {
  assert.equal(draftFromTab({ url: 'about:blank', title: 'x' }), null);
  assert.equal(draftFromTab({ url: 'safari-web-extension://abc/options.html', title: 'x' }), null);
  assert.equal(draftFromTab(null), null);
  assert.equal(draftFromTab({}), null);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/apps.test.js`
Expected: FAIL — `draftFromTab` is not exported.

- [ ] **Step 3: Implement** — append to `src/lib/apps.js`:

```js
export function draftFromTab(tab) {
  const url = (tab && tab.url) || '';
  if (!/^https?:/i.test(url)) return null;
  let name = (tab.title || '').trim();
  if (!name) {
    try {
      name = new URL(url).hostname;
    } catch {
      name = url;
    }
  }
  return { name, url, iconUrl: tab.favIconUrl || '' };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/apps.test.js`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all files green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/apps.js test/apps.test.js
git commit -m "feat: add draftFromTab helper (prefill a shortcut from a tab)"
```

---

### Task 2: Popup "+" button, add form, and `activeTab` permission

**Files:**
- Modify: `src/manifest.json`
- Overwrite: `src/popup.html`
- Overwrite: `src/popup.css`
- Overwrite: `src/popup.js`

**Interfaces:**
- Consumes: `draftFromTab` (`lib/apps.js`); `addApp` (`lib/appList.js`); `saveApps` (`lib/storage.js`); existing popup imports (`seedIfEmpty`, `filterApps`, `SEED_APPS`, `makeApp`, `resolveIcon`, `loadPrefs`, `DEFAULT_PREFS`, `applyTheme`).
- Produces: the popup add-page UI + behavior. No exports.

**Note:** DOM/tabs glue — verified via the import smoke test + manual checklist.

- [ ] **Step 1: Add the `activeTab` permission** — in `src/manifest.json`, change:

```json
  "permissions": ["storage"]
```
to:
```json
  "permissions": ["storage", "activeTab"]
```

- [ ] **Step 2: Overwrite `src/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <div class="search-bar">
    <input id="search" type="text" placeholder="Search and launch" autocomplete="off" autofocus />
    <button id="add-page" title="Add this page" aria-label="Add this page">+</button>
    <button id="open-settings" title="Settings" aria-label="Settings">&#9881;</button>
  </div>
  <div id="grid" class="grid"></div>
  <p id="empty" class="empty" hidden>No apps yet — open Settings to add some.</p>
  <p id="add-note" class="note" hidden></p>
  <form id="add-form" class="add-form" hidden>
    <label>Name <input id="add-name" type="text" required /></label>
    <label>URL <input id="add-url" type="url" required /></label>
    <label>Icon URL (optional) <input id="add-icon" type="url" /></label>
    <p id="add-error" class="error" hidden></p>
    <div class="add-actions">
      <button id="add-cancel" type="button">Cancel</button>
      <button id="add-save" type="submit">Add</button>
    </div>
  </form>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 3: Overwrite `src/popup.css`**

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
#add-page, #open-settings {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--muted);
}
#add-page { font-size: 22px; line-height: 1; }
#open-settings { font-size: 18px; }
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
.note { text-align: center; color: var(--muted); font-size: 13px; padding: 14px 8px; margin: 0; }

/* Add-this-page form */
.add-form { display: flex; flex-direction: column; gap: 8px; padding: 12px 4px; }
.add-form label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
.add-form input {
  font-size: 14px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--fg);
}
.add-form .error { color: #c5221f; font-size: 12px; margin: 0; }
.add-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
.add-actions button { font-size: 14px; padding: 6px 12px; border: none; border-radius: 8px; cursor: pointer; }
#add-save { background: var(--accent); color: #fff; }
#add-cancel { background: var(--hover); color: var(--fg); }
```

- [ ] **Step 4: Overwrite `src/popup.js`**

```js
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
```

- [ ] **Step 5: Import-resolution smoke test**

Run:
```
node --input-type=module -e "import('./src/popup.js').catch(e => { if (/browser|document|window/.test(String(e))) { console.log('OK'); process.exit(0);} console.error(e); process.exit(1); })"
```
Expected: prints `OK`.

- [ ] **Step 6: Full suite still green**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/manifest.json src/popup.html src/popup.css src/popup.js
git commit -m "feat: add 'add this page' button + form to the popup (activeTab)"
```

- [ ] **Step 8: Manual check (after rebuild):** on a normal website, the popup's "+" opens a form pre-filled with that page's name/URL/favicon; **Add** drops it into the grid and it persists; **Cancel** closes the form; on the Safari start page the "+" shows "Can't add this page"; Safari may prompt once to allow access to the active tab.

---

## Notes for the implementer

- Run each task's tests before committing; never commit red tests.
- Keep all logic that can be pure in `draftFromTab` (tested); `popup.js` is glue.
- The popup's launch/search/theme/columns behavior must be unchanged when the "+" isn't used.
- `apps.js` lives in the folder-referenced `lib/`, so a plain Xcode rebuild bundles the change — but note this task edits `manifest.json`, and the manifest is also folder-referenced, so a rebuild picks it up (no converter re-run needed).
