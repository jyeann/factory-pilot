import type { Expense } from '../../types'
import { buildExpensesCsv, centsToDecimal, csvFilename, escapeCsvField } from './csv'

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'id-1',
    amountCents: 1250,
    description: 'Pizza',
    category: 'food',
    date: '2026-11-01',
    ...overrides,
  }
}

describe('escapeCsvField', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsvField('Pizza')).toBe('Pizza')
  })

  it.each([
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['line1\nline2', '"line1\nline2"'],
    ['line1\r\nline2', '"line1\r\nline2"'],
  ])('quotes %j as %j', (input, expected) => {
    expect(escapeCsvField(input)).toBe(expected)
  })

  it.each([
    ['=SUM(A1:A2)', "'=SUM(A1:A2)"],
    ['+1', "'+1"],
    ['-1', "'-1"],
    ['@cmd', "'@cmd"],
    ['\tTAB', "'\tTAB"],
    ['\rCR', "\"'\rCR\""],
  ])('neutralises spreadsheet formula %j', (input, expected) => {
    expect(escapeCsvField(input)).toBe(expected)
  })

  it('neutralises and quotes a formula containing a comma', () => {
    expect(escapeCsvField('=HYPERLINK("x","y")')).toBe('"\'=HYPERLINK(""x"",""y"")"')
  })
})

describe('centsToDecimal', () => {
  it.each([
    [1250, '12.50'],
    [5, '0.05'],
    [100, '1.00'],
    [123456, '1234.56'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(centsToDecimal(cents)).toBe(expected)
  })
})

describe('buildExpensesCsv', () => {
  it('returns only the header for an empty list', () => {
    expect(buildExpensesCsv([])).toBe('date,description,category,amount\r\n')
  })

  it('writes one row per expense with the category label and decimal amount', () => {
    const csv = buildExpensesCsv([expense({ category: 'transport', amountCents: 999, description: 'Bus' })])
    expect(csv).toBe('date,description,category,amount\r\n2026-11-01,Bus,Transport,9.99\r\n')
  })

  it('sorts rows by date, oldest first', () => {
    const csv = buildExpensesCsv([
      expense({ id: 'b', date: '2026-11-02', description: 'Second' }),
      expense({ id: 'a', date: '2026-10-30', description: 'First' }),
    ])
    const rows = csv.trimEnd().split('\r\n')
    expect(rows[1]).toContain('First')
    expect(rows[2]).toContain('Second')
  })

  it('does not mutate the input array', () => {
    const list = [expense({ id: 'b', date: '2026-11-02' }), expense({ id: 'a', date: '2026-10-30' })]
    const snapshot = [...list]
    buildExpensesCsv(list)
    expect(list).toEqual(snapshot)
  })

  it('escapes descriptions with commas, quotes and newlines', () => {
    const csv = buildExpensesCsv([expense({ description: 'Dinner, "fancy"\nwith friends' })])
    expect(csv).toBe('date,description,category,amount\r\n2026-11-01,"Dinner, ""fancy""\nwith friends",Food,12.50\r\n')
  })

  it('keeps negative amounts numeric but neutralises formula-like descriptions', () => {
    const csv = buildExpensesCsv([expense({ amountCents: -500, description: '-5 refund' })])
    expect(csv).toContain(",'-5 refund,Food,-5.00\r\n")
  })

  it('falls back to the raw id for unknown categories', () => {
    const csv = buildExpensesCsv([expense({ category: 'gifts' })])
    expect(csv).toContain(',gifts,')
  })
})

describe('csvFilename', () => {
  it('uses the local calendar date with zero padding', () => {
    expect(csvFilename(new Date(2026, 0, 5, 23, 59))).toBe('expenses-2026-01-05.csv')
  })
})
