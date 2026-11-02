import type { Expense } from '../../types'

export interface TrendsPanelProps {
  /** All expenses. */
  expenses: Expense[]
  /** Today as `YYYY-MM-DD` (from `useToday`); the chart ends with this month. */
  today: string
}

/** STUB (round 3, step 1): implement the spending trends chart here. Props are the contract — don't change them. */
export function TrendsPanel(props: TrendsPanelProps) {
  void props
  return null
}
