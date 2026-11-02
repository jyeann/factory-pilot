import { useId, useState, type FormEvent } from 'react'
import type { NewExpense } from '../types'
import { categoryLabel, useCategories } from '../lib/categories'
import { centsToInput, parseAmountToCents } from '../lib/money'
import { toIsoDate } from '../lib/dates'

interface Props {
  /** Called with all form fields on a valid submit (also in edit mode). */
  onAdd: (expense: NewExpense) => void
  /** Prefilled values. Read once on mount: remount with a `key` to change them. */
  initial?: NewExpense
  title?: string
  submitLabel?: string
  /** When set, a "Cancel" button is shown that calls it. */
  onCancel?: () => void
  /** Clear amount and description after a successful submit. Default true. */
  resetOnSubmit?: boolean
}

export function ExpenseForm({
  onAdd,
  initial,
  title = 'Add an expense',
  submitLabel = 'Add',
  onCancel,
  resetOnSubmit = true,
}: Props) {
  const [amount, setAmount] = useState(() => (initial ? centsToInput(initial.amountCents) : ''))
  const [description, setDescription] = useState(initial?.description ?? '')
  const categories = useCategories()
  const [chosenCategory, setCategory] = useState(initial?.category ?? categories[0].id)
  // A deleted category stays selectable only for the expense that already had it (edit);
  // otherwise fall back to the first active category.
  const isActive = categories.some((c) => c.id === chosenCategory)
  const keepInactive = !isActive && initial?.category === chosenCategory
  const category = isActive || keepInactive ? chosenCategory : categories[0].id
  const [date, setDate] = useState(() => initial?.date ?? toIsoDate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const amountId = useId()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const amountCents = parseAmountToCents(amount)
    if (amountCents === null) {
      setError('Enter an amount greater than 0, with up to 2 decimals.')
      return
    }
    if (!description.trim()) {
      setError('Enter a description.')
      return
    }
    onAdd({ amountCents, description: description.trim(), category, date })
    if (resetOnSubmit) {
      setAmount('')
      setDescription('')
    }
    setError(null)
  }

  return (
    <form className="expense-form" aria-label={title} onSubmit={handleSubmit} noValidate>
      <h2>{title}</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor={amountId}>Amount</label>
          <span className="money-input">
            <span aria-hidden="true">$</span>
            <input id={amountId} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </span>
        </div>
        <label className="field-description">
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Coffee with Sam" />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            {keepInactive && <option value={category}>{categoryLabel(category)} (deleted)</option>}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="form-actions">
          {onCancel && (
            <button type="button" className="ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit">{submitLabel}</button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  )
}
