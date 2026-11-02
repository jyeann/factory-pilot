import type { Expense } from '../types'

export const STORAGE_KEY = 'factory-pilot.expenses.v1'

function isExpense(value: unknown): value is Expense {
  if (typeof value !== 'object' || value === null) return false
  const e = value as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.amountCents === 'number' &&
    typeof e.description === 'string' &&
    typeof e.category === 'string' &&
    typeof e.date === 'string'
  )
}

export function loadExpenses(storage: Storage = localStorage): Expense[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isExpense) : []
  } catch {
    return []
  }
}

export function saveExpenses(expenses: Expense[], storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  } catch {
    // Storage full or unavailable (e.g. private mode): keep working in memory.
  }
}
