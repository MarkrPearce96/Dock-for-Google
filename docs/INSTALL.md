# Installing Dock for Google in Safari

## Via Homebrew

```bash
brew tap markrpearce96/tap
brew install --cask dock-for-google
```

The first `brew install` from this tap prompts a one-time
`brew trust markrpearce96/tap` (or `brew trust --cask markrpearce96/tap/dock-for-google`)
confirmation — Homebrew gates casks from third-party taps behind this step.
Approve it to continue. The Cask is signed with a personal Apple Development
certificate but not notarized; see the Gatekeeper step below after installing.

To update: `brew upgrade --cask dock-for-google`. To remove it along with most
of its saved state: `brew uninstall --zap dock-for-google`.

`--zap` removes the app's preferences, caches, and sandbox container data, but
macOS itself protects the sandbox container's own metadata file from deletion
by any process, including a direct `rm -rf` in Terminal — you'll see
"Operation not permitted" on `.com.apple.containermanagerd.metadata.plist`.
Granting your terminal app Full Disk Access first (System Settings → Privacy
& Security → Full Disk Access) lets `--zap` remove it too. Safari also keeps
its own separate record of the extension inside Safari's own container,
which `--zap` does not reach; it's harmless left behind, but if you want it
gone, remove it manually after uninstalling.

## From a personal release app

Download `Dock-for-Google-VERSION.zip`, unzip it (double-click, or your browser
unzips it automatically), then drag **Dock for Google.app** to your Applications
folder. Open the app from Applications once to register the
extension. The locally packaged app targets macOS 13 or newer and includes Intel
and Apple Silicon code. It's signed with a personal Apple Development
certificate, not notarized. On first launch Gatekeeper will likely block it as
from an "unidentified developer" — this is expected for a non-notarized app,
not a sign anything is wrong. Open it once anyway: go to System Settings → Privacy
& Security, scroll down, and click **Open Anyway** next to the warning (only
needed once per install). Right-click → Open does not reliably bypass this on
current macOS, so use the System Settings route. Do not disable system-wide
security protections.

Enable Safari's developer features under Settings → Advanced → **Show features
for web developers**, then enable **Allow unsigned extensions** in Safari's
Developer settings (or Develop menu, depending on Safari version). Enable
**Dock for Google** under Safari → Settings → Extensions.
You may need to allow unsigned extensions again after restarting Safari.
See [Apple's Safari extension distribution guidance](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension).

## Build from source

1. Install full Xcode, open it, accept the license, and finish installing its
   required components. Select Xcode's Command Line Tools in Settings → Locations.
2. Clone this repository or extract the release source archive.
3. Open `Dock for Google/Dock for Google.xcodeproj`. The Xcode project is included;
   regenerating it with the Safari extension converter is unnecessary.
4. Select the **Dock for Google** scheme. Sign in with your Apple ID under
   Xcode → Settings → Accounts and create a free "Apple Development"
   certificate (Manage Certificates → **+**) if you don't have one — Safari
   refuses to register extensions signed ad-hoc or self-signed, so a real
   Apple-issued certificate is required even for personal local builds.
5. Run (⌘R), then enable the extension in Safari as described above.

To package a signed release build, install Node.js 22+ and run from the
extracted repository root (this also uses your Apple Development certificate;
see [RELEASE.md](RELEASE.md#signing)):

```bash
npm run release
```

The zip appears in `dist/vVERSION-zip/`. See [RELEASE.md](RELEASE.md).
A free Apple ID's certificate expires after about a year and needs renewing
via Xcode; see [Apple's signing guidance](https://developer.apple.com/documentation/safariservices/building-a-safari-app-extension).

## Update and restore

Edit files in `src/`, then rebuild. The project references these files directly.
Keep the same bundle identifiers to preserve the extension's identity. Shortcuts
and preferences live in Safari's extension storage; export a backup in the
extension's settings before replacing the app or moving to another Mac. Import
that backup on the new Mac after installation.

## Verify it works

- [ ] Dock for Google actually appears in Safari → Settings → Extensions after
      enabling it (Safari silently omits it entirely, with no error shown, if
      the build isn't signed with a real Apple-issued certificate).
- [ ] Popup opens with eight default apps on a fresh installation.
- [ ] Typing `dr` narrows the default grid to Drive.
- [ ] Clicking a shortcut opens its URL with the selected tab preferences.
- [ ] Settings can add, edit, delete, and drag to reorder shortcuts.
- [ ] Invalid URLs are rejected and duplicate URLs show a warning.
- [ ] Add-current-page fills in the active page's title and URL.
- [ ] Theme, grid columns, labels, and search visibility match preferences.
- [ ] Backup export and import preserve shortcuts and preferences.
- [ ] Relaunch Safari and confirm the extension can be enabled and used.
