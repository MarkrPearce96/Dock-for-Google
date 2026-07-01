# General Settings Toggles — Design

**Date:** 2026-07-01
**Status:** Approved

## Summary

Add a "General" preferences section under the two settings panels with four
toggle switches that change launcher behaviour: open apps in a new tab vs. the
current tab, open new tabs in the background, show/hide the popup search box, and
show/hide the app labels. Preferences persist in their own `prefs` object in
`browser.storage.local` (separate from the `apps` list) and are applied by the
popup when it opens.

## Goals

- Four toggles in a "General" card below the panels:
  - **Open in new tab** (default `true`) — off navigates the current tab.
  - **Open in background** (default `false`) — new tab opens without switching to it.
  - **Show search box** (default `true`) — hides the popup's search bar when off.
  - **Show app labels** (default `true`) — hides the names under popup icons when off.
- Toggling saves immediately (no Save button).
- The popup reads and applies the prefs on open.
- **Open in background** only applies when **Open in new tab** is on; its toggle is disabled (greyed) when new-tab is off.

## Non-Goals (YAGNI)

- No live update of an already-open popup when a toggle changes (applies on next open).
- No dark-mode / theme toggle (separate future work).
- No per-app behaviour overrides.
- No change to the `apps` data shape or the drag/catalog features.

## Preferences Model

A new object stored under the key `prefs` in `browser.storage.local`:

```js
const DEFAULT_PREFS = {
  openInNewTab: true,
  openInBackground: false,
  showSearch: true,
  showLabels: true,
};
```

Loading merges the stored object over the defaults, so missing keys fall back to
their default (forward-compatible when new prefs are added later).

## Architecture / Components

- **`src/lib/prefs.js`** (new) — mirrors the `storage.js` pattern:
  - `DEFAULT_PREFS` — the object above.
  - `PREFS_KEY = 'prefs'`.
  - `loadPrefs(area?) -> Promise<prefs>` — reads the object, merged over `DEFAULT_PREFS`.
  - `savePrefs(prefs, area?) -> Promise<void>` — writes the object.
  - `setPref(key, value, area?) -> Promise<prefs>` — loads, sets one key, saves, returns the new prefs.
  - `area` defaults to the live `browser.storage.local`; tests inject a mock (as `storage.js` does).
- **`src/options.html`** — add a `<section class="panel general">` (or a card) after `.panels`, containing four rows: a label + a checkbox styled as a switch (`#pref-new-tab`, `#pref-background`, `#pref-search`, `#pref-labels`).
- **`src/options.css`** — a toggle-switch style for the checkboxes and the General card layout.
- **`src/options.js`** — on load, `loadPrefs()` and set each checkbox's `checked`; disable `#pref-background` when `#pref-new-tab` is unchecked. On `change`, `setPref(...)` and re-apply the disabled state.
- **`src/popup.js`** — on load, `loadPrefs()` and apply:
  - Click handler: `openInNewTab ? browser.tabs.create({ url, active: !openInBackground }) : browser.tabs.update({ url })`.
  - `showSearch === false` → hide the search bar (`#search`'s container).
  - `showLabels === false` → add a `no-labels` class to the grid/body.
- **`src/popup.css`** — `.no-labels .app span { display: none; }` (and any spacing tweak); hidden-search handled via an attribute/class.

## Data Flow

1. **Settings load:** `loadPrefs()` → set the four checkboxes; grey `#pref-background` if new-tab off.
2. **Toggle change:** `setPref(key, checked)` persists; if `new-tab` changed, update the background toggle's disabled state.
3. **Popup open:** `loadPrefs()` → wire the click behaviour and apply show/hide classes before/at render.

The `prefs` object is fully independent of `apps`; existing apps/drag/catalog code is untouched.

## Error Handling

- Storage read failure in `loadPrefs` → return `DEFAULT_PREFS` (popup and settings still work with defaults).
- A malformed/partial stored `prefs` → missing keys fall back to defaults via the merge.
- `openInBackground` is ignored at click time when `openInNewTab` is false (belt-and-suspenders with the disabled toggle).

## Testing

**Automated (unit tests, mock storage area like `storage.test.js`):**
- `loadPrefs` returns `DEFAULT_PREFS` when nothing stored.
- `loadPrefs` merges a partial stored object over the defaults.
- `savePrefs` then `loadPrefs` round-trips.
- `setPref` changes one key, persists, leaves the others at their prior values, and returns the new prefs.

**Manual (popup + settings):** toggling each switch persists (reopen settings); new-tab off navigates the current tab; background on opens without focusing the tab; hiding search removes the search bar; hiding labels removes the names — all reflected the next time the popup opens.

## Open Questions / Future Work

- Dark-mode / theme toggle (separate, larger feature).
- Live-applying pref changes to an open popup via `storage.onChanged` (deferred).
