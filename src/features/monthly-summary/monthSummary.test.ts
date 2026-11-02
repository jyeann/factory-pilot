import type { Expense } from '../../types'
import { currentMonth, expensesInMonth, formatMonthLabel, shiftMonth, totalsByCategory } from './monthSummary'

const make = (id: string, amountCents: number, category: string, date: string): Expense => ({
  id,
  amountCents,
  description: id,
  category,
  date,
})

const list: Expense[] = [
  make('a', 500, 'food', '2026-03-01'),
  make('b', 1200, 'transport', '2026-03-31'),
  make('c', 300, 'food', '2026-03-15'),
  make('d', 999, 'food', '2026-02-28'),
  make('e', 100, 'other', '2026-04-01'),
  make('f', 700, 'mystery', '2026-03-10'),
]

describe('currentMonth', () => {
  it('formats the local month as YYYY-MM with zero padding', () => {
    expect(currentMonth(new Date(2026, 0, 31))).toBe('2026-01')
    expect(currentMonth(new Date(2026, 10, 2))).toBe('2026-11')
  })
})

describe('shiftMonth', () => {
  it.each([
    ['2026-03', 1, '2026-04'],
    ['2026-03', -1, '2026-02'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-01', -13, '2024-12'],
    ['2026-05', 0, '2026-05'],
  ])('shifts %s by %i to %s', (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected)
  })
})

describe('expensesInMonth', () => {
  it('keeps only expenses whose date falls in the month, including edge days', () => {
    expect(expensesInMonth(list, '2026-03').map((e) => e.id)).toEqual(['a', 'b', 'c', 'f'])
  })

  it('returns an empty list for a month with no expenses', () => {
    expect(expensesInMonth(list, '2025-07')).toEqual([])
  })

  it('does not mutate the input', () => {
    const copy = [...list]
    expensesInMonth(list, '2026-03')
    expect(list).toEqual(copy)
  })
})

describe('totalsByCategory', () => {
  it('sums per category, sorted by amount descending', () => {
    expect(totalsByCategory(expensesInMonth(list, '2026-03'))).toEqual([
      { category: 'transport', label: 'Transport', totalCents: 1200, count: 1 },
      { category: 'food', label: 'Food', totalCents: 800, count: 2 },
      { category: 'mystery', label: 'mystery', totalCents: 700, count: 1 },
    ])
  })

  it('breaks ties by label', () => {
    const tied = [make('x', 100, 'transport', '2026-03-01'), make('y', 100, 'food', '2026-03-01')]
    expect(totalsByCategory(tied).map((t) => t.category)).toEqual(['food', 'transport'])
  })

  it('returns [] for no expenses', () => {
    expect(totalsByCategory([])).toEqual([])
  })
})

describe('formatMonthLabel', () => {
  it('produces a human readable month and year', () => {
    const label = formatMonthLabel('2026-03')
    expect(label).toMatch(/2026/)
    expect(label).toMatch(/Mar/)
  })
})
