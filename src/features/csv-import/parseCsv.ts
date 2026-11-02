/**
 * Minimal RFC 4180 CSV parser: comma separated, double-quoted fields with `""` escapes,
 * CRLF / LF / CR line endings, an optional UTF-8 BOM. Blank lines are skipped.
 */

export interface CsvRecord {
  /** 1-based record number (the header is record 1), as a spreadsheet would count rows. */
  rowNumber: number
  fields: string[]
}

export type CsvParseResult =
  | { ok: true; records: CsvRecord[] }
  | { ok: false; error: string }

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

  const endField = () => {
    fields.push(field)
    field = ''
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
  const tooMany = (): CsvParseResult => ({ ok: false, error: `The file has more than ${maxRecords} rows.` })

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch !== '"') field += ch
      else if (text[i + 1] === '"') {
        field += '"'
        i++
      } else inQuotes = false
    } else if (ch === '"') {
      inQuotes = true
      quoteStartRecord = recordCount + 1
    } else if (ch === ',') endField()
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (!endRecord()) return tooMany()
    } else field += ch
  }

  if (inQuotes) return { ok: false, error: `Row ${quoteStartRecord}: a quoted value is never closed.` }
  if ((field !== '' || fields.length > 0) && !endRecord()) return tooMany()
  return { ok: true, records }
}
