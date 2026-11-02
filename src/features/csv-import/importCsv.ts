import type { Expense } from '../../types'
import { FALLBACK_CATEGORY_ID, type Category } from '../../lib/categories'
import { fnv1a } from './fnv1a'
import { parseCsv } from './parseCsv'
import {
  detectDateFormat,
  matchCategory,
  parseImportAmount,
  parseImportDate,
  unescapeExportPrefix,
  type DateFormatDetection,
  type SlashDateFormat,
} from './values'

/** Turns CSV text into expenses to import. Pure; no React. */

export const MAX_IMPORT_ROWS = 5000
export const MAX_DESCRIPTION_LENGTH = 1000
const REQUIRED_COLUMNS = ['date', 'description', 'amount'] as const
const OPTIONAL_COLUMNS = ['category'] as const
type Column = (typeof REQUIRED_COLUMNS)[number] | (typeof OPTIONAL_COLUMNS)[number]

/** One data row with its cells picked out by header (export prefix already undone). */
export interface RawRow {
  rowNumber: number
  date: string
  description: string
  category: string
  amount: string
}

export type CsvFileResult =
  | { ok: false; error: string }
  | { ok: true; rows: RawRow[]; dateFormat: DateFormatDetection }

/** Finds each column by header name (case-insensitive). Null when a required one is missing. */
function mapHeader(header: readonly string[]): { columns: Partial<Record<Column, number>>; missing: string[] } {
  const names = header.map((h) => h.trim().toLowerCase())
  const columns: Partial<Record<Column, number>> = {}
  for (const col of [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]) {
    const index = names.indexOf(col)
    if (index >= 0) columns[col] = index
  }
  return { columns, missing: REQUIRED_COLUMNS.filter((c) => columns[c] === undefined) }
}

/** Parses the file, maps the header and detects its date format. */
export function readExpenseCsv(text: string): CsvFileResult {
  // +1 for the header row.
  const parsed = parseCsv(text, MAX_IMPORT_ROWS + 1)
  if (!parsed.ok) {
    return parsed.error.includes('more than')
      ? { ok: false, error: `This file has more than ${MAX_IMPORT_ROWS.toLocaleString('en-US')} rows. Split it and import the parts.` }
      : parsed
  }
  const [header, ...data] = parsed.records
  if (!header) return { ok: false, error: 'This file is empty.' }
  const { columns, missing } = mapHeader(header.fields)
  if (missing.length > 0) {
    return { ok: false, error: `The first row needs the columns date, description and amount. Missing: ${missing.join(', ')}.` }
  }
  const cell = (fields: string[], col: Column) => {
    const index = columns[col]
    return index === undefined ? '' : unescapeExportPrefix(fields[index] ?? '')
  }
  const rows = data.map(({ rowNumber, fields }) => ({
    rowNumber,
    date: cell(fields, 'date'),
    description: cell(fields, 'description'),
    category: cell(fields, 'category'),
    amount: cell(fields, 'amount'),
  }))
  if (rows.length === 0) return { ok: false, error: 'This file has no expense rows.' }
  return { ok: true, rows, dateFormat: detectDateFormat(rows.map((r) => r.date)) }
}

/** Stable id for an imported expense: `k` is the occurrence of this tuple within the file. */
export function importId(date: string, description: string, amountCents: number, k: number): string {
  return `imp:${fnv1a(`${date}|${description}|${amountCents}`)}:${k}`
}

/** Duplicate key: (date, description, amount). The date's fixed width keeps it unambiguous. */
function tupleKey(e: Pick<Expense, 'date' | 'description' | 'amountCents'>): string {
  return `${e.date}|${e.description}|${e.amountCents}`
}

export interface PlannedRow {
  rowNumber: number
  expense: Expense
  duplicate: boolean
  /** The category wasn't recognised, so the row goes to the fallback category. */
  unknownCategory: boolean
}

export interface RowProblem {
  rowNumber: number
  message: string
}

