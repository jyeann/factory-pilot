import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseForm } from './ExpenseForm'
import { addCategory, removeCategory } from '../lib/categories'

const initial = { amountCents: 1250, description: 'Pizza', category: 'entertainment', date: '2026-10-30' }

describe('ExpenseForm', () => {
  it('prefills from initial and submits all fields without resetting', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<ExpenseForm onAdd={onAdd} initial={initial} title="Edit expense" submitLabel="Save changes" resetOnSubmit={false} />)

    expect(screen.getByRole('form', { name: 'Edit expense' })).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveValue('12.50')
    expect(screen.getByLabelText('Description')).toHaveValue('Pizza')
    expect(screen.getByLabelText('Category')).toHaveValue('entertainment')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-30')

    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '9')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onAdd).toHaveBeenCalledWith({ ...initial, amountCents: 900 })
    expect(screen.getByLabelText('Description')).toHaveValue('Pizza')
  })

  it('shows Cancel only when onCancel is given', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const { rerender } = render(<ExpenseForm onAdd={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()

    rerender(<ExpenseForm onAdd={vi.fn()} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('resets amount and description after adding by default', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm onAdd={vi.fn()} />)
    await user.type(screen.getByLabelText('Amount'), '3')
    await user.type(screen.getByLabelText('Description'), 'Tea')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByLabelText('Amount')).toHaveValue('')
    expect(screen.getByLabelText('Description')).toHaveValue('')
  })

  it('keeps a deleted category when editing an expense that has it', () => {
    addCategory('Gym', 'p1')
    removeCategory('gym')
    render(<ExpenseForm onAdd={vi.fn()} initial={{ ...initial, category: 'gym' }} />)
    expect(screen.getByLabelText('Category')).toHaveValue('gym')
    expect(screen.getByRole('option', { name: 'Gym (deleted)' })).toBeInTheDocument()
  })
})
