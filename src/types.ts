/** A single expense. Amounts are stored in integer cents to avoid float errors. */
export interface Expense {
  id: string
  /** Amount in cents, always > 0. */
  amountCents: number
  description: string
  /** Category id, see `lib/categories.ts`. */
  category: string
  /** Calendar date as `YYYY-MM-DD`. */
  date: string
  /** Set on expenses created by a recurring rule (see `features/recurring`). */
  recurringId?: string
}

export type NewExpense = Omit<Expense, 'id' | 'recurringId'>