export interface ImportPlan {
  /** Every valid row, in file order. */
  rows: PlannedRow[]
  /** The new expenses (valid, not duplicates). */
  toImport: Expense[]
  duplicateCount: number
  invalid: RowProblem[]
  /** Valid rows whose category was unknown (they go to "Other"). */
  unknownCategoryCount: number
  /** Distinct unknown category names, in first-seen order. */
  unknownCategories: string[]
}

type RowCheck = { ok: true; date: string; description: string; amountCents: number } | { ok: false; message: string }

function checkRow(row: RawRow, format: SlashDateFormat | null): RowCheck {
  const date = parseImportDate(row.date, format)
  if (date === null) {
    const shown = row.date.trim()
    return { ok: false, message: shown ? `date '${shown}' isn't a valid date` : 'date is missing' }
  }
  const description = row.description.trim()
  if (!description) return { ok: false, message: 'description is missing' }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, message: `description is longer than ${MAX_DESCRIPTION_LENGTH} characters` }
  }
  const amount = parseImportAmount(row.amount)
  if (!amount.ok) return { ok: false, message: amount.problem }
  return { ok: true, date, description, amountCents: amount.cents }
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  return counts
}

/**
 * Validates rows and decides what to import. Duplicates are counted as a multiset of
 * (date, description, amount): if the file has 2 identical rows and 1 is stored, 1 is
 * added. Ids already stored are never re-added, so re-importing a file adds nothing.
 */
export function planImport(
  rows: readonly RawRow[],
  format: SlashDateFormat | null,
  categories: readonly Category[],
  existing: readonly Expense[],
): ImportPlan {
  const valid: { rowNumber: number; date: string; description: string; amountCents: number; category: string }[] = []
  const invalid: RowProblem[] = []
  for (const row of rows) {
    const check = checkRow(row, format)
    if (check.ok) valid.push({ rowNumber: row.rowNumber, date: check.date, description: check.description, amountCents: check.amountCents, category: row.category })
    else invalid.push({ rowNumber: row.rowNumber, message: check.message })
  }

  const storedCounts = countBy(existing, tupleKey)
  const fileCounts = countBy(valid, tupleKey)
  const storedIds = new Set(existing.map((e) => e.id))
  const seenInFile = new Map<string, number>()
  const addedPerTuple = new Map<string, number>()
  const unknownCategories: string[] = []
  const unknownSeen = new Set<string>()
  const planned: PlannedRow[] = []

  for (const row of valid) {
    const matched = matchCategory(row.category, categories)
    const unknownName = row.category.trim()
    if (matched === null && unknownName && !unknownSeen.has(unknownName.toLocaleLowerCase())) {
      unknownSeen.add(unknownName.toLocaleLowerCase())
      unknownCategories.push(unknownName)
    }

    const key = tupleKey(row)
    const k = seenInFile.get(key) ?? 0
    seenInFile.set(key, k + 1)
    const id = importId(row.date, row.description, row.amountCents, k)
    // Multiset: only (copies in file - copies stored) of each tuple are new.
    const needed = (fileCounts.get(key) ?? 0) - (storedCounts.get(key) ?? 0)
    const added = addedPerTuple.get(key) ?? 0
    const duplicate = storedIds.has(id) || added >= needed
    if (!duplicate) addedPerTuple.set(key, added + 1)
    planned.push({
      rowNumber: row.rowNumber,
      expense: { id, date: row.date, description: row.description, amountCents: row.amountCents, category: matched ?? FALLBACK_CATEGORY_ID },
      duplicate,
      unknownCategory: matched === null,
    })
  }

  const toImport = planned.filter((r) => !r.duplicate).map((r) => r.expense)
  return {
    rows: planned,
    toImport,
    duplicateCount: planned.length - toImport.length,
    invalid,
    unknownCategoryCount: planned.filter((r) => r.unknownCategory).length,
    unknownCategories,
  }
}
