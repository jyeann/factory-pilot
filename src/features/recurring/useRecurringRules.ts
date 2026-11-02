import { useCallback, useEffect, useState } from 'react'
import type { Expense } from '../../types'
import { loadJson, saveJson } from '../../lib/storage'
import { createRule, generateDue, parseRules, RECURRING_STORAGE_KEY, type NewRecurringRule, type RecurringRule } from './recurring'

const loadRules = () => loadJson(RECURRING_STORAGE_KEY, parseRules, [])

/**
 * Rules state, persisted to localStorage, plus generation of due occurrences.
 * Generation runs in an effect on mount and whenever rules or `today` change. It is
 * idempotent (StrictMode runs effects twice): it computes from the current rules,
 * deterministic ids dedupe repeats in `onGenerate`, and the advanced rules are saved by the persist effect.
 */
export function useRecurringRules(today: string, onGenerate: (expenses: Expense[]) => void) {
  const [rules, setRules] = useState<RecurringRule[]>(loadRules)

  useEffect(() => {
    const result = generateDue(rules, today)
    if (!result.changed) return
    onGenerate(result.expenses)
    setRules(result.rules)
  }, [rules, today, onGenerate])

  // Single writer: the advanced rules from generation are saved here on the next commit.
  useEffect(() => {
    saveJson(RECURRING_STORAGE_KEY, rules)
  }, [rules])

  const addRule = useCallback((input: NewRecurringRule) => setRules((list) => [...list, createRule(input)]), [])

  /** Removes the rule only; expenses it already created stay. */
  const deleteRule = useCallback((id: string) => setRules((list) => list.filter((r) => r.id !== id)), [])

  return { rules, addRule, deleteRule }
}
