export function host(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function resolveIcon(app) {
  if (typeof app.iconUrl === 'string' && app.iconUrl.length > 0) {
    return app.iconUrl;
  }
  return `https://www.google.com/s2/favicons?domain=${host(app.url)}&sz=64`;
}
