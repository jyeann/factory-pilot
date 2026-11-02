import type { Expense } from '../types'
import { addExpense, removeExpense, sortByDateDesc, totalCents } from './expenses'

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
