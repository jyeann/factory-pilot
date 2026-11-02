import type { Expense } from '../../types'
import { categoryLabel } from '../../lib/categories'

/** Pure helpers for the monthly summary. Months are `YYYY-MM` strings. */

export interface CategoryTotal {
  category: string
  label: string
  totalCents: number
  count: number
}

const MONTHS_PER_YEAR = 12

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [year, mm] = month.split('-').map(Number)
  return { year, monthIndex: mm - 1 }
}

/** The month containing `now`, in local time. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
}

/** Moves a `YYYY-MM` month by `delta` months (negative goes back). */
export function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month)
  const total = year * MONTHS_PER_YEAR + monthIndex + delta
  const newYear = Math.floor(total / MONTHS_PER_YEAR)
  const newMonthIndex = total - newYear * MONTHS_PER_YEAR
  return `${newYear}-${pad2(newMonthIndex + 1)}`
}

/** Expenses whose `YYYY-MM-DD` date falls in the given month. */
export function expensesInMonth(list: Expense[], month: string): Expense[] {
  const prefix = `${month}-`
  return list.filter((e) => e.date.startsWith(prefix))
}

/** Per-category totals, largest first; ties ordered by label. */
export function totalsByCategory(list: Expense[]): CategoryTotal[] {
  // Local accumulator only; the input list is never mutated.
  const byCategory = new Map<string, { totalCents: number; count: number }>()
  for (const e of list) {
    const prev = byCategory.get(e.category) ?? { totalCents: 0, count: 0 }
    byCategory.set(e.category, { totalCents: prev.totalCents + e.amountCents, count: prev.count + 1 })
  }

  return [...byCategory.entries()]
    .map(([category, t]) => ({ category, label: categoryLabel(category), ...t }))
    .sort((a, b) => b.totalCents - a.totalCents || a.label.localeCompare(b.label))
}

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

/** Human readable label, e.g. "March 2026" (locale dependent). */
export function formatMonthLabel(month: string): string {
  const { year, monthIndex } = parseMonth(month)
  return monthFormatter.format(new Date(year, monthIndex, 1))
}
