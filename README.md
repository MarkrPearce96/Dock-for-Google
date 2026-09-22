# Dock for Google

A searchable grid launcher for your favorite web apps, built as a **Safari Web Extension** (Manifest V3). Click the toolbar icon to get a popup with a search box and a grid of app tiles — type to filter, click to launch. Inspired by the Chrome/Brave "Google apps" launcher, but custom-built for Safari.

## Features

- **Search-and-launch popup** — filter apps by name, click a tile to open.
- **Ships with 8 Google apps** (Docs, Slides, Sheets, Drive, Gmail, Photos, Maps, Translate) using high-quality bundled icons, plus a larger catalog you can add from (YouTube, Meet, Gemini, Classroom, Analytics, Search, Calendar, Keep, Contacts, Account).
- **Add the page you're on** — a `+` button in the popup opens a pre-filled modal to add the current tab as a shortcut.
- **Duplicate awareness** — adding a URL that's already in your Dock warns you and lets you "Add anyway".
- **Two-panel settings** — drag between an "Available" catalog and "My shortcuts"; create custom shortcuts with your own icon URL.
- **Appearance** — Light / Dark / Follow-system theme, and 3/4/5 grid columns.
- **General toggles** — open in new tab / background, show or hide the search box and labels.
- **Backup & restore** — export your shortcuts + settings to a JSON file and re-import them.

## Install (Safari, macOS)

Download a personal release app, or build the included Xcode project locally.
See **[docs/INSTALL.md](docs/INSTALL.md)** for installation and Safari's unsigned
extension settings. Personal release builds are ad-hoc signed, not notarized.
Export your shortcuts and settings before moving to another Mac.

## Private GitHub releases

Push a version tag such as **`v1.0.0`** to your private repository. GitHub tests and builds the app, then
publishes a release with a single DMG installer.

The workflow runs **only on version-tag pushes**: one macOS job, a 15-minute timeout,
no caches, no builds on ordinary code pushes, and no Actions artifact storage. Release builds
use GitHub Actions minutes. See **[docs/RELEASE.md](docs/RELEASE.md)** for details.

You can also build locally with macOS and Node.js 22+:

```bash
npm run release             # build and verify the DMG using Xcode
```

## Development

Pure logic lives in `src/lib/` and is unit-tested with Node's built-in test runner:

```bash
npm test
```

The DOM/`browser`-API glue (`src/popup.js`, `src/options.js`) can't run under Node; it requires manual checks in Safari (see the checklist at the end of [docs/INSTALL.md](docs/INSTALL.md)).

### Layout

- `src/manifest.json` — MV3 manifest (permissions: `storage`, `activeTab`).
- `src/popup.{html,css,js}` — the launcher popup.
- `src/options.{html,css,js}` — the settings page.
- `src/lib/` — pure modules: app list, storage, prefs, theme, backup, icon resolution, duplicate detection.
- `src/icons/` — toolbar/app icons and per-app tile icons.
- `test/` — unit tests for the pure modules.
- `docs/` — install guide and design specs/plans.

## License

Private project. Google app names and icons are trademarks of Google LLC; this is a personal launcher and is not affiliated with or endorsed by Google.
