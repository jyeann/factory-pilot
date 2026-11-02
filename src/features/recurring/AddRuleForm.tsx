import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { DEFAULT_CATEGORIES } from '../../lib/categories'
import { parseAmountToCents } from '../../lib/money'
import { FREQUENCIES, isIsoDate, type Frequency, type NewRecurringRule } from './recurring'

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
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].id)
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [error, setError] = useState<string | null>(null)
  const firstField = useRef<HTMLInputElement>(null)
  const amountId = useId()

  useEffect(() => {
    firstField.current?.focus()
  }, [])

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
    onAdd({ description: description.trim(), amountCents, category, frequency, startDate })
  }

  return (
    <form id={id} className="recurring-form" aria-label="New repeating expense" onSubmit={handleSubmit} noValidate>
      <div className="recurring-form-grid">
        <label className="rf-description">
          Rule description
          <input ref={firstField} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Rent" />
        </label>
        <div className="field rf-amount">
          <label htmlFor={amountId}>Rule amount</label>
          <span className="money-input">
            <span aria-hidden="true">$</span>
            <input id={amountId} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </span>
        </div>
        <label>
          Rule category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {DEFAULT_CATEGORIES.map((c) => (
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
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
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
