# Import / Export (Backup & Restore) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Backup & Restore to the settings page — an Export button that downloads a JSON file of the full app list + preferences, and an Import button that validates a backup file and (after confirmation) replaces apps + prefs and reloads.

**Architecture:** A new pure, unit-tested `src/lib/backup.js` builds and parses/validates the backup object (with an `app`/`version` marker; it sanitizes apps via `makeApp` and merges prefs over `DEFAULT_PREFS`). `options.js` wires Export (Blob download) and Import (file read → `parseBackup` → confirm → `saveApps`+`savePrefs` → `location.reload()`), with an inline status line for errors.

**Tech Stack:** Vanilla JavaScript (ES modules), Blob/File APIs, `browser.storage.local`, `node:test` + `node:assert`.

## Global Constraints

- Manifest V3; ES modules; `browser.*` promise-based API; no third-party deps.
- Tests use `node:test` + `node:assert`.
- Backup object: `{ app: 'app-launcher', version: 1, apps, prefs }` (`BACKUP_APP = 'app-launcher'`, `BACKUP_VERSION = 1`).
- Export downloads `app-launcher-backup.json`.
- Import **replaces** apps + prefs (no merge), after a `confirm(...)`, then `location.reload()`.
- `parseBackup` throws `Error('Not a valid backup file.')` on bad JSON and `Error("This isn't an App Launcher backup.")` on a missing/incorrect `app` marker or non-array `apps`; malformed app entries (missing name/url) are dropped; ids are regenerated via `makeApp`; prefs merge over `DEFAULT_PREFS`.
- Errors surface in an inline `#backup-status` line — no silent failures.
- No `innerHTML` with user data; do not change the `apps`/`prefs` shapes or existing features.

---

### Task 1: Backup build/parse module (`backup.js`)

**Files:**
- Create: `src/lib/backup.js`
- Test: `test/backup.test.js`

**Interfaces:**
- Consumes: `makeApp` (`appList.js`), `DEFAULT_PREFS` (`prefs.js`).
- Produces:
  - `BACKUP_APP = 'app-launcher'`, `BACKUP_VERSION = 1`.
  - `buildBackup(apps, prefs) -> { app, version, apps, prefs }`.
  - `parseBackup(text) -> { apps, prefs }` — validates and sanitizes; throws with the messages above on invalid input.

- [ ] **Step 1: Write the failing tests** — `test/backup.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_APP, BACKUP_VERSION, buildBackup, parseBackup } from '../src/lib/backup.js';
import { DEFAULT_PREFS } from '../src/lib/prefs.js';

test('buildBackup wraps apps and prefs with the marker', () => {
  const apps = [{ id: '1', name: 'A', url: 'https://a.com' }];
  const prefs = { ...DEFAULT_PREFS, theme: 'dark' };
  const b = buildBackup(apps, prefs);
  assert.equal(b.app, BACKUP_APP);
  assert.equal(b.version, BACKUP_VERSION);
  assert.deepEqual(b.apps, apps);
  assert.deepEqual(b.prefs, prefs);
});

test('parseBackup round-trips a built backup (regenerating ids)', () => {
  const apps = [{ id: 'x', name: 'A', url: 'https://a.com', iconUrl: 'i.png' }];
  const prefs = { ...DEFAULT_PREFS, gridColumns: 5 };
  const out = parseBackup(JSON.stringify(buildBackup(apps, prefs)));
  assert.equal(out.apps.length, 1);
  assert.equal(out.apps[0].name, 'A');
  assert.equal(out.apps[0].url, 'https://a.com');
  assert.equal(out.apps[0].iconUrl, 'i.png');
  assert.ok(out.apps[0].id.length > 0);
  assert.deepEqual(out.prefs, prefs);
});

test('parseBackup throws on non-JSON', () => {
  assert.throws(() => parseBackup('not json {'), /Not a valid backup file/);
});

test('parseBackup rejects a foreign or malformed object', () => {
  assert.throws(() => parseBackup(JSON.stringify({ hello: 'world' })), /isn't an App Launcher backup/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'other', apps: [] })), /isn't an App Launcher backup/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'app-launcher', apps: 'nope' })), /isn't an App Launcher backup/);
});

test('parseBackup drops malformed apps and merges partial prefs over defaults', () => {
  const text = JSON.stringify({
    app: 'app-launcher',
    version: 1,
    apps: [
      { name: 'Good', url: 'https://good.com' },
      { name: 'NoUrl' },
      { url: 'https://noname.com' },
    ],
    prefs: { theme: 'dark' },
  });
  const out = parseBackup(text);
  assert.deepEqual(out.apps.map((a) => a.name), ['Good']);
  assert.ok(out.apps[0].id.length > 0);
  assert.equal(out.prefs.theme, 'dark');
  assert.equal(out.prefs.openInNewTab, true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/backup.test.js`
