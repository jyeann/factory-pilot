import { act, render, screen } from '@testing-library/react'
import {
  CATEGORIES_STORAGE_KEY,
  addCategory,
  categoryColor,
  categoryLabel,
  getAllCategories,
  getCategories,
  recolorCategory,
  removeCategory,
  renameCategory,
  resetCategoriesForTests,
  useCategories,
  validateCategoryLabel,
} from './categories'

describe('category store', () => {
  it('starts with the five built-ins and a stable snapshot', () => {
    expect(getCategories().map((c) => c.id)).toEqual(['food', 'transport', 'housing', 'entertainment', 'other'])
    expect(getCategories()).toBe(getCategories())
  })

  it('adds, renames and recolours, persisting to localStorage', () => {
    const before = getCategories()
    const pets = addCategory('Pets', 'p6')
    expect(pets).toEqual({ id: 'pets', label: 'Pets', color: 'p6' })
    expect(getCategories()).not.toBe(before)
    renameCategory('pets', 'Pet care')
    recolorCategory('pets', 'p2')
    expect(categoryLabel('pets')).toBe('Pet care')
    expect(categoryColor('pets')).toBe('var(--cat-p2)')
    expect(JSON.parse(localStorage.getItem(CATEGORIES_STORAGE_KEY)!)).toContainEqual({ id: 'pets', label: 'Pet care', color: 'p2' })
  })

  it('keeps built-in colour tokens unless recoloured', () => {
    expect(categoryColor('food')).toBe('var(--cat-food)')
    recolorCategory('food', 'p9')
    expect(categoryColor('food')).toBe('var(--cat-p9)')
    expect(categoryColor('nope')).toBe('var(--cat-other)')
  })

  it('archives on delete: hidden from pickers but labels still resolve', () => {
    addCategory('Gym', 'p1')
    removeCategory('gym')
    expect(getCategories().some((c) => c.id === 'gym')).toBe(false)
    expect(getAllCategories().find((c) => c.id === 'gym')?.archived).toBe(true)
    expect(categoryLabel('gym')).toBe('Gym')
  })

  it('never reuses an id, even after delete', () => {
    addCategory('Gym', 'p1')
    removeCategory('gym')
    expect(addCategory('Gym', 'p1').id).toBe('gym-2')
    expect(addCategory('日本', 'p3').id).toBe('c-2')
  })

  it('protects "other" and validates labels', () => {
    expect(() => removeCategory('other')).toThrow()
    expect(validateCategoryLabel('  ')).toMatch(/Enter/)
    expect(validateCategoryLabel('FOOD')).toMatch(/already exists/)
    expect(validateCategoryLabel('Food', 'food')).toBeNull()
    expect(validateCategoryLabel('x'.repeat(25))).toMatch(/24/)
  })

  it('loads lazily from localStorage and drops bad entries', () => {
    localStorage.setItem(
      CATEGORIES_STORAGE_KEY,
      JSON.stringify([{ id: 'tea', label: 'Tea', color: 'p4' }, { id: 'bad' }, { id: 'x', label: 'X', color: '#fff' }]),
    )
    resetCategoriesForTests()
    expect(getCategories().map((c) => c.id)).toEqual(['tea', 'x', 'other'])
    expect(getCategories()[1].color).toBeUndefined()
  })

  it('re-renders subscribers when categories change', () => {
    function Names() {
      return <p>{useCategories().map((c) => c.label).join(',')}</p>
    }
    render(<Names />)
    act(() => {
      addCategory('Pets', 'p6')
    })
    expect(screen.getByText(/Pets/)).toBeInTheDocument()
  })
})
