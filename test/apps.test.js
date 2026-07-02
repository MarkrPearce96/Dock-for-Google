import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_APPS, CATALOG_APPS, filterApps, normalizeUrl, catalogAvailable } from '../src/lib/apps.js';

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

test('every default app ships with a local SVG icon path', () => {
  for (const a of SEED_APPS) {
    assert.match(a.iconUrl, /^icons\/apps\/.+\.(svg|png)$/);
  }
});

test('CATALOG_APPS contains every default app plus catalog-only extras with local icons', () => {
  for (const a of SEED_APPS) {
    assert.ok(CATALOG_APPS.some((c) => c.name === a.name && c.url === a.url));
  }
  const extras = CATALOG_APPS.filter((c) => !SEED_APPS.some((s) => s.url === c.url));
  assert.ok(extras.length > 0);
  for (const a of extras) {
    assert.match(a.url, /^https:\/\//);
    assert.match(a.iconUrl, /^icons\/apps\/.+\.(svg|png)$/);
  }
});

test('normalizeUrl lowercases host and strips one trailing slash', () => {
  assert.equal(normalizeUrl('https://Docs.Google.com/'), 'https://docs.google.com');
  assert.equal(normalizeUrl('https://docs.google.com'), 'https://docs.google.com');
  assert.equal(normalizeUrl('HTTPS://MAIL.google.com/mail/'), 'https://mail.google.com/mail');
});

test('normalizeUrl returns trimmed input on malformed url', () => {
  assert.equal(normalizeUrl('  not a url  '), 'not a url');
});

test('catalogAvailable returns the full catalog when no apps are added', () => {
  const catalog = [{ name: 'A', url: 'https://a.com' }, { name: 'B', url: 'https://b.com' }];
  assert.deepEqual(catalogAvailable(catalog, []), catalog);
});

test('catalogAvailable excludes already-added apps by normalized url, preserving order', () => {
  const catalog = [
    { name: 'A', url: 'https://a.com' },
    { name: 'B', url: 'https://b.com' },
    { name: 'C', url: 'https://c.com' },
  ];
  const mine = [{ id: '1', name: 'B', url: 'https://B.com/' }];
  assert.deepEqual(catalogAvailable(catalog, mine).map((e) => e.name), ['A', 'C']);
});

test('catalogAvailable ignores custom (non-catalog) apps', () => {
  const catalog = [{ name: 'A', url: 'https://a.com' }];
  const mine = [{ id: '1', name: 'Custom', url: 'https://custom.example' }];
  assert.deepEqual(catalogAvailable(catalog, mine).map((e) => e.name), ['A']);
});
