import { act, renderHook } from '@testing-library/react'
import { useExpenses } from './useExpenses'

describe('useExpenses.reassignCategory', () => {
  it('moves only the matching expenses', () => {
    const { result } = renderHook(() => useExpenses())
    act(() => {
      result.current.addMany([
        { id: 'a', amountCents: 1, description: 'A', category: 'gym', date: '2026-01-01' },
        { id: 'b', amountCents: 2, description: 'B', category: 'food', date: '2026-01-01' },
      ])
    })
    act(() => result.current.reassignCategory('gym', 'other'))
    expect(result.current.expenses.map((e) => e.category)).toEqual(['other', 'food'])
  })
})
