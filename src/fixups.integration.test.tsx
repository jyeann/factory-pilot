import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { addCategory, removeCategory } from './lib/categories'
import { BUDGETS_STORAGE_KEY } from './features/budgets/budgets'
import { STORAGE_KEY } from './lib/storage'

describe('round 3 foundation in App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('budgets follow the month picked in the summary', async () => {
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify({ food: 5000 }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: '1', amountCents: 1000, description: 'Lunch', category: 'food', date: '2026-11-03' },
        { id: '2', amountCents: 4000, description: 'Dinner', category: 'food', date: '2026-10-20' },
      ]),
    )
    const user = userEvent.setup()
    render(<App />)
    const budgets = () => within(screen.getByRole('region', { name: 'Budgets' }))
    expect(budgets().getByText(/\$10 of \$50/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(budgets().getByText(/\$40 of \$50/)).toBeInTheDocument()
  })

  it('new categories appear in the add form, and deleted ones disappear', () => {
    render(<App />)
    const form = within(screen.getByRole('form', { name: 'Add an expense' }))
    act(() => {
      addCategory('Pets', 'p6')
    })
    expect(form.getByRole('option', { name: 'Pets' })).toBeInTheDocument()
    act(() => removeCategory('pets'))
    expect(form.queryByRole('option', { name: 'Pets' })).not.toBeInTheDocument()
  })
})
