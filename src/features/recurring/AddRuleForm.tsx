import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useCategories } from '../../lib/categories'
import { addMonthsClamped } from '../../lib/dates'
import { parseAmountToCents } from '../../lib/money'
import { FREQUENCIES, isIsoDate, type Frequency, type NewRecurringRule } from './recurring'

/** How far back a new rule may start (and so how much it backfills). */
const MAX_BACKFILL_YEARS = 10

interface Props {
  id?: string
  /** Prefill for "Starts on" (today). */
  defaultStartDate: string
  onAdd: (rule: NewRecurringRule) => void
  onCancel: () => void
}

/** Compact form for a new rule. Names avoid the app's "Amount"/"Description"/"Add" on purpose. */
export function AddRuleForm({ id, defaultStartDate, onAdd, onCancel }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const categories = useCategories()
  const [chosenCategory, setCategory] = useState(categories[0].id)
  const category = categories.some((c) => c.id === chosenCategory) ? chosenCategory : categories[0].id
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [error, setError] = useState<string | null>(null)
  const firstField = useRef<HTMLInputElement>(null)
  const amountId = useId()
  const errorId = useId()

  useEffect(() => {
    firstField.current?.focus()
  }, [])

  /** Earliest allowed start, so a typo'd year can't backfill thousands of expenses. */
  const minStartDate = addMonthsClamped(defaultStartDate, -12 * MAX_BACKFILL_YEARS)

  function change(setter: (value: string) => void, value: string) {
    setter(value)
    setError(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!description.trim()) {
      setError('Enter a description for the rule.')
      return
    }
    const amountCents = parseAmountToCents(amount)
    if (amountCents === null) {
      setError('Enter an amount greater than 0, with up to 2 decimals.')
      return
    }
    if (!isIsoDate(startDate)) {
      setError('Pick a start date.')
      return
    }
    if (startDate < minStartDate) {
      setError(`Pick a start date within the last ${MAX_BACKFILL_YEARS} years.`)
      return
    }
    onAdd({ description: description.trim(), amountCents, category, frequency, startDate })
  }

  return (
    <form id={id} className="recurring-form" aria-label="New repeating expense" onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
      aria-describedby={error ? errorId : undefined}
      noValidate
    >
      <div className="recurring-form-grid">
        <label className="rf-description">
          Rule description
          <input ref={firstField} value={description} onChange={(e) => change(setDescription, e.target.value)} placeholder="Rent" />
        </label>
        <div className="field rf-amount">
          <label htmlFor={amountId}>Rule amount</label>
          <span className="money-input">
            <span aria-hidden="true">$</span>
            <input id={amountId} inputMode="decimal" value={amount} onChange={(e) => change(setAmount, e.target.value)} placeholder="0.00" />
          </span>
        </div>
        <label>
          Rule category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Repeats
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {FREQUENCIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Starts on
          <input type="date" min={minStartDate} value={startDate} onChange={(e) => change(setStartDate, e.target.value)} />
        </label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="error">
          {error}
        </p>
      )}
      <p className="muted small rf-hint">A start date in the past adds the missed ones too.</p>
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit">Add rule</button>
      </div>
    </form>
  )
}
