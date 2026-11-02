import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Expense } from '../../types'
import { BudgetsPanel } from '.'
import { BUDGETS_STORAGE_KEY } from './budgets'

const NOW = new Date(2026, 10, 15)

const expense = (id: string, category: string, amountCents: number, date = '2026-11-03'): Expense => ({
  id,
  description: `e${id}`,
  category,
  amountCents,
  date,
})

describe('BudgetsPanel', () => {
  it('invites the user to set a budget when there are none', () => {
    render(<BudgetsPanel expenses={[]} now={NOW} />)
    expect(screen.getByRole('heading', { name: 'Budgets' })).toBeInTheDocument()
    expect(screen.getByText(/set a monthly limit/i)).toBeInTheDocument()
  })

  it('saves budgets from the editor and persists them', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<BudgetsPanel expenses={[expense('1', 'food', 3200)]} now={NOW} />)

    const toggle = screen.getByRole('button', { name: 'Set budgets' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.type(screen.getByLabelText('Budget for Food'), '200')
    await user.click(screen.getByRole('button', { name: 'Save budgets' }))

    expect(screen.queryByLabelText('Budget for Food')).not.toBeInTheDocument()
    expect(screen.getByText('$32 of $200')).toBeInTheDocument()
    expect(screen.getByText('$168 left')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(BUDGETS_STORAGE_KEY) ?? '')).toEqual({ food: 20000 })

    unmount()
    render(<BudgetsPanel expenses={[]} now={NOW} />)
    expect(screen.getByText('$0 of $200')).toBeInTheDocument()
  })

  it('prefills the editor and clears a budget when left blank', async () => {
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify({ food: 1250, transport: 5000 }))
    const user = userEvent.setup()
    render(<BudgetsPanel expenses={[]} now={NOW} />)

    await user.click(screen.getByRole('button', { name: 'Set budgets' }))
    const food = screen.getByLabelText('Budget for Food')
    expect(food).toHaveValue('12.50')
    expect(screen.getByLabelText('Budget for Transport')).toHaveValue('50.00')

    await user.clear(food)
    await user.click(screen.getByRole('button', { name: 'Save budgets' }))

    expect(JSON.parse(localStorage.getItem(BUDGETS_STORAGE_KEY) ?? '')).toEqual({ transport: 5000 })
    expect(screen.queryByText(/of \$12\.50/)).not.toBeInTheDocument()
  })

  it('keeps budgets for categories the editor does not show', async () => {
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify({ pets: 3000 }))
    const user = userEvent.setup()
    render(<BudgetsPanel expenses={[]} now={NOW} />)
    await user.click(screen.getByRole('button', { name: 'Set budgets' }))
    await user.type(screen.getByLabelText('Budget for Food'), '10')
    await user.click(screen.getByRole('button', { name: 'Save budgets' }))
    expect(JSON.parse(localStorage.getItem(BUDGETS_STORAGE_KEY) ?? '')).toEqual({ pets: 3000, food: 1000 })
  })

  it('rejects invalid amounts without saving', async () => {
    const user = userEvent.setup()
    render(<BudgetsPanel expenses={[]} now={NOW} />)
    await user.click(screen.getByRole('button', { name: 'Set budgets' }))
    await user.type(screen.getByLabelText('Budget for Housing'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Save budgets' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Housing')
    expect(localStorage.getItem(BUDGETS_STORAGE_KEY)).toBeNull()
  })

  it('shows an over-budget message and ignores other months', () => {
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify({ food: 20000 }))
    const expenses = [expense('1', 'food', 21200), expense('2', 'food', 99900, '2026-10-31')]
    render(<BudgetsPanel expenses={expenses} now={NOW} />)

    expect(screen.getByText('$212 of $200')).toBeInTheDocument()
    expect(screen.getByText('$12 over')).toBeInTheDocument()
  })

  it('flags a category near its limit in text', () => {
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify({ transport: 10000 }))
    render(<BudgetsPanel expenses={[expense('1', 'transport', 9000)]} now={NOW} />)
    expect(screen.getByText(/almost at the limit/)).toBeInTheDocument()
  })
})
