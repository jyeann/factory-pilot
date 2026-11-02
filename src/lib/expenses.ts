import type { Expense, NewExpense } from '../types'

/** Pure helpers. They never mutate their inputs. */

export function addExpense(list: Expense[], input: NewExpense, id: string = crypto.randomUUID()): Expense[] {
  return [...list, { ...input, id }]
}

/**
 * Applies `patch` to the expense with `id`. Ignores any `id` in the patch, keeps fields
 * the patch doesn't set (including `recurringId`), and skips `undefined` values.
 */
export function updateExpense(list: Expense[], id: string, patch: Partial<NewExpense>): Expense[] {
  const changes = Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => key !== 'id' && key !== 'recurringId' && value !== undefined),
  )
  return list.map((e) => (e.id === id ? { ...e, ...changes } : e))
}

/** Appends the incoming expenses whose ids aren't already in the list (idempotent). */
export function mergeExpenses(list: Expense[], incoming: Expense[]): Expense[] {
  const seen = new Set(list.map((e) => e.id))
  const added: Expense[] = []
  for (const e of incoming) {
    if (!seen.has(e.id)) {
      seen.add(e.id)
      added.push(e)
    }
  }
  return added.length === 0 ? list : [...list, ...added]
}

export function removeExpense(list: Expense[], id: string): Expense[] {
  return list.filter((e) => e.id !== id)
}

/** Newest date first; ties keep insertion order. */
export function sortByDateDesc(list: Expense[]): Expense[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date))
}

export function totalCents(list: Expense[]): number {
  return list.reduce((sum, e) => sum + e.amountCents, 0)
}

export interface DayGroup {
  date: string
  expenses: Expense[]
  totalCents: number
}

/** Groups expenses by date, newest day first; order within a day is preserved. */
export function groupByDay(list: Expense[]): DayGroup[] {
  const groups = new Map<string, Expense[]>()
  for (const e of sortByDateDesc(list)) {
    groups.set(e.date, [...(groups.get(e.date) ?? []), e])
  }
  return [...groups].map(([date, expenses]) => ({ date, expenses, totalCents: totalCents(expenses) }))
}
