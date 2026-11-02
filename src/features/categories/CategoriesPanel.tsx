import { useId, useMemo, useRef, useState } from 'react'
import type { Expense } from '../../types'
import { removeCategory, useCategories } from '../../lib/categories'
import { AddCategoryForm } from './AddCategoryForm'
import { countByCategory } from './categoryHelpers'
import { CategoryRow, type RowMode } from './CategoryRow'
import './categories.css'

export interface CategoriesPanelProps {
  /** All expenses, e.g. to show how many use each category. */
  expenses: Expense[]
  /** Moves every expense from one category to another (call before `removeCategory`). */
  onReassign: (fromId: string, toId: string) => void
}

interface OpenEditor {
  id: string
  mode: Exclude<RowMode, 'idle'>
}

/** Collapsed "Categories" sheet: add, rename, recolour and delete (archive) categories. */
export function CategoriesPanel({ expenses, onReassign }: CategoriesPanelProps) {
  const categories = useCategories()
  const [expanded, setExpanded] = useState(false)
  const [open, setOpen] = useState<OpenEditor | null>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const counts = useMemo(() => countByCategory(expenses), [expenses])

  function toggleExpanded() {
    setOpen(null)
    setExpanded((value) => !value)
  }

  function handleDelete(id: string, moveTo: string | null) {
    if (moveTo !== null && moveTo !== id) onReassign(id, moveTo)
    removeCategory(id)
    setOpen(null)
    toggleRef.current?.focus()
  }

  return (
    <section className="categories" aria-labelledby={`${panelId}-title`}>
      <div className="categories-header">
        <h2 id={`${panelId}-title`}>Categories</h2>
        <button
          ref={toggleRef}
          type="button"
          className="ghost"
          aria-expanded={expanded}
          aria-controls={expanded ? panelId : undefined}
          onClick={toggleExpanded}
        >
          Manage categories
        </button>
      </div>

      {!expanded ? (
        <p className="muted small categories-summary">
          {categories.length} categories. Add your own, rename or recolour them.
        </p>
      ) : (
        <div id={panelId} className="categories-body">
          <ul className="cat-rows">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                categories={categories}
                count={counts.get(category.id) ?? 0}
                mode={open?.id === category.id ? open.mode : 'idle'}
                onModeChange={(mode) => setOpen(mode === 'idle' ? null : { id: category.id, mode })}
                onDelete={(moveTo) => handleDelete(category.id, moveTo)}
              />
            ))}
          </ul>
          <AddCategoryForm />
        </div>
      )}
    </section>
  )
}
