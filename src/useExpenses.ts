import { useCallback, useEffect, useState } from 'react'
import type { Expense, NewExpense } from './types'
import { addExpense, removeExpense } from './lib/expenses'
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

  return { expenses, add, remove, restore }
}
