import { useId, useState, type CSSProperties, type FormEvent } from 'react'
import type { Expense } from '../../types'
import { DEFAULT_CATEGORIES, categoryColor, categoryLabel } from '../../lib/categories'
import { centsToInput, parseAmountToCents } from '../../lib/money'
import { budgetStatus, formatBudgetMoney, loadBudgets, monthOf, saveBudgets, type BudgetStatus, type Budgets } from './budgets'
import './budgets.css'

export interface BudgetsPanelProps {
  /** All expenses; the panel works out the current month itself. */
  expenses: Expense[]
  /** Injectable clock for tests; defaults to the real current date. */
  now?: Date
}

type Drafts = Record<string, string>

const toDrafts = (budgets: Budgets): Drafts =>
  Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c.id in budgets ? centsToInput(budgets[c.id]) : '']))

const colorStyle = (category: string) => ({ '--dot': categoryColor(category) }) as CSSProperties

/** Parses drafts into budgets; blank means "no budget". Returns labels of invalid fields instead when any. */
function parseDrafts(drafts: Drafts, current: Budgets): { budgets: Budgets } | { invalid: string[] } {
  // Keep budgets for categories the editor doesn't show (e.g. no longer in DEFAULT_CATEGORIES).
  const budgets: Budgets = Object.fromEntries(Object.entries(current).filter(([id]) => !(id in drafts)))
  const invalid: string[] = []
  for (const { id, label } of DEFAULT_CATEGORIES) {
    const text = drafts[id]?.trim() ?? ''
    if (text === '') continue
    const cents = parseAmountToCents(text)
    if (cents === null) invalid.push(label)
    else budgets[id] = cents
  }
  return invalid.length > 0 ? { invalid } : { budgets }
}

function BudgetLine({ status }: { status: BudgetStatus }) {
  const { category, spentCents, limitCents, ratio, state } = status
  const remaining = limitCents - spentCents
  return (
    <li className={`budget-line budget-${state}`} style={colorStyle(category)}>
      <div className="budget-row">
        <span className="budget-cat">
          <span className="cat-dot" aria-hidden="true" />
          {categoryLabel(category)}
        </span>
        <span className="amount">
          {formatBudgetMoney(spentCents)} of {formatBudgetMoney(limitCents)}
        </span>
      </div>
      <div className="budget-bar" aria-hidden="true">
        <span className="budget-fill" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <p className="budget-note">
        {state === 'over' ? `${formatBudgetMoney(-remaining)} over` : `${formatBudgetMoney(remaining)} left`}
        {state === 'near' && <span className="visually-hidden"> (almost at the limit)</span>}
      </p>
    </li>
  )
}

export function BudgetsPanel({ expenses, now }: BudgetsPanelProps) {
  const [budgets, setBudgets] = useState<Budgets>(() => loadBudgets())
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Drafts>({})
  const [error, setError] = useState<string | null>(null)
  const editorId = useId()

  const statuses = budgetStatus(expenses, budgets, monthOf(now ?? new Date()))

  function toggleEditor() {
    if (!editing) setDrafts(toDrafts(budgets))
    setError(null)
    setEditing(!editing)
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseDrafts(drafts, budgets)
    if ('invalid' in result) {
      setError(`Enter a positive amount (or leave blank) for ${result.invalid.join(', ')}.`)
      return
    }
    setBudgets(result.budgets)
    saveBudgets(result.budgets)
    setError(null)
    setEditing(false)
  }

  return (
    <section className="budgets" aria-labelledby={`${editorId}-title`}>
      <div className="budgets-header">
        <h2 id={`${editorId}-title`}>Budgets</h2>
        <button type="button" className="ghost" aria-expanded={editing} aria-controls={editing ? editorId : undefined} onClick={toggleEditor}>
          Set budgets
        </button>
      </div>

      {statuses.length === 0 ? (
        !editing && <p className="muted small budgets-empty">Set a monthly limit for a category to see how this month is going.</p>
      ) : (
        <ul className="budget-lines">
          {statuses.map((s) => (
            <BudgetLine key={s.category} status={s} />
          ))}
        </ul>
      )}

      {editing && (
        <form id={editorId} className="budgets-editor" aria-label="Monthly budgets" onSubmit={handleSave} noValidate>
          <p className="muted small">Monthly limit per category. Leave blank for no budget.</p>
          <div className="budgets-grid">
            {DEFAULT_CATEGORIES.map(({ id, label }) => (
              <div key={id} className="field" style={colorStyle(id)}>
                <label htmlFor={`${editorId}-${id}`} className="budget-input-label">
                  <span className="cat-dot" aria-hidden="true" />
                  <span>
                    <span className="visually-hidden">Budget for </span>
                    {label}
                  </span>
                </label>
                <span className="money-input">
                  <span aria-hidden="true">$</span>
                  <input
                    id={`${editorId}-${id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="—"
                    value={drafts[id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))}
                  />
                </span>
              </div>
            ))}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="submit">Save budgets</button>
          </div>
        </form>
      )}
    </section>
  )
}
