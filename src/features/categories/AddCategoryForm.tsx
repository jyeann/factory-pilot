import { useId, useRef, useState, type FormEvent } from 'react'
import { addCategory, useCategories, validateCategoryLabel, type PaletteKey } from '../../lib/categories'
import { suggestColor } from './categoryHelpers'
import { ColorRadioGroup } from './ColorRadioGroup'

/** "New category name" + colour + "Add category". */
export function AddCategoryForm() {
  const categories = useCategories()
  const [name, setName] = useState('')
  const [pickedColor, setPickedColor] = useState<PaletteKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const color = pickedColor ?? suggestColor(categories)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validateCategoryLabel(name)
    if (problem) {
      setError(problem)
      nameRef.current?.focus()
      return
    }
    addCategory(name, color)
    setName('')
    setPickedColor(null)
    setError(null)
    nameRef.current?.focus()
  }

  return (
    <form className="cat-add" aria-labelledby={`${id}-title`} onSubmit={handleSubmit} noValidate>
      <h3 id={`${id}-title`} className="cat-add-title">
        New category
      </h3>
      <div className="field">
        <label htmlFor={`${id}-name`}>New category name</label>
        <input
          ref={nameRef}
          id={`${id}-name`}
          autoComplete="off"
          value={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(null)
          }}
        />
      </div>
      <ColorRadioGroup label="Colour for new category" value={color} onChange={setPickedColor} />
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit">Add category</button>
      </div>
    </form>
  )
}
