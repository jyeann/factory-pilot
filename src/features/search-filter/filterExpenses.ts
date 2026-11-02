import type { Expense } from '../../types'

/** Sentinel category value meaning "don't filter by category". */
export const ALL_CATEGORIES = 'all'

export interface ExpenseFilter {
  /** Free-text search on the description, matched case-insensitively. */
  query: string
  /** A category id, or `ALL_CATEGORIES`. */
  category: string
}

export const EMPTY_FILTER: ExpenseFilter = { query: '', category: ALL_CATEGORIES }

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase()
}

export function isFilterActive(filter: ExpenseFilter): boolean {
  return normalize(filter.query) !== '' || filter.category !== ALL_CATEGORIES
}

/** Returns the expenses matching both the text query and the category. Never mutates `list`. */
export function filterExpenses(list: Expense[], filter: ExpenseFilter): Expense[] {
  const query = normalize(filter.query)
  return list.filter(
    (e) =>
      (filter.category === ALL_CATEGORIES || e.category === filter.category) &&
      (query === '' || e.description.toLocaleLowerCase().includes(query)),
  )
}
