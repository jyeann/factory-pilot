const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

export function formatCents(cents: number): string {
  return formatter.format(cents / 100)
}

/** Parses user input like "12", "12.5" or "12.50" into cents. Returns null if invalid or <= 0. */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const cents = Math.round(Number(trimmed) * 100)
  return cents > 0 ? cents : null
}

/** Cents as plain input text, e.g. 1250 -> "12.50". Inverse of `parseAmountToCents`. */
export function centsToInput(cents: number): string {
  const abs = Math.abs(Math.trunc(cents))
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
