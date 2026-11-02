import { useEffect, useState } from 'react'
import type { Expense } from './types'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { useExpenses } from './useExpenses'
import { SearchFilter, useExpenseFilter } from './features/search-filter'
import { ExportCsvButton } from './features/csv-export/ExportCsvButton'
import { MonthlySummary } from './features/monthly-summary/MonthlySummary'
import { ThemeToggle } from './features/dark-mode/ThemeToggle'
import { EditExpenseDialog } from './features/edit-expense'
import { BudgetsPanel } from './features/budgets'
import { RecurringPanel } from './features/recurring'

/** How long the "Undo" toast stays after a delete. */
const UNDO_WINDOW_MS = 6000

export default function App() {
  const { expenses, add, remove, restore, update, addMany } = useExpenses()
  const { filter, setFilter, filtered, active: filterActive } = useExpenseFilter(expenses)
  const [lastDeleted, setLastDeleted] = useState<Expense | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)

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
      {/* Round 2 (step 2): budgets */}
      <BudgetsPanel expenses={expenses} />
      <ExpenseForm onAdd={add} />
      {/* Round 2 (step 3): recurring expenses */}
      <RecurringPanel onGenerate={addMany} />
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
          onEdit={setEditing}
          emptyMessage={filterActive ? 'No matches. Try another search or category.' : undefined}
        />
      )}
      {/* Round 2 (step 1): edit dialog */}
      <EditExpenseDialog expense={editing} onSave={update} onClose={() => setEditing(null)} />
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
