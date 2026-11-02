import { useId, useLayoutEffect, useMemo, useRef, type MouseEvent, type SyntheticEvent } from 'react'
import type { Expense } from '../../types'
import { categoryLabel, FALLBACK_CATEGORY_ID, useCategories } from '../../lib/categories'
import { formatCents } from '../../lib/money'
import { planImport, type ImportPlan, type RawRow } from './importCsv'
import type { SlashDateFormat } from './values'

export type ImportSession =
  | { kind: 'error'; fileName: string; message: string }
  | {
      kind: 'ready'
      fileName: string
      rows: RawRow[]
      /** Slash-date format of the file; null when unknown or not needed. */
      format: SlashDateFormat | null
      /** The file's slash dates fit both formats, so the user picks one. */
      askFormat: boolean
      /** Set after importing: how many expenses were added. */
      importedCount: number | null
    }
type ReadySession = Extract<ImportSession, { kind: 'ready' }>

interface Props {
  session: ImportSession | null
  expenses: Expense[]
  onChange: (session: ImportSession) => void
  onImport: (expenses: Expense[]) => void
  onClose: () => void
}

const TITLE = 'Import expenses'
const PREVIEW_ROWS = 5
const LISTED_PROBLEMS = 10

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

function isOutside(rect: DOMRect, x: number, y: number): boolean {
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom
}

/** Preview of a CSV file before importing, on a native modal `<dialog>`. Open while `session` is set. */
export function ImportPreviewDialog({ session, expenses, onChange, onImport, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const pressedBackdropRef = useRef(false)
  const titleId = useId()
  const isOpen = session !== null

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
      const opener = openerRef.current
      openerRef.current = null
      if (opener?.isConnected) opener.focus()
    }
  }, [isOpen])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onClose()
  }

  function handleNativeClose() {
    if (isOpen) onClose()
  }

  function handlePointerDown(event: MouseEvent<HTMLDialogElement>) {
    pressedBackdropRef.current = event.target === event.currentTarget
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const startedOnBackdrop = pressedBackdropRef.current
    pressedBackdropRef.current = false
    if (!startedOnBackdrop || event.target !== event.currentTarget) return
    if (isOutside(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY)) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="csv-import-dialog"
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClose={handleNativeClose}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      {session && (
        <div className="csv-import-sheet">
          <h2 id={titleId}>{TITLE}</h2>
          <p className="muted small csv-import-file">{session.fileName}</p>
          {session.kind === 'error' ? (
            <>
              <p role="alert" className="error">
                {session.message}
              </p>
              <div className="form-actions">
                <button type="button" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <ReadyBody session={session} expenses={expenses} onChange={onChange} onImport={onImport} onClose={onClose} />
          )}
        </div>
      )}
    </dialog>
  )
}

interface ReadyProps {
  session: ReadySession
  expenses: Expense[]
  onChange: (session: ImportSession) => void
  onImport: (expenses: Expense[]) => void
  onClose: () => void
}

function ReadyBody({ session, expenses, onChange, onImport, onClose }: ReadyProps) {
  const categories = useCategories()
  const formatHintId = useId()
  const needsFormat = session.askFormat && session.format === null
  const plan = useMemo(
    () => (needsFormat ? null : planImport(session.rows, session.format, categories, expenses)),
    [needsFormat, session.rows, session.format, categories, expenses],
  )
  const imported = session.importedCount

  function handleImport() {
    if (!plan || plan.toImport.length === 0) return
    onImport(plan.toImport)
    onChange({ ...session, importedCount: plan.toImport.length })
  }

  return (
    <>
      {session.askFormat && imported === null && (
        <div className="csv-import-format">
          <label>
            Date format
            <select
              value={session.format ?? ''}
              aria-describedby={formatHintId}
              onChange={(e) => onChange({ ...session, format: (e.target.value || null) as SlashDateFormat | null })}
            >
              <option value="">Choose…</option>
              <option value="dmy">DD/MM/YYYY (day first)</option>
              <option value="mdy">MM/DD/YYYY (month first)</option>
            </select>
          </label>
          <p id={formatHintId} className="muted small">
            Dates like 03/04/2025 could mean either. Pick how this file writes them.
          </p>
        </div>
      )}
      {plan && imported === null && <PlanSummary plan={plan} />}
      {imported === null ? (
        <div className="form-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={handleImport} disabled={!plan || plan.toImport.length === 0}>
            Import {plural(plan?.toImport.length ?? 0, 'expense')}
          </button>
        </div>
      ) : (
        <>
          <p role="status" className="csv-import-done">
            Imported {plural(imported, 'expense')}
          </p>
          <div className="form-actions">
            {/* Focus moves here so keyboard users land on the next step. */}
            <button type="button" onClick={onClose} autoFocus>
              Done
            </button>
          </div>
        </>
      )}
    </>
  )
}

function PlanSummary({ plan }: { plan: ImportPlan }) {
  const otherLabel = categoryLabel(FALLBACK_CATEGORY_ID)
  const preview = plan.rows.slice(0, PREVIEW_ROWS)
  const hiddenProblems = plan.invalid.length - LISTED_PROBLEMS
  return (
    <>
      <ul className="csv-import-counts" aria-label="Summary">
        <li>
          <strong>{plan.toImport.length.toLocaleString()}</strong> new
        </li>
        <li>
          <strong>{plan.duplicateCount.toLocaleString()}</strong> {plan.duplicateCount === 1 ? 'duplicate' : 'duplicates'}
        </li>
        <li>
          <strong>{plan.invalid.length.toLocaleString()}</strong> invalid
        </li>
      </ul>
      {plan.unknownCategoryCount > 0 && (
        <p className="small">
          {plural(plan.unknownCategoryCount, 'row')} → {otherLabel}
          {plan.unknownCategories.length > 0 && (
            <span className="muted"> (unknown: {plan.unknownCategories.slice(0, 5).join(', ')}{plan.unknownCategories.length > 5 ? ', …' : ''})</span>
          )}
        </p>
      )}
      {preview.length > 0 && (
        <div className="csv-import-table-wrap">
          <table className="csv-import-table">
            <caption className="visually-hidden">First {preview.length} rows</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Category</th>
                <th scope="col" className="num">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.map(({ rowNumber, expense, duplicate }) => (
                <tr key={rowNumber} className={duplicate ? 'is-duplicate' : undefined}>
                  <td>{expense.date}</td>
                  <td>
                    {expense.description}
                    {duplicate && <span className="csv-import-tag"> already added</span>}
                  </td>
                  <td>{categoryLabel(expense.category)}</td>
                  <td className="num amount">{formatCents(expense.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {plan.invalid.length > 0 && (
        <div className="csv-import-problems">
          <h3>Rows that will be skipped</h3>
          <ul>
            {plan.invalid.slice(0, LISTED_PROBLEMS).map((p) => (
              <li key={p.rowNumber}>
                Row {p.rowNumber}: {p.message}
              </li>
            ))}
          </ul>
          {hiddenProblems > 0 && <p className="muted small">…and {plural(hiddenProblems, 'more row')}.</p>}
        </div>
      )}
    </>
  )
}
