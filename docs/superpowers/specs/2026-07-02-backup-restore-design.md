# Import / Export (Backup & Restore) — Design

**Date:** 2026-07-02
**Status:** Approved

## Summary

Add Backup & Restore to the settings page: an **Export** button that downloads a
JSON file containing the full app list and all preferences, and an **Import**
button that reads a backup file and — after confirmation — **replaces** the
current apps and preferences with the file's contents, then reloads the settings
page so everything reflects the restore.

## Goals

- **Export:** download `app-launcher-backup.json` = `{ app, version, apps, prefs }`.
- **Import:** pick a `.json` file → validate → confirm → replace apps + prefs →
  reload the settings page.
- A backup marker (`app: 'app-launcher'`, `version: 1`) so a file can be verified
  as our backup and the format can evolve.
- Clear, inline errors for a bad or foreign file (no silent failures).

## Non-Goals (YAGNI)

- No merge-on-import (replace only).
- No cloud/automatic backups or scheduling.
- No partial export (apps-only). The backup is always full (apps + prefs).
- No change to the `apps`/`prefs` shapes or existing features.

## File Format

```json
{
  "app": "app-launcher",
  "version": 1,
  "apps": [ { "id": "…", "name": "Docs", "url": "https://docs.google.com", "iconUrl": "icons/apps/docs.svg" } ],
  "prefs": { "openInNewTab": true, "openInBackground": false, "showSearch": true, "showLabels": true, "theme": "system", "gridColumns": 3 }
}
```

## Architecture / Components

- **`src/lib/backup.js`** (new, pure, unit-tested):
  - `BACKUP_APP = 'app-launcher'`, `BACKUP_VERSION = 1`.
  - `buildBackup(apps, prefs) -> { app: BACKUP_APP, version: BACKUP_VERSION, apps, prefs }`.
  - `parseBackup(text) -> { apps, prefs }` — `JSON.parse` (throws `Error('Not a valid backup file.')` on failure); require `data.app === BACKUP_APP` (else `Error("This isn't an App Launcher backup.")`); require `Array.isArray(data.apps)` (else the same error). Sanitize: `apps = data.apps.filter(a => a && a.name && a.url).map(a => makeApp(a))` (regenerates ids, trims, keeps optional `iconUrl`); `prefs = { ...DEFAULT_PREFS, ...(data.prefs && typeof data.prefs === 'object' ? data.prefs : {}) }`. Imports `makeApp` (`appList.js`) and `DEFAULT_PREFS` (`prefs.js`).
- **`src/options.js`** wiring:
  - **Export:** `const blob = new Blob([JSON.stringify(buildBackup(apps, prefs), null, 2)], { type: 'application/json' })`; create an object URL; click a temporary `<a download="app-launcher-backup.json">`; revoke the URL.
  - **Import:** a hidden `<input type="file" accept="application/json,.json">`; on `change`, `await file.text()`, `parseBackup(...)`; on success `confirm('Replace your apps and settings with this backup? This cannot be undone.')` → `await saveApps(result.apps)` + `await savePrefs(result.prefs)` → `location.reload()`; on parse error, show the message in the inline status line; reset the input value so re-selecting the same file re-fires `change`.
  - The in-page `prefs` object (already held in `initPrefs`) is exposed to the export handler; apps is the module-level `apps`.
- **`src/options.html`**: a `<section class="card">` titled "Backup & restore" with `#export-backup` and `#import-backup` buttons, a hidden `#import-file` input, and a `#backup-status` line.
- **`src/options.css`**: a small style for the status line (reuse existing button/card styles; `--danger`/`--muted` for status text).

## Data Flow

1. **Export:** read in-page `apps` + `prefs` → `buildBackup` → JSON string → Blob → download.
2. **Import:** file → text → `parseBackup` → confirm → `saveApps` + `savePrefs` →
   `location.reload()` (re-runs `init()`/`initPrefs()`, re-reading storage so the
   grids, toggles, theme, and columns all reflect the imported data).

## Error Handling

- `JSON.parse` failure → `Error('Not a valid backup file.')` → shown in `#backup-status`.
- Missing/incorrect `app` marker or non-array `apps` → `Error("This isn't an App Launcher backup.")` → shown in status.
- Individual malformed app entries (missing name/url) are dropped by the sanitize filter; the rest import.
- Imported prefs merge over `DEFAULT_PREFS`; unknown values are harmless (existing clamps handle `gridColumns`/`theme` at apply time).
- Export never fails on valid in-memory state; the temporary object URL is revoked after use.

## Testing

**Automated (unit tests):**
- `buildBackup` — returns the marker + version and the given apps/prefs.
- `parseBackup` round-trips a `JSON.stringify(buildBackup(...))` string back to
  equivalent apps (by name/url/iconUrl) and prefs.
- `parseBackup` throws on non-JSON, on a foreign object (no/incorrect `app`
  marker), and on non-array `apps`.
- `parseBackup` sanitizes: drops entries missing name/url; regenerates ids;
  merges partial prefs over `DEFAULT_PREFS`.

**Manual (settings):** Export downloads a readable JSON file; editing the app
list then importing that file restores it (with a confirm) and the page reflects
it after reload; importing a random/invalid file shows the inline error and
changes nothing.

## Open Questions / Future Work

- Merge-on-import mode (deferred; replace-only for now).
- Versioned migration if the format changes (the `version` field reserves for it).
