import { useEffect, useState } from 'react'
import type { Expense } from './types'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { useExpenses } from './useExpenses'
import { SearchFilter, useExpenseFilter } from './features/search-filter'
import { ExportCsvButton } from './features/csv-export/ExportCsvButton'
import { MonthlySummary } from './features/monthly-summary/MonthlySummary'
import { ThemeToggle } from './features/dark-mode/ThemeToggle'

/** How long the "Undo" toast stays after a delete. */
const UNDO_WINDOW_MS = 6000

export default function App() {
  const { expenses, add, remove, restore } = useExpenses()
  const { filter, setFilter, filtered, active: filterActive } = useExpenseFilter(expenses)
  const [lastDeleted, setLastDeleted] = useState<Expense | null>(null)

  useEffect(() => {
    if (!lastDeleted) return
    const timer = setTimeout(() => setLastDeleted(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [lastDeleted])

  function handleRemove(id: string) {
    setLastDeleted(expenses.find((e) => e.id === id) ?? null)
    remove(id)
  }

  function handleUndo() {
    if (lastDeleted) restore(lastDeleted)
    setLastDeleted(null)
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Expense Tracker</h1>
        <ThemeToggle />
      </header>
      {/* FEATURE SLOT: summaries / charts go here */}
      <MonthlySummary expenses={expenses} />
      <ExpenseForm onAdd={add} />
      {/* FEATURE SLOT: export / tools go here */}
      {expenses.length > 0 && (
        <div className="toolbar">
          <SearchFilter filter={filter} onChange={setFilter} />
          <ExportCsvButton expenses={expenses} />
        </div>
      )}
      {expenses.length > 0 && (
        <ExpenseList
          expenses={filtered}
          onRemove={handleRemove}
          emptyMessage={filterActive ? 'No matches. Try another search or category.' : undefined}
        />
      )}
      <div role="status" aria-live="polite">
        {lastDeleted && (
          <div className="toast">
            <span>Expense deleted.</span>
            <button type="button" onClick={handleUndo}>
              Undo
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
