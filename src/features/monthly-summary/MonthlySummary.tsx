import { useState, type CSSProperties } from 'react'
import type { Expense } from '../../types'
import { categoryColor } from '../../lib/categories'
import { formatCents } from '../../lib/money'
import { totalCents } from '../../lib/expenses'
import { currentMonth, expensesInMonth, formatMonthLabel, shiftMonth, totalsByCategory } from './monthSummary'
import './MonthlySummary.css'

interface Props {
  expenses: Expense[]
  /** Injectable clock for tests; defaults to the real current date. */
  now?: Date
}

/** Share of the month as a whole percent; tiny non-zero shares show as "<1%". */
function formatShare(ratio: number): string {
  const pct = Math.round(ratio * 100)
  return pct === 0 && ratio > 0 ? '<1%' : `${pct}%`
}

const dotStyle = (category: string) => ({ '--dot': categoryColor(category) }) as CSSProperties

export function MonthlySummary({ expenses, now }: Props) {
  const thisMonth = currentMonth(now)
  const [month, setMonth] = useState(thisMonth)

  const inMonth = expensesInMonth(expenses, month)
  const breakdown = totalsByCategory(inMonth)
  const total = totalCents(inMonth)
  const monthLabel = formatMonthLabel(month)

  return (
    <section className="monthly-summary" aria-label="Monthly summary">
      <div className="ms-header">
        <h2 className="ms-month" aria-live="polite">
          {monthLabel}
        </h2>
        <div className="ms-picker">
          <button type="button" className="ms-nav" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
            ‹
          </button>
          <button type="button" className="ms-nav" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      {inMonth.length === 0 ? (
        <p className="ms-empty">
          {month === thisMonth
            ? 'Nothing spent yet this month. Add your first expense below.'
            : `No expenses in ${monthLabel}.`}
        </p>
      ) : (
        <>
          <dl className="ms-stats">
            <div className="ms-total-stat">
              <dt>Total spent</dt>
              <dd className="ms-total">{formatCents(total)}</dd>
            </div>
            <div>
              <dt>Expenses</dt>
              <dd className="ms-count">{inMonth.length}</dd>
            </div>
          </dl>

          <div className="ms-strip" aria-hidden="true">
            {breakdown.map((t) => (
              <span
                key={t.category}
                className="ms-strip-part"
                style={{ ...dotStyle(t.category), flexGrow: t.totalCents }}
              />
            ))}
          </div>

          <ul className="ms-breakdown" aria-label="Spending by category">
            {breakdown.map((t) => (
              <li key={t.category}>
                <span className="cat-dot" style={dotStyle(t.category)} aria-hidden="true" />
                <span className="ms-cat">{t.label}</span>
                <span className="amount">{formatCents(t.totalCents)}</span>
                <span className="ms-share">{formatShare(t.totalCents / total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
