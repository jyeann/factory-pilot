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
    typeof e.date === 'string' &&
    (e.recurringId === undefined || typeof e.recurringId === 'string')
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

/**
 * Loads JSON stored under `key`. `parse` validates (and may clean) the parsed value;
 * returning null, missing data or invalid JSON all yield `fallback`.
 */
export function loadJson<T>(key: string, parse: (value: unknown) => T | null, fallback: T, storage: Storage = localStorage): T {
  try {
    const raw = storage.getItem(key)
    if (!raw) return fallback
    return parse(JSON.parse(raw)) ?? fallback
  } catch {
    return fallback
  }
}

export function saveJson(key: string, value: unknown, storage: Storage = localStorage): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable (e.g. private mode): keep working in memory.
  }
}
