import type { Expense } from '../../types'

export interface RecurringPanelProps {
  /** Adds generated occurrences. Idempotent by expense id (`rec:<ruleId>:<date>`). */
  onGenerate: (expenses: Expense[]) => void
  /** Injectable clock for tests; defaults to the real current date. */
  now?: Date
}

/** STUB (round 2, step 3): implement recurring expenses here. Props are the contract — don't change them. */
export function RecurringPanel(props: RecurringPanelProps) {
  void props
  return null
}
