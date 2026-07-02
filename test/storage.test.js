import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, INIT_KEY, loadApps, saveApps, seedIfEmpty } from '../src/lib/storage.js';

function mockArea(initial = {}) {
  const store = { ...initial };
  return {
    store,
    async get(key) {
      return key in store ? { [key]: store[key] } : {};
    },
    async set(obj) {
      Object.assign(store, obj);
    },
  };
}

test('loadApps returns [] when nothing stored', async () => {
  const area = mockArea();
  assert.deepEqual(await loadApps(area), []);
});

test('saveApps then loadApps round-trips', async () => {
  const area = mockArea();
  const list = [{ id: '1', name: 'Gmail', url: 'https://mail.google.com' }];
  await saveApps(list, area);
  assert.deepEqual(await loadApps(area), list);
  assert.deepEqual(area.store[STORAGE_KEY], list);
});

test('seedIfEmpty populates from SEED_APPS when empty', async () => {
  const area = mockArea();
  const seeded = await seedIfEmpty(area);
  assert.ok(seeded.length > 0);
  assert.ok(seeded.every((a) => typeof a.id === 'string' && a.id.length > 0));
  assert.deepEqual(await loadApps(area), seeded);
});

test('seedIfEmpty leaves an existing list untouched', async () => {
  const existing = [{ id: '1', name: 'Only', url: 'https://only.com' }];
  const area = mockArea({ [STORAGE_KEY]: existing });
  assert.deepEqual(await seedIfEmpty(area), existing);
});

test('seedIfEmpty marks the store initialized on first run', async () => {
  const area = mockArea();
  await seedIfEmpty(area);
  assert.equal(area.store[INIT_KEY], true);
});

test('seedIfEmpty does not re-seed an empty list once initialized', async () => {
  const area = mockArea({ [INIT_KEY]: true });
  const result = await seedIfEmpty(area);
  assert.deepEqual(result, []);
  assert.ok(!area.store[STORAGE_KEY] || area.store[STORAGE_KEY].length === 0);
});

test('seedIfEmpty backfills the initialized marker for an existing list', async () => {
  const existing = [{ id: '1', name: 'Only', url: 'https://only.com' }];
  const area = mockArea({ [STORAGE_KEY]: existing });
  assert.deepEqual(await seedIfEmpty(area), existing);
  assert.equal(area.store[INIT_KEY], true);
});
