import type { Expense } from '../../types'
import { ALL_CATEGORIES, EMPTY_FILTER, filterExpenses, isFilterActive } from './filterExpenses'

const lunch: Expense = { id: 'a', amountCents: 500, description: 'Lunch at Café', category: 'food', date: '2026-01-02' }
const bus: Expense = { id: 'b', amountCents: 250, description: 'Bus ticket', category: 'transport', date: '2026-01-05' }
const dinner: Expense = { id: 'c', amountCents: 1500, description: 'Dinner', category: 'food', date: '2026-01-06' }
const all = [lunch, bus, dinner]

describe('filterExpenses', () => {
  it('returns every expense for the empty filter', () => {
    expect(filterExpenses(all, EMPTY_FILTER)).toEqual(all)
  })

  it('matches description case-insensitively', () => {
    expect(filterExpenses(all, { query: 'LUNCH', category: ALL_CATEGORIES })).toEqual([lunch])
    expect(filterExpenses(all, { query: 'café', category: ALL_CATEGORIES })).toEqual([lunch])
  })

  it('matches substrings anywhere in the description', () => {
    expect(filterExpenses(all, { query: 'ticket', category: ALL_CATEGORIES })).toEqual([bus])
  })

  it('ignores surrounding whitespace and treats a blank query as no query', () => {
    expect(filterExpenses(all, { query: '  dinner ', category: ALL_CATEGORIES })).toEqual([dinner])
    expect(filterExpenses(all, { query: '   ', category: ALL_CATEGORIES })).toEqual(all)
  })

  it('filters by category', () => {
    expect(filterExpenses(all, { query: '', category: 'food' })).toEqual([lunch, dinner])
  })

  it('combines text and category', () => {
    expect(filterExpenses(all, { query: 'dinner', category: 'food' })).toEqual([dinner])
    expect(filterExpenses(all, { query: 'dinner', category: 'transport' })).toEqual([])
  })

  it('does not mutate the input list', () => {
    const list = [...all]
    filterExpenses(list, { query: 'bus', category: 'transport' })
    expect(list).toEqual(all)
  })
})

describe('isFilterActive', () => {
  it('is false for the empty filter and a blank query', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false)
    expect(isFilterActive({ query: '  ', category: ALL_CATEGORIES })).toBe(false)
  })

  it('is true when a query or category is set', () => {
    expect(isFilterActive({ query: 'x', category: ALL_CATEGORIES })).toBe(true)
    expect(isFilterActive({ query: '', category: 'food' })).toBe(true)
  })
})
