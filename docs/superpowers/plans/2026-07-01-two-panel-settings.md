# Two-Panel Catalog Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the App Launcher settings page into a two-panel catalog: a searchable "Available" grid of known apps and a "My shortcuts" grid, with click-to-add, ×-to-remove, and drag-to-reorder.

**Architecture:** Add one pure, unit-tested helper (`catalogAvailable`) plus a URL-normalizer to `apps.js`; the bundled `SEED_APPS` doubles as the catalog. Rewrite `options.html/css/js` into two grid panels — `options.js` is thin DOM glue over already-tested helpers (`addApp`/`removeApp`/`moveAppTo`/`makeApp`/`catalogAvailable`/`filterApps`/`resolveIcon`). The popup and the saved-data shape are untouched.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML/CSS, `browser.storage.local`, Node `node:test` + `node:assert`.

## Global Constraints

- Manifest V3; ES module syntax; `browser.*` promise-based API.
- No third-party runtime or test dependencies — standard library only.
- Tests use `node:test` + `node:assert`.
- App object: `{ id, name, url, iconUrl? }`; catalog entry: `{ name, url, iconUrl }`.
- The **catalog** is the existing `SEED_APPS` array in `src/lib/apps.js`.
- **My shortcuts** are stored under the existing `apps` key in `browser.storage.local`; the saved-data shape does NOT change.
- Adding/removing between panels is **click-based** (click a tile in Available to add; click the **×** badge on a My-shortcuts tile to remove). Reordering within My shortcuts is **drag-based**.
- Search filters the Available grid by **name** only (reuse `filterApps`).
- All mutations route through the existing helpers (`addApp`/`removeApp`/`moveAppTo`/`makeApp`) and the `persist()` funnel; do not reimplement them.
- No user-supplied string may reach the DOM via `innerHTML` — use `textContent` / element properties only.
- The popup (`popup.html/css/js`) is NOT modified.

---

### Task 1: Catalog helpers — `normalizeUrl` + `catalogAvailable`

**Files:**
- Modify: `src/lib/apps.js`
- Test: `test/apps.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `normalizeUrl(url: string) -> string` — `scheme://host/path` lowercased with a single trailing slash stripped; on a malformed URL returns `(url ?? '').trim()`.
  - `catalogAvailable(catalog: Array<{url}>, myApps: Array<{url}>) -> Array` — catalog entries whose `normalizeUrl(url)` is not among the `myApps` normalized URLs; preserves catalog order.

- [ ] **Step 1: Add failing tests** — append to `test/apps.test.js`, and add `normalizeUrl, catalogAvailable` to the existing import from `../src/lib/apps.js`:

```js
test('normalizeUrl lowercases host and strips one trailing slash', () => {
  assert.equal(normalizeUrl('https://Docs.Google.com/'), 'https://docs.google.com');
  assert.equal(normalizeUrl('https://docs.google.com'), 'https://docs.google.com');
  assert.equal(normalizeUrl('HTTPS://MAIL.google.com/mail/'), 'https://mail.google.com/mail');
});

test('normalizeUrl returns trimmed input on malformed url', () => {
  assert.equal(normalizeUrl('  not a url  '), 'not a url');
});

test('catalogAvailable returns the full catalog when no apps are added', () => {
  const catalog = [{ name: 'A', url: 'https://a.com' }, { name: 'B', url: 'https://b.com' }];
  assert.deepEqual(catalogAvailable(catalog, []), catalog);
});

test('catalogAvailable excludes already-added apps by normalized url, preserving order', () => {
  const catalog = [
    { name: 'A', url: 'https://a.com' },
    { name: 'B', url: 'https://b.com' },
    { name: 'C', url: 'https://c.com' },
  ];
  const mine = [{ id: '1', name: 'B', url: 'https://B.com/' }];
  assert.deepEqual(catalogAvailable(catalog, mine).map((e) => e.name), ['A', 'C']);
});

test('catalogAvailable ignores custom (non-catalog) apps', () => {
  const catalog = [{ name: 'A', url: 'https://a.com' }];
  const mine = [{ id: '1', name: 'Custom', url: 'https://custom.example' }];
  assert.deepEqual(catalogAvailable(catalog, mine).map((e) => e.name), ['A']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/apps.test.js`
