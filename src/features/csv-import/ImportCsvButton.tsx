import { useRef, useState, type ChangeEvent } from 'react'
import type { Expense } from '../../types'
import { readExpenseCsv } from './importCsv'
import { ImportPreviewDialog, type ImportSession } from './ImportPreviewDialog'
import './csv-import.css'

export interface ImportCsvButtonProps {
  /** Expenses already stored, for duplicate detection. */
  expenses: Expense[]
  /** Adds the imported expenses (App passes `addMany`, which skips ids already present). */
  onImport: (expenses: Expense[]) => void
}

/** Largest file we read (5,000 rows fit comfortably). */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

const READ_ERROR = "We couldn't read this file. Try saving it again as CSV."

async function readSession(file: File): Promise<ImportSession> {
  const fileName = file.name
  if (file.size > MAX_FILE_BYTES) return { kind: 'error', fileName, message: 'This file is too big to import (max 5 MB).' }
  try {
    const result = readExpenseCsv(await file.text())
    if (!result.ok) return { kind: 'error', fileName, message: result.error }
    if (result.dateFormat === 'conflict') {
      return {
        kind: 'error',
        fileName,
        message: 'Some dates look like DD/MM/YYYY and others like MM/DD/YYYY. Use one format for the whole file.',
      }
    }
    return {
      kind: 'ready',
      fileName,
      rows: result.rows,
      format: result.dateFormat === 'dmy' || result.dateFormat === 'mdy' ? result.dateFormat : null,
      askFormat: result.dateFormat === 'ambiguous',
      importedCount: null,
    }
  } catch {
    return { kind: 'error', fileName, message: READ_ERROR }
  }
}

/** "Import CSV" button: pick a file, check it in a preview dialog, then add the new expenses. */
export function ImportCsvButton({ expenses, onImport }: ImportCsvButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [session, setSession] = useState<ImportSession | null>(null)
  /** Bumped per file pick (and on close) so a slow, older read can't overwrite a newer one. */
  const requestRef = useRef(0)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    // Reset so choosing the same file again fires another change.
    input.value = ''
    if (!file) return
    const request = ++requestRef.current
    const next = await readSession(file)
    if (request === requestRef.current) setSession(next)
  }

  return (
    <>
      <button type="button" className="import-btn" onClick={() => inputRef.current?.click()}>
        Import CSV
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="CSV file to import"
        hidden
        onChange={handleFileChange}
      />
      <ImportPreviewDialog
        session={session}
        expenses={expenses}
        onChange={setSession}
        onImport={onImport}
        onClose={() => {
          requestRef.current++
          setSession(null)
        }}
      />
    </>
  )
}
