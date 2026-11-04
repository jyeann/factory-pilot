import type { Expense } from '../../types'
import { CATEGORY_PALETTE, type Category } from '../../lib/categories'
import { PALETTE_NAMES, countByCategory, formatExpenseCount, reassignTargets, suggestColor } from './categoryHelpers'

const expense = (id: string, category: string): Expense => ({ id, description: id, category, amountCents: 100, date: '2026-11-01' })

describe('category helpers', () => {
  it('counts expenses per category', () => {
    const counts = countByCategory([expense('1', 'food'), expense('2', 'food'), expense('3', 'other')])
    expect(counts.get('food')).toBe(2)
    expect(counts.get('other')).toBe(1)
    expect(counts.get('housing')).toBeUndefined()
  })

  it('formats expense counts', () => {
    expect(formatExpenseCount(0)).toBe('No expenses')
    expect(formatExpenseCount(1)).toBe('1 expense')
    expect(formatExpenseCount(12)).toBe('12 expenses')
  })

  it('names every palette colour', () => {
    expect(CATEGORY_PALETTE.every((key) => PALETTE_NAMES[key].length > 0)).toBe(true)
    expect(new Set(Object.values(PALETTE_NAMES)).size).toBe(CATEGORY_PALETTE.length)
  })

  it('suggests the first unused palette colour', () => {
    expect(suggestColor([{ id: 'a', label: 'A' }])).toBe('p1')
    expect(suggestColor([{ id: 'food', label: 'Food' }, { id: 'transport', label: 'Transport' }])).toBe('p3')
    expect(suggestColor([{ id: 'a', label: 'A', color: 'p1' }, { id: 'b', label: 'B', color: 'p2' }])).toBe('p3')
    const full: Category[] = CATEGORY_PALETTE.map((color) => ({ id: color, label: color, color }))
    expect(suggestColor(full)).toBe('p1')
  })

  it('offers every other category as a reassign target, Other first', () => {
    const list: Category[] = [
      { id: 'food', label: 'Food' },
      { id: 'transport', label: 'Transport' },
      { id: 'other', label: 'Other' },
    ]
    expect(reassignTargets(list, 'food').map((c) => c.id)).toEqual(['other', 'transport'])
  })
})
