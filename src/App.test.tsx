import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

/** The main "Add an expense" form; scoping keeps lookups unambiguous as features add forms. */
const addForm = () => within(screen.getByRole('form', { name: 'Add an expense' }))

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('adds and deletes an expense', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(addForm().getByLabelText('Amount'), '12.50')
    await user.type(addForm().getByLabelText('Description'), 'Pizza')
    await user.click(addForm().getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByLabelText('Total')).toHaveTextContent('12.50')

    await user.click(screen.getByRole('button', { name: 'Delete Pizza' }))
    expect(screen.queryByText('Pizza')).not.toBeInTheDocument()
  })

  it('shows a validation error for a bad amount', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(addForm().getByLabelText('Description'), 'Pizza')
    await user.click(addForm().getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toHaveTextContent('amount')
  })

  it('restores a deleted expense with Undo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(addForm().getByLabelText('Amount'), '3')
    await user.type(addForm().getByLabelText('Description'), 'Tea')
    await user.click(addForm().getByRole('button', { name: 'Add' }))

    await user.click(screen.getByRole('button', { name: 'Delete Tea' }))
    expect(screen.queryByText('Tea')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Expense deleted.')

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Tea')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })
})
