import { SEED_APPS } from './apps.js';
import { makeApp } from './appList.js';

export const STORAGE_KEY = 'apps';
export const INIT_KEY = 'initialized';

function defaultArea() {
  if (typeof browser !== 'undefined' && browser.storage) return browser.storage.local;
  if (typeof chrome !== 'undefined' && chrome.storage) return chrome.storage.local;
  throw new Error('No extension storage area available');
}

export async function loadApps(area = defaultArea()) {
  const result = await area.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? [];
}

export async function saveApps(list, area = defaultArea()) {
  await area.set({ [STORAGE_KEY]: list });
}

export async function seedIfEmpty(area = defaultArea()) {
  const existing = await loadApps(area);
  const initialized = (await area.get(INIT_KEY))[INIT_KEY];
  // Seed the defaults only on first run. Once initialized (or if a list already
  // exists), honor whatever is stored — including an intentionally-empty list
  // after an import or after removing every app. Backfill the marker for
  // pre-existing installs so their apps are never re-seeded.
  if (existing.length > 0 || initialized) {
    if (!initialized) await area.set({ [INIT_KEY]: true });
    return existing;
  }
  const seeded = SEED_APPS.map((a) => makeApp(a));
  await area.set({ [STORAGE_KEY]: seeded, [INIT_KEY]: true });
  return seeded;
}
