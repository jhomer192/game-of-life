const VALID_THEMES = ['tokyo', 'miami', 'matcha'] as const
export type ThemeId = (typeof VALID_THEMES)[number]

const OLD_THEMES = ['mocha', 'tokyo-night', 'dracula', 'nord', 'forest']

export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem('site-theme')
    if (v && !OLD_THEMES.includes(v) && (VALID_THEMES as readonly string[]).includes(v)) return v as ThemeId
  } catch {
    // ignore
  }
  return 'tokyo'
}

export function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id)
  try { localStorage.setItem('site-theme', id) } catch { /* ignore */ }
}

export function initTheme() {
  applyTheme(getStoredTheme())
}
