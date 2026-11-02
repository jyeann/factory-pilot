import type { Expense } from '../../types'

export interface CategoriesPanelProps {
  /** All expenses, e.g. to show how many use each category. */
  expenses: Expense[]
  /** Moves every expense from one category to another (call before `removeCategory`). */
  onReassign: (fromId: string, toId: string) => void
}

/** STUB (round 3, step 3): implement category management here. Props are the contract — don't change them. */
export function CategoriesPanel(props: CategoriesPanelProps) {
  void props
  return null
}
