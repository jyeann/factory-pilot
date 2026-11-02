import type { Expense } from '../../types'

export interface ImportCsvButtonProps {
  /** Expenses already stored, for duplicate detection. */
  expenses: Expense[]
  /** Adds the imported expenses (App passes `addMany`, which skips ids already present). */
  onImport: (expenses: Expense[]) => void
}

/** STUB (round 3, step 2): implement CSV import here. Props are the contract — don't change them. */
export function ImportCsvButton(props: ImportCsvButtonProps) {
  void props
  return null
}
