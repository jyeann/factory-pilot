import { addCategory } from '../../lib/categories'
import type { Expense } from '../../types'
import { categoriesInUse, hasTrend, monthlyTotals, percentChange, trendSummary, type MonthTotal } from './trends'

let seq = 0
function exp(date: string, amountCents: number, category = 'food'): Expense {
  seq += 1
  return { id: `e${seq}`, date, amountCents, category, description: 'x' }
}

function totalsOf(...cents: number[]): MonthTotal[] {
  return cents.map((totalCents, i) => ({ month: `2026-0${i + 1}`, totalCents, byCategory: {} }))
}

describe('monthlyTotals', () => {
  it('returns six months oldest first ending with the month of today, including empty months', () => {
    const totals = monthlyTotals([exp('2026-06-02', 500)], '2026-06-15')
    expect(totals.map((t) => t.month)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'])
    expect(totals.map((t) => t.totalCents)).toEqual([0, 0, 0, 0, 0, 500])
    expect(totals[0].byCategory).toEqual({})
  })

  it('sums per month and per category', () => {
    const totals = monthlyTotals(
      [exp('2026-05-01', 1000, 'food'), exp('2026-05-31', 250, 'food'), exp('2026-05-10', 4000, 'housing'), exp('2026-06-01', 99, 'transport')],
      '2026-06-01',
    )
    const may = totals.find((t) => t.month === '2026-05')!
    expect(may.totalCents).toBe(5250)
    expect(may.byCategory).toEqual({ food: 1250, housing: 4000 })
    expect(totals[5]).toEqual({ month: '2026-06', totalCents: 99, byCategory: { transport: 99 } })
  })

  it('crosses the year boundary', () => {
    const totals = monthlyTotals([exp('2025-11-30', 100), exp('2025-12-01', 200), exp('2026-02-14', 300)], '2026-02-01')
    expect(totals.map((t) => t.month)).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'])
    expect(totals.map((t) => t.totalCents)).toEqual([0, 0, 100, 200, 0, 300])
  })

  it('ignores expenses outside the window (older or in the future)', () => {
    const totals = monthlyTotals([exp('2025-12-31', 100), exp('2026-07-01', 200), exp('2026-01-01', 7)], '2026-06-30')
    expect(totals.reduce((sum, t) => sum + t.totalCents, 0)).toBe(7)
  })

  it('supports a custom number of months', () => {
    expect(monthlyTotals([], '2026-03-10', 3).map((t) => t.month)).toEqual(['2026-01', '2026-02', '2026-03'])
  })
})

describe('percentChange', () => {
  it('rounds to whole percent, up or down', () => {
    expect(percentChange(88, 100)).toBe(-12)
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(100, 100)).toBe(0)
    expect(percentChange(0, 100)).toBe(-100)
  })

  it('is null when last month is zero', () => {
    expect(percentChange(500, 0)).toBeNull()
    expect(percentChange(0, 0)).toBeNull()
  })
})

describe('trendSummary', () => {
  it('reports the amount and change versus last month', () => {
    expect(trendSummary(totalsOf(0, 114943, 101150))).toBe('This month $1,011.50, 12% less than last month')
    expect(trendSummary(totalsOf(1000, 1500))).toBe('This month $15.00, 50% more than last month')
    expect(trendSummary(totalsOf(1000, 1001))).toBe('This month $10.01, about the same as last month')
  })

  it('handles a zero last month', () => {
    expect(trendSummary(totalsOf(0, 0, 2500))).toBe('This month $25.00, first month with spending')
    expect(trendSummary(totalsOf(700, 0, 2500))).toBe('This month $25.00, nothing spent last month')
    expect(trendSummary(totalsOf(0, 0, 0))).toBe('This month $0.00, nothing spent yet')
  })

  it('reports a drop to nothing this month', () => {
    expect(trendSummary(totalsOf(800, 0))).toBe('This month $0.00, 100% less than last month')
    expect(trendSummary(totalsOf(0, 800, 0))).toBe('This month $0.00, 100% less than last month')
  })
})

describe('hasTrend', () => {
  it('needs at least two months with spending', () => {
    expect(hasTrend(totalsOf(0, 0, 100))).toBe(false)
    expect(hasTrend(totalsOf(5, 0, 100))).toBe(true)
  })
})

describe('categoriesInUse', () => {
  it('orders used categories like the store, unknown ids last', () => {
    const custom = addCategory('Pets', 'p6')
    const totals = monthlyTotals(
      [exp('2026-06-01', 1, 'zzz-unknown'), exp('2026-06-01', 1, custom.id), exp('2026-05-01', 1, 'other'), exp('2026-06-02', 1, 'food')],
      '2026-06-10',
    )
    expect(categoriesInUse(totals)).toEqual(['food', 'other', custom.id, 'zzz-unknown'])
  })
})
