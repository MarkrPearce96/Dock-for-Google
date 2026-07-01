import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREFS_KEY, DEFAULT_PREFS, loadPrefs, savePrefs, setPref } from '../src/lib/prefs.js';

function mockArea(initial = {}) {
  const store = { ...initial };
  return {
    store,
    async get(key) { return key in store ? { [key]: store[key] } : {}; },
    async set(obj) { Object.assign(store, obj); },
  };
}

test('loadPrefs returns defaults when nothing stored', async () => {
  const area = mockArea();
  assert.deepEqual(await loadPrefs(area), DEFAULT_PREFS);
});

test('loadPrefs merges a partial stored object over defaults', async () => {
  const area = mockArea({ [PREFS_KEY]: { showLabels: false } });
  const prefs = await loadPrefs(area);
  assert.equal(prefs.showLabels, false);
  assert.equal(prefs.openInNewTab, true);
  assert.equal(prefs.showSearch, true);
});

test('savePrefs then loadPrefs round-trips', async () => {
  const area = mockArea();
  const next = { openInNewTab: false, openInBackground: true, showSearch: false, showLabels: false };
  await savePrefs(next, area);
  assert.deepEqual(await loadPrefs(area), next);
  assert.deepEqual(area.store[PREFS_KEY], next);
});

test('setPref changes one key, persists, leaves the others', async () => {
  const area = mockArea();
  const next = await setPref('showSearch', false, area);
  assert.equal(next.showSearch, false);
  assert.equal(next.openInNewTab, true);
  assert.deepEqual((await loadPrefs(area)).showSearch, false);
});
