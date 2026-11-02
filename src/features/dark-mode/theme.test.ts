import {
  THEME_STORAGE_KEY,
  applyTheme,
  getSystemTheme,
  loadThemePreference,
  nextTheme,
  saveThemePreference,
} from './theme'

function fakeMatchMedia(matches: boolean) {
  return (query: string) => ({ matches, media: query }) as MediaQueryList
}

describe('theme helpers', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no preference is stored', () => {
    expect(loadThemePreference(localStorage)).toBeNull()
  })

  it('round-trips a saved preference', () => {
    saveThemePreference('dark', localStorage)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(loadThemePreference(localStorage)).toBe('dark')
  })

  it('ignores invalid stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(loadThemePreference(localStorage)).toBeNull()
  })

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    } as unknown as Storage
    expect(loadThemePreference(broken)).toBeNull()
    expect(() => saveThemePreference('dark', broken)).not.toThrow()
  })

  it('reads the OS preference', () => {
    expect(getSystemTheme(fakeMatchMedia(true))).toBe('dark')
    expect(getSystemTheme(fakeMatchMedia(false))).toBe('light')
  })

  it('falls back to light when matchMedia is unavailable', () => {
    const original = window.matchMedia
    window.matchMedia = undefined as unknown as typeof window.matchMedia
    try {
      expect(getSystemTheme()).toBe('light')
    } finally {
      window.matchMedia = original
    }
  })

  it('flips between themes', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })

  it('applies the theme to the root element', () => {
    const root = document.createElement('html')
    applyTheme('dark', root)
    expect(root.dataset.theme).toBe('dark')
    applyTheme('light', root)
    expect(root.dataset.theme).toBe('light')
  })
})
