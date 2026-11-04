import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Expense } from '../../types'
import { CATEGORIES_STORAGE_KEY, addCategory, categoryColor, getAllCategories, getCategories } from '../../lib/categories'
import { CategoriesPanel } from '.'

const expense = (id: string, category: string): Expense => ({
  id,
  description: `e${id}`,
  category,
  amountCents: 500,
  date: '2026-11-01',
})

function setup(expenses: Expense[] = [], onReassign = vi.fn()) {
  const user = userEvent.setup()
  render(<CategoriesPanel expenses={expenses} onReassign={onReassign} />)
  return { user, onReassign }
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Manage categories' }))
}

const rowFor = (label: string) => screen.getByText(label, { selector: '.cat-row-label' }).closest('li') as HTMLElement

describe('CategoriesPanel', () => {
  it('is collapsed by default and renders no live regions', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Manage categories' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('New category name')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('lists every category with its expense count', async () => {
    const { user } = setup([expense('1', 'food'), expense('2', 'food'), expense('3', 'transport')])
    await openPanel(user)
    expect(screen.getByRole('button', { name: 'Manage categories' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(rowFor('Food')).getByText('2 expenses')).toBeInTheDocument()
    expect(within(rowFor('Transport')).getByText('1 expense')).toBeInTheDocument()
    expect(within(rowFor('Housing')).getByText('No expenses')).toBeInTheDocument()
  })

  it('adds a category with the chosen colour', async () => {
    const { user } = setup()
    await openPanel(user)
    await user.type(screen.getByLabelText('New category name'), '  Pets ')
    const colours = screen.getByRole('radiogroup', { name: 'Colour for new category' })
    expect(within(colours).getAllByRole('radio')).toHaveLength(10)
    await user.click(within(colours).getByRole('radio', { name: 'Teal' }))
    await user.click(screen.getByRole('button', { name: 'Add category' }))

    expect(getCategories().map((c) => c.label)).toContain('Pets')
    const pets = getCategories().find((c) => c.label === 'Pets')
    expect(pets?.color).toBe('p6')
    expect(rowFor('Pets')).toBeInTheDocument()
    expect(screen.getByLabelText('New category name')).toHaveValue('')
    expect(JSON.parse(localStorage.getItem(CATEGORIES_STORAGE_KEY) ?? '[]')).toContainEqual({ id: 'pets', label: 'Pets', color: 'p6' })
  })

  it('validates new names: empty, too long and duplicates (case-insensitive)', async () => {
    const { user } = setup()
    await openPanel(user)
    const name = screen.getByLabelText('New category name')
    const addButton = screen.getByRole('button', { name: 'Add category' })

    await user.click(addButton)
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a category name.')
    expect(name).toHaveAttribute('aria-invalid', 'true')

    await user.type(name, 'x'.repeat(25))
    await user.click(addButton)
    expect(screen.getByRole('alert')).toHaveTextContent('24 characters')

    await user.clear(name)
    await user.type(name, 'fOOD')
    await user.click(addButton)
    expect(screen.getByRole('alert')).toHaveTextContent('already exists')
    expect(getCategories()).toHaveLength(5)
  })

  it('renames a category inline', async () => {
    const { user } = setup()
    await openPanel(user)
    const renameButton = screen.getByRole('button', { name: 'Rename Food' })
    await user.click(renameButton)
    const input = screen.getByLabelText('Name for Food')
    expect(input).toHaveFocus()
    await user.clear(input)
    await user.type(input, 'Groceries{Enter}')

    expect(getCategories().find((c) => c.id === 'food')?.label).toBe('Groceries')
    expect(screen.queryByLabelText('Name for Food')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename Groceries' })).toHaveFocus()
  })

  it('rejects a rename to an existing name and cancels with Escape', async () => {
    const { user } = setup()
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: 'Rename Food' }))
    const input = screen.getByLabelText('Name for Food')
    await user.clear(input)
    await user.type(input, 'transport{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('already exists')

    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('Name for Food')).not.toBeInTheDocument()
    expect(getCategories().find((c) => c.id === 'food')?.label).toBe('Food')
  })

  it('recolours a category from the palette radio group', async () => {
    const { user } = setup()
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: 'Colour of Food' }))
    const group = screen.getByRole('radiogroup', { name: 'Colour for Food' })
    expect(within(group).queryByRole('radio', { checked: true })).not.toBeInTheDocument()
    expect(within(group).getByRole('radio', { name: 'Green' })).toHaveFocus()

    await user.click(within(group).getByRole('radio', { name: 'Orange' }))
    expect(getCategories().find((c) => c.id === 'food')?.color).toBe('p5')
    expect(categoryColor('food')).toBe('var(--cat-p5)')
    expect(within(group).getByRole('radio', { name: 'Orange' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('radiogroup', { name: 'Colour for Food' })).not.toBeInTheDocument()
  })

  it('deletes a category without expenses straight away (archived, not erased)', async () => {
    const { user, onReassign } = setup()
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: 'Delete category Housing' }))

    expect(onReassign).not.toHaveBeenCalled()
    expect(getCategories().map((c) => c.id)).not.toContain('housing')
    expect(getAllCategories().find((c) => c.id === 'housing')?.archived).toBe(true)
    expect(screen.queryByText('Housing', { selector: '.cat-row-label' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename Entertainment' })).toHaveFocus()
  })

  it('asks where expenses go before deleting, defaulting to Other', async () => {
    const { user, onReassign } = setup([expense('1', 'food'), expense('2', 'food')])
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: 'Delete category Food' }))

    const target = screen.getByLabelText('Move expenses to')
    expect(target).toHaveValue('other')
    expect(within(target).queryByRole('option', { name: 'Food' })).not.toBeInTheDocument()
    expect(getCategories().map((c) => c.id)).toContain('food')

    await user.click(screen.getByRole('button', { name: 'Move and delete' }))
    expect(onReassign).toHaveBeenCalledTimes(1)
    expect(onReassign).toHaveBeenCalledWith('food', 'other')
    expect(getCategories().map((c) => c.id)).not.toContain('food')
  })

  it('reassigns to the chosen category, and reassigns before removing', async () => {
    const order: string[] = []
    const onReassign = vi.fn((from: string, to: string) => {
      order.push(`reassign ${from}->${to} (food active: ${getCategories().some((c) => c.id === 'food')})`)
    })
    const { user } = setup([expense('1', 'food')], onReassign)
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: 'Delete category Food' }))
    await user.selectOptions(screen.getByLabelText('Move expenses to'), 'Transport')
    await user.click(screen.getByRole('button', { name: 'Move and delete' }))

    expect(order).toEqual(['reassign food->transport (food active: true)'])
    expect(getCategories().map((c) => c.id)).not.toContain('food')
  })

  it('can back out of a delete', async () => {
    const { user, onReassign } = setup([expense('1', 'food')])
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: 'Delete category Food' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('Move expenses to')).not.toBeInTheDocument()
    expect(onReassign).not.toHaveBeenCalled()
    expect(getCategories().map((c) => c.id)).toContain('food')
    expect(screen.getByRole('button', { name: 'Delete category Food' })).toHaveFocus()
  })

  it('protects Other: no delete button', async () => {
    const { user } = setup()
    await openPanel(user)
    expect(rowFor('Other')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete category Other' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename Other' })).toBeInTheDocument()
  })

  it('shows categories added elsewhere (store subscription)', async () => {
    const { user } = setup()
    await openPanel(user)
    addCategory('Gifts', 'p9')
    expect(await screen.findByText('Gifts', { selector: '.cat-row-label' })).toBeInTheDocument()
  })
})
