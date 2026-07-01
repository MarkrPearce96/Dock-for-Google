export const SEED_APPS = [
  { name: 'Docs', url: 'https://docs.google.com', iconUrl: 'icons/apps/docs.svg' },
  { name: 'Slides', url: 'https://slides.google.com', iconUrl: 'icons/apps/slides.svg' },
  { name: 'Sheets', url: 'https://sheets.google.com', iconUrl: 'icons/apps/sheets.svg' },
  { name: 'Drive', url: 'https://drive.google.com', iconUrl: 'icons/apps/drive.svg' },
  { name: 'Gmail', url: 'https://mail.google.com', iconUrl: 'icons/apps/gmail.svg' },
  { name: 'Photos', url: 'https://photos.google.com', iconUrl: 'icons/apps/photos.svg' },
  { name: 'Maps', url: 'https://maps.google.com', iconUrl: 'icons/apps/maps.svg' },
  { name: 'Translate', url: 'https://translate.google.com' },
];

export function filterApps(apps, query) {
  const q = query.trim().toLowerCase();
  if (q === '') return apps;
  return apps.filter((a) => a.name.toLowerCase().includes(q));
}
