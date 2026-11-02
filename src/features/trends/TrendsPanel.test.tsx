import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { renameCategory } from '../../lib/categories'
import { formatCents } from '../../lib/money'
import { formatMonthLabel, formatShortMonth } from '../../lib/months'
import type { Expense } from '../../types'
import { TrendsPanel } from './TrendsPanel'
import { monthlyTotals } from './trends'

const TODAY = '2026-06-15'

const expenses: Expense[] = [
  { id: '1', date: '2026-05-03', amountCents: 80000, category: 'housing', description: 'Rent' },
  { id: '2', date: '2026-05-20', amountCents: 34943, category: 'food', description: 'Groceries' },
  { id: '3', date: '2026-06-01', amountCents: 80000, category: 'housing', description: 'Rent' },
  { id: '4', date: '2026-06-10', amountCents: 21150, category: 'food', description: 'Groceries' },
  { id: '5', date: '2026-02-02', amountCents: 1500, category: 'transport', description: 'Bus' },
]

function columns(container: HTMLElement) {
  return Array.from(container.querySelectorAll<SVGGElement>('.trend-column'))
}

describe('TrendsPanel', () => {
  it('shows an empty state when fewer than two months have spending', () => {
    render(<TrendsPanel expenses={[expenses[2]]} today={TODAY} />)
    expect(screen.getByRole('heading', { name: 'Spending trends' })).toBeInTheDocument()
    expect(screen.getByText(/at least two of the last six months/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show numbers' })).not.toBeInTheDocument()
  })

  it('summarises this month against last month', () => {
    render(<TrendsPanel expenses={expenses} today={TODAY} />)
    expect(screen.getByText('This month $1,011.50, 12% less than last month')).toBeInTheDocument()
  })

  it('renders one column per month, oldest first, with the current month highlighted', () => {
    const { container } = render(<TrendsPanel expenses={expenses} today={TODAY} />)
    const chart = screen.getByRole('img', { name: /spending per month/i })
    const cols = columns(container)
    expect(cols).toHaveLength(6)
    expect(cols.map((c) => c.dataset.month)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'])
    expect(cols.map((c) => c.querySelector('.trend-label')?.textContent)).toEqual(
      ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'].map(formatShortMonth),
    )
    expect(cols.filter((c) => c.classList.contains('trend-current')).map((c) => c.dataset.month)).toEqual(['2026-06'])
    expect(chart.querySelectorAll('.trend-highlight')).toHaveLength(1)
  })

  it('stacks one segment per category, coloured from the category store, scaled to the biggest month', () => {
    const { container } = render(<TrendsPanel expenses={expenses} today={TODAY} />)
    const [, feb, mar, , may, jun] = columns(container)
    expect(mar.querySelectorAll('.trend-segment')).toHaveLength(0)
    expect(feb.querySelectorAll('.trend-segment')).toHaveLength(1)
    const maySegments = Array.from(may.querySelectorAll<SVGRectElement>('.trend-segment'))
    expect(maySegments.map((s) => s.style.fill)).toEqual(['var(--cat-food)', 'var(--cat-housing)'])
    const height = (col: SVGGElement) =>
      Array.from(col.querySelectorAll('.trend-segment')).reduce((sum, s) => sum + Number(s.getAttribute('height')), 0)
    expect(height(may)).toBeGreaterThan(height(jun))
    expect(height(jun) / height(may)).toBeCloseTo(101150 / 114943, 5)
  })

  it('shows a key with the categories in use', () => {
    render(<TrendsPanel expenses={expenses} today={TODAY} />)
    const key = screen.getByRole('list', { name: 'Chart key' })
    expect(within(key).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Food', 'Transport', 'Housing'])
  })

  it('toggles a data table that matches the chart data', async () => {
    const user = userEvent.setup()
    render(<TrendsPanel expenses={expenses} today={TODAY} />)
    const toggle = screen.getByRole('button', { name: 'Show numbers' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const table = screen.getByRole('table', { name: 'Spending by month and category' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Month', 'Food', 'Transport', 'Housing', 'Spent'])

    const totals = monthlyTotals(expenses, TODAY)
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(6)
    rows.forEach((row, i) => {
      const t = totals[i]
      const cells = within(row).getAllByRole('cell').map((c) => c.textContent)
      expect(within(row).getByRole('rowheader')).toHaveTextContent(formatMonthLabel(t.month))
      expect(cells).toEqual([
        formatCents(t.byCategory.food ?? 0),
        formatCents(t.byCategory.transport ?? 0),
        formatCents(t.byCategory.housing ?? 0),
        formatCents(t.totalCents),
      ])
    })

    await user.click(toggle)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('follows category renames', async () => {
    const user = userEvent.setup()
    render(<TrendsPanel expenses={expenses} today={TODAY} />)
    act(() => renameCategory('food', 'Groceries'))
    await user.click(screen.getByRole('button', { name: 'Show numbers' }))
    expect(screen.getByRole('columnheader', { name: 'Groceries' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Chart key' })).getByText('Groceries')).toBeInTheDocument()
  })

  it('does not add status or alert regions', () => {
    render(<TrendsPanel expenses={expenses} today={TODAY} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
