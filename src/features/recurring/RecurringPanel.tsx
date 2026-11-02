import { useId, useRef, useState, type CSSProperties } from 'react'
import type { Expense } from '../../types'
import { categoryColor, categoryLabel } from '../../lib/categories'
import { friendlyDay, toIsoDate } from '../../lib/dates'
import { AddRuleForm } from './AddRuleForm'
import { describeRule, nextOccurrence, type NewRecurringRule } from './recurring'
import { useRecurringRules } from './useRecurringRules'
import './recurring.css'

export interface RecurringPanelProps {
  /** Adds generated occurrences. Idempotent by expense id (`rec:<ruleId>:<date>`). */
  onGenerate: (expenses: Expense[]) => void
  /** Injectable clock for tests; defaults to the real current date. */
  now?: Date
}

/** "Repeating expenses": rules that create their expenses automatically when due. */
export function RecurringPanel({ onGenerate, now }: RecurringPanelProps) {
  const today = toIsoDate(now ?? new Date())
  const { rules, addRule, deleteRule } = useRecurringRules(today, onGenerate)
  const [formOpen, setFormOpen] = useState(false)
  const formId = useId()
  const headingId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)

  function closeForm() {
    setFormOpen(false)
    toggleRef.current?.focus()
  }

  function handleAdd(input: NewRecurringRule) {
    addRule(input)
    closeForm()
  }

  return (
    <section className="recurring" aria-labelledby={headingId}>
      <div className="recurring-header">
        <h2 id={headingId}>Repeating expenses</h2>
        <button
          ref={toggleRef}
          type="button"
          className="ghost recurring-toggle"
          aria-expanded={formOpen}
          aria-controls={formId}
          onClick={() => setFormOpen((open) => !open)}
        >
          <span aria-hidden="true">{formOpen ? '− ' : '+ '}</span>New rule
        </button>
      </div>

      {rules.length === 0 && !formOpen && (
        <p className="muted small recurring-empty">Rent, subscriptions, gym? Add a rule and they'll appear on their own.</p>
      )}

      {rules.length > 0 && (
        <ul className="recurring-list">
          {rules.map((rule) => (
            <li key={rule.id}>
              <span className="cat-dot" style={{ '--dot': categoryColor(rule.category) } as CSSProperties} aria-hidden="true" />
              <div className="recurring-text">
                <div className="recurring-rule">{describeRule(rule)}</div>
                <div className="muted small">
                  {categoryLabel(rule.category)}, next on {friendlyDay(nextOccurrence(rule, today), now)}
                </div>
              </div>
              <button
                type="button"
                className="ghost icon-btn delete-btn"
                aria-label={`Delete rule ${rule.description}`}
                title="Delete rule (expenses already added stay)"
                onClick={() => deleteRule(rule.id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen && <AddRuleForm id={formId} defaultStartDate={today} onAdd={handleAdd} onCancel={closeForm} />}
    </section>
  )
}
