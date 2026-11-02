import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { STORAGE_KEY } from '../../lib/storage'

const seed = [
  { id: 'a', amountCents: 500, description: 'Lunch', category: 'food', date: '2026-01-02' },
  { id: 'b', amountCents: 250, description: 'Bus ticket', category: 'transport', date: '2026-01-05' },
  { id: 'c', amountCents: 1500, description: 'Dinner', category: 'food', date: '2026-01-06' },
]

describe('search and category filter', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
  })

  it('narrows the list and total, shows "No matches", and clears', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByLabelText('Total')).toHaveTextContent('22.50')

    await user.selectOptions(screen.getByLabelText('Category filter'), 'food')
    expect(screen.queryByText('Bus ticket')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Total')).toHaveTextContent('20.00')

    await user.type(screen.getByLabelText('Search'), 'DIN')
    expect(screen.getByText('Dinner')).toBeInTheDocument()
    expect(screen.queryByText('Lunch')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Total')).toHaveTextContent('15.00')

    await user.type(screen.getByLabelText('Search'), 'xyz')
    expect(screen.getByText(/^No matches/)).toBeInTheDocument()
    expect(screen.queryByText(/No expenses yet/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByLabelText('Search')).toHaveValue('')
    expect(screen.getByLabelText('Category filter')).toHaveValue('all')
    expect(screen.getByLabelText('Total')).toHaveTextContent('22.50')
  })

  it('disables the clear button when no filter is active', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled()
  })

  it('hides the filter bar when there are no expenses', () => {
    localStorage.clear()
    render(<App />)
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
  })
})
