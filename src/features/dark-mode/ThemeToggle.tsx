import { useTheme } from './useTheme'
import './dark-mode.css'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const target = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${target} theme`

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      <span aria-hidden="true">{target === 'dark' ? '☾' : '☀'}</span>
    </button>
  )
}
