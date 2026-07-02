# Duplicate Awareness on Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user manually adds a page whose URL already exists in their Dock, warn them (naming the existing shortcut) and let them add it anyway with one more click.

**Architecture:** A new pure `findDuplicate(apps, url)` helper in `src/lib/apps.js` (reusing the existing `normalizeUrl`) is unit-tested in isolation. Both manual add modals — the popup "+" (`src/popup.js`) and Settings "Create custom shortcut" (`src/options.js`) — call it in their submit handler and implement a two-step confirm: first submit on a match shows a warning and relabels the primary button to "Add anyway"; a second submit adds. The acknowledgement resets when the modal reopens or the URL field changes.

**Tech Stack:** Vanilla JS ES modules; Node `node:test` + `node:assert/strict` (`npm test`); Safari Web Extension (MV3). No new dependencies.

## Global Constraints

- No new runtime or test dependencies.
- Warning copy is exactly: `"<name>" is already in your Dock.` (double-quoted shortcut name).
- Popup primary button toggles between `Add` and `Add anyway`; Settings primary button toggles between `Save` and `Add anyway`.
- URL identity uses the existing `normalizeUrl` — no new comparison logic.
- Behavior is warn-and-allow: never block, never silently skip.
- No HTML or CSS changes — both modals already have `#add-error` and a primary submit button.
- No change to backup restore or the Settings "Available" catalog panel.
- Duplicate check runs only after the existing http(s) URL-validity check passes.

---

### Task 1: `findDuplicate` helper

**Files:**
- Modify: `src/lib/apps.js` (append a new exported function after `catalogAvailable`)
- Test: `test/apps.test.js` (add `findDuplicate` to the import on line 3; append tests)

**Interfaces:**
- Consumes: existing `normalizeUrl(url)` from the same file.
- Produces: `findDuplicate(apps, url) -> app | null` — returns the first element of `apps` whose `normalizeUrl(app.url)` equals `normalizeUrl(url)`, else `null`. `apps` is an array of `{ name, url, ... }`; `url` is a string.

- [ ] **Step 1: Write the failing tests**

In `test/apps.test.js`, change the import on line 3 to add `findDuplicate`:

```js
import { SEED_APPS, CATALOG_APPS, filterApps, normalizeUrl, catalogAvailable, draftFromTab, findDuplicate } from '../src/lib/apps.js';
```

Append these tests to the end of the file:

