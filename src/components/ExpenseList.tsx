import type { CSSProperties } from 'react'
import type { Expense } from '../types'
import { categoryColor, categoryLabel } from '../lib/categories'
import { friendlyDay } from '../lib/dates'
import { formatCents } from '../lib/money'
import { groupByDay, totalCents } from '../lib/expenses'

interface Props {
  expenses: Expense[]
  onRemove: (id: string) => void
  /** Shown instead of the default empty-state text when the list is empty. */
  emptyMessage?: string
}

export function ExpenseList({ expenses, onRemove, emptyMessage = 'No expenses yet. Add your first one above.' }: Props) {
  if (expenses.length === 0) {
    return (
      <section className="expenses" aria-labelledby="expenses-heading">
        <h2 id="expenses-heading" className="visually-hidden">
          Expenses
        </h2>
        <p className="muted empty-note">{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="expenses" aria-labelledby="expenses-heading">
      <div className="list-header">
        <h2 id="expenses-heading">All expenses</h2>
        <span className="total" aria-label="Total">
          {formatCents(totalCents(expenses))}
        </span>
      </div>
      {groupByDay(expenses).map((group) => (
        <div className="day-group" key={group.date}>
          <h3 className="day-header">
            <span>{friendlyDay(group.date)}</span>
            <span className="amount small">{formatCents(group.totalCents)}</span>
          </h3>
          <ul className="expense-list">
            {group.expenses.map((e) => (
              <li key={e.id}>
                <div className="expense-main">
                  <span className="cat-dot" style={{ '--dot': categoryColor(e.category) } as CSSProperties} aria-hidden="true" />
                  <div>
                    <div className="description">{e.description}</div>
                    <div className="muted small">{categoryLabel(e.category)}</div>
                  </div>
                </div>
                <div className="row-end">
                  <span className="amount">{formatCents(e.amountCents)}</span>
                  <button className="ghost delete-btn" onClick={() => onRemove(e.id)} aria-label={`Delete ${e.description}`}>
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
