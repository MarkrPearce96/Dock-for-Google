# Personal GitHub releases

## Release using GitHub Actions

1. Enable GitHub Actions under Settings → Actions → General if you previously
   disabled it.
2. Commit and push this workflow and the app changes to the default branch.
3. Tag the committed release version and push that tag:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

   The tag must point to a commit containing `.github/workflows/build.yml`.
   Watch **Actions → Build and release** for progress.
4. When the run finishes, open **Releases** to download `Dock-for-Google-VERSION.zip`, or update the Homebrew tap (below) so `brew upgrade --cask` picks it up. You do not need Xcode on your own Mac for this route.

The workflow reads the version from `package.json` (currently `1.0.0`), checks it
matches `src/manifest.json`, tests and builds the app, then publishes `v1.0.0`
against the exact built commit. It uses the built-in GitHub token; no personal
access token or Apple signing secrets are needed. Repository rules must permit
that token to create releases.

For subsequent releases, increment both version fields and add a matching
`## x.y.z` entry to `CHANGELOG.md`, commit, then push the new version tag.
The tag must match both version fields. Existing releases stop the job before
the expensive build.

If a tag push does not start a run, use **Actions → Build and release → Run
workflow** on the default branch and enter the existing tag (for example
`v1.0.0`). This builds the tagged commit without moving the tag. Existing releases
are still rejected before building.

### Usage controls

- Version-tag pushes or explicit manual recovery only (`v1.0.0`, `v1.0.1`, etc.). Ordinary branch pushes,
  pull requests, and schedules never build.
- One standard macOS runner builds both Intel and Apple Silicon in one job.
- A 15-minute job timeout limits runaway jobs; only one job per version tag runs at a time.
- No npm install, dependency cache, Xcode cache, or Actions artifact uploads.
- Only the zip is uploaded directly to GitHub Releases, and its sha256 is
  appended to the release notes for updating the Homebrew tap.
- GitHub also displays its automatically generated source ZIP/tar.gz links;
  these are not build outputs or files uploaded by this workflow.

Each version-tag run still consumes billable macOS runner time or your account's
included allowance. Disabling caches does not prevent builds; the version-tag-only
trigger prevents unwanted runs. GitHub retains workflow logs according to the
repository's retention setting; reduce that under Settings → Actions → General
if desired. See [GitHub's runner documentation](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

The upload first creates a draft and only publishes after all assets upload.
If upload or publication fails, inspect the draft under Releases and the run log.
You can finish uploading/publishing the draft manually, or delete the incomplete
draft (keep the tag) and use **Re-run failed jobs** on the original Actions run. A rerun never overwrites a release.

## Optional: build locally

Use macOS with Node.js 22 or newer. No npm dependencies need installing.
For an app archive, install full Xcode, open it to accept its license and finish
component installation, and select it under Xcode → Settings → Locations →
Command Line Tools.

1. Update `package.json` and `src/manifest.json` to the same `x.y.z` version.
2. Add release notes to `CHANGELOG.md`.
3. Commit the intended changes and push them to the repository.
4. Run `npm run release` from the repository root.

The command runs tests, builds the universal app, verifies its signature and
sandbox entitlements, creates and verifies a zip archive, and writes only
`Dock-for-Google-VERSION.zip` to `dist/vVERSION-zip/`, printing its sha256.
Existing output directories are never overwritten; move them aside before
rebuilding the same version.

The app command builds Release for macOS 13 or newer and uses ad-hoc signing for
personal testing. It needs no Apple signing secrets, but **is not Developer ID
signed or notarized**. Safari requires allowing unsigned extensions for this
build; see [INSTALL.md](INSTALL.md). The script verifies the app's signature;
manually test the app in Safari before uploading it. Compilation and signature
verification alone do not establish that the Safari extension works.

## Optional: upload a local build manually

On GitHub, open the repository → Releases → Draft a new release.
To avoid the automated build when uploading a local build, disable the
**Build and release** workflow in Actions first. Create a tag such as `v1.0.0`,
targeting the commit you just built. Re-enable the workflow when you want
automated releases again. Copy the matching changelog entry into the release
notes and attach only the zip from `dist/vVERSION-zip/`. Review and publish.
Do not move an existing release tag to a different commit.

For the next release, increment the version and repeat. Local builds consume no
Actions minutes. Uploads use GitHub Releases, not Actions artifacts.

## Update the Homebrew tap

The Cask formula lives in a **separate** repository,
[markrpearce96/homebrew-tap](https://github.com/markrpearce96/homebrew-tap),
not this one. After a release publishes:

1. Get the zip's sha256 (the release notes include it, or run
   `shasum -a 256 dist/vVERSION-zip/*.zip` on a local build).
2. In the tap repo, edit `Casks/dock-for-google.rb`: bump `version` and
   replace `sha256`.
3. `ruby -c Casks/dock-for-google.rb && brew style --fix Casks/dock-for-google.rb`,
   commit, and push.
4. Test it: `brew update && brew upgrade --cask dock-for-google` (or
   `brew install --cask dock-for-google` on a machine that doesn't have it yet).

The app repo and the tap repo release independently — a version tag here
only updates GitHub Releases; the Cask formula needs the manual step above
before `brew upgrade` sees the new version.
