import { parseCsv } from './parseCsv'

function fields(text: string) {
  const result = parseCsv(text)
  if (!result.ok) throw new Error(result.error)
  return result.records.map((r) => r.fields)
}

describe('parseCsv', () => {
  it('splits simple rows on commas and LF', () => {
    expect(fields('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles CRLF and lone CR line endings', () => {
    expect(fields('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(fields('a,b\r1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('strips a UTF-8 BOM', () => {
    expect(fields('﻿date,amount\n')).toEqual([['date', 'amount']])
  })

  it('reads quoted fields with commas, newlines and escaped quotes', () => {
    expect(fields('"a,b","say ""hi""","line1\r\nline2"\n')).toEqual([['a,b', 'say "hi"', 'line1\r\nline2']])
  })

  it('keeps empty fields, including trailing ones', () => {
    expect(fields('a,,c,\n')).toEqual([['a', '', 'c', '']])
    expect(fields('""\n')).toEqual([])
  })

  it('skips blank lines and works without a trailing newline', () => {
    expect(fields('a\n\n\nb')).toEqual([['a'], ['b']])
  })

  it('numbers records like spreadsheet rows, ignoring blank lines', () => {
    const result = parseCsv('h\n\nx\n"multi\nline"\ny\n')
    expect(result.ok && result.records.map((r) => r.rowNumber)).toEqual([1, 2, 3, 4])
  })

  it('reports an unclosed quote', () => {
    expect(parseCsv('a\n"oops,1\n2')).toEqual({ ok: false, error: 'Row 2: a quoted value is never closed.' })
  })

  it('stops once there are more records than allowed', () => {
    expect(parseCsv('1\n2\n3\n', 2).ok).toBe(false)
    expect(parseCsv('1\n2\n3', 2).ok).toBe(false)
    expect(parseCsv('1\n2\n', 2).ok).toBe(true)
  })

  it('returns no records for an empty file', () => {
    expect(fields('')).toEqual([])
    expect(fields('﻿')).toEqual([])
  })
})
