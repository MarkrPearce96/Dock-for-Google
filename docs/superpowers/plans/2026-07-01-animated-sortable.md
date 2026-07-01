# Animated Sortable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the settings page's native drag with a custom, pointer-based animated sortable: drag apps from Available into a chosen spot, reorder with a smooth slide-aside gap, and drag a shortcut onto the Available "Remove" zone to delete it.

**Architecture:** Two new pure, unit-tested helpers (`addAppAt`, `insertionIndex`) back a new DOM drag controller `src/sortable.js` (floating clone + FLIP animation + Remove zone). `options.js` wires the controller to both grids and keeps click-to-add and hover-× remove. The popup and saved-data shape are unchanged.

**Tech Stack:** Vanilla JavaScript (ES modules), Pointer Events, CSS transforms/FLIP, `node:test` + `node:assert`.

## Global Constraints

- Manifest V3; ES module syntax; `browser.*` promise-based API.
- No third-party runtime or test dependencies — standard library only (Approach B is deliberately dependency-free).
- Tests use `node:test` + `node:assert`.
- App object: `{ id, name, url, iconUrl? }`; catalog entry: `{ name, url, iconUrl }`.
- Pure functions return NEW arrays; never mutate inputs.
- Keep **click-to-add** (append) and hover-**×** remove; drag adds/reorders/removes.
- Drag begins only after the pointer moves ≈5px from pointerdown (so clicks still register).
- No user-supplied string via `innerHTML` — `textContent` / element properties only.
- Do not modify the popup or the saved-data shape.

---

### Task 1: `addAppAt` — insert an app at an index

**Files:**
- Modify: `src/lib/appList.js`
- Test: `test/appList.test.js`

**Interfaces:**
- Consumes: existing `makeApp`.
- Produces: `addAppAt(list, input, index) -> list` — inserts `makeApp(input)` at `index` clamped to `[0, list.length]`; returns a new array; never mutates input.

- [ ] **Step 1: Add failing tests** — append to `test/appList.test.js` and add `addAppAt` to the existing import from `../src/lib/appList.js`:

```js
test('addAppAt inserts at the given index', () => {
  let list = addApp(addApp([], { name: 'A', url: 'https://a.com' }), { name: 'C', url: 'https://c.com' });
  list = addAppAt(list, { name: 'B', url: 'https://b.com' }, 1);
  assert.deepEqual(list.map((a) => a.name), ['A', 'B', 'C']);
});

test('addAppAt inserts at the start and end', () => {
  let list = addApp([], { name: 'B', url: 'https://b.com' });
  assert.deepEqual(addAppAt(list, { name: 'A', url: 'https://a.com' }, 0).map((a) => a.name), ['A', 'B']);
  assert.deepEqual(addAppAt(list, { name: 'C', url: 'https://c.com' }, 1).map((a) => a.name), ['B', 'C']);
});

test('addAppAt clamps an out-of-range index', () => {
  const list = addApp([], { name: 'A', url: 'https://a.com' });
  assert.deepEqual(addAppAt(list, { name: 'X', url: 'https://x.com' }, -5).map((a) => a.name), ['X', 'A']);
  assert.deepEqual(addAppAt(list, { name: 'Y', url: 'https://y.com' }, 99).map((a) => a.name), ['A', 'Y']);
});

test('addAppAt generates an id and does not mutate the input', () => {
  const list = addApp([], { name: 'A', url: 'https://a.com' });
  const snapshot = JSON.stringify(list);
  const next = addAppAt(list, { name: 'B', url: 'https://b.com' }, 0);
  assert.equal(typeof next[0].id, 'string');
  assert.ok(next[0].id.length > 0);
  assert.equal(JSON.stringify(list), snapshot);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/appList.test.js`
Expected: FAIL — `addAppAt` is not exported.

- [ ] **Step 3: Implement** — append to `src/lib/appList.js`:

```js
export function addAppAt(list, input, index) {
  const app = makeApp(input);
  const i = Math.max(0, Math.min(index, list.length));
  const next = [...list];
  next.splice(i, 0, app);
  return next;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/appList.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/appList.js test/appList.test.js
git commit -m "feat: add addAppAt (insert app at index)"
```

---

### Task 2: `insertionIndex` — pointer position → insertion index

