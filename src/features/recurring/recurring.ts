import type { Expense } from '../../types'
import { addDays, addMonthsClamped, parseIsoDate, toIsoDate } from '../../lib/dates'
import { formatCents } from '../../lib/money'

/** Pure helpers for recurring rules. They never mutate their inputs. */

export const RECURRING_STORAGE_KEY = 'factory-pilot.recurring.v1'

/** Most occurrences one rule generates per run; the rest follow on the next run. */
export const MAX_OCCURRENCES_PER_RUN = 366

export type Frequency = 'monthly' | 'weekly'

export const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: 'monthly', label: 'Every month' },
  { id: 'weekly', label: 'Every week' },
]

export interface RecurringRule {
  id: string
  description: string
  /** Amount in cents, always > 0. */
  amountCents: number
  category: string
  frequency: Frequency
  /** First occurrence, `YYYY-MM-DD`. Monthly occurrences are always computed from it. */
  startDate: string
  /** Last date an expense was generated for, or null if none yet. */
  generatedThrough: string | null
}

export type NewRecurringRule = Omit<RecurringRule, 'id' | 'generatedThrough'>

/** True for a real calendar date written as `YYYY-MM-DD`. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toIsoDate(parseIsoDate(value)) === value
}

function isRule(value: unknown): value is RecurringRule {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    r.id !== '' &&
    typeof r.description === 'string' &&
    typeof r.amountCents === 'number' &&
    Number.isInteger(r.amountCents) &&
    r.amountCents > 0 &&
    typeof r.category === 'string' &&
    (r.frequency === 'monthly' || r.frequency === 'weekly') &&
    isIsoDate(r.startDate) &&
    (r.generatedThrough === null || isIsoDate(r.generatedThrough))
  )
}

/** `parse` for `loadJson`: keeps valid rules, drops anything malformed. */
export function parseRules(value: unknown): RecurringRule[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(isRule).map((r) => ({
    id: r.id,
    description: r.description,
    amountCents: r.amountCents,
    category: r.category,
    frequency: r.frequency,
    startDate: r.startDate,
    generatedThrough: r.generatedThrough,
  }))
}

/** The n-th occurrence (n = 0 is the start date). */
export function occurrenceDate(rule: Pick<RecurringRule, 'frequency' | 'startDate'>, n: number): string {
  return rule.frequency === 'monthly' ? addMonthsClamped(rule.startDate, n) : addDays(rule.startDate, 7 * n)
}

/**
 * Dates `d` that are due: `d >= startDate` AND (`generatedThrough` is null OR
 * `d > generatedThrough`) AND `d <= today`, oldest first, at most
 * `MAX_OCCURRENCES_PER_RUN`. ISO dates compare correctly as strings.
 */
export function dueOccurrences(rule: RecurringRule, today: string): string[] {
  const due: string[] = []
  for (let n = 0; due.length < MAX_OCCURRENCES_PER_RUN; n++) {
    const date = occurrenceDate(rule, n)
    if (date > today) break
    if (date >= rule.startDate && (rule.generatedThrough === null || date > rule.generatedThrough)) {
      due.push(date)
    }
  }
  return due
}

/** Deterministic id, so repeated runs (e.g. StrictMode) dedupe in `addMany`. */
export function occurrenceId(ruleId: string, date: string): string {
  return `rec:${ruleId}:${date}`
}

export function occurrenceExpense(rule: RecurringRule, date: string): Expense {
  return {
    id: occurrenceId(rule.id, date),
    amountCents: rule.amountCents,
    description: rule.description,
    category: rule.category,
    date,
    recurringId: rule.id,
  }
}

export interface GenerationResult {
  expenses: Expense[]
  /** Rules with `generatedThrough` moved to the last generated date (unchanged when nothing was due). */
  rules: RecurringRule[]
  /** True when at least one rule produced an occurrence. */
  changed: boolean
}

export function generateDue(rules: RecurringRule[], today: string): GenerationResult {
  const expenses: Expense[] = []
  const next = rules.map((rule) => {
    const dates = dueOccurrences(rule, today)
    if (dates.length === 0) return rule
    expenses.push(...dates.map((date) => occurrenceExpense(rule, date)))
    return { ...rule, generatedThrough: dates[dates.length - 1] }
  })
  return { expenses, rules: next, changed: expenses.length > 0 }
}

export function createRule(input: NewRecurringRule, id: string = crypto.randomUUID()): RecurringRule {
  return { ...input, id, generatedThrough: null }
}

export function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'
  return `${n}${suffix}`
}

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' })

/** Plain-words schedule, e.g. "every month on the 1st" or "every week on Monday". */
export function scheduleText(rule: Pick<RecurringRule, 'frequency' | 'startDate'>): string {
  const start = parseIsoDate(rule.startDate)
  if (rule.frequency === 'weekly') return `every week on ${weekdayFormatter.format(start)}`
  const day = start.getDate()
  return day > 28 ? `every month on the ${ordinal(day)} (or the last day)` : `every month on the ${ordinal(day)}`
}

/** "Rent, $1,200.00 every month on the 1st". */
export function describeRule(rule: RecurringRule): string {
  return `${rule.description}, ${formatCents(rule.amountCents)} ${scheduleText(rule)}`
}

/** First occurrence after `today` (and after `generatedThrough`): when the rule next adds an expense. */
export function nextOccurrence(rule: RecurringRule, today: string): string {
  const after = rule.generatedThrough !== null && rule.generatedThrough > today ? rule.generatedThrough : today
  for (let n = 0; ; n++) {
    const date = occurrenceDate(rule, n)
    if (date > after) return date
  }
}
