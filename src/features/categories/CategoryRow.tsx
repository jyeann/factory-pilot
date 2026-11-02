import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import {
  FALLBACK_CATEGORY_ID,
  categoryColor,
  recolorCategory,
  renameCategory,
  validateCategoryLabel,
  type Category,
} from '../../lib/categories'
import { formatExpenseCount, reassignTargets } from './categoryHelpers'
import { ColorRadioGroup } from './ColorRadioGroup'

export type RowMode = 'idle' | 'rename' | 'colour' | 'delete'

export interface CategoryRowProps {
  category: Category
  /** Active categories, for the "Move expenses to" choices. */
  categories: readonly Category[]
  count: number
  mode: RowMode
  onModeChange: (mode: RowMode) => void
  /** Deletes the category; `moveTo` is set when its expenses need a new home. */
  onDelete: (moveTo: string | null) => void
}

function RenameForm({ category, onDone }: { category: Category; onDone: () => void }) {
  const [draft, setDraft] = useState(category.label)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validateCategoryLabel(draft, category.id)
    if (problem) {
      setError(problem)
      inputRef.current?.focus()
      return
    }
    if (draft.trim() !== category.label) renameCategory(category.id, draft)
    onDone()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onDone()
    }
  }

  return (
    <form className="cat-editor" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>Name for {category.label}</label>
        <input
          ref={inputRef}
          id={`${id}-name`}
          autoComplete="off"
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit">Save name</button>
      </div>
    </form>
  )
}

function DeleteConfirm({ category, categories, count, onCancel, onConfirm }: {
  category: Category
  categories: readonly Category[]
  count: number
  onCancel: () => void
  onConfirm: (moveTo: string) => void
}) {
  const targets = reassignTargets(categories, category.id)
  const [moveTo, setMoveTo] = useState(targets[0]?.id ?? FALLBACK_CATEGORY_ID)
  const selectRef = useRef<HTMLSelectElement>(null)
  const id = useId()

  useEffect(() => {
    selectRef.current?.focus()
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onConfirm(moveTo)
  }

  return (
    <form className="cat-editor" aria-labelledby={`${id}-note`} onSubmit={handleSubmit}>
      <p id={`${id}-note`} className="cat-delete-note">
        {category.label} has {formatExpenseCount(count).toLowerCase()}. Where should they go?
      </p>
      <div className="field">
        <label htmlFor={`${id}-target`}>Move expenses to</label>
        <select
          ref={selectRef}
          id={`${id}-target`}
          value={moveTo}
          onChange={(e) => setMoveTo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
        >
          {targets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Keep {category.label}
        </button>
        <button type="submit" className="cat-danger">
          Move and delete
        </button>
      </div>
    </form>
  )
}

/** One category: swatch, name, expense count and its rename / recolour / delete actions. */
export function CategoryRow({ category, categories, count, mode, onModeChange, onDelete }: CategoryRowProps) {
  const { id, label } = category
  const renameRef = useRef<HTMLButtonElement>(null)
  const colourRef = useRef<HTMLButtonElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const editorId = useId()
  const canDelete = id !== FALLBACK_CATEGORY_ID

  function close(returnFocusTo: HTMLButtonElement | null) {
    onModeChange('idle')
    returnFocusTo?.focus()
  }

  function toggle(next: RowMode) {
    onModeChange(mode === next ? 'idle' : next)
  }

  function handleDeleteClick() {
    if (count === 0) onDelete(null)
    else toggle('delete')
  }

  return (
    <li className="cat-row" style={{ '--dot': categoryColor(id) } as CSSProperties}>
      <div className="cat-row-main">
        <span className="cat-dot cat-row-dot" aria-hidden="true" />
        <span className="cat-row-name">
          <span className="cat-row-label">{label}</span>
          <span className="cat-row-count muted small">{formatExpenseCount(count)}</span>
        </span>
        <span className="cat-row-actions">
          <button
            ref={renameRef}
            type="button"
            className="ghost"
            aria-label={`Rename ${label}`}
            aria-expanded={mode === 'rename'}
            aria-controls={mode === 'rename' ? editorId : undefined}
            onClick={() => toggle('rename')}
          >
            Rename
          </button>
          <button
            ref={colourRef}
            type="button"
            className="ghost"
            aria-label={`Colour of ${label}`}
            aria-expanded={mode === 'colour'}
            aria-controls={mode === 'colour' ? editorId : undefined}
            onClick={() => toggle('colour')}
          >
            Colour
          </button>
          {!canDelete && <span className="cat-row-spacer" aria-hidden="true" />}
          {canDelete && (
            <button
              ref={deleteRef}
              type="button"
              className="ghost icon-btn delete-btn"
              aria-label={`Delete category ${label}`}
              aria-expanded={count > 0 ? mode === 'delete' : undefined}
              aria-controls={mode === 'delete' ? editorId : undefined}
              onClick={handleDeleteClick}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </span>
      </div>

      {mode !== 'idle' && (
        <div id={editorId} className="cat-row-editor">
          {mode === 'rename' && <RenameForm category={category} onDone={() => close(renameRef.current)} />}
          {mode === 'colour' && (
            <div
              className="cat-editor"
              onKeyDown={(e) => {
                if (e.key === 'Escape') close(colourRef.current)
              }}
            >
              <ColorRadioGroup label={`Colour for ${label}`} value={category.color} onChange={(c) => recolorCategory(id, c)} />
              <div className="form-actions">
                <button type="button" className="ghost" onClick={() => close(colourRef.current)}>
                  Done
                </button>
              </div>
            </div>
          )}
          {mode === 'delete' && canDelete && (
            <DeleteConfirm
              category={category}
              categories={categories}
              count={count}
              onCancel={() => close(deleteRef.current)}
              onConfirm={(moveTo) => onDelete(moveTo)}
            />
          )}
        </div>
      )}
    </li>
  )
}
