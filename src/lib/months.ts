/** Helpers for `YYYY-MM` calendar months, in local time. */

const MONTHS_PER_YEAR = 12

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function parseMonth(month: string): { year: number; monthIndex: number } {
  const [year, mm] = month.split('-').map(Number)
  return { year, monthIndex: mm - 1 }
}

/** The month containing `now`, in local time. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
}

/** The month of a `YYYY-MM-DD` date. */
export function monthOfIso(iso: string): string {
  return iso.slice(0, 7)
}

/** Moves a `YYYY-MM` month by `delta` months (negative goes back). */
export function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month)
  const total = year * MONTHS_PER_YEAR + monthIndex + delta
  const newYear = Math.floor(total / MONTHS_PER_YEAR)
  const newMonthIndex = total - newYear * MONTHS_PER_YEAR
  return `${newYear}-${pad2(newMonthIndex + 1)}`
}

/** The `count` months ending with `lastMonth`, oldest first. */
export function monthRange(lastMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(lastMonth, i - count + 1))
}

const longFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const shortFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })

/** "March 2026" (locale dependent). */
export function formatMonthLabel(month: string): string {
  const { year, monthIndex } = parseMonth(month)
  return longFormatter.format(new Date(year, monthIndex, 1))
}

/** "Mar" (locale dependent). */
export function formatShortMonth(month: string): string {
  const { year, monthIndex } = parseMonth(month)
  return shortFormatter.format(new Date(year, monthIndex, 1))
}