Expected: FAIL — `normalizeUrl`/`catalogAvailable` are not exported.

- [ ] **Step 3: Implement** — append to `src/lib/apps.js`:

```js
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    let s = `${u.protocol}//${u.hostname}${u.pathname}`.toLowerCase();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return (url ?? '').trim();
  }
}

export function catalogAvailable(catalog, myApps) {
  const have = new Set(myApps.map((a) => normalizeUrl(a.url)));
  return catalog.filter((entry) => !have.has(normalizeUrl(entry.url)));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/apps.test.js`
Expected: PASS (all apps.test.js tests, including the new ones).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all files green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/apps.js test/apps.test.js
git commit -m "feat: add normalizeUrl and catalogAvailable helpers"
```

---

### Task 2: Two-panel markup + styles

**Files:**
- Overwrite: `src/options.html`
- Overwrite: `src/options.css`

**Interfaces:**
- Consumes: nothing (static). Loads `options.js` (rewritten in Task 3) as a module.
- Produces: the DOM structure/IDs that Task 3 wires up — `#available-grid`, `#available-empty`, `#my-grid`, `#my-empty`, `#search`, `#create-custom`, `#restore-defaults`, `#custom-form`, `#add-name`, `#add-url`, `#add-icon`, `#add-error`, `#cancel-custom`.

**Note:** This task delivers the static layout. Verify by opening `src/options.html` in a browser: two side-by-side panel cards ("Available" with a search box, "My shortcuts" with action buttons), the custom-shortcut form hidden. No data/logic yet (that's Task 3).

- [ ] **Step 1: Overwrite `src/options.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>App Launcher — Settings</title>
  <link rel="stylesheet" href="options.css" />
</head>
<body>
  <main>
    <h1>App Launcher</h1>
    <p class="subtitle">Click an app in Available to add it. Hover a shortcut and click × to remove. Drag your shortcuts to reorder.</p>

    <div class="panels">
      <section class="panel">
        <div class="panel-head">
          <h2>Available</h2>
          <input id="search" type="search" placeholder="Search" autocomplete="off" />
        </div>
        <div id="available-grid" class="grid"></div>
        <p id="available-empty" class="empty" hidden></p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>My shortcuts</h2>
        </div>
        <div id="my-grid" class="grid"></div>
        <p id="my-empty" class="empty" hidden>No shortcuts yet — add some from Available.</p>
        <div class="panel-actions">
          <button id="create-custom" type="button">Create custom shortcut</button>
          <button id="restore-defaults" class="secondary" type="button">Restore defaults</button>
        </div>
      </section>
    </div>

    <form id="custom-form" class="card" hidden>
      <h2>Create a custom shortcut</h2>
      <label>Name <input id="add-name" type="text" required /></label>
      <label>URL <input id="add-url" type="url" placeholder="https://example.com" required /></label>
      <label>Custom icon URL (optional) <input id="add-icon" type="url" placeholder="https://…/icon.png" /></label>
      <p id="add-error" class="error" hidden></p>
      <div class="form-actions">
        <button type="submit">Add shortcut</button>
        <button id="cancel-custom" class="secondary" type="button">Cancel</button>
      </div>
    </form>
  </main>
  <script type="module" src="options.js"></script>
</body>
</html>
```

- [ ] **Step 2: Overwrite `src/options.css`**

```css
* { box-sizing: border-box; }
body {
  font-family: -apple-system, system-ui, sans-serif;
  color: #202124;
  background: #f8f9fa;
  margin: 0;
  padding: 24px;
}
main { max-width: 760px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 4px; }
.subtitle { color: #5f6368; font-size: 13px; margin: 0 0 20px; }

.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .panels { grid-template-columns: 1fr; } }

.panel {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 320px;
}
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.panel-head h2 { font-size: 15px; margin: 0; }
#search {
  flex: 1;
  max-width: 170px;
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 999px;
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
}
.tile:hover { background: #f1f3f4; }
.tile img { width: 40px; height: 40px; object-fit: contain; pointer-events: none; }
.tile-label {
  font-size: 12px; text-align: center; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.tile.mine { cursor: grab; }
.tile.mine:active { cursor: grabbing; }
.tile.dragging { opacity: 0.5; }
.tile.drag-over { box-shadow: inset 0 0 0 2px #4f46e5; }
.tile .remove {
  position: absolute;
  top: 2px; right: 2px;
  width: 18px; height: 18px;
  padding: 0;
  border: none; border-radius: 50%;
  background: #e8eaed; color: #5f6368;
  font-size: 12px; line-height: 18px;
  text-align: center;
  cursor: pointer;
  display: none;
}
.tile.mine:hover .remove { display: block; }

.empty { color: #5f6368; font-size: 13px; text-align: center; padding: 24px 8px; margin: auto 0; }

.panel-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

button {
  font-size: 14px; padding: 8px 14px; border: none; border-radius: 8px;
  background: #4f46e5; color: #fff; cursor: pointer;
}
button.secondary { background: #e8eaed; color: #202124; }

.card {
  background: #fff; border: 1px solid #e0e0e0; border-radius: 12px;
  padding: 16px; margin-top: 16px; display: flex; flex-direction: column; gap: 10px;
}
.card h2 { font-size: 15px; margin: 0; }
label { display: flex; flex-direction: column; font-size: 13px; gap: 4px; }
input[type=text], input[type=url] {
  font-size: 14px; padding: 8px; border: 1px solid #ccc; border-radius: 8px;
}
.error { color: #c5221f; font-size: 13px; margin: 0; }
.form-actions { display: flex; gap: 8px; }
```

- [ ] **Step 3: Verify structure**

Run: `grep -c -E 'id="(available-grid|available-empty|my-grid|my-empty|search|create-custom|restore-defaults|custom-form|add-name|add-url|add-icon|add-error|cancel-custom)"' src/options.html`
Expected: `13` (every ID the JS needs is present).

Also open `src/options.html` in a browser and confirm: two panel cards side by side, search box in the Available header, "Create custom shortcut" + "Restore defaults" buttons under My shortcuts, and the custom form hidden.

- [ ] **Step 4: Commit**

```bash
git add src/options.html src/options.css
git commit -m "feat: two-panel settings markup and styles"
```

---

### Task 3: Wire up the two panels (`options.js`)

**Files:**
- Overwrite: `src/options.js`

**Interfaces:**
- Consumes: `seedIfEmpty`, `saveApps` (`lib/storage.js`); `addApp`, `removeApp`, `moveAppTo`, `makeApp` (`lib/appList.js`); `SEED_APPS`, `filterApps`, `catalogAvailable` (`lib/apps.js`); `resolveIcon` (`lib/icons.js`); the DOM IDs from Task 2.
- Produces: the functional settings page. No exports.

**Note:** `options.js` is thin DOM glue over already-tested modules — verified via an import-resolution smoke test plus a manual checklist, not unit tests.

- [ ] **Step 1: Overwrite `src/options.js`**

```js
import { seedIfEmpty, saveApps } from './lib/storage.js';
import { addApp, removeApp, moveAppTo, makeApp } from './lib/appList.js';
import { SEED_APPS, filterApps, catalogAvailable } from './lib/apps.js';
import { resolveIcon } from './lib/icons.js';

const availableGrid = document.getElementById('available-grid');
const availableEmpty = document.getElementById('available-empty');
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
let draggedId = null;

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
  btn.append(makeIcon(entry), makeLabel(entry.name));
  btn.addEventListener('click', () => persist(addApp(apps, entry)));
  return btn;
}

function makeMyTile(app) {
  const tile = document.createElement('div');
  tile.className = 'tile mine';
  tile.draggable = true;

  const remove = document.createElement('button');
  remove.className = 'remove';
  remove.type = 'button';
  remove.textContent = '×';
  remove.title = `Remove ${app.name}`;
  remove.addEventListener('click', () => persist(removeApp(apps, app.id)));

  tile.append(makeIcon(app), makeLabel(app.name), remove);

  tile.addEventListener('dragstart', (e) => {
    draggedId = app.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', app.id);
    tile.classList.add('dragging');
  });
  tile.addEventListener('dragend', () => {
    draggedId = null;
    tile.classList.remove('dragging');
    myGrid.querySelectorAll('.tile.drag-over').forEach((t) => t.classList.remove('drag-over'));
  });
  tile.addEventListener('dragover', (e) => {
    if (draggedId === null || draggedId === app.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    tile.classList.add('drag-over');
  });
  tile.addEventListener('dragleave', (e) => {
    if (!tile.contains(e.relatedTarget)) tile.classList.remove('drag-over');
  });
  tile.addEventListener('drop', (e) => {
    e.preventDefault();
    tile.classList.remove('drag-over');
    if (draggedId === null || draggedId === app.id) return;
    const targetIndex = apps.findIndex((a) => a.id === app.id);
    persist(moveAppTo(apps, draggedId, targetIndex));
  });

  return tile;
}

function render() {
  // My shortcuts
  myGrid.textContent = '';
  apps.forEach((app) => myGrid.append(makeMyTile(app)));
  myEmpty.hidden = apps.length !== 0;

  // Available (catalog minus added, then search filter)
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
```

- [ ] **Step 2: Import-resolution smoke test**

Run:
```
node --input-type=module -e "import('./src/options.js').catch(e => { if (/browser|document/.test(String(e))) { console.log('OK: fails only on browser/DOM globals'); process.exit(0);} console.error(e); process.exit(1); })"
```
Expected: prints `OK: fails only on browser/DOM globals` (confirms every import resolves; DOM/`browser` are undefined outside Safari). If it fails for any other reason (unresolved import, syntax error), STOP — that's a real defect.

- [ ] **Step 3: Full suite still green**

Run: `npm test`
Expected: PASS — all files (popup + lib unchanged; apps.js tests from Task 1 included).

- [ ] **Step 4: Commit**

```bash
git add src/options.js
git commit -m "feat: wire two-panel settings (click add/remove, drag reorder, search, custom, restore)"
```

- [ ] **Step 5: Manual verification (in Safari, after a rebuild)**

Rebuild in Xcode (Run), open the extension's Settings, and confirm:
- [ ] Two panels render; My shortcuts shows your current apps as tiles; Available shows catalog apps not yet added (empty with "All caught up…" when all are added).
- [ ] Clicking a tile in Available moves it into My shortcuts.
- [ ] Hovering a My-shortcuts tile shows a **×**; clicking it removes the app (catalog apps reappear in Available).
- [ ] Dragging a My-shortcuts tile reorders it; the popup reflects the new order.
- [ ] Typing in the search box filters the Available grid; "No apps match your search." shows when nothing matches.
- [ ] "Create custom shortcut" reveals the form; a valid URL adds a shortcut; an invalid URL shows the inline error and does not save; Cancel hides the form.
- [ ] "Restore defaults" (after confirm) repopulates My shortcuts with the default apps.

---

## Notes for the implementer

- Run each task's tests before committing; never commit red tests.
- Keep `options.js` as glue only — all list/catalog logic lives in the tested `src/lib/*` modules.
- The popup and the stored-data shape must not change; this feature only rebuilds the options page and adds two pure helpers.
- The generated `App Launcher/` Xcode project is git-ignored and rebuilt from `src/` (folder-referenced), so a plain Xcode rebuild picks up these changes — no converter re-run needed.
