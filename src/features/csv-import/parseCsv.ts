/**
 * Minimal RFC 4180 CSV parser: comma separated, double-quoted fields with `""` escapes,
 * CRLF / LF / CR line endings, an optional UTF-8 BOM. Blank lines are skipped.
 */

export interface CsvRecord {
  /** 1-based record number (the header is record 1). Blank lines aren't counted and a
   *  quoted value spanning lines is one record. */
  rowNumber: number
  fields: string[]
}

export type CsvParseResult =
  | { ok: true; records: CsvRecord[] }
  | { ok: false; code: 'too-many-rows' | 'unclosed-quote'; error: string }

const BOM = '﻿'

/**
 * Parses CSV text. Stops with an error once more than `maxRecords` records are found, so
 * a huge file doesn't build a huge array.
 */
export function parseCsv(input: string, maxRecords = Number.POSITIVE_INFINITY): CsvParseResult {
  const text = input.startsWith(BOM) ? input.slice(BOM.length) : input
  const records: CsvRecord[] = []
  let fields: string[] = []
  let field = ''
  let inQuotes = false
  let quoteStartRecord = 0
  let recordCount = 0
  /** RFC 4180: a quote is only special at the start of a field; elsewhere it's literal. */
  let atFieldStart = true

  const endField = () => {
    fields.push(field)
    field = ''
    atFieldStart = true
  }
  /** Returns false when the record limit is exceeded. */
  const endRecord = (): boolean => {
    endField()
    const isBlank = fields.length === 1 && fields[0] === ''
    if (!isBlank) {
      recordCount += 1
      if (recordCount > maxRecords) return false
      records.push({ rowNumber: recordCount, fields })
    }
    fields = []
    return true
  }
  const tooMany = (): CsvParseResult => ({ ok: false, code: 'too-many-rows', error: `The file has more than ${maxRecords} rows.` })

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch !== '"') field += ch
      else if (text[i + 1] === '"') {
        field += '"'
        i++
      } else inQuotes = false
    } else if (ch === '"' && atFieldStart) {
      inQuotes = true
      atFieldStart = false
      quoteStartRecord = recordCount + 1
    } else if (ch === ',') endField()
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (!endRecord()) return tooMany()
    } else {
      field += ch
      atFieldStart = false
    }
  }

  if (inQuotes) return { ok: false, code: 'unclosed-quote', error: `Row ${quoteStartRecord}: a quoted value is never closed.` }
  if ((field !== '' || fields.length > 0) && !endRecord()) return tooMany()
  return { ok: true, records }
}
