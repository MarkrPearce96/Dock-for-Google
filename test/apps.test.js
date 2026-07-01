import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_APPS, filterApps } from '../src/lib/apps.js';

const apps = [
  { name: 'Gmail', url: 'https://mail.google.com' },
  { name: 'Drive', url: 'https://drive.google.com' },
  { name: 'Maps', url: 'https://maps.google.com' },
];

test('empty query returns all apps', () => {
  assert.deepEqual(filterApps(apps, ''), apps);
});

test('whitespace-only query returns all apps', () => {
  assert.deepEqual(filterApps(apps, '   '), apps);
});

test('filters by case-insensitive substring of name', () => {
  assert.deepEqual(filterApps(apps, 'ma'), [apps[0], apps[2]]);
});

test('no match returns empty array', () => {
  assert.deepEqual(filterApps(apps, 'zzz'), []);
});

test('SEED_APPS is a non-empty list of name+url objects', () => {
  assert.ok(SEED_APPS.length > 0);
  for (const a of SEED_APPS) {
    assert.equal(typeof a.name, 'string');
    assert.match(a.url, /^https:\/\//);
  }
});

test('Docs, Sheets, and Slides ship with bundled SVG icon paths', () => {
  const byName = Object.fromEntries(SEED_APPS.map((a) => [a.name, a]));
  for (const name of ['Docs', 'Sheets', 'Slides']) {
    assert.match(byName[name].iconUrl, /^icons\/apps\/.+\.svg$/);
  }
});
