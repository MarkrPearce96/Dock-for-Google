export function resolveTheme(pref, prefersDark) {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  if (pref === 'system') return prefersDark ? 'dark' : 'light';
  return 'light';
}

let mediaQuery = null;
let systemListener = null;

function media() {
  if (mediaQuery) return mediaQuery;
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }
  return mediaQuery;
}

export function applyTheme(pref, root = document.documentElement) {
  const mq = media();
  const effective = resolveTheme(pref, mq ? mq.matches : false);
  root.dataset.theme = effective;
  root.style.colorScheme = effective;

  if (!mq) return;
  if (systemListener) {
    mq.removeEventListener('change', systemListener);
    systemListener = null;
  }
  if (pref === 'system') {
    systemListener = (e) => {
      const eff = resolveTheme('system', e.matches);
      root.dataset.theme = eff;
      root.style.colorScheme = eff;
    };
    mq.addEventListener('change', systemListener);
  }
}
