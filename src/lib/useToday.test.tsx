import { act, render, screen } from '@testing-library/react'
import { useToday } from './useToday'

function Today() {
  return <p>{useToday()}</p>
}

describe('useToday', () => {
  afterEach(() => vi.useRealTimers())

  it('rolls over just after local midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 2, 23, 59, 0))
    render(<Today />)
    expect(screen.getByText('2026-11-02')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000)
    })
    expect(screen.getByText('2026-11-03')).toBeInTheDocument()
  })

  it('re-checks the date when the tab regains focus', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 2, 12))
    render(<Today />)
    vi.setSystemTime(new Date(2026, 10, 5, 9))
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(screen.getByText('2026-11-05')).toBeInTheDocument()
  })
})