**Files:**
- Create: `src/lib/grid.js`
- Test: `test/grid.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `insertionIndex(centers, x, y) -> number` — `centers` is an ordered array of `{x, y}` tile-center points (visual order). Returns the index to insert at: nearest center by squared distance, then insert *before* it if `x < center.x`, else *after*. Empty `centers` → 0.

- [ ] **Step 1: Write failing tests** — `test/grid.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertionIndex } from '../src/lib/grid.js';

test('empty centers returns 0', () => {
  assert.equal(insertionIndex([], 10, 10), 0);
});

test('single tile: left of center inserts before, right inserts after', () => {
  const centers = [{ x: 50, y: 50 }];
  assert.equal(insertionIndex(centers, 40, 50), 0);
  assert.equal(insertionIndex(centers, 60, 50), 1);
});

test('row of tiles: inserts before/after the nearest by x', () => {
  const centers = [{ x: 50, y: 50 }, { x: 150, y: 50 }, { x: 250, y: 50 }];
  assert.equal(insertionIndex(centers, 30, 50), 0);   // before first
  assert.equal(insertionIndex(centers, 120, 50), 1);  // nearest 150, left of it
  assert.equal(insertionIndex(centers, 170, 50), 2);  // nearest 150, right of it
  assert.equal(insertionIndex(centers, 260, 50), 3);  // after last
});

