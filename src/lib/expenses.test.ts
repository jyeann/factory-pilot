import type { Expense } from '../types'
import { addExpense, groupByDay, removeExpense, sortByDateDesc, totalCents } from './expenses'

const a: Expense = { id: 'a', amountCents: 500, description: 'Lunch', category: 'food', date: '2026-01-02' }
const b: Expense = { id: 'b', amountCents: 250, description: 'Bus', category: 'transport', date: '2026-01-05' }

describe('expense helpers', () => {
  it('adds without mutating the original list', () => {
    const list = [a]
    const next = addExpense(list, { amountCents: 100, description: 'Tea', category: 'food', date: '2026-01-03' }, 'c')
    expect(list).toHaveLength(1)
    expect(next.map((e) => e.id)).toEqual(['a', 'c'])
  })

  it('removes by id', () => {
    expect(removeExpense([a, b], 'a')).toEqual([b])
  })

  it('sorts newest first', () => {
    expect(sortByDateDesc([a, b]).map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('totals cents', () => {
    expect(totalCents([a, b])).toBe(750)
    expect(totalCents([])).toBe(0)
  })
})

describe('groupByDay', () => {
  it('groups newest day first with day totals', () => {
    const c: Expense = { ...a, id: 'c', amountCents: 100, date: '2026-01-05' }
    const groups = groupByDay([a, b, c])
    expect(groups.map((g) => g.date)).toEqual(['2026-01-05', '2026-01-02'])
    expect(groups[0].expenses.map((e) => e.id)).toEqual(['b', 'c'])
    expect(groups[0].totalCents).toBe(350)
  })

  it('returns no groups for an empty list', () => {
    expect(groupByDay([])).toEqual([])
  })
})
