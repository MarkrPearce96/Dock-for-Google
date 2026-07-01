import { SEED_APPS } from './apps.js';
import { makeApp } from './appList.js';

export const STORAGE_KEY = 'apps';

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
  if (existing.length > 0) return existing;
  const seeded = SEED_APPS.map((a) => makeApp(a));
  await saveApps(seeded, area);
  return seeded;
}
