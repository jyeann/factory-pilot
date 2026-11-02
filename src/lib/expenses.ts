import type { Expense, NewExpense } from '../types'

/** Pure helpers. They never mutate their inputs. */

export function addExpense(list: Expense[], input: NewExpense, id: string = crypto.randomUUID()): Expense[] {
  return [...list, { ...input, id }]
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
