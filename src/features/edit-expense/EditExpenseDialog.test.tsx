import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Expense, NewExpense } from '../../types'
import { centsToInput } from '../../lib/money'
import { EditExpenseDialog } from './EditExpenseDialog'

const lunch: Expense = { id: 'a', amountCents: 1250, description: 'Lunch', category: 'food', date: '2026-01-02' }
const bus: Expense = { id: 'b', amountCents: 275, description: 'Bus ticket', category: 'transport', date: '2026-01-05' }

const dialog = () => screen.getByRole('dialog', { name: 'Edit expense' })
const inDialog = () => within(dialog())

function renderDialog(expense: Expense | null) {
  const onSave = vi.fn<(id: string, patch: NewExpense) => void>()
  const onClose = vi.fn()
  const utils = render(<EditExpenseDialog expense={expense} onSave={onSave} onClose={onClose} />)
  const rerender = (next: Expense | null) =>
    utils.rerender(<EditExpenseDialog expense={next} onSave={onSave} onClose={onClose} />)
  return { onSave, onClose, rerender }
}

/** Small harness that behaves like App: Edit buttons open the dialog, onClose clears it. */
function Harness({ onSave = () => {} }: { onSave?: (id: string, patch: NewExpense) => void }) {
  const [editing, setEditing] = useState<Expense | null>(null)
  return (
    <>
      {[lunch, bus].map((e) => (
        <button key={e.id} type="button" onClick={() => setEditing(e)}>
          Edit {e.description}
        </button>
      ))}
      <EditExpenseDialog expense={editing} onSave={onSave} onClose={() => setEditing(null)} />
    </>
  )
}

describe('EditExpenseDialog', () => {
  it('renders no form while closed', () => {
    renderDialog(null)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument()
  })

  it('opens with the expense values prefilled', () => {
    renderDialog(lunch)
    expect(dialog()).toHaveAttribute('open')
    expect(inDialog().getByRole('heading', { name: 'Edit expense' })).toBeInTheDocument()
    expect(inDialog().getByLabelText('Amount')).toHaveValue(centsToInput(lunch.amountCents))
    expect(inDialog().getByLabelText('Description')).toHaveValue('Lunch')
    expect(inDialog().getByLabelText('Category')).toHaveValue('food')
    expect(inDialog().getByLabelText('Date')).toHaveValue('2026-01-02')
  })

  it('saves all form fields for the expense id, then closes', async () => {
    const user = userEvent.setup()
    const { onSave, onClose } = renderDialog(lunch)

    const amount = inDialog().getByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '9.5')
    const description = inDialog().getByLabelText('Description')
    await user.clear(description)
    await user.type(description, '  Brunch ')
    await user.selectOptions(inDialog().getByLabelText('Category'), 'entertainment')
    fireEvent.change(inDialog().getByLabelText('Date'), { target: { value: '2026-01-03' } })
    await user.click(inDialog().getByRole('button', { name: 'Save changes' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('a', {
      amountCents: 950,
      description: 'Brunch',
      category: 'entertainment',
      date: '2026-01-03',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows validation errors and does not save', async () => {
    const user = userEvent.setup()
    const { onSave, onClose } = renderDialog(lunch)

    await user.clear(inDialog().getByLabelText('Amount'))
    await user.click(inDialog().getByRole('button', { name: 'Save changes' }))
    expect(inDialog().getByRole('alert')).toHaveTextContent('amount')

    await user.type(inDialog().getByLabelText('Amount'), '4')
    await user.clear(inDialog().getByLabelText('Description'))
    await user.click(inDialog().getByRole('button', { name: 'Save changes' }))
    expect(inDialog().getByRole('alert')).toHaveTextContent('description')

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(dialog()).toHaveAttribute('open')
  })

  it('calls onClose on Cancel without saving', async () => {
    const user = userEvent.setup()
    const { onSave, onClose } = renderDialog(lunch)
    await user.click(inDialog().getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onClose on Escape (dialog cancel event)', () => {
    const { onClose } = renderDialog(lunch)
    const cancel = new Event('cancel', { cancelable: true })
    dialog().dispatchEvent(cancel)
    expect(cancel.defaultPrevented).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the browser closes the dialog itself', () => {
    const { onClose } = renderDialog(lunch)
    fireEvent(dialog(), new Event('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on a backdrop click but not on clicks inside the form', () => {
    const { onClose } = renderDialog(lunch)
    const description = inDialog().getByLabelText('Description')
    fireEvent.pointerDown(description)
    fireEvent.click(description)
    expect(onClose).not.toHaveBeenCalled()

    // A drag that starts inside the form and ends on the backdrop is not a backdrop click.
    fireEvent.pointerDown(description)
    fireEvent.click(dialog())
    expect(onClose).not.toHaveBeenCalled()

    // Inside the dialog's own box (e.g. its scrollbar): not the backdrop.
    vi.spyOn(dialog(), 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 10, 200, 100))
    fireEvent.pointerDown(dialog())
    fireEvent.click(dialog(), { clientX: 50, clientY: 50 })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.pointerDown(dialog())
    fireEvent.click(dialog(), { clientX: 5, clientY: 5 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes the native dialog when expense becomes null, without a second onClose', () => {
    const { onClose, rerender } = renderDialog(lunch)
    const el = dialog()
    rerender(null)
    expect(el).not.toHaveAttribute('open')
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the new values when switched to another expense', () => {
    const { rerender } = renderDialog(lunch)
    rerender(bus)
    expect(inDialog().getByLabelText('Amount')).toHaveValue('2.75')
    expect(inDialog().getByLabelText('Description')).toHaveValue('Bus ticket')
    expect(inDialog().getByLabelText('Category')).toHaveValue('transport')
    expect(inDialog().getByLabelText('Date')).toHaveValue('2026-01-05')
  })

  it('can reopen for the same row after closing, and returns focus to the Edit button', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const editLunch = screen.getByRole('button', { name: 'Edit Lunch' })

    await user.click(editLunch)
    expect(inDialog().getByLabelText('Description')).toHaveValue('Lunch')
    fireEvent(dialog(), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(editLunch).toHaveFocus()

    await user.click(editLunch)
    expect(dialog()).toHaveAttribute('open')
    await user.click(inDialog().getByRole('button', { name: 'Cancel' }))
    expect(editLunch).toHaveFocus()
  })

  it('returns focus after saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Harness onSave={onSave} />)
    const editBus = screen.getByRole('button', { name: 'Edit Bus ticket' })
    await user.click(editBus)
    await user.click(inDialog().getByRole('button', { name: 'Save changes' }))
    expect(onSave).toHaveBeenCalledWith('b', { amountCents: 275, description: 'Bus ticket', category: 'transport', date: '2026-01-05' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(editBus).toHaveFocus()
  })
})
