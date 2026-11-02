import { useLayoutEffect, useRef, type MouseEvent, type SyntheticEvent } from 'react'
import type { Expense, NewExpense } from '../../types'
import { ExpenseForm } from '../../components/ExpenseForm'
import './edit-expense.css'

export interface EditExpenseDialogProps {
  /** The expense being edited; null when the dialog is closed. */
  expense: Expense | null
  /** Called with the expense id and all form fields when the user saves. */
  onSave: (id: string, patch: NewExpense) => void
  /** Called whenever the dialog closes (save, cancel, Escape, backdrop). */
  onClose: () => void
}

const TITLE = 'Edit expense'

function isOutside(rect: DOMRect, x: number, y: number): boolean {
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom
}

/**
 * Modal editor for one expense, built on a native `<dialog>`.
 * Open state is driven by `expense`: non-null opens it, null closes it. Every way the
 * user can dismiss it (Cancel, Escape, backdrop, save) reports back through `onClose`.
 */
export function EditExpenseDialog({ expense, onSave, onClose }: EditExpenseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  /** Element focused before opening (the row's Edit button); focus returns there on close. */
  const openerRef = useRef<HTMLElement | null>(null)
  /** True when the current pointer press started on the backdrop (the dialog element itself). */
  const pressedBackdropRef = useRef(false)
  const isOpen = expense !== null

  // Layout effect: open/close in the same commit that mounts/unmounts the form, so an
  // empty modal frame is never painted.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
      const opener = openerRef.current
      openerRef.current = null
      if (opener?.isConnected) opener.focus()
    }
  }, [isOpen])

  // Escape: let React state drive the close instead of the browser.
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onClose()
  }

  // The browser closed the dialog on its own (e.g. a repeated Escape). Ignored when we
  // closed it ourselves because `expense` is already null.
  function handleNativeClose() {
    if (isOpen) onClose()
  }

  function handlePointerDown(event: MouseEvent<HTMLDialogElement>) {
    pressedBackdropRef.current = event.target === event.currentTarget
  }

  // Backdrop clicks target the dialog element but land outside its box. The box check skips
  // clicks on the dialog's own scrollbar; requiring the press to start there too ignores
  // text-selection drags that end outside.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const startedOnBackdrop = pressedBackdropRef.current
    pressedBackdropRef.current = false
    if (!startedOnBackdrop || event.target !== event.currentTarget) return
    if (isOutside(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY)) onClose()
  }

  function handleSubmit(fields: NewExpense) {
    if (!expense) return
    onSave(expense.id, fields)
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="edit-expense-dialog"
      aria-label={TITLE}
      onCancel={handleCancel}
      onClose={handleNativeClose}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      {expense && (
        <ExpenseForm
          key={expense.id}
          initial={{
            amountCents: expense.amountCents,
            description: expense.description,
            category: expense.category,
            date: expense.date,
          }}
          title={TITLE}
          submitLabel="Save changes"
          resetOnSubmit={false}
          onCancel={onClose}
          onAdd={handleSubmit}
        />
      )}
    </dialog>
  )
}
