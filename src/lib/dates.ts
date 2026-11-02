/** Helpers for `YYYY-MM-DD` calendar dates, in local time. */

export function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parses `YYYY-MM-DD` as a LOCAL date. Never use `new Date('YYYY-MM-DD')`: it parses as UTC. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** `iso` shifted by `n` days (negative goes back). */
export function addDays(iso: string, n: number): string {
  const d = parseIsoDate(iso)
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
}

/**
 * `startIso` plus `n` months, with the day clamped to the target month's last day
 * (Jan 31 + 1 month = Feb 28, or Feb 29 in a leap year). Always compute from the same
 * start date so the day doesn't drift (31 -> 28 -> 28 ...).
 */
export function addMonthsClamped(startIso: string, n: number): string {
  const start = parseIsoDate(startIso)
  const firstOfTarget = new Date(start.getFullYear(), start.getMonth() + n, 1)
  const lastDay = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth() + 1, 0).getDate()
  return toIsoDate(new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), Math.min(start.getDate(), lastDay)))
}

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
const dayWithYearFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

/** "Today", "Yesterday", or a short date such as "Fri, 30 Oct" (year added when not the current year). */
export function friendlyDay(iso: string, now: Date = new Date()): string {
  const today = toIsoDate(now)
  if (iso === today) return 'Today'
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (iso === toIsoDate(yesterday)) return 'Yesterday'
  const date = parseIsoDate(iso)
  return (date.getFullYear() === now.getFullYear() ? dayFormatter : dayWithYearFormatter).format(date)
}
