import { act, renderHook } from '@testing-library/react'
import { addCategory, removeCategory } from '../../lib/categories'
import { useExpenseFilter } from './useExpenseFilter'

describe('useExpenseFilter', () => {
  it('falls back to all categories when the filtered one is deleted', () => {
    addCategory('Gym', 'p1')
    const expenses = [
      { id: 'a', amountCents: 1, description: 'A', category: 'gym', date: '2026-01-01' },
      { id: 'b', amountCents: 2, description: 'B', category: 'food', date: '2026-01-01' },
    ]
    const { result } = renderHook(() => useExpenseFilter(expenses))
    act(() => result.current.setFilter({ query: '', category: 'gym' }))
    expect(result.current.filtered.map((e) => e.id)).toEqual(['a'])
    act(() => removeCategory('gym'))
    expect(result.current.filter.category).toBe('all')
    expect(result.current.filtered).toHaveLength(2)
  })
})
