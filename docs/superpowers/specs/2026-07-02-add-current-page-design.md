# "Add this page" from the Popup — Design

**Date:** 2026-07-02
**Status:** Approved

## Summary

Add a "+" button to the launcher popup that adds the page you're currently
viewing to your shortcuts. Clicking it opens a compact form **pre-filled** with
the current page's title, URL, and favicon, so you can add it with one more click
or tweak the details first — without opening Settings.

## Goals

- A **"+" button** in the popup's top bar, next to the gear (⚙).
- Clicking it reveals an inline add form in the popup, pre-filled from the active tab:
  - **Name** = page title (falls back to the hostname if the title is empty)
  - **URL** = the current page URL
  - **Icon URL** = the page's favicon (optional; blank falls back to the auto favicon)
- **Add** saves the shortcut (it appears in the grid immediately); **Cancel** closes the form.
- On a non-`http(s)` page (Safari start page, extension pages), the "+" shows a brief "Can't add this page" note instead of a form.
- URL validated (http/https) on Add, same as the Settings custom-add.

## Non-Goals (YAGNI)

- No auto-add without the confirm form (the form is the confirm step; you can just click Add).
- No duplicate detection/merge — adding a page whose URL already exists is allowed (consistent with the existing custom-add).
- No change to the Settings page, the catalog, or existing features beyond adding the permission.

## Permission

Add **`activeTab`** to `manifest.json` permissions (currently `["storage"]` → `["storage", "activeTab"]`).
`activeTab` grants access to the active tab's `url`, `title`, and `favIconUrl`
**only when the user invokes the extension** (opening the popup counts). It does
not allow background reading of pages. Safari may show a one-time permission grant.

## Architecture / Components

- **`src/lib/apps.js`** (extended, pure, unit-tested):
  - `draftFromTab(tab) -> { name, url, iconUrl } | null` — returns a prefilled
    draft for the active tab, or `null` if the tab's URL isn't `http(s)`.
    - `url = tab.url`; must match `^https?:` (else return `null`).
    - `name = (tab.title || '').trim()`; if empty, the URL's hostname; if that
      fails, the raw URL.
    - `iconUrl = tab.favIconUrl || ''`.
- **`src/popup.html`**: a `+` button (`#add-page`) in `.search-bar` next to
  `#open-settings`; a hidden add-form section (`#add-form`) with `#add-name`,
  `#add-url`, `#add-icon` inputs, an `#add-error` line, and Add (`#add-save`) /
  Cancel (`#add-cancel`) buttons; plus a status line (`#add-note`) for the
  "can't add" case.
- **`src/popup.css`**: styles for the "+" button, the inline form, and the note
  (reusing the existing color variables / field styles).
- **`src/popup.js`**:
  - On "+" click: `const [tab] = await browser.tabs.query({ active: true, currentWindow: true })`;
    `draft = draftFromTab(tab)`. If `null` → show the "Can't add this page" note
    briefly. Else prefill the three inputs, hide the grid, show the form, focus Name.
  - **Add**: validate URL (http/https) via the existing `isValidUrl` pattern; on
    failure show `#add-error`; on success `await saveApps(addApp(allApps, {...}))`,
    update `allApps`, hide the form, re-render the grid (the new tile shows).
  - **Cancel** (and Escape): hide the form, reset it, show the grid.
- **`src/manifest.json`**: add `"activeTab"` to `permissions`.

## Data Flow

1. Popup open → existing render (unchanged).
2. Click "+" → query active tab → `draftFromTab` → prefill + show form (or the note).
3. Add → validate → `addApp` + `saveApps` → re-render grid with the new shortcut → hide form.
4. Cancel/Escape → discard, show grid.

## Error Handling

- Non-`http(s)` active tab → `draftFromTab` returns `null` → inline note, no form, nothing added.
- Invalid URL on Add → inline `#add-error`, not saved.
- `browser.tabs.query` unavailable/empty (shouldn't happen when invoked) → treat as "can't add this page".
- Blank favicon → stored `iconUrl` empty → `resolveIcon` falls back to the domain favicon (existing behavior).

## Testing

**Automated (unit tests):**
- `draftFromTab` — https tab → name from title, url passthrough, favicon passthrough;
  empty title → hostname; non-http (e.g. `about:blank`, `safari-web-extension://…`)
  → `null`; missing favicon → `iconUrl: ''`.

**Manual (popup):** on a normal site, "+" opens the form pre-filled with that
site's name/URL/icon; Add drops it into the grid; Cancel/Escape closes it; on the
Safari start page the "+" shows "Can't add this page"; a rebuild is required and
Safari may prompt once to allow the active-tab permission.

## Open Questions / Future Work

- Duplicate warning ("already in your shortcuts") — deferred; allowed for now.
- One-click instant add (no form) as a future toggle — deferred; the prefilled form is the chosen behavior.
