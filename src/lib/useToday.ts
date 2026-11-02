import { useEffect, useState } from 'react'
import { toIsoDate } from './dates'

/** A little after midnight, so the new date is definitely in effect. */
const MIDNIGHT_BUFFER_MS = 1000

function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime() + MIDNIGHT_BUFFER_MS
}

/**
 * Today's local date as `YYYY-MM-DD`. Re-renders just after midnight, and re-checks when
 * the tab becomes visible or focused again (timers drift while a laptop sleeps).
 * Tests: fake only `Date` (`vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime`).
 */
export function useToday(): string {
  const [today, setToday] = useState(() => toIsoDate(new Date()))

  useEffect(() => {
    const refresh = () => setToday(toIsoDate(new Date()))
    let timer = 0
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        refresh()
        schedule()
      }, msUntilNextMidnight(new Date()))
    }
    const onWake = () => {
      refresh()
      schedule()
    }
    schedule()
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [])

  return today
}
