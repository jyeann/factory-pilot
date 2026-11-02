import { useTheme } from './useTheme'
import './dark-mode.css'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const target = theme === 'dark' ? 'light' : 'dark'

  return (
    <button type="button" className="theme-toggle" onClick={toggle}>
      <span aria-hidden="true">{target === 'dark' ? '☾' : '☀'}</span>
      {`Switch to ${target} theme`}
    </button>
  )
}
