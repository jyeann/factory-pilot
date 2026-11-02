import { loadExpenses, loadJson, saveExpenses, saveJson, STORAGE_KEY } from './storage'

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

describe('loadJson / saveJson', () => {
  const parseNumbers = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : null)

  it('round-trips and lets parse clean the value', () => {
    saveJson('k', [1, 'x', 2])
    expect(loadJson('k', parseNumbers, [])).toEqual([1, 2])
  })

  it('falls back for missing, invalid JSON, or rejected values', () => {
    expect(loadJson('missing', parseNumbers, [9])).toEqual([9])
    localStorage.setItem('k', '{bad')
    expect(loadJson('k', parseNumbers, [9])).toEqual([9])
    localStorage.setItem('k', '"not an array"')
    expect(loadJson('k', parseNumbers, [9])).toEqual([9])
  })

  it('keeps expenses that have a recurringId', () => {
    const e = { id: 'r', amountCents: 1, description: 'Rent', category: 'housing', date: '2026-01-01', recurringId: 'rule1' }
    saveExpenses([e])
    expect(loadExpenses()).toEqual([e])
  })
})
