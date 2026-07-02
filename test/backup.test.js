import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_APP, BACKUP_VERSION, buildBackup, parseBackup } from '../src/lib/backup.js';
import { DEFAULT_PREFS } from '../src/lib/prefs.js';

test('buildBackup wraps apps and prefs with the marker', () => {
  const apps = [{ id: '1', name: 'A', url: 'https://a.com' }];
  const prefs = { ...DEFAULT_PREFS, theme: 'dark' };
  const b = buildBackup(apps, prefs);
  assert.equal(b.app, BACKUP_APP);
  assert.equal(b.version, BACKUP_VERSION);
  assert.deepEqual(b.apps, apps);
  assert.deepEqual(b.prefs, prefs);
});

test('parseBackup round-trips a built backup (regenerating ids)', () => {
  const apps = [{ id: 'x', name: 'A', url: 'https://a.com', iconUrl: 'i.png' }];
  const prefs = { ...DEFAULT_PREFS, gridColumns: 5 };
  const out = parseBackup(JSON.stringify(buildBackup(apps, prefs)));
  assert.equal(out.apps.length, 1);
  assert.equal(out.apps[0].name, 'A');
  assert.equal(out.apps[0].url, 'https://a.com');
  assert.equal(out.apps[0].iconUrl, 'i.png');
  assert.ok(out.apps[0].id.length > 0);
  assert.deepEqual(out.prefs, prefs);
});

test('parseBackup throws on non-JSON', () => {
  assert.throws(() => parseBackup('not json {'), /Not a valid backup file/);
});

test('parseBackup rejects a foreign or malformed object', () => {
  assert.throws(() => parseBackup(JSON.stringify({ hello: 'world' })), /isn't an App Launcher backup/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'other', apps: [] })), /isn't an App Launcher backup/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'app-launcher', apps: 'nope' })), /isn't an App Launcher backup/);
});

test('parseBackup drops malformed apps and merges partial prefs over defaults', () => {
  const text = JSON.stringify({
    app: 'app-launcher',
    version: 1,
    apps: [
      { name: 'Good', url: 'https://good.com' },
      { name: 'NoUrl' },
      { url: 'https://noname.com' },
    ],
    prefs: { theme: 'dark' },
  });
  const out = parseBackup(text);
  assert.deepEqual(out.apps.map((a) => a.name), ['Good']);
  assert.ok(out.apps[0].id.length > 0);
  assert.equal(out.prefs.theme, 'dark');
  assert.equal(out.prefs.openInNewTab, true);
});
