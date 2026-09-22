# Installing Dock for Google in Safari

## From a personal release app

Download and open `Dock-for-Google-VERSION.dmg`, drag
**Dock for Google.app** onto the Applications shortcut, then eject the DMG.
Open the app from Applications once to register the
extension. The locally packaged app targets macOS 13 or newer and includes Intel
and Apple Silicon code. It is ad-hoc signed for personal testing, not notarized.
If macOS blocks a trusted copy you built, review it under System Settings →
Privacy & Security. Do not disable system-wide security protections.

Enable Safari's developer features under Settings → Advanced → **Show features
for web developers**, then enable **Allow unsigned extensions** in Safari's
Developer settings (or Develop menu, depending on Safari version). Enable
**Dock for Google** under Safari → Settings → Extensions.
You may need to allow unsigned extensions again after restarting Safari.
See [Apple's Safari extension distribution guidance](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension).

## Build from source

1. Install full Xcode, open it, accept the license, and finish installing its
   required components. Select Xcode's Command Line Tools in Settings → Locations.
2. Clone this private repository or extract the release source archive.
3. Open `Dock for Google/Dock for Google.xcodeproj`. The Xcode project is included;
   regenerating it with the Safari extension converter is unnecessary.
4. Select the **Dock for Google** scheme. Under each target's Signing &
   Capabilities, choose an available signing identity for your own account, or
   use the local ad-hoc build command below for personal testing.
5. Run (⌘R), then enable the extension in Safari as described above.

To package an ad-hoc app without configuring an Apple team, install Node.js 22+
and run from the extracted repository root:

```bash
npm run release
```

The DMG appears in `dist/vVERSION-dmg/`. See [RELEASE.md](RELEASE.md).
A free Apple ID does not guarantee permanently enabled Safari extensions;
signing and distribution depend on the available Apple certificates and Safari's
requirements. See [Apple's signing guidance](https://developer.apple.com/documentation/safariservices/building-a-safari-app-extension).

## Update and restore

Edit files in `src/`, then rebuild. The project references these files directly.
Keep the same bundle identifiers to preserve the extension's identity. Shortcuts
and preferences live in Safari's extension storage; export a backup in the
extension's settings before replacing the app or moving to another Mac. Import
that backup on the new Mac after installation.

## Verify it works

- [ ] Popup opens with eight default apps on a fresh installation.
- [ ] Typing `dr` narrows the default grid to Drive.
- [ ] Clicking a shortcut opens its URL with the selected tab preferences.
- [ ] Settings can add, edit, delete, and drag to reorder shortcuts.
- [ ] Invalid URLs are rejected and duplicate URLs show a warning.
- [ ] Add-current-page fills in the active page's title and URL.
- [ ] Theme, grid columns, labels, and search visibility match preferences.
- [ ] Backup export and import preserve shortcuts and preferences.
- [ ] Relaunch Safari and confirm the extension can be enabled and used.
