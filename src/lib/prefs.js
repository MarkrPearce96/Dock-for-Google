export const PREFS_KEY = 'prefs';

export const DEFAULT_PREFS = {
  openInNewTab: true,
  openInBackground: false,
  showSearch: true,
  showLabels: true,
};

function defaultArea() {
  if (typeof browser !== 'undefined' && browser.storage) return browser.storage.local;
  if (typeof chrome !== 'undefined' && chrome.storage) return chrome.storage.local;
  throw new Error('No extension storage area available');
}

export async function loadPrefs(area = defaultArea()) {
  const result = await area.get(PREFS_KEY);
  return { ...DEFAULT_PREFS, ...(result[PREFS_KEY] ?? {}) };
}

export async function savePrefs(prefs, area = defaultArea()) {
  await area.set({ [PREFS_KEY]: prefs });
}

export async function setPref(key, value, area = defaultArea()) {
  const prefs = await loadPrefs(area);
  const next = { ...prefs, [key]: value };
  await savePrefs(next, area);
  return next;
}
