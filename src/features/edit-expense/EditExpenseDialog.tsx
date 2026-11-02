import type { Expense, NewExpense } from '../../types'

export interface EditExpenseDialogProps {
  /** The expense being edited; null when the dialog is closed. */
  expense: Expense | null
  /** Called with the expense id and all form fields when the user saves. */
  onSave: (id: string, patch: NewExpense) => void
  /** Called whenever the dialog closes (save, cancel, Escape, backdrop). */
  onClose: () => void
}

/** STUB (round 2, step 1): implement the edit dialog here. Props are the contract — don't change them. */
export function EditExpenseDialog(props: EditExpenseDialogProps) {
  void props
  return null
}
