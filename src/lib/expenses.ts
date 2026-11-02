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
