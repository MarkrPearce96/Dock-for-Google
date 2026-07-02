# Installing Dock for Google in Safari

## One-time build
1. Open Terminal and move into the project folder first (every command below is
   relative to it — running them from elsewhere gives "Could not find extension at src"):
   ```
   cd "/Users/mark/Documents/Chrome Extension"
   ```
2. (No action needed) The toolbar/app icons are committed PNGs in `src/icons/`, rendered from the source `src/icons/app-icon-source.svg`. To change them, replace that SVG and re-render the four `icon-*.png` sizes (48/128/256/512).
3. Run the converter:
   ```
   xcrun safari-web-extension-converter "src" --project-location "." \
     --app-name "Dock for Google" --bundle-identifier "com.mark.Dock-for-Google" \
     --macos-only --no-open --force
   ```
4. Open `Dock for Google/Dock for Google.xcodeproj` in Xcode.
5. Select the **Dock for Google** scheme and press **Run** (⌘R). A small
   container app window appears — you can close it; the extension is now registered.

## Enable in Safari
1. Safari → Settings → **Advanced** → check **Show features for web developers**.
2. In the new **Develop** menu, choose **Allow unsigned extensions**
   (you re-do this each time Safari restarts, unless you sign the app — see below).
3. Safari → Settings → **Extensions** → enable **Dock for Google**.
4. Click the puzzle-piece / extension icon in the toolbar → **Dock for Google** to open the popup.

## Using it
- Click the toolbar icon → search box + app grid.
- Type to filter by name; click an icon to open it in a new tab.
- Click the gear (⚙) in the popup, or Safari → Settings → Extensions → Dock for Google →
  the extension's options, to **add / edit / delete / reorder** apps.

## Make it permanent (optional)
Unsigned extensions turn off when Safari quits. To keep it enabled:
1. In Xcode, select each target → **Signing & Capabilities**.
2. Add your **free Apple ID** under Team, letting Xcode manage signing.
3. Run once more. The extension now persists across restarts without the Develop-menu step.

## Updating the app list code later
Edit files in `src/`, re-run the converter (step 2) with `--force`, then rebuild with the **Dock for Google** scheme in Xcode.
The stored app list persists across rebuilds (it lives in Safari's extension storage).

## Verify it works
After enabling the extension, confirm each of these:
- [ ] Popup opens showing the seeded 8-app grid (Docs, Slides, Sheets, Drive, Gmail, Photos, Maps, Translate).
- [ ] Typing `dr` in the search box narrows the grid to Drive only.
- [ ] Clicking an app icon opens its URL in a new tab.
- [ ] The gear (⚙) button in the popup opens the settings page.
- [ ] Adding an app with a valid URL saves it, and it appears in the popup grid.
- [ ] Adding an app with an invalid URL shows an inline error and does not save.
- [ ] Edit changes a name/URL; Delete removes an app; the ↑/↓ buttons reorder, and the popup reflects the new order.
- [ ] Entering a custom icon URL overrides the auto-fetched favicon.
