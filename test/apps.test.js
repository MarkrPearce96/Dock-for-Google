import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_APPS, CATALOG_APPS, filterApps, normalizeUrl, catalogAvailable, draftFromTab, findDuplicate } from '../src/lib/apps.js';

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

test('draftFromTab builds a draft from an http(s) tab', () => {
  const d = draftFromTab({ url: 'https://poni.com/x', title: 'PoniPack', favIconUrl: 'https://poni.com/f.ico' });
  assert.deepEqual(d, { name: 'PoniPack', url: 'https://poni.com/x', iconUrl: 'https://poni.com/f.ico' });
});

test('draftFromTab falls back to hostname when title is empty', () => {
  const d = draftFromTab({ url: 'https://sub.example.com/p', title: '   ', favIconUrl: '' });
  assert.equal(d.name, 'sub.example.com');
  assert.equal(d.iconUrl, '');
});

test('draftFromTab returns null for non-http(s) pages', () => {
  assert.equal(draftFromTab({ url: 'about:blank', title: 'x' }), null);
  assert.equal(draftFromTab({ url: 'safari-web-extension://abc/options.html', title: 'x' }), null);
  assert.equal(draftFromTab(null), null);
  assert.equal(draftFromTab({}), null);
});

test('findDuplicate returns the matching app for an exact url', () => {
  const list = [
    { id: '1', name: 'Maps', url: 'https://maps.google.com' },
    { id: '2', name: 'Gmail', url: 'https://mail.google.com' },
  ];
  assert.equal(findDuplicate(list, 'https://maps.google.com').name, 'Maps');
});

test('findDuplicate matches ignoring case and a trailing slash', () => {
  const list = [{ id: '1', name: 'Maps', url: 'https://maps.google.com' }];
  assert.equal(findDuplicate(list, 'https://Maps.google.com/').name, 'Maps');
});

test('findDuplicate returns null when the url is not present', () => {
  const list = [{ id: '1', name: 'Maps', url: 'https://maps.google.com' }];
  assert.equal(findDuplicate(list, 'https://docs.google.com'), null);
});

test('findDuplicate returns null for an empty list', () => {
  assert.equal(findDuplicate([], 'https://maps.google.com'), null);
});

test('findDuplicate matches malformed urls on trimmed string equality', () => {
  const list = [{ id: '1', name: 'Weird', url: '  not a url  ' }];
  assert.equal(findDuplicate(list, 'not a url').name, 'Weird');
});
