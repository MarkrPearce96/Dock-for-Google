import { makeApp } from './appList.js';
import { DEFAULT_PREFS } from './prefs.js';

export const BACKUP_APP = 'app-launcher';
export const BACKUP_VERSION = 1;

function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildBackup(apps, prefs) {
  return { app: BACKUP_APP, version: BACKUP_VERSION, apps, prefs };
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Not a valid backup file.');
  }
  if (!data || data.app !== BACKUP_APP || !Array.isArray(data.apps)) {
    throw new Error("This isn't a Dock for Google backup.");
  }
  const apps = data.apps
    .filter((a) => a && a.name && isHttpUrl(a.url))
    .map((a) => makeApp(a));
  const prefs = {
    ...DEFAULT_PREFS,
    ...(data.prefs && typeof data.prefs === 'object' ? data.prefs : {}),
  };
  return { apps, prefs };
}
