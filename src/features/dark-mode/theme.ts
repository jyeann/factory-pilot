export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'factory-pilot.theme.v1'
export const DARK_QUERY = '(prefers-color-scheme: dark)'

type MatchMedia = (query: string) => MediaQueryList

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** The user's explicit choice, or null if they never picked one (follow the OS). */
export function loadThemePreference(storage: Storage = localStorage): Theme | null {
  try {
    const value = storage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

export function saveThemePreference(theme: Theme, storage: Storage = localStorage): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage unavailable (e.g. private mode): the choice lasts for this session only.
  }
}

export function getSystemTheme(matchMedia: MatchMedia | undefined = window.matchMedia): Theme {
  if (typeof matchMedia !== 'function') return 'light'
  return matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme
}
