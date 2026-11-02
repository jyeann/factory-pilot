import { useMemo, useState } from 'react'
import type { Expense } from '../../types'
import { EMPTY_FILTER, filterExpenses, isFilterActive, type ExpenseFilter } from './filterExpenses'

/** Holds the (non-persisted) filter state and derives the filtered list. */
export function useExpenseFilter(expenses: Expense[]) {
  const [filter, setFilter] = useState<ExpenseFilter>(EMPTY_FILTER)
  const filtered = useMemo(() => filterExpenses(expenses, filter), [expenses, filter])
  return { filter, setFilter, filtered, active: isFilterActive(filter) }
}
