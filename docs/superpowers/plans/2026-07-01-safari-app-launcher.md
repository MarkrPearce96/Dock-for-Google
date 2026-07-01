# Safari App Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Safari Web Extension whose toolbar popup shows a searchable grid of app icons and whose settings page lets the user add/edit/delete/reorder apps.

**Architecture:** A plain cross-browser MV3 Web Extension. All non-trivial logic lives in dependency-free ES modules under `src/lib/` that are unit-tested with Node's built-in test runner; the popup and options pages are thin DOM glue over those modules. Apple's `safari-web-extension-converter` wraps the finished extension in an Xcode app shell for install.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML/CSS, `browser.storage.local`, Node.js `node:test` + `node:assert` for tests (Node v24 present), `xcrun safari-web-extension-converter` + Xcode 26 for packaging.

## Global Constraints

- Target: Safari 26+ on macOS 26+ (Xcode 26.4.1, Node v24.13.0 confirmed present).
- No third-party runtime or test dependencies — standard library only.
- Manifest V3.
- App list persisted as an ordered array under storage key `apps` in `browser.storage.local`.
- Search filters on app **name** only, case-insensitive substring.
- App click opens the URL in a **new tab** (`browser.tabs.create({ url })`).
- Icon resolution: use `app.iconUrl` if a non-empty string, else `https://www.google.com/s2/favicons?domain=<host>&sz=64`.
- Each app object: `{ id: string, name: string, url: string, iconUrl?: string }`.
- Use ES module syntax (`import`/`export`) everywhere; `package.json` has `"type": "module"`.
- Use the `browser.*` promise-based extension API (Safari/Firefox style), not callback `chrome.*`.

---

### Task 1: Project scaffold + icon resolution module

**Files:**
- Create: `package.json`
- Create: `src/lib/icons.js`
- Test: `test/icons.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `host(url: string) -> string` — hostname, or `""` if the URL is malformed.
  - `resolveIcon(app: {url: string, iconUrl?: string}) -> string` — icon URL.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "app-launcher",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write the failing test** — `test/icons.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { host, resolveIcon } from '../src/lib/icons.js';

test('host extracts hostname', () => {
  assert.equal(host('https://mail.google.com/mail'), 'mail.google.com');
});

test('host returns empty string on malformed url', () => {
  assert.equal(host('not a url'), '');
});

test('resolveIcon prefers a custom iconUrl', () => {
  const app = { url: 'https://x.com', iconUrl: 'https://cdn/x.png' };
  assert.equal(resolveIcon(app), 'https://cdn/x.png');
});

test('resolveIcon falls back to favicon service using host', () => {
  const app = { url: 'https://mail.google.com' };
  assert.equal(
    resolveIcon(app),
    'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64'
  );
});

