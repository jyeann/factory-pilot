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

  return { expenses, add, remove }
}
