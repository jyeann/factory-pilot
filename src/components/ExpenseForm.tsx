import { useState, type FormEvent } from 'react'
import type { NewExpense } from '../types'
import { DEFAULT_CATEGORIES } from '../lib/categories'
import { parseAmountToCents } from '../lib/money'

function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface Props {
  onAdd: (expense: NewExpense) => void
}

export function ExpenseForm({ onAdd }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].id)
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string | null>(null)

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
    setAmount('')
    setDescription('')
    setError(null)
  }

  return (
    <form className="card expense-form" onSubmit={handleSubmit} noValidate>
      <h2>Add expense</h2>
      <div className="form-grid">
        <label>
          Amount
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Coffee" />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit">Add</button>
    </form>
  )
}
