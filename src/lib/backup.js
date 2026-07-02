import { makeApp } from './appList.js';
import { DEFAULT_PREFS } from './prefs.js';

export const BACKUP_APP = 'app-launcher';
export const BACKUP_VERSION = 1;

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
    throw new Error("This isn't an App Launcher backup.");
  }
  const apps = data.apps
    .filter((a) => a && a.name && a.url)
    .map((a) => makeApp(a));
  const prefs = {
    ...DEFAULT_PREFS,
    ...(data.prefs && typeof data.prefs === 'object' ? data.prefs : {}),
  };
  return { apps, prefs };
}
