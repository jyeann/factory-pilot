import type { Expense } from '../../types'
import {
  BUDGETS_STORAGE_KEY,
  budgetStatus,
  formatBudgetMoney,
  loadBudgets,
  monthOf,
  parseBudgets,
  saveBudgets,
} from './budgets'

let nextId = 0
const expense = (category: string, amountCents: number, date: string, extra: Partial<Expense> = {}): Expense => ({
  id: String(nextId++),
  description: 'x',
  category,
  amountCents,
  date,
  ...extra,
})

describe('budgetStatus', () => {
  it('returns nothing when there are no budgets', () => {
    expect(budgetStatus([expense('food', 500, '2026-11-02')], {}, '2026-11')).toEqual([])
  })

  it('sums only the given month and the budgeted category', () => {
    const expenses = [
      expense('food', 1000, '2026-11-01'),
      expense('food', 2200, '2026-11-30'),
      expense('food', 9900, '2026-10-31'),
      expense('food', 9900, '2025-11-15'),
      expense('transport', 700, '2026-11-05'),
    ]
    expect(budgetStatus(expenses, { food: 20000 }, '2026-11')).toEqual([
      { category: 'food', spentCents: 3200, limitCents: 20000, ratio: 0.16, state: 'ok' },
    ])
  })

  it('counts recurring-generated expenses like any other', () => {
    const expenses = [expense('housing', 50000, '2026-11-01', { recurringId: 'r1' })]
    expect(budgetStatus(expenses, { housing: 100000 }, '2026-11')[0].spentCents).toBe(50000)
  })

  it('marks near at 80% and over above 100%', () => {
    const budgets = { food: 10000, transport: 10000, housing: 10000, entertainment: 10000 }
    const expenses = [
      expense('food', 7999, '2026-11-02'),
      expense('transport', 8000, '2026-11-02'),
      expense('housing', 10000, '2026-11-02'),
      expense('entertainment', 10001, '2026-11-02'),
    ]
    const states = Object.fromEntries(budgetStatus(expenses, budgets, '2026-11').map((s) => [s.category, s.state]))
    expect(states).toEqual({ food: 'ok', transport: 'near', housing: 'near', entertainment: 'over' })
  })

  it('reports a zero ratio for a budgeted category with no spending, in category order', () => {
    const result = budgetStatus([], { other: 500, food: 100 }, '2026-11')
    expect(result.map((s) => s.category)).toEqual(['food', 'other'])
    expect(result[0]).toMatchObject({ spentCents: 0, ratio: 0, state: 'ok' })
  })
})

describe('parseBudgets', () => {
  it('drops non-positive and non-integer values', () => {
    expect(parseBudgets({ food: 1000, transport: 0, housing: -5, other: 12.5, entertainment: '300' })).toEqual({ food: 1000 })
  })

  it('rejects non-objects', () => {
    expect(parseBudgets(null)).toBeNull()
    expect(parseBudgets([1, 2])).toBeNull()
    expect(parseBudgets('x')).toBeNull()
  })
})

describe('storage', () => {
  it('round-trips budgets under its own key', () => {
    saveBudgets({ food: 20000 })
    expect(JSON.parse(localStorage.getItem(BUDGETS_STORAGE_KEY) ?? '')).toEqual({ food: 20000 })
    expect(loadBudgets()).toEqual({ food: 20000 })
  })

  it('falls back to no budgets on corrupt data', () => {
    localStorage.setItem(BUDGETS_STORAGE_KEY, '{oops')
    expect(loadBudgets()).toEqual({})
  })
})

describe('helpers', () => {
  it('monthOf uses local time', () => {
    expect(monthOf(new Date(2026, 0, 31, 23, 59))).toBe('2026-01')
  })

  it('formats whole dollars compactly', () => {
    expect(formatBudgetMoney(3200)).toBe('$32')
    expect(formatBudgetMoney(1250)).toBe('$12.50')
  })
})
