import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Expense } from '../types'
import { ExpenseList } from './ExpenseList'

const rent: Expense = { id: 'r', amountCents: 120000, description: 'Rent', category: 'housing', date: '2026-11-01', recurringId: 'rule1' }
const tea: Expense = { id: 't', amountCents: 300, description: 'Tea', category: 'food', date: '2026-11-01' }

describe('ExpenseList', () => {
  it('has no Edit buttons without onEdit', () => {
    render(<ExpenseList expenses={[tea]} onRemove={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument()
  })

  it('calls onEdit with the row expense', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<ExpenseList expenses={[tea, rent]} onRemove={vi.fn()} onEdit={onEdit} />)
    await user.click(screen.getByRole('button', { name: 'Edit Rent' }))
    expect(onEdit).toHaveBeenCalledWith(rent)
  })

  it('marks recurring expenses with accessible text', () => {
    render(<ExpenseList expenses={[tea, rent]} onRemove={vi.fn()} />)
    expect(screen.getAllByText(', repeats')).toHaveLength(1)
  })
})
