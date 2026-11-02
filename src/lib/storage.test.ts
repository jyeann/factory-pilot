import { loadExpenses, saveExpenses, STORAGE_KEY } from './storage'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips expenses', () => {
    const list = [{ id: 'x', amountCents: 100, description: 'Tea', category: 'food', date: '2026-01-01' }]
    saveExpenses(list)
    expect(loadExpenses()).toEqual(list)
  })

  it('returns [] for missing or corrupt data', () => {
    expect(loadExpenses()).toEqual([])
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadExpenses()).toEqual([])
  })

  it('drops malformed entries', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 1 }, { id: 'ok', amountCents: 1, description: 'd', category: 'food', date: '2026-01-01' }]))
    expect(loadExpenses().map((e) => e.id)).toEqual(['ok'])
  })
})
