import { useCallback, useEffect, useState } from 'react'
import type { Expense, NewExpense } from './types'
import { addExpense, mergeExpenses, removeExpense, updateExpense } from './lib/expenses'
import { loadExpenses, saveExpenses } from './lib/storage'

/** Single source of truth for expense state, persisted to localStorage. */
export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses())

  useEffect(() => {
    saveExpenses(expenses)
  }, [expenses])

  const add = useCallback((input: NewExpense) => setExpenses((list) => addExpense(list, input)), [])
  const remove = useCallback((id: string) => setExpenses((list) => removeExpense(list, id)), [])

  /** Puts a previously removed expense back (used for undo). */
  const restore = useCallback(
    (expense: Expense) => setExpenses((list) => (list.some((e) => e.id === expense.id) ? list : [...list, expense])),
    [],
  )

  /** Changes fields of an existing expense; keeps its id and `recurringId`. */
  const update = useCallback(
    (id: string, patch: Partial<NewExpense>) => setExpenses((list) => updateExpense(list, id, patch)),
    [],
  )

  /** Adds expenses that already have ids (e.g. recurring occurrences); ids already present are skipped. */
  const addMany = useCallback((incoming: Expense[]) => setExpenses((list) => mergeExpenses(list, incoming)), [])

  /** Moves every expense in `fromId` to `toId` (used before deleting a category). */
  const reassignCategory = useCallback(
    (fromId: string, toId: string) =>
      setExpenses((list) =>
        list.some((e) => e.category === fromId) ? list.map((e) => (e.category === fromId ? { ...e, category: toId } : e)) : list,
      ),
    [],
  )

  return { expenses, add, remove, restore, update, addMany, reassignCategory }
}
