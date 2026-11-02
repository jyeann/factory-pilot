import { useId, useState } from 'react'
import type { Expense } from '../../types'
import { formatCents } from '../../lib/money'
import { totalCents } from '../../lib/expenses'
import { currentMonth, expensesInMonth, formatMonthLabel, shiftMonth, totalsByCategory } from './monthSummary'
import './MonthlySummary.css'

interface Props {
  expenses: Expense[]
  /** Injectable clock for tests; defaults to the real current date. */
  now?: Date
}

export function MonthlySummary({ expenses, now }: Props) {
  const [month, setMonth] = useState(() => currentMonth(now))
  const headingId = useId()

  const inMonth = expensesInMonth(expenses, month)
  const breakdown = totalsByCategory(inMonth)
  const maxCents = breakdown[0]?.totalCents ?? 0

  return (
    <section className="card monthly-summary" aria-labelledby={headingId}>
      <div className="ms-header">
        <h2 id={headingId}>This month</h2>
        <div className="ms-picker">
          <button type="button" className="ms-nav" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
            ‹
          </button>
          <span className="ms-month" aria-live="polite">
            {formatMonthLabel(month)}
          </span>
          <button type="button" className="ms-nav" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      {inMonth.length === 0 ? (
        <p className="muted">No expenses in this month.</p>
      ) : (
        <>
          <dl className="ms-stats">
            <div>
              <dt className="muted small">Total spent</dt>
              <dd className="ms-total">
                {formatCents(totalCents(inMonth))}
              </dd>
            </div>
            <div>
              <dt className="muted small">Expenses</dt>
              <dd className="ms-count">
                {inMonth.length}
              </dd>
            </div>
          </dl>

          <ul className="ms-breakdown" aria-label="Spending by category">
            {breakdown.map((t) => (
              <li key={t.category} className="ms-row">
                <div className="ms-row-text">
                  <span>{t.label}</span>
                  <span className="amount">
                    {formatCents(t.totalCents)} <span className="muted small">({t.count})</span>
                  </span>
                </div>
                <div className="ms-bar" aria-hidden="true">
                  <div className="ms-bar-fill" style={{ width: `${(t.totalCents / maxCents) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
