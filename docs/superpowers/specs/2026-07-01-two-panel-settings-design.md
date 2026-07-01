# Two-Panel Catalog Settings — Design

**Date:** 2026-07-01
**Status:** Approved

## Summary

Redesign the App Launcher settings page from a single list into a two-panel
"catalog" layout inspired by (but not identical to) the "Shortcuts for Google"
extension. The left panel ("Available") is a searchable grid of known apps not
yet added; the right panel ("My shortcuts") is the user's chosen, ordered apps.
Users click to add/remove between panels and drag to reorder within My shortcuts.

## Goals

- Two side-by-side panels of icon+label tiles (grid, like the popup).
- **Available** shows catalog apps the user has not added (matched by URL).
- **My shortcuts** shows the user's apps; drives the popup.
- Click a tile in Available → add it to My shortcuts.
- A small **×** (on hover) on each My-shortcuts tile → remove it.
- Drag to reorder within My shortcuts (reuse existing drag-and-drop).
- Search box filters the Available grid by name.
- **Create custom shortcut** button opens the existing add form (Name, URL,
  optional icon URL) with http/https validation.
- A **Restore defaults** action re-adds the default set.

## Non-Goals (YAGNI)

- No category filter (the reference's "Popular ▾"). Search only for now.
- No cross-panel drag-and-drop; add/remove is click-based.
- No inline editing of shortcuts. To change a custom shortcut, remove and
  re-create it. (This intentionally drops the current list-row Edit UI.)
- No General-settings toggles (the reference's "Display search / suggestions").
- No change to the popup or to the saved data shape.

## Model

Two concepts:

- **Catalog** — a bundled, static array of known apps `{ name, url, iconUrl }`.
  This is the current `SEED_APPS` (the 8 defaults), repurposed as the catalog.
  It grows over time as more apps/icons are bundled. Source for the Available panel.
- **My shortcuts** — the user's ordered apps, each `{ id, name, url, iconUrl? }`,
  stored under the existing `apps` key in `browser.storage.local` (unchanged).

The **Available** list = catalog entries whose normalized URL is not present in
My shortcuts. Custom (user-created) shortcuts are never in the catalog; they live
only in My shortcuts and simply don't appear in Available.

### URL matching

An app counts as "already added" when its URL matches a My-shortcuts entry after
normalization: lowercase host, strip a single trailing slash, ignore scheme case.
Exact-enough for catalog matching without over-engineering.

## Architecture / Components

The popup is untouched. All work is in the options page plus one pure helper.

- **`src/lib/apps.js`** (extended):
  - `SEED_APPS` remains the catalog (also still the first-run seed).
  - `normalizeUrl(url) -> string` — for matching (lowercased host, no trailing slash).
  - `catalogAvailable(catalog, myApps) -> Array` — catalog entries whose
    `normalizeUrl(url)` is not in the set of `myApps` normalized URLs. Preserves
    catalog order.
  - Existing `filterApps(apps, query)` reused to filter the Available grid.
- **`src/options.html`** (rewritten): two panel cards — Available (title +
  search input + grid) and My shortcuts (title + grid + "Create custom shortcut"
  button + "Restore defaults") — plus the custom-shortcut form (reused fields).
- **`src/options.css`** (rewritten): two-column responsive layout; tile grid
  (icon + label), hover **×** remove badge, drag-over styling (reuse existing).
- **`src/options.js`** (rewritten glue): renders both panels from storage +
  catalog, wires click-to-add, ×-to-remove, drag-reorder, search, custom form,
  restore-defaults. Thin over the tested helpers
  (`addApp`/`removeApp`/`moveApp`/`moveAppTo`/`catalogAvailable`/`filterApps`).

## Data Flow

1. **Load:** `seedIfEmpty()` returns My shortcuts (unchanged first-run behavior:
   catalog seeded as the initial shortcuts). Render My shortcuts grid; render
   Available = `catalogAvailable(SEED_APPS, myApps)` (then `filterApps` by search).
2. **Add:** click Available tile → `persist(addApp(myApps, catalogEntry))` →
   re-render both panels (tile moves left→right).
3. **Remove:** click × on a My-shortcuts tile → `persist(removeApp(myApps, id))`
   → re-render (catalog apps reappear in Available; custom apps vanish).
4. **Reorder:** drag within My shortcuts → `persist(moveAppTo(...))` (existing).
5. **Search:** input event → re-render Available filtered by `filterApps`.
6. **Create custom shortcut:** validate URL → `persist(addApp(myApps, {...}))`.
7. **Restore defaults:** confirm → `persist(SEED_APPS.map(makeApp))`.

All mutations go through the existing `persist()` funnel (save + re-render).

## Error Handling

- Invalid custom-shortcut URL → inline error, not saved (existing behavior).
- Favicon/icon load failure on a tile → letter-tile fallback via `<img onerror>`
  (existing behavior, applied in both panels).
- Storage read failure on load → fall back to in-memory seed (existing behavior).
- Empty Available panel (all catalog apps added) → a friendly "All caught up —
  create a custom shortcut for anything else" message.
- Empty My shortcuts → a friendly prompt to add from Available.

## Testing

**Automated (pure functions):**
- `normalizeUrl` — lowercases host, strips one trailing slash, tolerates missing
  path; malformed input returns input trimmed (no throw).
- `catalogAvailable(catalog, myApps)` — excludes already-added (by normalized
  URL), preserves catalog order, returns full catalog when myApps empty, ignores
  custom (non-catalog) myApps entries.

**Manual (options page):** two-panel render; click-add moves a tile; ×-remove
returns catalog app to Available; custom-app remove deletes it; drag reorders;
search filters Available; create-custom validates and adds; restore-defaults
repopulates; changes reflected in the popup after reopen.

## Open Questions / Future Work

- Category filter for a larger catalog (deferred).
- Re-introduce inline edit if remove-and-recreate proves annoying (deferred).
- Growing the catalog with more apps + bundled icons (ongoing, separate work).
