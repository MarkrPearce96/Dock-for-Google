# Duplicate Awareness on Add — Design

**Date:** 2026-07-02
**Status:** Approved

## Summary

When you manually add a page whose URL already exists in your Dock, the add
form warns you — naming the existing shortcut — and lets you add it anyway with
one more click. Nothing is blocked; you decide. This applies to both manual add
paths: the popup "+" modal and the Settings "Create custom shortcut" modal.

## Goals

- Detect when a to-be-added URL matches one already in the user's list, using
  the same normalized comparison the catalog already uses (`normalizeUrl`), so
  `https://Maps.google.com/` matches `https://maps.google.com`.
- On a match, show a **warning** in the form's existing error line, naming the
  existing shortcut: `"Maps" is already in your Dock.`
- Relabel the form's primary button from **Add** / **Save** to **Add anyway**.
- A second submit adds the shortcut and closes the form (the existing behavior).
- The acknowledgement is one-shot: it resets when the dialog reopens or the URL
  field changes, so a stale "Add anyway" can't carry into an unrelated add.

## Non-Goals (YAGNI)

- No change to backup **restore** — importing a saved set is an intentional bulk
  replace, not a manual add, and is not duplicate-checked.
- No change to the Settings **Available** catalog panel — it already hides apps
  you've added (`catalogAvailable`), so catalog adds can't duplicate.
- No dedupe/merge of shortcuts already in the list.
- No blocking and no silent skip — the chosen behavior is warn-and-allow.
- No cross-field matching (e.g. by name) — URL is the identity.

## Architecture / Components

- **`src/lib/apps.js`** (extended, pure, unit-tested):
  - `findDuplicate(apps, url) -> app | null` — returns the first app in `apps`
    whose `normalizeUrl(app.url)` equals `normalizeUrl(url)`, else `null`.
    Reuses the existing `normalizeUrl`. No side effects.

- **`src/popup.js`** (add-page modal):
  - Track a module-level `dupAcknowledged = false`.
  - On the URL input's `input` event and in `showAddForm`, reset
    `dupAcknowledged = false` and restore the save button label to `Add`.
  - In the submit handler, after the URL-validity check and before `addApp`:
    - `const dupe = findDuplicate(allApps, addUrl.value);`
    - If `dupe` and `!dupAcknowledged`: set `addError.textContent =
      `"${dupe.name}" is already in your Dock.``, show it, set the save button
      label to `Add anyway`, set `dupAcknowledged = true`, and `return`
      (don't add yet).
    - Otherwise proceed with the existing `addApp` + `saveApps` + `render` +
      `hideAddForm`.
  - `hideAddForm` already resets the form; also reset `dupAcknowledged = false`
    and the save button label to `Add`.

- **`src/options.js`** (create-custom modal):
  - Same pattern with its own `dupAcknowledged` flag, its `urlInput` `input`
    listener, its `#custom-form` submit handler, and its submit button (label
    `Save` ↔ `Add anyway`). Reset on dialog open (the existing `create-custom`
    click handler that calls `form.reset()`).

- **No HTML/CSS changes.** Both modals already contain the `#add-error` element
  used for the warning text, and the primary button already exists; only its
  text label changes at runtime.

## Data Flow

1. User opens an add modal → `dupAcknowledged = false`, button label default.
2. User submits → URL validated (existing) → `findDuplicate` checked.
3. Match + not yet acknowledged → show warning, relabel button to "Add anyway",
   set acknowledged, stop. (No shortcut added.)
4. User submits again (or there was no match) → `addApp` + save + re-render +
   close. (Existing behavior.)
5. Editing the URL field at any point clears the acknowledgement and restores
   the default button label.

## Error Handling

- Invalid URL still fails first with the existing `Enter a valid http(s) URL.`
  message; duplicate check only runs on a valid URL.
- `findDuplicate` with a malformed URL falls back to `normalizeUrl`'s trimmed
  string comparison (same as the catalog), so it never throws.
- An empty list (`apps = []`) yields no match — returns `null`.

## Testing

**Automated (unit tests) — `findDuplicate`:**
- Exact URL already present → returns that app.
- Case/trailing-slash variant (`https://Maps.google.com/`) → returns the app.
- URL not present → `null`.
- Empty list → `null`.
- Malformed URL compared to a malformed stored URL → matches on trimmed string.

**Manual (both modals):**
- Popup "+": add a page already in the Dock → warning names the existing tile,
  button reads "Add anyway"; click again → the (duplicate) tile is added.
- Editing the URL after the warning restores the "Add" label and clears the
  warning.
- Settings "Create custom shortcut": same two-step behavior with the "Save"
  button becoming "Add anyway".
- A brand-new URL adds on the first click, with no warning (no regression).

## Open Questions / Future Work

- Optional "jump to the existing shortcut" affordance — deferred.
- Duplicate detection during backup restore — deferred (bulk replace is
  intentional).
