import type { Expense } from '../../types'
import { categoryLabel } from '../../lib/categories'

/** Pure helpers for the monthly summary. Months are `YYYY-MM` strings. */

export interface CategoryTotal {
  category: string
  label: string
  totalCents: number
  count: number
}

export { currentMonth, formatMonthLabel, shiftMonth } from '../../lib/months'

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
