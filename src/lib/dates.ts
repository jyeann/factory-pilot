/** Helpers for `YYYY-MM-DD` calendar dates, in local time. */

export function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
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
