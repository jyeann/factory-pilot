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
