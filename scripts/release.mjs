import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--app') || args.length > 1) {
  throw new Error('Usage: npm run release (--app is accepted for compatibility)');
}
if (process.platform !== 'darwin') throw new Error('Release packaging requires macOS and Xcode.');
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`);
};
const runCapture = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${result.stderr}`);
  return result.stdout;
};
const pkg = JSON.parse(readFileSync(join(root, 'package.json')));
const manifest = JSON.parse(readFileSync(join(root, 'src/manifest.json')));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version) || pkg.version !== manifest.version) {
  throw new Error('package.json and src/manifest.json must have matching x.y.z versions.');
}
const version = pkg.version;
const destination = join(root, 'dist', `v${version}-zip`);
if (existsSync(destination)) throw new Error(`Output already exists: ${destination}. Move it aside before rebuilding.`);
run(process.execPath, ['--test']);
const staging = mkdtempSync(join(tmpdir(), 'dock-release-'));
try {
  const bundleName = `Dock-for-Google-${version}`;
  const source = join(staging, bundleName);
  mkdirSync(source);
  const include = ['src', 'Dock for Google'];
  const exclude = new Set(['.DS_Store', 'xcuserdata', 'build', 'DerivedData']);
  for (const entry of include) {
    cpSync(join(root, entry), join(source, entry), {
      recursive: true,
      filter: path => !exclude.has(basename(path)) && !path.endsWith('.xcuserstate'),
    });
  }
  const derived = join(staging, 'DerivedData');
  run('xcodebuild', [
    '-project', join(source, 'Dock for Google/Dock for Google.xcodeproj'),
    '-scheme', 'Dock for Google', '-configuration', 'Release',
    '-derivedDataPath', derived, '-destination', 'generic/platform=macOS',
    'ARCHS=arm64 x86_64', 'ONLY_ACTIVE_ARCH=NO', 'MACOSX_DEPLOYMENT_TARGET=13.0',
    `MARKETING_VERSION=${version}`, 'CURRENT_PROJECT_VERSION=1',
    'CODE_SIGN_STYLE=Manual', 'CODE_SIGN_IDENTITY=-', 'DEVELOPMENT_TEAM=',
    'CODE_SIGNING_ALLOWED=YES', 'build',
  ]);
  const app = join(derived, 'Build/Products/Release/Dock for Google.app');
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);

  const entitlements = runCapture('/usr/bin/codesign', ['-d', '--entitlements', '-', '--xml', app]);
  if (!entitlements.trim()) {
    throw new Error('Built app has no entitlements at all — signing produced an unsandboxed binary.');
  }
  if (!/<key>com\.apple\.security\.app-sandbox<\/key>\s*<true\/>/.test(entitlements)) {
    throw new Error('Built app is missing com.apple.security.app-sandbox = true.');
  }
  if (/<key>com\.apple\.security\.get-task-allow<\/key>\s*<true\/>/.test(entitlements)) {
    throw new Error('Built app has com.apple.security.get-task-allow = true (debug entitlement should not ship).');
  }

  const bundleZipName = `${bundleName}.zip`;
  const zipPath = join(staging, bundleZipName);
  run('/usr/bin/ditto', ['-c', '-k', '--keepParent', app, zipPath]);
  const topEntry = runCapture('/usr/bin/unzip', ['-Z1', zipPath]).split('\n')[0];
  if (topEntry !== 'Dock for Google.app/') {
    throw new Error(`Zip's top-level entry is '${topEntry}', expected 'Dock for Google.app/'.`);
  }

  mkdirSync(resolve(destination, '..'), { recursive: true });
  mkdirSync(destination);
  cpSync(zipPath, join(destination, bundleZipName));
  const sha256 = runCapture('/usr/bin/shasum', ['-a', '256', join(destination, bundleZipName)]).split(' ')[0];
  console.log(`\nRelease assets: ${destination}\nsha256: ${sha256}\nNothing has been uploaded. See docs/RELEASE.md.`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
