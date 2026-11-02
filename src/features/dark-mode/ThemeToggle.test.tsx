import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './ThemeToggle'
import { THEME_STORAGE_KEY } from './theme'

type Listener = (event: MediaQueryListEvent) => void

/** Installs a controllable `window.matchMedia` that reports `prefers-color-scheme`. */
function mockSystemTheme(initialDark: boolean) {
  let matches = initialDark
  const listeners = new Set<Listener>()
  window.matchMedia = ((media: string) => ({
    get matches() {
      return matches
    },
    media,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  })) as unknown as typeof window.matchMedia
  return {
    setDark(dark: boolean) {
      matches = dark
      listeners.forEach((l) => l({ matches: dark } as MediaQueryListEvent))
    },
  }
}

const root = document.documentElement

describe('ThemeToggle', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    delete root.dataset.theme
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('defaults to the OS theme', () => {
    mockSystemTheme(true)
    render(<ThemeToggle />)
    expect(root.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })

  it('defaults to light when matchMedia is unavailable', () => {
    // jsdom ships without matchMedia
    window.matchMedia = undefined as unknown as typeof window.matchMedia
    render(<ThemeToggle />)
    expect(root.dataset.theme).toBe('light')
  })

  it('toggling switches the theme and persists it', async () => {
    mockSystemTheme(false)
    const user = userEvent.setup()
    const { unmount } = render(<ThemeToggle />)
    expect(root.dataset.theme).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(root.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()

    // A fresh mount (page reload) restores the saved choice over the OS default.
    unmount()
    delete root.dataset.theme
    render(<ThemeToggle />)
    expect(root.dataset.theme).toBe('dark')
  })

  it('is keyboard operable', async () => {
    mockSystemTheme(false)
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(root.dataset.theme).toBe('dark')
  })

  it('follows OS changes until the user picks a theme', async () => {
    const system = mockSystemTheme(false)
    const user = userEvent.setup()
    render(<ThemeToggle />)

    act(() => system.setDark(true))
    expect(root.dataset.theme).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    act(() => system.setDark(true))
    expect(root.dataset.theme).toBe('light')
  })
})
