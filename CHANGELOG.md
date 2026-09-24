# Changelog

## 1.2.0

- Fixed: the Safari extension silently failed to register at all (no error, just missing from Settings → Extensions) on current macOS — Safari refuses to compute a code signing dictionary for ad-hoc or self-signed extensions. Release builds are now signed with a real, Apple-issued personal Apple Development certificate (still not notarized) instead of ad-hoc.
- The release script now verifies the built app's signature chains to a real Apple certificate authority before packaging.

## 1.1.0

- Installable via Homebrew: `brew install --cask markrpearce96/tap/dock-for-google`.
- Release packaging switched from a DMG to a zip archive (Homebrew casks mount/extract either format silently, and zip has no disk-image mounting failure modes); the release script now also verifies the built app's sandbox entitlements before packaging.
- Repository is now public under the MIT license (excluding the bundled Google app icons, which remain Google's own trademarked assets).

## 1.0.0

Initial personal-use release of Dock for Google for Safari.

- Searchable Google app launcher with custom shortcuts and duplicate detection.
- Drag-and-drop shortcut organization and an expanded Google app catalog.
- Light, dark, and system themes with configurable grid and launch preferences.
- Add the current page and back up or restore shortcuts and settings.
- Version-tag-triggered GitHub Actions releases with a DMG installer, no caches, and no builds on ordinary code pushes.
- Optional local release packaging.
