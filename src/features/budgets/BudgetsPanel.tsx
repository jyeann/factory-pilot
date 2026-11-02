import type { Expense } from '../../types'

export interface BudgetsPanelProps {
  /** All expenses; the panel works out the current month itself. */
  expenses: Expense[]
  /** Injectable clock for tests; defaults to the real current date. */
  now?: Date
}

/** STUB (round 2, step 2): implement category budgets here. Props are the contract — don't change them. */
export function BudgetsPanel(props: BudgetsPanelProps) {
  void props
  return null
}
