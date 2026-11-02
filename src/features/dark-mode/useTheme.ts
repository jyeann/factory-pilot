import { useCallback, useEffect, useState } from 'react'
import {
  DARK_QUERY,
  applyTheme,
  getSystemTheme,
  loadThemePreference,
  nextTheme,
  saveThemePreference,
  type Theme,
} from './theme'

/**
 * Current theme: the saved choice if there is one, otherwise the OS preference
 * (kept in sync while the user has not chosen). Applied as `data-theme` on <html>.
 */
export function useTheme() {
  const [preference, setPreference] = useState<Theme | null>(() => loadThemePreference())
  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme())
  const theme = preference ?? systemTheme

  useEffect(() => {
    if (preference !== null || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [preference])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    const next = nextTheme(theme)
    saveThemePreference(next)
    setPreference(next)
  }, [theme])

  return { theme, toggle }
}
