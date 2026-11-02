import type { Expense } from '../../types'
import { getCategories } from '../../lib/categories'
import { toIsoDate } from '../../lib/dates'
import { loadJson, saveJson } from '../../lib/storage'

/** Monthly limit per category: category id -> limit in integer cents (> 0). */
export type Budgets = Record<string, number>

export type BudgetState = 'ok' | 'near' | 'over'

export interface BudgetStatus {
  category: string
  spentCents: number
  limitCents: number
  /** spent / limit; can exceed 1 when over budget. */
  ratio: number
  state: BudgetState
}

export const BUDGETS_STORAGE_KEY = 'factory-pilot.budgets.v1'

/** A category counts as "near" its limit from 80% (4/5) of the budget, compared in integers. */
const NEAR_NUMERATOR = 4
const NEAR_DENOMINATOR = 5

const isPositiveInteger = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0

/** Validates stored budgets, dropping entries that aren't positive integer cents. */
export function parseBudgets(value: unknown): Budgets | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value).filter(([, cents]) => isPositiveInteger(cents)))
}

export function loadBudgets(storage: Storage = localStorage): Budgets {
  return loadJson(BUDGETS_STORAGE_KEY, parseBudgets, {}, storage)
}

export function saveBudgets(budgets: Budgets, storage: Storage = localStorage): void {
  saveJson(BUDGETS_STORAGE_KEY, budgets, storage)
}

/** `YYYY-MM` for the month containing `now`, in local time. */
export function monthOf(now: Date): string {
  return toIsoDate(now).slice(0, 7)
}

function stateFor(spentCents: number, limitCents: number): BudgetState {
  if (spentCents > limitCents) return 'over'
  return spentCents * NEAR_DENOMINATOR >= limitCents * NEAR_NUMERATOR ? 'near' : 'ok'
}

/** Active categories that have a budget, in the store's order. Deleted or unknown ids are ignored. */
function budgetedCategories(budgets: Budgets): string[] {
  return getCategories()
    .map((c) => c.id)
    .filter((id) => id in budgets)
}

/** Spending against each budgeted category for `month` (`YYYY-MM`). */
export function budgetStatus(expenses: Expense[], budgets: Budgets, month: string): BudgetStatus[] {
  const spent = new Map<string, number>()
  for (const e of expenses) {
    if (e.date.startsWith(`${month}-`)) spent.set(e.category, (spent.get(e.category) ?? 0) + e.amountCents)
  }
  return budgetedCategories(budgets).map((category) => {
    const limitCents = budgets[category]
    const spentCents = spent.get(category) ?? 0
    return { category, spentCents, limitCents, ratio: spentCents / limitCents, state: stateFor(spentCents, limitCents) }
  })
}

const wholeFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const centsFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

/** Compact money for budget lines: "$32" for whole dollars, "$32.50" otherwise. */
export function formatBudgetMoney(cents: number): string {
  return (cents % 100 === 0 ? wholeFormatter : centsFormatter).format(cents / 100)
}
