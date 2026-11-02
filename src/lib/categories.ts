export interface Category {
  id: string
  label: string
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', label: 'Food' },
  { id: 'transport', label: 'Transport' },
  { id: 'housing', label: 'Housing' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'other', label: 'Other' },
]

export function categoryLabel(id: string): string {
  return DEFAULT_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

/** CSS colour for a category, from the `--cat-<id>` design tokens (falls back to "other"). */
export function categoryColor(id: string): string {
  const known = DEFAULT_CATEGORIES.some((c) => c.id === id)
  return `var(--cat-${known ? id : 'other'})`
}
