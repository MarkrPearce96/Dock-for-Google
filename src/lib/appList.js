export function makeApp({ name, url, iconUrl }) {
  const app = {
    id: crypto.randomUUID(),
    name: (name ?? '').trim(),
    url: (url ?? '').trim(),
  };
  const icon = (iconUrl ?? '').trim();
  if (icon) app.iconUrl = icon;
  return app;
}

export function addApp(list, input) {
  return [...list, makeApp(input)];
}

export function updateApp(list, id, patch) {
  return list.map((app) => {
    if (app.id !== id) return app;
    const next = { ...app };
    if ('name' in patch) next.name = (patch.name ?? '').trim();
    if ('url' in patch) next.url = (patch.url ?? '').trim();
    if ('iconUrl' in patch) {
      const icon = (patch.iconUrl ?? '').trim();
      if (icon) next.iconUrl = icon;
      else delete next.iconUrl;
    }
    return next;
  });
}

export function removeApp(list, id) {
  return list.filter((app) => app.id !== id);
}

export function moveApp(list, id, direction) {
  const i = list.findIndex((app) => app.id === id);
  if (i === -1) return list;
  const j = direction === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function moveAppTo(list, id, toIndex) {
  const from = list.findIndex((app) => app.id === id);
  if (from === -1) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  const clamped = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clamped, 0, item);
  return next;
}
