import type { Category } from '../../lib/categories'
import { parseIsoDate, toIsoDate } from '../../lib/dates'
import { parseAmountToCents } from '../../lib/money'

/** Field parsers for imported rows. Pure; no React. */

/** Our export prefixes cells starting with these characters with `'` (CSV injection guard). */
const EXPORT_PREFIXED = /^'[=+\-@\t\r]/

/** Undoes the `'` our CSV export adds before `= + - @`, tab or CR. */
export function unescapeExportPrefix(value: string): string {
  return EXPORT_PREFIXED.test(value) ? value.slice(1) : value
}

// ---- dates ----

export type SlashDateFormat = 'dmy' | 'mdy'
/** How a file writes `nn/nn/yyyy` dates: known, unknown (ask the user), or mixed (error). */
export type DateFormatDetection = SlashDateFormat | 'ambiguous' | 'conflict' | 'none'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

/**
 * Detects the slash-date format of a whole file: any first part > 12 means DD/MM, any
 * second part > 12 means MM/DD, both is a conflict, neither is ambiguous. `none` means the
 * file has no slash dates at all.
 */
export function detectDateFormat(values: readonly string[]): DateFormatDetection {
  let sawSlash = false
  let firstOver12 = false
  let secondOver12 = false
  for (const value of values) {
    const m = SLASH_DATE.exec(value.trim())
    if (!m) continue
    sawSlash = true
    if (Number(m[1]) > 12) firstOver12 = true
    if (Number(m[2]) > 12) secondOver12 = true
  }
  if (!sawSlash) return 'none'
  if (firstOver12 && secondOver12) return 'conflict'
  if (firstOver12) return 'dmy'
  if (secondOver12) return 'mdy'
  return 'ambiguous'
}

/** True when `iso` is a real calendar date (e.g. not 2025-02-30). */
function isRealDate(iso: string): boolean {
  return toIsoDate(parseIsoDate(iso)) === iso
}

const pad2 = (part: string) => part.padStart(2, '0')

/**
 * Parses an imported date to `YYYY-MM-DD`. Slash dates need the file's format (`null`
 * while it is still unknown). Returns null for anything else or impossible dates.
 */
export function parseImportDate(raw: string, format: SlashDateFormat | null): string | null {
  const value = raw.trim()
  const iso = ISO_DATE.exec(value)
  if (iso) return isRealDate(value) ? value : null
  const slash = SLASH_DATE.exec(value)
  if (!slash || format === null) return null
  const [, first, second, year] = slash
  const [day, month] = format === 'dmy' ? [first, second] : [second, first]
  const result = `${year}-${pad2(month)}-${pad2(day)}`
  return isRealDate(result) ? result : null
}

export function isSlashDate(raw: string): boolean {
  return SLASH_DATE.test(raw.trim())
}

// ---- amounts ----

/** Largest amount we accept (keeps cents well inside the safe-integer range). */
export const MAX_AMOUNT_CENTS = 100_000_000_000
const GROUPED_THOUSANDS = /^\d{1,3}(,\d{3})+(\.\d*)?$/
const NUMBER_LIKE = /^-?\d+(\.\d+)?$/

export type AmountResult = { ok: true; cents: number } | { ok: false; problem: string }

/** Parses "12.50", "$12.50" or "1,234.50" to cents. Zero, negative and junk are rejected. */
export function parseImportAmount(raw: string): AmountResult {
  const shown = raw.trim()
  let value = shown.replace(/^\$/, '').trim()
  if (GROUPED_THOUSANDS.test(value)) value = value.replace(/,/g, '')
  const cents = parseAmountToCents(value)
  if (cents !== null) {
    return cents <= MAX_AMOUNT_CENTS ? { ok: true, cents } : { ok: false, problem: `amount '${shown}' is too large` }
  }
  if (shown === '') return { ok: false, problem: 'amount is missing' }
  const negative = /^-|^\$-|^-\$|^\(.*\)$/.test(shown)
  if (negative || (NUMBER_LIKE.test(value) && Number(value) <= 0)) {
    return { ok: false, problem: `amount '${shown}' must be more than 0` }
  }
  if (NUMBER_LIKE.test(value)) return { ok: false, problem: `amount '${shown}' has more than 2 decimals` }
  return { ok: false, problem: `amount '${shown}' isn't a number` }
}

// ---- categories ----

/**
 * Category id for an imported label or id (case-insensitive, active categories only).
 * Returns null when nothing matches; callers then use the fallback category.
 */
export function matchCategory(raw: string, categories: readonly Category[]): string | null {
  const wanted = raw.trim().toLocaleLowerCase()
  if (!wanted) return null
  const hit = categories.find((c) => c.label.toLocaleLowerCase() === wanted || c.id.toLocaleLowerCase() === wanted)
  return hit ? hit.id : null
}
