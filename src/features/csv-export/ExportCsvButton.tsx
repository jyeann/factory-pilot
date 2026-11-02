import { useId } from 'react'
import type { Expense } from '../../types'
import { buildExpensesCsv, csvFilename } from './csv'
import { downloadCsv } from './download'
import './csv-export.css'

interface Props {
  expenses: readonly Expense[]
  /** Injectable for tests; defaults to a browser download. */
  download?: (filename: string, content: string) => void
  /** Injectable for tests; defaults to the current time. */
  now?: () => Date
}

export function ExportCsvButton({ expenses, download = downloadCsv, now = () => new Date() }: Props) {
  const headingId = useId()
  const hintId = useId()
  const isEmpty = expenses.length === 0
  const count = expenses.length

  function handleExport() {
    download(csvFilename(now()), buildExpensesCsv(expenses))
  }

  return (
    <section className="card csv-export" aria-labelledby={headingId}>
      <h2 id={headingId}>Export</h2>
      <div className="csv-export-row">
        <button
          type="button"
          onClick={handleExport}
          disabled={isEmpty}
          aria-describedby={isEmpty ? hintId : undefined}
        >
          Export CSV
        </button>
        <span id={hintId} className="muted small">
          {isEmpty ? 'Add an expense to enable export.' : `${count} expense${count === 1 ? '' : 's'} will be exported`}
        </span>
      </div>
    </section>
  )
}
