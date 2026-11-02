import type { Expense } from '../../types'
import { addCategory, getCategories } from '../../lib/categories'
import { buildExpensesCsv } from '../csv-export/csv'
import { fnv1a } from './fnv1a'
import { importId, MAX_IMPORT_ROWS, planImport, readExpenseCsv, type RawRow } from './importCsv'
import type { SlashDateFormat } from './values'

function rowsOf(text: string): RawRow[] {
  const result = readExpenseCsv(text)
  if (!result.ok) throw new Error(result.error)
  return result.rows
}

function plan(text: string, existing: Expense[] = [], format: SlashDateFormat | null = null) {
  return planImport(rowsOf(text), format, getCategories(), existing)
}

const HEADER = 'date,description,category,amount\n'

describe('readExpenseCsv', () => {
  it('maps columns by header name, case-insensitively and in any order', () => {
    expect(rowsOf('Amount,DATE,Description,Category\n12.50,2025-01-02,Coffee,Food\n')).toEqual([
      { rowNumber: 2, date: '2025-01-02', description: 'Coffee', category: 'Food', amount: '12.50' },
    ])
  })

  it('treats the category column as optional', () => {
    expect(rowsOf('date,description,amount\n2025-01-02,Coffee,3\n')[0].category).toBe('')
  })

  it('undoes the export formula prefix in every column', () => {
    const [row] = rowsOf(`${HEADER}2025-01-02,'=SUM(A1),'@work,'+3\n`)
    expect(row).toMatchObject({ description: '=SUM(A1)', category: '@work', amount: '+3' })
  })

  it('explains missing columns, empty files and header-only files', () => {
    expect(readExpenseCsv('date,amount\n2025-01-01,3\n')).toEqual({
      ok: false,
      error: 'The first row needs the columns date, description and amount. Missing: description.',
    })
    expect(readExpenseCsv('')).toEqual({ ok: false, error: 'This file is empty.' })
    expect(readExpenseCsv(HEADER)).toEqual({ ok: false, error: 'This file has no expense rows.' })
  })

  it(`allows ${MAX_IMPORT_ROWS} rows and refuses more`, () => {
    const line = '2025-01-02,Coffee,Food,3\n'
    expect(readExpenseCsv(HEADER + line.repeat(MAX_IMPORT_ROWS)).ok).toBe(true)
    expect(readExpenseCsv(HEADER + line.repeat(MAX_IMPORT_ROWS + 1))).toEqual({
      ok: false,
      error: 'This file has more than 5,000 rows. Split it and import the parts.',
    })
  })

  it('detects the date format for the whole file', () => {
    const detect = (dates: string[]) => {
      const result = readExpenseCsv(HEADER + dates.map((d) => `${d},x,Food,1\n`).join(''))
      return result.ok ? result.dateFormat : result.error
    }
    expect(detect(['2025-01-02'])).toBe('none')
    expect(detect(['01/02/2025', '13/02/2025'])).toBe('dmy')
    expect(detect(['01/02/2025', '02/13/2025'])).toBe('mdy')
    expect(detect(['13/02/2025', '02/13/2025'])).toBe('conflict')
    expect(detect(['01/02/2025', '02/03/2025'])).toBe('ambiguous')
  })
})

