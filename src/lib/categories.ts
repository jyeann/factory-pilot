import { useSyncExternalStore } from 'react'
import { loadJson, saveJson } from './storage'

/**
 * Category store. Every picker and display reads categories from here so that custom
 * categories (round 3) show up everywhere. Plain code uses `getCategories()`,
 * `categoryLabel()` and `categoryColor()`; components use `useCategories()`.
 */

/** Theme-aware colour choices for categories (`--cat-p1` ... `--cat-p10` in index.css). */
export const CATEGORY_PALETTE = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'] as const
export type PaletteKey = (typeof CATEGORY_PALETTE)[number]

export interface Category {
  id: string
  label: string
  /** Palette colour. Built-ins without one use their own `--cat-<id>` token. */
  color?: PaletteKey
  /** Archived (deleted) categories are hidden from pickers but still resolve labels/colours. */
  archived?: boolean
}

/** Built-in seed categories. Don't use this for pickers or display; read the store. */
export const DEFAULT_CATEGORIES: readonly Category[] = Object.freeze([
  { id: 'food', label: 'Food' },
  { id: 'transport', label: 'Transport' },
  { id: 'housing', label: 'Housing' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'other', label: 'Other' },
])

/** The fallback category; it can't be deleted. */
export const FALLBACK_CATEGORY_ID = 'other'
export const CATEGORIES_STORAGE_KEY = 'factory-pilot.categories.v1'
export const MAX_CATEGORY_LABEL_LENGTH = 24

const BUILT_IN_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id))

function isPaletteKey(value: unknown): value is PaletteKey {
  return typeof value === 'string' && (CATEGORY_PALETTE as readonly string[]).includes(value)
}

/** `parse` for loadJson: keeps valid categories and makes sure "other" exists. */
export function parseCategories(value: unknown): Category[] | null {
  if (!Array.isArray(value)) return null
  const seen = new Set<string>()
  const list: Category[] = []
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue
    const c = raw as Record<string, unknown>
    if (typeof c.id !== 'string' || c.id === '' || seen.has(c.id)) continue
    if (typeof c.label !== 'string' || c.label.trim() === '') continue
    seen.add(c.id)
    list.push({
      id: c.id,
      label: c.label,
      ...(isPaletteKey(c.color) ? { color: c.color } : {}),
      ...(c.archived === true && c.id !== FALLBACK_CATEGORY_ID ? { archived: true } : {}),
    })
  }
  if (!seen.has(FALLBACK_CATEGORY_ID)) list.push({ ...DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1] })
  return list
}

// ---- store state (loaded lazily so tests can seed localStorage first) ----

let all: readonly Category[] | null = null
let active: readonly Category[] = []
const listeners = new Set<() => void>()

function ensureLoaded(): readonly Category[] {
  if (all === null) setAll(loadJson(CATEGORIES_STORAGE_KEY, parseCategories, DEFAULT_CATEGORIES.map((c) => ({ ...c }))), false)
  return all as readonly Category[]
}

/** Replaces the state with new frozen snapshots (stable until the next change). */
function setAll(next: Category[], persist = true) {
  all = Object.freeze(next.map((c) => Object.freeze({ ...c })))
  active = Object.freeze(all.filter((c) => !c.archived))
  if (persist) saveJson(CATEGORIES_STORAGE_KEY, all)
  listeners.forEach((fn) => fn())
}

/** Active categories in display order. Same array until something changes. */
export function getCategories(): readonly Category[] {
  ensureLoaded()
  return active
}

/** All categories including archived ones. */
export function getAllCategories(): readonly Category[] {
  return ensureLoaded()
}

export function subscribeCategories(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Active categories; re-renders when they change. */
export function useCategories(): readonly Category[] {
  return useSyncExternalStore(subscribeCategories, getCategories, getCategories)
}

export function isActiveCategory(id: string): boolean {
  return getCategories().some((c) => c.id === id)
}

/** Label for any known id (archived included); unknown ids show as-is. */
export function categoryLabel(id: string): string {
  return ensureLoaded().find((c) => c.id === id)?.label ?? id
}

/** CSS colour for a category (theme-aware variable); unknown ids use "other". */
export function categoryColor(id: string): string {
  const c = ensureLoaded().find((x) => x.id === id)
  if (c?.color) return `var(--cat-${c.color})`
  if (c && BUILT_IN_IDS.has(c.id)) return `var(--cat-${c.id})`
  return c ? `var(--cat-p${(hash(c.id) % CATEGORY_PALETTE.length) + 1})` : `var(--cat-${FALLBACK_CATEGORY_ID})`
}

function hash(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A new id, unique against every category ever created (archived included). */
function uniqueId(label: string): string {
  const taken = new Set(ensureLoaded().map((c) => c.id))
  const base = slugify(label) || 'c'
  if (!taken.has(base) && base !== 'c') return base
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

/** Error message for a proposed label, or null when it's fine. `exceptId` skips itself (rename). */
export function validateCategoryLabel(label: string, exceptId?: string): string | null {
  const trimmed = label.trim()
  if (!trimmed) return 'Enter a category name.'
  if (trimmed.length > MAX_CATEGORY_LABEL_LENGTH) return `Keep it to ${MAX_CATEGORY_LABEL_LENGTH} characters or fewer.`
  const clash = getCategories().some((c) => c.id !== exceptId && c.label.toLocaleLowerCase() === trimmed.toLocaleLowerCase())
  return clash ? 'A category with that name already exists.' : null
}

/** Adds an active category. Throws if the label is invalid (check `validateCategoryLabel` first). */
export function addCategory(label: string, color: PaletteKey): Category {
  const problem = validateCategoryLabel(label)
  if (problem) throw new Error(problem)
  const category: Category = { id: uniqueId(label), label: label.trim(), color }
  setAll([...ensureLoaded(), category])
  return category
}

export function renameCategory(id: string, label: string): void {
  const problem = validateCategoryLabel(label, id)
  if (problem) throw new Error(problem)
  setAll(ensureLoaded().map((c) => (c.id === id ? { ...c, label: label.trim() } : c)))
}

export function recolorCategory(id: string, color: PaletteKey): void {
  setAll(ensureLoaded().map((c) => (c.id === id ? { ...c, color } : c)))
}

/**
 * Deletes (archives) a category: hidden from pickers, but old data still shows its name.
 * Reassign its expenses first. Refuses the fallback category.
 */
export function removeCategory(id: string): void {
  if (id === FALLBACK_CATEGORY_ID) throw new Error('The "Other" category can\'t be deleted.')
  setAll(ensureLoaded().map((c) => (c.id === id ? { ...c, archived: true } : c)))
}

/** Test helper: forget the in-memory store so the next read loads from localStorage. */
export function resetCategoriesForTests(): void {
  all = null
  active = []
  listeners.forEach((fn) => fn())
}
