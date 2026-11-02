import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { STORAGE_KEY } from '../../lib/storage'

const seed = [
  { id: 'a', amountCents: 500, description: 'Lunch', category: 'food', date: '2026-01-02' },
  { id: 'r', amountCents: 120000, description: 'Rent', category: 'housing', date: '2026-01-01', recurringId: 'rule-1' },
]

const editDialog = () => within(screen.getByRole('dialog', { name: 'Edit expense' }))

describe('editing an expense in the app', () => {
  beforeEach(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)))

  it('updates the row, the total and storage; the add form is untouched', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByLabelText('Total')).toHaveTextContent('1,205.00')

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    const amount = editDialog().getByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '7.25')
    const description = editDialog().getByLabelText('Description')
    await user.clear(description)
    await user.type(description, 'Big lunch')
    await user.click(editDialog().getByRole('button', { name: 'Save changes' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Big lunch')).toBeInTheDocument()
    expect(screen.queryByText('Lunch')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Total')).toHaveTextContent('1,207.25')
    const addForm = within(screen.getByRole('form', { name: 'Add an expense' }))
    expect(addForm.getByLabelText('Description')).toHaveValue('')

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored).toContainEqual({ id: 'a', amountCents: 725, description: 'Big lunch', category: 'food', date: '2026-01-02' })
  })

  it('keeps recurringId when editing a generated expense', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Edit Rent' }))
    await user.selectOptions(editDialog().getByLabelText('Category'), 'other')
    await user.click(editDialog().getByRole('button', { name: 'Save changes' }))

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored).toContainEqual({ ...seed[1], category: 'other' })
  })

  it('can be dismissed with Escape and reopened for the same row', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    expect(editDialog().getByLabelText('Description')).toHaveValue('Lunch')
  })
})
