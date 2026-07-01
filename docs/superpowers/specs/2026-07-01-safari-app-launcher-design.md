# Safari App Launcher — Design

**Date:** 2026-07-01
**Status:** Approved

## Summary

A Safari Web Extension for macOS that reproduces the Chrome/Brave "Google Apps launcher"
experience: a toolbar popup showing a search box and a grid of app icons. Typing filters
the grid; clicking an icon opens that app in a new tab. A settings (options) page lets the
user add, edit, delete, and reorder apps themselves — no code editing required.

## Goals

- Toolbar popup with a searchable icon grid.
- Live filtering of the grid as the user types (filter-only; no web-search fallback).
- Clicking an app opens its URL in a **new tab**.
- User-editable app list via a settings page (add / edit / delete / reorder).
- Per-app icons auto-fetched from the site favicon, with an optional custom icon URL override.
- Runs in Safari 26+ on macOS 26+ (user has Xcode 26.4.1 installed).

## Non-Goals (YAGNI)

- No web-search / smart-launch behavior in the search box (filter only).
- No "reuse existing tab" logic — always opens a new tab.
- No cloud sync of the app list across devices (local storage only).
- No App Store distribution work — local/dev install only for now.

## Build Approach

Write the extension as a **plain cross-browser Web Extension** (manifest + HTML/CSS/JS),
then wrap it with Apple's converter to produce an Xcode app shell:

```
xcrun safari-web-extension-converter <extension-dir> --macos-only
```

The user opens the generated project in Xcode, Runs it, and enables the extension in Safari.

**Why this over the Xcode Safari template:** the web code stays clean and portable (the same
source would run in Chrome/Brave/Firefox with minimal change), and Xcode is only a thin shell.

## Architecture

Standard MV3 Web Extension. No background service worker required for v1 (popup opens tabs
directly). Components:

- **`manifest.json`** — MV3. Declares the browser-action popup, the options page, and the
  `storage` permission. `tabs` permission for opening new tabs (or use `browser.tabs.create`,
  which works with activeTab/no special permission in Safari — verified during implementation).
- **Popup** (`popup.html`, `popup.css`, `popup.js`) — search input at top, responsive icon
  grid below. Reads the app list from storage, renders the grid, filters live on input,
  and opens the clicked app via `browser.tabs.create({ url })`.
- **Options page** (`options.html`, `options.css`, `options.js`) — a manageable list of apps
  with Add / Edit / Delete and reorder. Reorder via drag-and-drop, with up/down arrow buttons
  as an accessible fallback. Edit form fields: **Name**, **URL**, **Custom icon URL (optional)**.
- **Shared modules** (pure, unit-tested):
  - `storage.js` — load/save the app list to `browser.storage.local`; add/update/remove/reorder helpers.
  - `icons.js` — resolve an app's icon URL.
  - `apps.js` — the default seed list + filtering logic.

## Data Model

Each app is a plain object:

```js
{
  id: string,       // stable unique id (e.g. crypto.randomUUID())
  name: string,     // display label, e.g. "Gmail"
  url: string,      // launch target, e.g. "https://mail.google.com"
  iconUrl?: string  // optional custom icon; overrides the auto favicon
}
```

The full list is stored under a single key (e.g. `apps`) in `browser.storage.local` as an
ordered array. Order in the array is the display order.

### Icon resolution

```
resolveIcon(app):
  if app.iconUrl is a non-empty string -> return app.iconUrl
  else -> return "https://www.google.com/s2/favicons?domain=" + host(app.url) + "&sz=64"
```

`host(url)` extracts the hostname; on a malformed URL it falls back to a neutral placeholder
(e.g. a letter tile or generic icon) rather than throwing.

### Seed data

On first run (storage empty), seed a starter set so the popup isn't blank. Starter apps:
Docs, Slides, Sheets, Drive, Gmail, Photos, Maps, Translate — each pointing at its Google URL.
The user can then edit/remove/add freely.

## Data Flow

1. **Popup open:** load `apps` from storage → render grid → attach search `input` listener →
   attach click handlers that call `browser.tabs.create`.
2. **Filtering:** on each keystroke, filter apps by case-insensitive substring match on `name`
   only; re-render the grid. Pure function `filterApps(apps, query)`.
3. **Settings edit:** options page mutates the array via storage helpers, then persists.
   Because both views read from `browser.storage.local`, the popup reflects changes next time
   it opens. (Optional nicety: a `storage.onChanged` listener to live-update an open popup —
   deferred unless trivial.)

## Error Handling

- Malformed/empty URL when adding an app → inline validation error in the options form; do not save.
- Favicon fails to load in the grid → `<img onerror>` swaps to a letter-tile / placeholder.
- Empty app list → popup shows a friendly "No apps yet — add some in Settings" message with a
  link to the options page.
- Storage read failure → fall back to the in-memory seed list so the popup still works.

## Testing

**Automated (unit tests on pure functions):**
- `filterApps(apps, query)` — matches on name only, case-insensitive, empty query returns all, no-match returns [].
- `resolveIcon(app)` — custom override wins; otherwise builds correct favicon URL; malformed URL → placeholder.
- storage helpers — add appends, update by id, remove by id, reorder (move up/down / to index) preserve integrity.
- `host(url)` — extracts hostname; handles missing scheme and malformed input.

**Manual (Safari/Xcode wrapper — checklist provided to user):**
- Converter runs and Xcode project builds.
- Extension appears and can be enabled in Safari (Allow unsigned extensions).
- Popup renders grid; search filters; click opens app in a new tab.
- Options page add/edit/delete/reorder persists across popup reopen and Safari relaunch (when signed).

## Install / Run (to be documented for the user)

1. Run the converter on the extension source.
2. Open the generated `.xcodeproj` in Xcode, select the macOS target, Run.
3. In Safari: Settings → Advanced → "Show features for web developers"; Develop menu →
   "Allow unsigned extensions" (re-enable after each Safari quit for unsigned dev builds).
4. Safari → Settings → Extensions → enable "App Launcher"; grant site access as prompted.
5. For permanent use without re-enabling: sign the app target with a free Apple ID in Xcode.

**Caveat:** unsigned extensions are disabled when Safari quits and must be re-allowed via the
Develop menu. Signing with a free Apple ID makes it persistent.

## Open Questions / Future Work

- Live popup refresh via `storage.onChanged` (deferred; add only if trivial).
- "Reuse existing tab" launch mode (explicitly out of scope for v1).
- iCloud/`storage.sync` for cross-device app lists (out of scope for v1).
- Cross-browser packaging (Chrome/Brave/Firefox) — the source is written to allow it later.
