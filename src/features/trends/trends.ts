import type { Expense } from '../../types'
import { getAllCategories } from '../../lib/categories'
import { formatCents } from '../../lib/money'
import { monthOfIso, monthRange } from '../../lib/months'

/** How many months the chart shows by default (this month and the five before). */
export const DEFAULT_TREND_MONTHS = 6

export interface MonthTotal {
  /** `YYYY-MM` */
  month: string
  totalCents: number
  /** Cents per category id; only categories with spending that month. */
  byCategory: Record<string, number>
}

/** Totals for the `months` months ending with the month of `today`, oldest first; empty months included. */
export function monthlyTotals(expenses: readonly Expense[], today: string, months = DEFAULT_TREND_MONTHS): MonthTotal[] {
  const range = monthRange(monthOfIso(today), months)
  const index = new Map(range.map((month, i) => [month, i]))
  const totals: MonthTotal[] = range.map((month) => ({ month, totalCents: 0, byCategory: {} }))
  for (const expense of expenses) {
    const i = index.get(monthOfIso(expense.date))
    if (i === undefined) continue
    const bucket = totals[i]
    bucket.totalCents += expense.amountCents
    bucket.byCategory[expense.category] = (bucket.byCategory[expense.category] ?? 0) + expense.amountCents
  }
  return totals
}

/** Whole-percent change from `previous` to `current`; null when there's nothing to compare against. */
export function percentChange(currentCents: number, previousCents: number): number | null {
  if (previousCents <= 0) return null
  return Math.round(((currentCents - previousCents) / previousCents) * 100)
}

/** True when at least two months in the window have spending (enough to show a trend). */
export function hasTrend(totals: readonly MonthTotal[]): boolean {
  return totals.filter((t) => t.totalCents > 0).length >= 2
}

/** "This month $1,011.50, 12% less than last month". `totals` is oldest first, ending with this month. */
export function trendSummary(totals: readonly MonthTotal[]): string {
  const current = totals[totals.length - 1]?.totalCents ?? 0
  const previous = totals[totals.length - 2]?.totalCents ?? 0
  return `This month ${formatCents(current)}, ${comparison(totals, current, previous)}`
}

function comparison(totals: readonly MonthTotal[], current: number, previous: number): string {
  const change = percentChange(current, previous)
  if (change === null) {
    const spentBefore = totals.slice(0, -1).some((t) => t.totalCents > 0)
    if (current === 0) return 'nothing spent yet'
    return spentBefore ? 'nothing spent last month' : 'first month with spending'
  }
  if (change === 0) return 'about the same as last month'
  return `${Math.abs(change)}% ${change < 0 ? 'less' : 'more'} than last month`
}

/**
 * Category ids that appear in `totals`, in store order (archived/unknown ids last), so
 * stacks and table columns are stable across months.
 */
export function categoriesInUse(totals: readonly MonthTotal[]): string[] {
  const used = new Set(totals.flatMap((t) => Object.keys(t.byCategory)))
  const ordered = getAllCategories()
    .map((c) => c.id)
    .filter((id) => used.has(id))
  const known = new Set(ordered)
  return [...ordered, ...[...used].filter((id) => !known.has(id)).sort()]
}
