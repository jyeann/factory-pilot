import type { Expense } from '../types'
import { categoryLabel } from '../lib/categories'
import { formatCents } from '../lib/money'
import { sortByDateDesc, totalCents } from '../lib/expenses'

interface Props {
  expenses: Expense[]
  onRemove: (id: string) => void
  /** Shown instead of the default empty-state text when the list is empty. */
  emptyMessage?: string
}

export function ExpenseList({ expenses, onRemove, emptyMessage = 'No expenses yet. Add your first one above.' }: Props) {
  if (expenses.length === 0) {
    return (
      <section className="card">
        <h2>Expenses</h2>
        <p className="muted">{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="list-header">
        <h2>Expenses</h2>
        <span className="total" aria-label="Total">
          {formatCents(totalCents(expenses))}
        </span>
      </div>
      <ul className="expense-list">
        {sortByDateDesc(expenses).map((e) => (
          <li key={e.id}>
            <div>
              <div className="description">{e.description}</div>
              <div className="muted small">
                {e.date} · {categoryLabel(e.category)}
              </div>
            </div>
            <div className="row-end">
              <span className="amount">{formatCents(e.amountCents)}</span>
              <button className="ghost" onClick={() => onRemove(e.id)} aria-label={`Delete ${e.description}`}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
