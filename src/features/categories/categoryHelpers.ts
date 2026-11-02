import type { Expense } from '../../types'
import { CATEGORY_PALETTE, FALLBACK_CATEGORY_ID, type Category, type PaletteKey } from '../../lib/categories'

/** Friendly names for the palette swatches (screen readers announce these). */
export const PALETTE_NAMES: Readonly<Record<PaletteKey, string>> = Object.freeze({
  p1: 'Green',
  p2: 'Blue',
  p3: 'Purple',
  p4: 'Pink',
  p5: 'Orange',
  p6: 'Teal',
  p7: 'Indigo',
  p8: 'Olive',
  p9: 'Magenta',
  p10: 'Taupe',
})

/** Theme-aware CSS colour for a palette key. */
export const paletteColor = (key: PaletteKey): string => `var(--cat-${key})`

/** Number of expenses per category id. */
export function countByCategory(expenses: readonly Expense[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>()
  for (const e of expenses) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
  return counts
}

/** "No expenses", "1 expense", "3 expenses". */
export function formatExpenseCount(count: number): string {
  if (count === 0) return 'No expenses'
  return count === 1 ? '1 expense' : `${count} expenses`
}

/** Palette colours that look the same as a built-in category's own `--cat-<id>` colour. */
const BUILT_IN_LOOKALIKES: Readonly<Record<string, PaletteKey>> = Object.freeze({
  food: 'p1',
  transport: 'p2',
  housing: 'p3',
  entertainment: 'p4',
  other: 'p10',
})

/** The first palette colour no active category uses (or looks like) yet; falls back to the first one. */
export function suggestColor(categories: readonly Category[]): PaletteKey {
  const used = new Set(categories.map((c) => c.color ?? BUILT_IN_LOOKALIKES[c.id]).filter(Boolean))
  return CATEGORY_PALETTE.find((key) => !used.has(key)) ?? CATEGORY_PALETTE[0]
}

/** Where a deleted category's expenses can go: every other active category, "Other" first. */
export function reassignTargets(categories: readonly Category[], removingId: string): Category[] {
  const others = categories.filter((c) => c.id !== removingId)
  const fallback = others.filter((c) => c.id === FALLBACK_CATEGORY_ID)
  return [...fallback, ...others.filter((c) => c.id !== FALLBACK_CATEGORY_ID)]
}
