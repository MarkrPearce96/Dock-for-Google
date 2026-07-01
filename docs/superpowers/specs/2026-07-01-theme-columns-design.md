# Appearance Settings (Dark Mode + Grid Columns) — Design

**Date:** 2026-07-01
**Status:** Approved

## Summary

Add two appearance preferences to the App Launcher: a **theme** (Light / Dark /
Follow system) applied to both the popup and the settings page, and a **grid
columns** choice (3 / 4 / 5) for the popup launcher grid (which also widens the
popup to fit). Both persist in the existing `prefs` store and are exposed as
dropdowns in the settings "General" card.

## Goals

- `theme` pref: `'light' | 'dark' | 'system'` (default `'system'`).
  - Applied to **both** the popup and the settings page.
  - `'system'` resolves to the OS appearance via `prefers-color-scheme` and
    **live-updates** if the OS appearance changes while a page is open.
- `gridColumns` pref: `3 | 4 | 5` (default `3`).
  - Applies to the **popup** launcher grid only; the settings tile grids stay 3-wide.
  - The popup widens to fit the chosen column count.
- Two dropdowns in the settings "General" card (Theme, Columns); both save on
  change; the theme applies live in the settings page.

## Non-Goals (YAGNI)

- No per-surface theme (one theme applies everywhere).
- No custom accent colour or full theme editor.
- No columns control for the settings panels (popup only).
- No change to the `apps` data shape or the drag/catalog/toggle features.

## Preferences Model

Extend `DEFAULT_PREFS` in `src/lib/prefs.js` with:

```js
theme: 'system',   // 'light' | 'dark' | 'system'
gridColumns: 3,    // 3 | 4 | 5
```

`loadPrefs` already merges the stored object over `DEFAULT_PREFS`, so existing
stored prefs (without these keys) get the new defaults. **The existing
`prefs.test.js` tests that assert `DEFAULT_PREFS` and round-trip a full prefs
object must be updated to include the two new keys.**

## Theming Approach

- **CSS variables:** refactor `popup.css` and `options.css` so colours come from
  a shared set of custom properties defined on `:root` (light values), with a
  `[data-theme="dark"]` block that redefines them for dark. Proposed variables:
  `--bg` (page), `--fg` (text), `--muted` (secondary text), `--card`
  (panel/popup/modal surface), `--border`, `--hover` (tile hover), `--field-bg`,
  `--field-border`. `--accent` (`#4f46e5`) and `--danger` (`#c5221f`) stay
  constant across themes.
  - Light: `--bg #f8f9fa` (popup `--bg #fff`), `--fg #202124`, `--muted #5f6368`,
    `--card #fff`, `--border #e0e0e0`, `--hover #f1f3f4`, `--field-bg #fff`,
    `--field-border #ccc`.
  - Dark: `--bg #1c1c1e`, `--fg #e8eaed`, `--muted #9aa0a6`, `--card #2c2c2e`,
    `--border #3a3a3c`, `--hover #3a3a3c`, `--field-bg #3a3a3c`,
    `--field-border #4a4a4c`.
- **New `src/lib/theme.js`:**
  - `resolveTheme(pref, prefersDark) -> 'light' | 'dark'` — pure: `'light'`/`'dark'`
    return themselves; `'system'` returns `prefersDark ? 'dark' : 'light'`; any
    other value falls back to `'light'`. Unit-tested.
  - `applyTheme(pref, root = document.documentElement)` — DOM glue: computes the
    effective theme via `resolveTheme(pref, matchMedia('(prefers-color-scheme: dark)').matches)`,
    sets `root.dataset.theme` to `'light'`/`'dark'` and `root.style.colorScheme`
    accordingly. When `pref === 'system'`, it also (idempotently) attaches a
    `matchMedia` `change` listener that re-applies on OS-appearance change.
- Both `popup.js` and `options.js` call `applyTheme(prefs.theme)` on load;
  `options.js` also re-applies on the theme dropdown's `change`.
- `color-scheme` is set so native controls (inputs, the modal, scrollbars) match
  the theme — this also supersedes the fixed `color-scheme: light` currently on
  `options.css` body (that line is removed; the theme drives it).

## Grid Columns

- Popup `.grid` uses `grid-template-columns: repeat(var(--cols, 3), 1fr);`.
- On popup load, set `--cols` from `gridColumns` and widen the popup body:
  `document.body.style.width = (40 + gridColumns * 100) + 'px'` → 340 / 440 / 540px
  for 3 / 4 / 5. (`--cols` is set on `document.documentElement`.)
- Settings tile grids are unchanged.

## Settings UI

In the existing General card, add an "Appearance" pair of rows (reusing the
`.toggle` row layout: a label + a control):
- **Theme** — `<select id="pref-theme">` with options Light / Dark / Follow system
  (values `light` / `dark` / `system`).
- **Columns** — `<select id="pref-columns">` with options 3 / 4 / 5.

On `change`: update the in-page prefs object, `savePrefs(prefs)` (with a `.catch`
log, matching the existing pattern), and for theme call `applyTheme(...)` so the
settings page re-themes immediately.

## Data Flow

1. **Popup open:** load prefs → `applyTheme(prefs.theme)` and set `--cols` +
   width from `prefs.gridColumns` → render. (Existing toggle behaviours unchanged.)
2. **Settings open:** load prefs → `applyTheme(prefs.theme)` → set the Theme and
   Columns dropdowns' values → render, plus the existing toggle wiring.
3. **Change theme/columns:** update the prefs object, save, and (theme) re-apply
   live. Columns takes effect the next time the popup opens.

## Error Handling

- A stored `theme`/`gridColumns` outside the allowed values: `resolveTheme`
  falls back to `'light'`; the columns value is clamped/validated to `[3,5]`
  before use (out-of-range → 3).
- `loadPrefs` failure → `DEFAULT_PREFS` (existing behaviour); the page still
  themes and lays out with defaults.
- `matchMedia` unavailable (non-browser) → `applyTheme` guards and treats system
  as light.

## Testing

**Automated (unit tests):**
- `resolveTheme` — `'light'`→light, `'dark'`→dark, `'system'`+prefersDark→dark,
  `'system'`+!prefersDark→light, unknown→light.
- `prefs.test.js` updated: `DEFAULT_PREFS` now includes `theme: 'system'` and
  `gridColumns: 3`; the merge and round-trip tests include the two keys.

**Manual (popup + settings):** switching Theme to Dark darkens both surfaces;
Follow system matches the Mac and flips live when the Mac appearance changes;
Columns 4/5 widens the popup and lays out more icons per row; all existing
toggles and drag still work in both themes.

## Open Questions / Future Work

- Custom accent colour (deferred).
- Per-surface theming (deferred; out of scope).