Expected: FAIL — cannot find module `../src/lib/backup.js`.

- [ ] **Step 3: Implement** — `src/lib/backup.js`:

```js
import { makeApp } from './appList.js';
import { DEFAULT_PREFS } from './prefs.js';

export const BACKUP_APP = 'app-launcher';
export const BACKUP_VERSION = 1;

export function buildBackup(apps, prefs) {
  return { app: BACKUP_APP, version: BACKUP_VERSION, apps, prefs };
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Not a valid backup file.');
  }
  if (!data || data.app !== BACKUP_APP || !Array.isArray(data.apps)) {
    throw new Error("This isn't an App Launcher backup.");
  }
  const apps = data.apps
    .filter((a) => a && a.name && a.url)
    .map((a) => makeApp(a));
  const prefs = {
    ...DEFAULT_PREFS,
    ...(data.prefs && typeof data.prefs === 'object' ? data.prefs : {}),
  };
  return { apps, prefs };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/backup.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all files green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/backup.js test/backup.test.js
git commit -m "feat: add backup build/parse module"
```

---

### Task 2: Backup & Restore UI + wiring

**Files:**
- Modify: `src/options.html`
- Modify: `src/options.css`
- Modify: `src/options.js`

**Interfaces:**
- Consumes: `buildBackup`, `parseBackup` (`lib/backup.js`); existing `saveApps` (`lib/storage.js`), `loadPrefs`, `savePrefs`, `DEFAULT_PREFS` (`lib/prefs.js`); the module-level `apps` array in `options.js`.
- Produces: the Export/Import buttons + their handlers. No exports.

**Note:** DOM glue — verified via the import smoke test + manual checklist.

- [ ] **Step 1: Add the Backup & restore card** — in `src/options.html`, insert this block AFTER the `</section>` that closes the `<section class="card general">` card and BEFORE `<dialog id="custom-dialog" ...>`:

```html
    <section class="card">
      <h2>Backup &amp; restore</h2>
      <div class="backup-actions">
        <button id="export-backup" type="button">Export backup</button>
        <button id="import-backup" class="secondary" type="button">Import backup</button>
      </div>
      <p id="backup-status" class="status" hidden></p>
      <input id="import-file" type="file" accept="application/json,.json" hidden />
    </section>
```

- [ ] **Step 2: Append styles** to `src/options.css`:

```css
/* Backup & restore */
.backup-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.status { font-size: 13px; margin: 0; }
.status.error { color: var(--danger); }
.status.ok { color: var(--muted); }
```

- [ ] **Step 3: Wire it in `src/options.js`** — add the import (with the other imports):

```js
import { buildBackup, parseBackup } from './lib/backup.js';
```

Add the element lookups (near the other `document.getElementById` consts):

```js
const exportBtn = document.getElementById('export-backup');
const importBtn = document.getElementById('import-backup');
const importFile = document.getElementById('import-file');
const backupStatus = document.getElementById('backup-status');
```

Add these handlers at the END of the file (after `initPrefs();`):

```js
function showBackupStatus(message, kind) {
  backupStatus.textContent = message;
  backupStatus.className = `status ${kind}`;
  backupStatus.hidden = false;
}

exportBtn.addEventListener('click', async () => {
  let currentPrefs;
  try {
    currentPrefs = await loadPrefs();
  } catch {
    currentPrefs = { ...DEFAULT_PREFS };
  }
  const blob = new Blob(
    [JSON.stringify(buildBackup(apps, currentPrefs), null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'app-launcher-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', async () => {
  const file = importFile.files && importFile.files[0];
  importFile.value = '';
  if (!file) return;
  let result;
  try {
    result = parseBackup(await file.text());
  } catch (e) {
    showBackupStatus(e.message, 'error');
    return;
  }
  if (!confirm('Replace your apps and settings with this backup? This cannot be undone.')) return;
  await saveApps(result.apps);
  await savePrefs(result.prefs);
  location.reload();
});
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
git commit -m "feat: add Backup & restore (export/import) to settings"
```

- [ ] **Step 7: Manual check (after rebuild):** "Export backup" downloads `app-launcher-backup.json` (open it — readable JSON with app/version/apps/prefs); change your app list, then "Import backup" that file → confirm → the page reloads restored; importing a non-backup file shows the inline error and changes nothing.

---

## Notes for the implementer

- Run each task's tests before committing; never commit red tests.
- Keep all validation/sanitization logic in the tested `backup.js`; `options.js` is glue.
- Export reads the current prefs fresh via `loadPrefs()`; apps is the module-level `apps` array.
- `backup.js` lives in the folder-referenced `lib/`, so a plain Xcode rebuild bundles it — no converter re-run needed.
- Do not touch the drag/catalog/toggle/theme logic.
