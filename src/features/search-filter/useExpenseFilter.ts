import { useMemo, useState } from 'react'
import type { Expense } from '../../types'
import { useCategories } from '../../lib/categories'
import { ALL_CATEGORIES, EMPTY_FILTER, filterExpenses, isFilterActive, type ExpenseFilter } from './filterExpenses'

/** Holds the (non-persisted) filter state and derives the filtered list. */
export function useExpenseFilter(expenses: Expense[]) {
  const [chosen, setFilter] = useState<ExpenseFilter>(EMPTY_FILTER)
  const categories = useCategories()
  // If the filtered category gets deleted, fall back to "All" instead of an empty list.
  const filter = useMemo(
    () =>
      chosen.category === ALL_CATEGORIES || categories.some((c) => c.id === chosen.category)
        ? chosen
        : { ...chosen, category: ALL_CATEGORIES },
    [chosen, categories],
  )
  const filtered = useMemo(() => filterExpenses(expenses, filter), [expenses, filter])
  return { filter, setFilter, filtered, active: isFilterActive(filter) }
}