describe('planImport', () => {
  it('builds expenses with FNV-1a ids and occurrence indexes', () => {
    const result = plan(`${HEADER}2025-01-02,Coffee,Food,3.50\n2025-01-03,Bus,Transport,2\n2025-01-02,Coffee,Food,3.50\n`)
    const coffeeHash = fnv1a('2025-01-02|Coffee|350')
    expect(result.toImport).toEqual([
      { id: `imp:${coffeeHash}:0`, date: '2025-01-02', description: 'Coffee', category: 'food', amountCents: 350 },
      { id: `imp:${fnv1a('2025-01-03|Bus|200')}:0`, date: '2025-01-03', description: 'Bus', category: 'transport', amountCents: 200 },
      { id: `imp:${coffeeHash}:1`, date: '2025-01-02', description: 'Coffee', category: 'food', amountCents: 350 },
    ])
    expect(importId('2025-01-02', 'Coffee', 350, 1)).toBe(`imp:${coffeeHash}:1`)
  })

  it('uses the occurrence index, not the row number, so ids survive reordering', () => {
    const a = plan(`${HEADER}2025-01-02,Coffee,Food,3\n2025-01-05,Tea,Food,2\n`).toImport
    const b = plan(`${HEADER}2025-01-05,Tea,Food,2\n\n2025-01-02,Coffee,Food,3\n`).toImport
    expect(new Set(a.map((e) => e.id))).toEqual(new Set(b.map((e) => e.id)))
  })

  it('lists invalid rows with row numbers and messages', () => {
    const result = plan(
      `${HEADER}2025-01-02,Coffee,Food,3\n2025-01-02,Lunch,Food,abc\n2025-02-30,Tea,Food,1\n,No date,Food,1\n2025-01-02,,Food,1\n2025-01-02,Refund,Food,-4\n`,
    )
    expect(result.toImport).toHaveLength(1)
    expect(result.invalid).toEqual([
      { rowNumber: 3, message: "amount 'abc' isn't a number" },
      { rowNumber: 4, message: "date '2025-02-30' isn't a valid date" },
      { rowNumber: 5, message: 'date is missing' },
      { rowNumber: 6, message: 'description is missing' },
      { rowNumber: 7, message: "amount '-4' must be more than 0" },
    ])
  })

  it('reads slash dates with the chosen format', () => {
    const text = `${HEADER}03/04/2025,Coffee,Food,3\n`
    expect(plan(text, [], 'dmy').toImport[0].date).toBe('2025-04-03')
    expect(plan(text, [], 'mdy').toImport[0].date).toBe('2025-03-04')
  })

  it('maps categories by label or id against the store; unknown ones go to Other', () => {
    const pets = addCategory('Pets', 'p3')
    const result = plan(
      `${HEADER}2025-01-02,A,pets,1\n2025-01-02,B,HOUSING,1\n2025-01-02,C,Groceries,1\n2025-01-02,D,Gym,1\n2025-01-02,E,groceries,1\n2025-01-02,F,,1\n`,
    )
    expect(result.toImport.map((e) => e.category)).toEqual([pets.id, 'housing', 'other', 'other', 'other', 'other'])
    expect(result.unknownCategoryCount).toBe(4)
    expect(result.unknownCategories).toEqual(['Groceries', 'Gym'])
  })

  describe('duplicates (multiset of date, description, amount)', () => {
    const stored: Expense = { id: 'manual-1', date: '2025-01-02', description: 'Coffee', category: 'food', amountCents: 350 }
    const twoCoffees = `${HEADER}2025-01-02,Coffee,Food,3.50\n2025-01-02,Coffee,Food,3.50\n`

    it('adds only the copies beyond what is stored', () => {
      const result = plan(twoCoffees, [stored])
      expect(result.toImport).toHaveLength(1)
      expect(result.duplicateCount).toBe(1)
      expect(result.rows.map((r) => r.duplicate)).toEqual([false, true])
    })

    it('ignores the category when comparing', () => {
      expect(plan(`${HEADER}2025-01-02,Coffee,Transport,3.50\n`, [stored]).duplicateCount).toBe(1)
    })

    it('treats a different date, description or amount as new', () => {
      const result = plan(`${HEADER}2025-01-03,Coffee,Food,3.50\n2025-01-02,coffee,Food,3.50\n2025-01-02,Coffee,Food,3.51\n`, [stored])
      expect(result.toImport).toHaveLength(3)
    })

    it('adds nothing when the same file is imported again', () => {
      const first = plan(twoCoffees, [stored])
      const afterFirst = [stored, ...first.toImport]
      const second = plan(twoCoffees, afterFirst)
      expect(second.toImport).toEqual([])
      expect(second.duplicateCount).toBe(2)
    })

    it('never proposes an id that is already stored', () => {
      // Only the second imported copy is left (the first was deleted), and its description
      // matches; the free slot is occurrence 0.
      const leftover: Expense = { ...stored, id: importId('2025-01-02', 'Coffee', 350, 1) }
      const result = plan(twoCoffees, [leftover])
      expect(result.toImport.map((e) => e.id)).toEqual([importId('2025-01-02', 'Coffee', 350, 0)])
    })

    it('skips rows whose id is stored even if the stored copy was edited', () => {
      const edited: Expense = { ...stored, id: importId('2025-01-02', 'Coffee', 350, 0), description: 'Flat white' }
      const result = plan(`${HEADER}2025-01-02,Coffee,Food,3.50\n`, [edited])
      expect(result.toImport).toEqual([])
    })
  })
})

describe('Export → Import round-trip', () => {
  const expenses: Expense[] = [
    { id: 'a', date: '2025-03-01', description: 'Lunch, with "Sam"', category: 'food', amountCents: 1250 },
    { id: 'b', date: '2025-03-02', description: '=HYPERLINK("x")', category: 'transport', amountCents: 275 },
    { id: 'c', date: '2025-03-02', description: '@home\nsecond line', category: 'housing', amountCents: 123450 },
    { id: 'd', date: '2025-03-03', description: '-minus +plus', category: 'other', amountCents: 1 },
    { id: 'e', date: '2025-03-03', description: '-minus +plus', category: 'other', amountCents: 1 },
    { id: 'f', date: '2025-03-04', description: 'Café crème', category: 'entertainment', amountCents: 999 },
  ]

  it('imports everything we exported, with the same fields', () => {
    const csv = buildExpensesCsv(expenses)
    expect(csv.includes('\r\n')).toBe(true)
    const result = plan(csv)
    expect(result.invalid).toEqual([])
    const withoutId = (list: Expense[]) => list.map((e) => ({ date: e.date, description: e.description, category: e.category, amountCents: e.amountCents }))
    expect(withoutId(result.toImport)).toEqual(withoutId(expenses))
  })

  it('handles a BOM added by a spreadsheet app and custom categories', () => {
    const garden = addCategory('Garden', 'p8')
    const withCustom = [...expenses, { id: 'g', date: '2025-03-05', description: 'Seeds', category: garden.id, amountCents: 450 }]
    const result = plan('﻿' + buildExpensesCsv(withCustom))
    expect(result.toImport[result.toImport.length - 1].category).toBe(garden.id)
    expect(result.unknownCategoryCount).toBe(0)
  })

  it('adds nothing when importing an export of the same expenses', () => {
    const result = plan(buildExpensesCsv(expenses), expenses)
    expect(result.toImport).toEqual([])
    expect(result.duplicateCount).toBe(expenses.length)
  })
})
