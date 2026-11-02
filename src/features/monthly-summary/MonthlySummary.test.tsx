import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Expense } from '../../types'
import { MonthlySummary } from './MonthlySummary'

const expenses: Expense[] = [
  { id: '1', amountCents: 1250, description: 'Pizza', category: 'food', date: '2026-11-02' },
  { id: '2', amountCents: 250, description: 'Bus', category: 'transport', date: '2026-11-10' },
  { id: '3', amountCents: 4000, description: 'Concert', category: 'entertainment', date: '2026-10-20' },
]

const now = new Date(2026, 10, 15)

/** Value (`dd`) paired with the stat term (`dt`) of the given text. */
const statValue = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling

describe('MonthlySummary', () => {
  it('shows the current month by default with totals and breakdown', () => {
    render(<MonthlySummary expenses={expenses} now={now} />)

    const region = screen.getByRole('region', { name: 'Monthly summary' })
    expect(within(region).getByText(/November 2026/)).toBeInTheDocument()
    expect(statValue('Total spent')).toHaveTextContent('15.00')
    expect(statValue('Expenses')).toHaveTextContent('2')

    const items = within(region).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Food')
    expect(items[0]).toHaveTextContent('12.50')
    expect(items[1]).toHaveTextContent('Transport')
  })

  it('navigates to the previous and next month', async () => {
    const user = userEvent.setup()
    render(<MonthlySummary expenses={expenses} now={now} />)

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText(/October 2026/)).toBeInTheDocument()
    expect(statValue('Total spent')).toHaveTextContent('40.00')
    expect(screen.getByText('Entertainment')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('heading', { name: /December 2026/ })).toBeInTheDocument()
  })

  it('shows an empty state for a month without expenses', async () => {
    const user = userEvent.setup()
    render(<MonthlySummary expenses={expenses} now={now} />)

    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText('No expenses in December 2026.')).toBeInTheDocument()
    expect(screen.queryByText('Total spent')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows each category as a share of the month total', () => {
    render(<MonthlySummary expenses={expenses} now={now} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('83%')
    expect(items[1]).toHaveTextContent('17%')
    const parts = document.querySelectorAll<HTMLElement>('.ms-strip-part')
    expect([...parts].map((p) => p.style.flexGrow)).toEqual(['1250', '250'])
  })

  it('invites a first expense when the current month is empty', () => {
    render(<MonthlySummary expenses={[]} now={now} />)
    expect(screen.getByText(/Nothing spent yet this month/)).toBeInTheDocument()
  })
})