```js
test('findDuplicate returns the matching app for an exact url', () => {
  const list = [
    { id: '1', name: 'Maps', url: 'https://maps.google.com' },
    { id: '2', name: 'Gmail', url: 'https://mail.google.com' },
  ];
  assert.equal(findDuplicate(list, 'https://maps.google.com').name, 'Maps');
});

test('findDuplicate matches ignoring case and a trailing slash', () => {
  const list = [{ id: '1', name: 'Maps', url: 'https://maps.google.com' }];
  assert.equal(findDuplicate(list, 'https://Maps.google.com/').name, 'Maps');
});

test('findDuplicate returns null when the url is not present', () => {
  const list = [{ id: '1', name: 'Maps', url: 'https://maps.google.com' }];
  assert.equal(findDuplicate(list, 'https://docs.google.com'), null);
});

test('findDuplicate returns null for an empty list', () => {
  assert.equal(findDuplicate([], 'https://maps.google.com'), null);
});

test('findDuplicate matches malformed urls on trimmed string equality', () => {
  const list = [{ id: '1', name: 'Weird', url: '  not a url  ' }];
  assert.equal(findDuplicate(list, 'not a url').name, 'Weird');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `findDuplicate is not a function` (or an import error) on the new tests; the existing tests still pass.

- [ ] **Step 3: Implement `findDuplicate`**

In `src/lib/apps.js`, append after the `catalogAvailable` function (after its closing `}` near line 49):

```js
export function findDuplicate(apps, url) {
  const target = normalizeUrl(url);
  return apps.find((a) => normalizeUrl(a.url) === target) || null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green (the 5 new ones plus the existing suite).

- [ ] **Step 5: Commit**

```bash
git add src/lib/apps.js test/apps.test.js
git commit -m "feat: add findDuplicate helper for duplicate-url detection"
```

---

### Task 2: Wire duplicate warning into both add modals

**Files:**
- Modify: `src/popup.js` (import, a button reference, a flag, `showAddForm`, `hideAddForm`, a URL-input listener, the submit handler)
- Modify: `src/options.js` (import, a button reference, a flag, the create-open handler, the close handler, a URL-input listener, the submit handler)

**Interfaces:**
- Consumes: `findDuplicate(apps, url) -> app | null` from `src/lib/apps.js` (Task 1).
- Produces: no new exports — this is UI wiring.

**Verification note:** `src/popup.js` and `src/options.js` import `browser`/DOM globals, so they can't run under Node. After editing, verify each with the import-resolution smoke test shown in Step 5, and rely on `npm test` for the pure `findDuplicate` logic.

- [ ] **Step 1: Wire the popup modal (`src/popup.js`)**

**1a.** On line 2, add `findDuplicate` to the `apps.js` import:

```js
import { filterApps, SEED_APPS, draftFromTab, findDuplicate } from './lib/apps.js';
```

**1b.** Add a reference to the save button next to the other element refs (immediately after the `const addNote = document.getElementById('add-note');` line):

```js
const addSave = document.getElementById('add-save');
```

**1c.** Add a module-level acknowledgement flag next to `let allApps = [];` / `let prefs = ...` (after those lines):

```js
let dupAcknowledged = false;
```

**1d.** In `showAddForm`, reset the flag and button label. Change the function body from:

```js
function showAddForm(draft) {
  addName.value = draft.name;
  addUrl.value = draft.url;
  addIcon.value = draft.iconUrl;
  addError.hidden = true;
  addNote.hidden = true;
  addDialog.showModal();
  addName.focus();
}
```

to:

```js
function showAddForm(draft) {
  addName.value = draft.name;
  addUrl.value = draft.url;
  addIcon.value = draft.iconUrl;
  addError.hidden = true;
  addNote.hidden = true;
  dupAcknowledged = false;
  addSave.textContent = 'Add';
  addDialog.showModal();
  addName.focus();
}
```

**1e.** In `hideAddForm`, reset the flag and button label. Change:

```js
function hideAddForm() {
  addDialog.close();
  addForm.reset();
  addError.hidden = true;
}
```

to:

```js
function hideAddForm() {
  addDialog.close();
  addForm.reset();
  addError.hidden = true;
  dupAcknowledged = false;
  addSave.textContent = 'Add';
}
```

**1f.** Add a URL-input listener that clears the acknowledgement. Place it immediately after the `addCancel.addEventListener('click', () => hideAddForm());` line:

```js
addUrl.addEventListener('input', () => {
  dupAcknowledged = false;
  addSave.textContent = 'Add';
});
```

**1g.** In the submit handler, insert the duplicate check after the `isValidUrl` block and before the `allApps = addApp(...)` line. The handler currently reads:

```js
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
  render(filterApps(allApps, search.value));
  hideAddForm();
});
```

Insert the check so it becomes:

```js
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addError.hidden = true;
  if (!isValidUrl(addUrl.value)) {
    addError.textContent = 'Enter a valid http(s) URL.';
    addError.hidden = false;
    return;
  }
  const dupe = findDuplicate(allApps, addUrl.value);
  if (dupe && !dupAcknowledged) {
    addError.textContent = `"${dupe.name}" is already in your Dock.`;
    addError.hidden = false;
    addSave.textContent = 'Add anyway';
    dupAcknowledged = true;
    return;
  }
  allApps = addApp(allApps, {
    name: addName.value,
    url: addUrl.value,
    iconUrl: addIcon.value,
  });
  await saveApps(allApps);
  render(filterApps(allApps, search.value));
  hideAddForm();
});
```

- [ ] **Step 2: Wire the Settings modal (`src/options.js`)**

**2a.** On line 4, add `findDuplicate` to the `apps.js` import:

```js
import { SEED_APPS, CATALOG_APPS, filterApps, catalogAvailable, findDuplicate } from './lib/apps.js';
```

**2b.** Add a reference to the submit button after the `const cancelBtn = document.getElementById('cancel-custom');` line (the Settings submit button has no id, so select it from the form):

```js
const saveBtn = form.querySelector('button[type="submit"]');
```

**2c.** Add a module-level flag. Place it immediately after the element-reference block, near the top-level `let` declarations (search for the existing `let apps` declaration and add this line after it):

```js
let dupAcknowledged = false;
```

**2d.** In the create-open handler, reset the flag and label. Change:

```js
createBtn.addEventListener('click', () => {
  dialog.showModal();
  nameInput.focus();
});
```

to:

```js
createBtn.addEventListener('click', () => {
  dupAcknowledged = false;
  saveBtn.textContent = 'Save';
  dialog.showModal();
  nameInput.focus();
});
```

**2e.** In the close handler, also reset the flag and label. Change:

```js
dialog.addEventListener('close', () => {
  form.reset();
  addError.hidden = true;
});
```

to:

```js
dialog.addEventListener('close', () => {
  form.reset();
  addError.hidden = true;
  dupAcknowledged = false;
  saveBtn.textContent = 'Save';
});
```

**2f.** Add a URL-input listener that clears the acknowledgement. Place it immediately after the `cancelBtn.addEventListener('click', () => dialog.close());` line:

```js
urlInput.addEventListener('input', () => {
  dupAcknowledged = false;
  saveBtn.textContent = 'Save';
});
```

**2g.** In the submit handler, insert the duplicate check after the `isValidUrl` block and before the `await persist(addApp(...))` call. The handler currently reads:

```js
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
  dialog.close();
});
```

Insert the check so it becomes:

```js
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  addError.hidden = true;
  if (!isValidUrl(urlInput.value)) {
    addError.textContent = 'Enter a valid http(s) URL.';
    addError.hidden = false;
    return;
  }
  const dupe = findDuplicate(apps, urlInput.value);
  if (dupe && !dupAcknowledged) {
    addError.textContent = `"${dupe.name}" is already in your Dock.`;
    addError.hidden = false;
    saveBtn.textContent = 'Add anyway';
    dupAcknowledged = true;
    return;
  }
  await persist(addApp(apps, {
    name: nameInput.value,
    url: urlInput.value,
    iconUrl: iconInput.value,
  }));
  dialog.close();
});
```

- [ ] **Step 3: Run the unit suite (no regression)**

Run: `npm test`
Expected: PASS — the full suite is green (the pure `findDuplicate` logic is covered by Task 1; these edits are UI wiring).

- [ ] **Step 4: Smoke-test module resolution for `popup.js`**

Run:

```bash
node --input-type=module -e "import('./src/popup.js').catch(e => { if (/browser|document|window/.test(String(e))) {console.log('smoke OK');process.exit(0)} else {console.error(e);process.exit(1)} })"
```

Expected: prints `smoke OK` (the import resolves; it fails only on the expected `browser`/`document` global, proving no syntax/import error).

- [ ] **Step 5: Smoke-test module resolution for `options.js`**

Run:

```bash
node --input-type=module -e "import('./src/options.js').catch(e => { if (/browser|document|window/.test(String(e))) {console.log('smoke OK');process.exit(0)} else {console.error(e);process.exit(1)} })"
```

Expected: prints `smoke OK`.

- [ ] **Step 6: Commit**

```bash
git add src/popup.js src/options.js
git commit -m "feat: warn on duplicate url when adding a shortcut (both modals)"
```

---

## Manual Verification (after both tasks, in Safari)

Rebuild in Xcode, then:
- Popup "+": add a page already in the Dock → the warning names the existing tile and the button reads "Add anyway"; click again → the (duplicate) tile is added.
- After the warning, edit the URL field → the button returns to "Add" and the warning clears; reopen the modal → also reset.
- Settings "Create custom shortcut": entering an existing URL shows the same warning with the "Save" button becoming "Add anyway"; a brand-new URL saves on the first click.
- A brand-new URL in the popup adds on the first click, with no warning (no regression).