test('resolveIcon ignores empty-string iconUrl', () => {
  const app = { url: 'https://mail.google.com', iconUrl: '' };
  assert.equal(
    resolveIcon(app),
    'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64'
  );
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/icons.test.js`
Expected: FAIL — cannot find module `../src/lib/icons.js`.

- [ ] **Step 4: Write minimal implementation** — `src/lib/icons.js`

```js
export function host(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function resolveIcon(app) {
  if (typeof app.iconUrl === 'string' && app.iconUrl.length > 0) {
    return app.iconUrl;
  }
  return `https://www.google.com/s2/favicons?domain=${host(app.url)}&sz=64`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/icons.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json src/lib/icons.js test/icons.test.js
git commit -m "feat: add icon resolution module and test harness"
```

---

### Task 2: App seed data + filtering module

**Files:**
- Create: `src/lib/apps.js`
- Test: `test/apps.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SEED_APPS: Array<{name: string, url: string}>` — default apps (no ids; ids are assigned at seed time in Task 4).
  - `filterApps(apps: Array<{name: string}>, query: string) -> Array` — apps whose `name` contains `query` (case-insensitive). Empty/whitespace query returns all apps.

- [ ] **Step 1: Write the failing test** — `test/apps.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_APPS, filterApps } from '../src/lib/apps.js';

const apps = [
  { name: 'Gmail', url: 'https://mail.google.com' },
  { name: 'Drive', url: 'https://drive.google.com' },
  { name: 'Maps', url: 'https://maps.google.com' },
];

test('empty query returns all apps', () => {
  assert.deepEqual(filterApps(apps, ''), apps);
});

test('whitespace-only query returns all apps', () => {
  assert.deepEqual(filterApps(apps, '   '), apps);
});

test('filters by case-insensitive substring of name', () => {
  assert.deepEqual(filterApps(apps, 'ma'), [apps[0], apps[2]]);
});

test('no match returns empty array', () => {
  assert.deepEqual(filterApps(apps, 'zzz'), []);
});

test('SEED_APPS is a non-empty list of name+url objects', () => {
  assert.ok(SEED_APPS.length > 0);
  for (const a of SEED_APPS) {
    assert.equal(typeof a.name, 'string');
    assert.match(a.url, /^https:\/\//);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/apps.test.js`
Expected: FAIL — cannot find module `../src/lib/apps.js`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/apps.js`

```js
export const SEED_APPS = [
  { name: 'Docs', url: 'https://docs.google.com' },
  { name: 'Slides', url: 'https://slides.google.com' },
  { name: 'Sheets', url: 'https://sheets.google.com' },
  { name: 'Drive', url: 'https://drive.google.com' },
  { name: 'Gmail', url: 'https://mail.google.com' },
  { name: 'Photos', url: 'https://photos.google.com' },
  { name: 'Maps', url: 'https://maps.google.com' },
  { name: 'Translate', url: 'https://translate.google.com' },
];

export function filterApps(apps, query) {
  const q = query.trim().toLowerCase();
  if (q === '') return apps;
  return apps.filter((a) => a.name.toLowerCase().includes(q));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/apps.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/apps.js test/apps.test.js
git commit -m "feat: add seed apps and name filter"
```

---

### Task 3: App-list mutation module

**Files:**
- Create: `src/lib/appList.js`
- Test: `test/appList.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (all pure; return a **new** array, never mutate the input):
  - `makeApp({name, url, iconUrl?}) -> {id, name, url, iconUrl?}` — trims fields, generates `id` via `crypto.randomUUID()`, omits `iconUrl` when empty.
  - `addApp(list, input) -> list` — appends `makeApp(input)`.
  - `updateApp(list, id, patch) -> list` — merges `patch` into the matching app; if `patch.iconUrl` is empty/whitespace the key is removed.
  - `removeApp(list, id) -> list` — drops the matching app.
  - `moveApp(list, id, direction) -> list` — swaps the app with its neighbor; `direction` is `'up'` or `'down'`; a no-op at the boundary.

- [ ] **Step 1: Write the failing test** — `test/appList.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, addApp, updateApp, removeApp, moveApp } from '../src/lib/appList.js';

test('makeApp generates id and trims fields', () => {
  const a = makeApp({ name: '  Gmail ', url: ' https://mail.google.com ' });
  assert.equal(a.name, 'Gmail');
  assert.equal(a.url, 'https://mail.google.com');
  assert.equal(typeof a.id, 'string');
  assert.ok(a.id.length > 0);
  assert.ok(!('iconUrl' in a));
});

test('makeApp keeps a non-empty iconUrl', () => {
  const a = makeApp({ name: 'X', url: 'https://x.com', iconUrl: 'https://i/x.png' });
  assert.equal(a.iconUrl, 'https://i/x.png');
});

test('addApp appends without mutating input', () => {
  const list = [];
  const next = addApp(list, { name: 'Gmail', url: 'https://mail.google.com' });
  assert.equal(list.length, 0);
  assert.equal(next.length, 1);
  assert.equal(next[0].name, 'Gmail');
});

test('updateApp merges patch by id', () => {
  const list = addApp([], { name: 'Gmail', url: 'https://mail.google.com' });
  const id = list[0].id;
  const next = updateApp(list, id, { name: 'Mail' });
  assert.equal(next[0].name, 'Mail');
  assert.equal(next[0].url, 'https://mail.google.com');
});

test('updateApp removes iconUrl when patched empty', () => {
  let list = addApp([], { name: 'X', url: 'https://x.com', iconUrl: 'https://i/x.png' });
  const id = list[0].id;
  list = updateApp(list, id, { iconUrl: '  ' });
  assert.ok(!('iconUrl' in list[0]));
});

test('removeApp drops the matching app', () => {
  let list = addApp([], { name: 'Gmail', url: 'https://mail.google.com' });
  const id = list[0].id;
  list = removeApp(list, id);
  assert.equal(list.length, 0);
});

test('moveApp up swaps with previous neighbor', () => {
  let list = addApp(addApp([], { name: 'A', url: 'https://a.com' }), { name: 'B', url: 'https://b.com' });
  const idB = list[1].id;
  list = moveApp(list, idB, 'up');
  assert.deepEqual(list.map((a) => a.name), ['B', 'A']);
});

test('moveApp down at the end is a no-op', () => {
  let list = addApp(addApp([], { name: 'A', url: 'https://a.com' }), { name: 'B', url: 'https://b.com' });
  const idB = list[1].id;
  list = moveApp(list, idB, 'down');
  assert.deepEqual(list.map((a) => a.name), ['A', 'B']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/appList.test.js`
Expected: FAIL — cannot find module `../src/lib/appList.js`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/appList.js`

```js
export function makeApp({ name, url, iconUrl }) {
  const app = {
    id: crypto.randomUUID(),
    name: (name ?? '').trim(),
    url: (url ?? '').trim(),
  };
  const icon = (iconUrl ?? '').trim();
  if (icon) app.iconUrl = icon;
  return app;
}

export function addApp(list, input) {
  return [...list, makeApp(input)];
}

export function updateApp(list, id, patch) {
  return list.map((app) => {
    if (app.id !== id) return app;
    const next = { ...app };
    if ('name' in patch) next.name = patch.name.trim();
    if ('url' in patch) next.url = patch.url.trim();
    if ('iconUrl' in patch) {
      const icon = (patch.iconUrl ?? '').trim();
      if (icon) next.iconUrl = icon;
      else delete next.iconUrl;
    }
    return next;
  });
}

export function removeApp(list, id) {
  return list.filter((app) => app.id !== id);
}

export function moveApp(list, id, direction) {
  const i = list.findIndex((app) => app.id === id);
  if (i === -1) return list;
  const j = direction === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/appList.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/appList.js test/appList.test.js
git commit -m "feat: add app-list mutation helpers"
```

---

### Task 4: Storage persistence module

**Files:**
- Create: `src/lib/storage.js`
- Test: `test/storage.test.js`

**Interfaces:**
- Consumes: `SEED_APPS` from `apps.js`; `makeApp` from `appList.js`.
- Produces:
  - `STORAGE_KEY = 'apps'`
  - `loadApps(area?) -> Promise<Array>` — reads the array (default `[]`).
  - `saveApps(list, area?) -> Promise<void>` — writes the array.
  - `seedIfEmpty(area?) -> Promise<Array>` — if stored list is empty, builds apps from `SEED_APPS` via `makeApp`, saves, and returns them; otherwise returns the stored list.
  - `area` defaults to the live `browser.storage.local`; tests inject a mock.

**Note:** `area` must be an object with promise-returning `get(key)` and `set(obj)` matching the WebExtension storage API.

- [ ] **Step 1: Write the failing test** — `test/storage.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, loadApps, saveApps, seedIfEmpty } from '../src/lib/storage.js';

function mockArea(initial = {}) {
  const store = { ...initial };
  return {
    store,
    async get(key) {
      return key in store ? { [key]: store[key] } : {};
    },
    async set(obj) {
      Object.assign(store, obj);
    },
  };
}

test('loadApps returns [] when nothing stored', async () => {
  const area = mockArea();
  assert.deepEqual(await loadApps(area), []);
});

test('saveApps then loadApps round-trips', async () => {
  const area = mockArea();
  const list = [{ id: '1', name: 'Gmail', url: 'https://mail.google.com' }];
  await saveApps(list, area);
  assert.deepEqual(await loadApps(area), list);
  assert.deepEqual(area.store[STORAGE_KEY], list);
});

test('seedIfEmpty populates from SEED_APPS when empty', async () => {
  const area = mockArea();
  const seeded = await seedIfEmpty(area);
  assert.ok(seeded.length > 0);
  assert.ok(seeded.every((a) => typeof a.id === 'string' && a.id.length > 0));
  assert.deepEqual(await loadApps(area), seeded);
});

test('seedIfEmpty leaves an existing list untouched', async () => {
  const existing = [{ id: '1', name: 'Only', url: 'https://only.com' }];
  const area = mockArea({ [STORAGE_KEY]: existing });
  assert.deepEqual(await seedIfEmpty(area), existing);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/storage.test.js`
Expected: FAIL — cannot find module `../src/lib/storage.js`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/storage.js`

```js
import { SEED_APPS } from './apps.js';
import { makeApp } from './appList.js';

export const STORAGE_KEY = 'apps';

function defaultArea() {
  if (typeof browser !== 'undefined' && browser.storage) return browser.storage.local;
  if (typeof chrome !== 'undefined' && chrome.storage) return chrome.storage.local;
  throw new Error('No extension storage area available');
}

export async function loadApps(area = defaultArea()) {
  const result = await area.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? [];
}

export async function saveApps(list, area = defaultArea()) {
  await area.set({ [STORAGE_KEY]: list });
}

export async function seedIfEmpty(area = defaultArea()) {
  const existing = await loadApps(area);
  if (existing.length > 0) return existing;
  const seeded = SEED_APPS.map((a) => makeApp(a));
  await saveApps(seeded, area);
  return seeded;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/storage.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all four test files, 22 tests total.

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.js test/storage.test.js
git commit -m "feat: add storage persistence with seed-on-empty"
```

---

### Task 5: Toolbar icon assets (dependency-free PNG generator)

**Files:**
- Create: `tools/make-icons.mjs`
- Create (generated, then committed): `src/icons/icon-48.png`, `src/icons/icon-128.png`, `src/icons/icon-256.png`, `src/icons/icon-512.png`

**Interfaces:**
- Consumes: nothing (standalone build script using `node:zlib` + `node:fs`).
- Produces: PNG files used by `manifest.json` (Task 6) for the toolbar action icon. A solid indigo square with a white 2×2 launcher grid.

**Why a generator:** Safari's action icon needs raster PNGs. This script writes valid PNGs with zero dependencies so the build is reproducible; the outputs are committed so implementers don't need to re-run it.

- [ ] **Step 1: Write the generator** — `tools/make-icons.mjs`

```js
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

// --- CRC32 (PNG spec) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// --- Draw one RGBA square icon ---
function drawIcon(size) {
  const bg = [79, 70, 229];      // indigo
  const fg = [255, 255, 255];    // white grid squares
  const px = (x, y) => {
    // 2x2 grid of white squares on the indigo background
    const unit = size / 8;
    const cells = [
      [1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5],
    ];
    for (const [cx, cy] of cells) {
      if (
        x >= cx * unit && x < cx * unit + unit * 1.5 &&
        y >= cy * unit && y < cy * unit + unit * 1.5
      ) return fg;
    }
    return bg;
  };
  // raw image: each row prefixed with filter byte 0
  const raw = Buffer.alloc(size * (1 + size * 4));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = 255;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('../src/icons/', import.meta.url), { recursive: true });
for (const size of [48, 128, 256, 512]) {
  const png = drawIcon(size);
  writeFileSync(new URL(`../src/icons/icon-${size}.png`, import.meta.url), png);
  console.log(`wrote src/icons/icon-${size}.png (${png.length} bytes)`);
}
```

- [ ] **Step 2: Run the generator**

Run: `node tools/make-icons.mjs`
Expected: prints four `wrote src/icons/icon-*.png` lines.

- [ ] **Step 3: Verify the PNGs are valid images**

Run: `sips -g pixelWidth -g pixelHeight src/icons/icon-128.png`
Expected: reports `pixelWidth: 128` and `pixelHeight: 128` (proves the file is a real, readable PNG).

- [ ] **Step 4: Commit**

```bash
git add tools/make-icons.mjs src/icons/
git commit -m "feat: add dependency-free toolbar icon generator and assets"
```

---

### Task 6: Manifest + popup (grid, search, launch)

**Files:**
- Create: `src/manifest.json`
- Create: `src/popup.html`
- Create: `src/popup.css`
- Create: `src/popup.js`

**Interfaces:**
- Consumes: `seedIfEmpty`, `loadApps` from `lib/storage.js`; `filterApps` from `lib/apps.js`; `resolveIcon` from `lib/icons.js`.
- Produces: the toolbar popup UI. No exports consumed by later tasks.

**Note:** `popup.js` is thin DOM glue over already-tested modules; it is verified manually in Task 8, not unit-tested.

- [ ] **Step 1: Create `src/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "App Launcher",
  "version": "1.0",
  "description": "A searchable grid launcher for your favorite web apps.",
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
    "256": "icons/icon-256.png",
    "512": "icons/icon-512.png"
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "permissions": ["storage"]
}
```

Note: `browser.tabs.create({ url })` needs no `tabs` permission, so it is omitted intentionally.

- [ ] **Step 2: Create `src/popup.html`**

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
    <button id="open-settings" title="Settings" aria-label="Settings">&#9881;</button>
  </div>
  <div id="grid" class="grid"></div>
  <p id="empty" class="empty" hidden>No apps yet — open Settings to add some.</p>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `src/popup.css`**

```css
* { box-sizing: border-box; }
body {
  width: 340px;
  margin: 0;
  padding: 8px;
  font-family: -apple-system, system-ui, sans-serif;
  background: #fff;
  color: #202124;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px 12px;
  border-bottom: 1px solid #eee;
}
#search {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  padding: 6px 4px;
}
#open-settings {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 18px;
  color: #5f6368;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
.app:hover { background: #f1f3f4; }
.app img { width: 40px; height: 40px; object-fit: contain; }
.app span {
  font-size: 13px;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty { text-align: center; color: #5f6368; padding: 24px 8px; }
```

- [ ] **Step 4: Create `src/popup.js`**

```js
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
```

- [ ] **Step 5: Verify the modules parse together**

Run: `node --input-type=module -e "import('./src/popup.js').catch(e => { if (/browser|document/.test(String(e))) { console.log('OK: fails only on browser/DOM globals'); process.exit(0);} console.error(e); process.exit(1); })"`
Expected: prints `OK: fails only on browser/DOM globals` (confirms imports resolve; DOM/`browser` are expected to be undefined outside Safari).

- [ ] **Step 6: Commit**

```bash
git add src/manifest.json src/popup.html src/popup.css src/popup.js
git commit -m "feat: add manifest and popup launcher UI"
```

---

### Task 7: Options page (add / edit / delete / reorder)

**Files:**
- Create: `src/options.html`
- Create: `src/options.css`
- Create: `src/options.js`

**Interfaces:**
- Consumes: `seedIfEmpty`, `saveApps` from `lib/storage.js`; `addApp`, `updateApp`, `removeApp`, `moveApp` from `lib/appList.js`; `resolveIcon` from `lib/icons.js`.
- Produces: the settings UI. No exports consumed by later tasks.

**Note:** `options.js` is thin DOM glue over already-tested modules; verified manually in Task 8. URL validation reuses the browser's `URL` constructor.

- [ ] **Step 1: Create `src/options.html`**

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

    <form id="add-form" class="card">
      <h2>Add an app</h2>
      <label>Name <input id="add-name" type="text" required /></label>
      <label>URL <input id="add-url" type="url" placeholder="https://example.com" required /></label>
      <label>Custom icon URL (optional) <input id="add-icon" type="url" placeholder="https://…/icon.png" /></label>
      <p id="add-error" class="error" hidden></p>
      <button type="submit">Add app</button>
    </form>

    <h2>Your apps</h2>
    <ul id="list" class="list"></ul>
  </main>
  <script type="module" src="options.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/options.css`**

```css
* { box-sizing: border-box; }
body {
  font-family: -apple-system, system-ui, sans-serif;
  color: #202124;
  background: #f8f9fa;
  margin: 0;
  padding: 24px;
}
main { max-width: 640px; margin: 0 auto; }
h1 { font-size: 22px; }
h2 { font-size: 16px; margin: 20px 0 8px; }
.card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
label { display: flex; flex-direction: column; font-size: 13px; gap: 4px; }
input {
  font-size: 14px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
button {
  align-self: flex-start;
  font-size: 14px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
}
button.secondary { background: #e8eaed; color: #202124; padding: 6px 10px; }
.error { color: #c5221f; font-size: 13px; margin: 0; }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 8px 12px;
}
.row img { width: 28px; height: 28px; object-fit: contain; }
.row .meta { flex: 1; min-width: 0; }
.row .meta .name { font-weight: 600; }
.row .meta .url { font-size: 12px; color: #5f6368; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row .actions { display: flex; gap: 4px; }
.row.editing .display { display: none; }
.edit-fields { display: none; flex-direction: column; gap: 6px; flex: 1; }
.row.editing .edit-fields { display: flex; }
```

- [ ] **Step 3: Create `src/options.js`**

```js
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
```

- [ ] **Step 4: Verify the module parses and resolves imports**

Run: `node --input-type=module -e "import('./src/options.js').catch(e => { if (/browser|document/.test(String(e))) { console.log('OK: fails only on browser/DOM globals'); process.exit(0);} console.error(e); process.exit(1); })"`
Expected: prints `OK: fails only on browser/DOM globals`.

- [ ] **Step 5: Commit**

```bash
git add src/options.html src/options.css src/options.js
git commit -m "feat: add settings page with add/edit/delete/reorder"
```

---

### Task 8: Package into Safari via converter + install docs

**Files:**
- Create: `docs/INSTALL.md`
- Generated (git-ignored): the Xcode project under `App Launcher/` (already in `.gitignore`).

**Interfaces:**
- Consumes: the finished `src/` extension.
- Produces: a runnable Safari extension + written install/verify instructions.

**Note:** This task is manual verification — no unit tests. Follow the checklist exactly and confirm each observed result.

- [ ] **Step 1: Confirm the full test suite is green**

Run: `npm test`
Expected: PASS — 22 tests across four files.

- [ ] **Step 2: Run the Safari converter on the extension source**

Run: `xcrun safari-web-extension-converter "src" --project-location "." --app-name "App Launcher" --bundle-identifier "com.mark.applauncher" --macos-only --no-open --force`
Expected: prints "Xcode project created" and a warning summary (warnings about `browser_specific_settings` are fine). A folder `App Launcher/` containing `App Launcher.xcodeproj` is created.

- [ ] **Step 3: Build the app from the command line to catch errors early**

Run: `xcodebuild -project "App Launcher/App Launcher.xcodeproj" -scheme "App Launcher (macOS)" -configuration Debug build 2>&1 | tail -20`
Expected: ends with `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Write `docs/INSTALL.md`**

```markdown
# Installing App Launcher in Safari

## One-time build
1. Regenerate icons if needed: `node tools/make-icons.mjs`
2. Run the converter:
   ```
   xcrun safari-web-extension-converter "src" --project-location "." \
     --app-name "App Launcher" --bundle-identifier "com.mark.applauncher" \
     --macos-only --no-open --force
   ```
3. Open `App Launcher/App Launcher.xcodeproj` in Xcode.
4. Select the **App Launcher (macOS)** scheme and press **Run** (⌘R). A small
   container app window appears — you can close it; the extension is now registered.

## Enable in Safari
1. Safari → Settings → **Advanced** → check **Show features for web developers**.
2. In the new **Develop** menu, choose **Allow unsigned extensions**
   (you re-do this each time Safari restarts, unless you sign the app — see below).
3. Safari → Settings → **Extensions** → enable **App Launcher**.
4. Click the puzzle-piece / extension icon in the toolbar → **App Launcher** to open the popup.

## Using it
- Click the toolbar icon → search box + app grid.
- Type to filter by name; click an icon to open it in a new tab.
- Click the gear (⚙) in the popup, or Safari → Settings → Extensions → App Launcher →
  the extension's options, to **add / edit / delete / reorder** apps.

## Make it permanent (optional)
Unsigned extensions turn off when Safari quits. To keep it enabled:
1. In Xcode, select each target → **Signing & Capabilities**.
2. Add your **free Apple ID** under Team, letting Xcode manage signing.
3. Run once more. The extension now persists across restarts without the Develop-menu step.

## Updating the app list code later
Edit files in `src/`, re-run the converter (step 2) with `--force`, rebuild in Xcode.
The stored app list persists across rebuilds (it lives in Safari's extension storage).
```

- [ ] **Step 5: Manual verification checklist in Safari**

Perform each and confirm:
- [ ] Popup opens showing the seeded grid (Docs, Slides, Sheets, Drive, Gmail, Photos, Maps, Translate).
- [ ] Typing `dr` narrows the grid to Drive.
- [ ] Clicking an icon opens that app in a **new tab**.
- [ ] Gear button opens the settings page.
- [ ] Adding an app with a valid URL makes it appear in the grid (reopen popup).
- [ ] Adding an app with an invalid URL shows the inline error and does not save.
- [ ] Edit changes a name/URL; Delete removes; ↑/↓ reorder and the popup reflects the new order.
- [ ] A custom icon URL overrides the favicon.

- [ ] **Step 6: Commit the docs**

```bash
git add docs/INSTALL.md
git commit -m "docs: add Safari install and verification guide"
```

---

## Notes for the implementer

- Run each task's tests before committing; never commit red tests.
- The `App Launcher/` Xcode project is git-ignored — it is a generated artifact rebuilt from `src/`.
- If the converter complains about the `permissions` array, that is expected to succeed with just `["storage"]`; do not add `tabs`.
- Keep all logic in `src/lib/*` covered by tests; treat `popup.js`/`options.js` as glue only.
