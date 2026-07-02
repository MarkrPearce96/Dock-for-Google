export const SEED_APPS = [
  { name: 'Docs', url: 'https://docs.google.com', iconUrl: 'icons/apps/docs.svg' },
  { name: 'Slides', url: 'https://slides.google.com', iconUrl: 'icons/apps/slides.svg' },
  { name: 'Sheets', url: 'https://sheets.google.com', iconUrl: 'icons/apps/sheets.svg' },
  { name: 'Drive', url: 'https://drive.google.com', iconUrl: 'icons/apps/drive.svg' },
  { name: 'Gmail', url: 'https://mail.google.com', iconUrl: 'icons/apps/gmail.svg' },
  { name: 'Photos', url: 'https://photos.google.com', iconUrl: 'icons/apps/photos.svg' },
  { name: 'Maps', url: 'https://maps.google.com', iconUrl: 'icons/apps/maps.svg' },
  { name: 'Translate', url: 'https://translate.google.com', iconUrl: 'icons/apps/translate.png' },
];

// The full catalog shown in the "Available" panel: the default seed plus extra
// apps you can add but that are not part of the default set.
export const CATALOG_APPS = [
  ...SEED_APPS,
  { name: 'YouTube', url: 'https://www.youtube.com', iconUrl: 'icons/apps/youtube.svg' },
  { name: 'Meet', url: 'https://meet.google.com', iconUrl: 'icons/apps/meet.png' },
  { name: 'Gemini', url: 'https://gemini.google.com', iconUrl: 'icons/apps/gemini.png' },
  { name: 'Classroom', url: 'https://classroom.google.com', iconUrl: 'icons/apps/classroom.png' },
  { name: 'Analytics', url: 'https://analytics.google.com', iconUrl: 'icons/apps/analytics.svg' },
  { name: 'Search', url: 'https://www.google.com', iconUrl: 'icons/apps/search.svg' },
  { name: 'Calendar', url: 'https://calendar.google.com', iconUrl: 'icons/apps/calendar.png' },
  { name: 'Keep', url: 'https://keep.google.com', iconUrl: 'icons/apps/keep.png' },
  { name: 'Contacts', url: 'https://contacts.google.com', iconUrl: 'icons/apps/contacts.svg' },
  { name: 'Account', url: 'https://myaccount.google.com', iconUrl: 'icons/apps/account.svg' },
];

export function filterApps(apps, query) {
  const q = query.trim().toLowerCase();
  if (q === '') return apps;
  return apps.filter((a) => a.name.toLowerCase().includes(q));
}

export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // hostname (not host) — port is intentionally dropped for catalog matching.
    let s = `${u.protocol}//${u.hostname}${u.pathname}`.toLowerCase();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return (url ?? '').trim();
  }
}

export function catalogAvailable(catalog, myApps) {
  const have = new Set(myApps.map((a) => normalizeUrl(a.url)));
  return catalog.filter((entry) => !have.has(normalizeUrl(entry.url)));
}

export function draftFromTab(tab) {
  const url = (tab && tab.url) || '';
  if (!/^https?:/i.test(url)) return null;
  let name = (tab.title || '').trim();
  if (!name) {
    try {
      name = new URL(url).hostname;
    } catch {
      name = url;
    }
  }
  return { name, url, iconUrl: tab.favIconUrl || '' };
}