test('wrapping grid: nearest center picks the right row', () => {
  const centers = [
    { x: 50, y: 50 }, { x: 150, y: 50 },
    { x: 50, y: 150 }, { x: 150, y: 150 },
  ];
  assert.equal(insertionIndex(centers, 140, 150), 3); // nearest bottom-right, left of it
  assert.equal(insertionIndex(centers, 160, 150), 4); // nearest bottom-right, right of it
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/grid.test.js`
Expected: FAIL — cannot find module `../src/lib/grid.js`.

- [ ] **Step 3: Implement** — `src/lib/grid.js`:

```js
export function insertionIndex(centers, x, y) {
  if (centers.length === 0) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const dx = centers[i].x - x;
    const dy = centers[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = i; }
  }
  return x < centers[best].x ? best : best + 1;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/grid.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all files green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/grid.js test/grid.test.js
git commit -m "feat: add insertionIndex geometry helper"
```

---

### Task 3: Pointer-drag controller + wire the settings page

**Files:**
- Create: `src/sortable.js`
- Modify: `src/options.css` (append styles; make `.panel` positioned)
- Overwrite: `src/options.js`

**Interfaces:**
- Consumes: `insertionIndex` (`lib/grid.js`); `addApp`, `addAppAt`, `removeApp`, `moveAppTo`, `makeApp` (`lib/appList.js`); `SEED_APPS`, `filterApps`, `catalogAvailable` (`lib/apps.js`); `resolveIcon` (`lib/icons.js`).
- Produces: `createDragController(config) -> { down(pointerEvent, source) }` where
  `config = { myGrid, availablePanel, onReorder(id, index), onAddAt(entry, index), onRemove(id) }`
  and `source = { kind: 'mine'|'available', id?, entry?, tileEl, onDragStart? }`.

**Note:** `sortable.js` and the `options.js` wiring are DOM/pointer glue — verified via an import-resolution smoke test plus the manual Safari checklist (the decisive go/no-go). Only the pure helpers (Tasks 1–2) are unit-tested.

- [ ] **Step 1: Create `src/sortable.js`**

```js
import { insertionIndex } from './lib/grid.js';

const DRAG_THRESHOLD = 5;

function hit(el, e) {
  const r = el.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}

export function createDragController(config) {
  const { myGrid, availablePanel, onReorder, onAddAt, onRemove } = config;
  let st = null;

  function down(e, source) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    st = { source, x0: e.clientX, y0: e.clientY, dragging: false, index: null };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  function movableTiles() {
    return [...myGrid.querySelectorAll('.tile.mine')]
      .filter((t) => t !== st.source.tileEl && !t.classList.contains('placeholder'));
  }

  function begin(e) {
    st.dragging = true;
    st.source.onDragStart?.();
    const tile = st.source.tileEl;
    const r = tile.getBoundingClientRect();
    st.offX = e.clientX - r.left;
    st.offY = e.clientY - r.top;

    const clone = tile.cloneNode(true);
    clone.classList.add('drag-clone');
    clone.classList.remove('drag-source-hidden');
    clone.style.width = `${r.width}px`;
    clone.style.height = `${r.height}px`;
    clone.style.left = `${r.left}px`;
    clone.style.top = `${r.top}px`;
    document.body.appendChild(clone);
    st.clone = clone;

    const ph = document.createElement('div');
    ph.className = 'tile placeholder';
    st.ph = ph;

    if (st.source.kind === 'mine') {
      tile.classList.add('drag-source-hidden');
      tile.after(ph);
      availablePanel.classList.add('removing');
    }
    document.body.classList.add('dragging-active');
  }

  function move(e) {
    if (!st) return;
    if (!st.dragging) {
      if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) < DRAG_THRESHOLD) return;
      begin(e);
    }
    st.clone.style.left = `${e.clientX - st.offX}px`;
    st.clone.style.top = `${e.clientY - st.offY}px`;

    const overRemove = st.source.kind === 'mine' && hit(availablePanel, e);
    const overMy = hit(myGrid, e) && !overRemove;
    availablePanel.classList.toggle('remove-hot', overRemove);
    st.overRemove = overRemove;
    st.overMy = overMy;

    if (overMy) {
      const tiles = movableTiles();
      const centers = tiles.map((t) => {
        const b = t.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      });
      const idx = insertionIndex(centers, e.clientX, e.clientY);
      showPh(true);
      if (idx !== st.index) { placeAt(tiles, idx); st.index = idx; }
    } else {
      showPh(false);
      st.index = null;
    }
  }

  function placeAt(tiles, idx) {
    const ph = st.ph;
    const first = tiles.map((t) => t.getBoundingClientRect());
    const ref = tiles[idx] || null;
    if (ref) myGrid.insertBefore(ph, ref);
    else myGrid.appendChild(ph);
    tiles.forEach((t, i) => {
      const last = t.getBoundingClientRect();
      const dx = first[i].left - last.left;
      const dy = first[i].top - last.top;
      if (dx || dy) {
        t.style.transition = 'none';
        t.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          t.style.transition = 'transform 160ms ease';
          t.style.transform = '';
        });
      }
    });
  }

  function showPh(on) {
    if (!st.ph) return;
    if (on && !st.ph.isConnected) myGrid.appendChild(st.ph);
    st.ph.style.display = on ? '' : 'none';
  }

  function up() {
    if (st && st.dragging) {
      if (st.overRemove && st.source.kind === 'mine') {
        onRemove(st.source.id);
      } else if (st.overMy && st.index !== null) {
        if (st.source.kind === 'mine') onReorder(st.source.id, st.index);
        else onAddAt(st.source.entry, st.index);
      }
    }
    finish();
  }

  function cancel() { finish(); }

  function finish() {
    if (st) {
      st.clone?.remove();
      st.ph?.remove();
      st.source.tileEl.classList.remove('drag-source-hidden');
      availablePanel.classList.remove('removing', 'remove-hot');
      document.body.classList.remove('dragging-active');
      myGrid.querySelectorAll('.tile.mine').forEach((t) => {
        t.style.transition = '';
        t.style.transform = '';
      });
    }
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    st = null;
  }

  return { down };
}
```

- [ ] **Step 2: Append styles to `src/options.css`** (and make `.panel` positioned so the Remove overlay can fill it)

First, change the existing `.panel` rule to add `position: relative;` — locate:
```css
.panel {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 320px;
}
```
and add `position: relative;` as its first declaration (after the opening brace).

Then append these rules to the end of `src/options.css`:
```css
/* Pointer-drag sortable */
.drag-clone {
  position: fixed;
  z-index: 1000;
  margin: 0;
  pointer-events: none;
  opacity: 0.95;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.drag-source-hidden { display: none !important; }
.tile.placeholder {
  background: #eef0fd;
  border: 2px dashed #c3c9f5;
  border-radius: 10px;
  cursor: default;
  pointer-events: none;
}
body.dragging-active { cursor: grabbing; user-select: none; }
.tile.mine { touch-action: none; }

/* Available panel becomes a Remove drop zone while dragging a shortcut */
.panel.removing #available-grid,
.panel.removing #search,
.panel.removing .panel-head h2 { visibility: hidden; }
.panel.removing::after {
  content: "Drop here to remove";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 2px dashed #d0d0d0;
  font-size: 15px;
  color: #5f6368;
}
.panel.removing.remove-hot { background: #fce8e6; }
.panel.removing.remove-hot::after { border-color: #f28b82; color: #c5221f; }
```

- [ ] **Step 3: Overwrite `src/options.js`**

```js
import { seedIfEmpty, saveApps } from './lib/storage.js';
import { addApp, addAppAt, removeApp, moveAppTo, makeApp } from './lib/appList.js';
import { SEED_APPS, filterApps, catalogAvailable } from './lib/apps.js';
import { resolveIcon } from './lib/icons.js';
import { createDragController } from './sortable.js';

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
let dragMoved = false;

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

const drag = createDragController({
  myGrid,
  availablePanel: availableGrid.closest('.panel'),
  onReorder: (id, index) => persist(moveAppTo(apps, id, index)),
  onAddAt: (entry, index) => persist(addAppAt(apps, entry, index)),
  onRemove: (id) => persist(removeApp(apps, id)),
});

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
  btn.addEventListener('pointerdown', (e) => {
    dragMoved = false;
    drag.down(e, { kind: 'available', entry, tileEl: btn, onDragStart: () => { dragMoved = true; } });
  });
  btn.addEventListener('click', () => {
    if (dragMoved) { dragMoved = false; return; }
    persist(addApp(apps, entry));
  });
  return btn;
}

function makeMyTile(app) {
  const tile = document.createElement('div');
  tile.className = 'tile mine';

  const remove = document.createElement('button');
  remove.className = 'remove';
  remove.type = 'button';
  remove.textContent = '×';
  remove.title = `Remove ${app.name}`;
  remove.addEventListener('click', () => persist(removeApp(apps, app.id)));

  tile.append(makeIcon(app), makeLabel(app.name), remove);

  tile.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.remove')) return;
    drag.down(e, { kind: 'mine', id: app.id, tileEl: tile });
  });

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

- [ ] **Step 4: Import-resolution smoke tests** (both entry modules)

Run:
```
node --input-type=module -e "import('./src/options.js').catch(e => { if (/browser|document|window/.test(String(e))) { console.log('OK'); process.exit(0);} console.error(e); process.exit(1); })"
node --input-type=module -e "import('./src/sortable.js').then(m => { if (typeof m.createDragController === 'function') { console.log('OK'); process.exit(0);} console.error('no export'); process.exit(1); }).catch(e => { console.error(e); process.exit(1); })"
```
Expected: each prints `OK`. `sortable.js` imports only `./lib/grid.js` (pure), so it loads cleanly in Node; `options.js` fails only on DOM/`window` globals.

- [ ] **Step 5: Full suite still green**

Run: `npm test`
Expected: PASS — all files (lib pure helpers include Tasks 1–2; popup unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/sortable.js src/options.js src/options.css
git commit -m "feat: pointer-drag animated sortable (drag-to-position, slide-aside, drag-to-remove)"
```

- [ ] **Step 7: Manual verification (in Safari, after a rebuild — the decisive go/no-go)**

Rebuild in Xcode (Run), open Settings, and confirm:
- [ ] Click an Available app still adds it (append); hover-× still removes; a plain click does NOT start a drag.
- [ ] Dragging a My-shortcut lifts a floating copy that follows the cursor; the source leaves a gap.
- [ ] Reordering: neighbors slide aside to open a gap; dropping in the gap moves the tile there.
- [ ] Dragging an Available app over My shortcuts opens a gap; dropping inserts it at that position.
- [ ] While dragging a shortcut, the Available panel shows "Drop here to remove"; dropping there deletes it (and it reappears in Available if it's a catalog app).
- [ ] Dropping outside any valid target cancels (snap back, no change); popup reflects committed changes.
- [ ] **Judgment call:** if the slide-aside animation is janky or the interaction feels wrong, STOP and report — that is the trigger to switch to Approach A (vendor a sortable library), reusing Tasks 1–2 and the callback wiring.

---

## Notes for the implementer

- Run each task's tests before committing; never commit red tests.
- Keep all list/geometry logic in the tested `src/lib/*` helpers; `sortable.js` and `options.js` are glue.
- Do not modify the popup or the stored-data shape.
- The generated `App Launcher/` Xcode project is git-ignored and folder-references `src/`, so a plain Xcode rebuild picks up these changes — no converter re-run needed.
