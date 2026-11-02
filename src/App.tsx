import { useEffect, useMemo, useState } from 'react'
import type { Expense } from './types'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { useExpenses } from './useExpenses'
import { useCategories } from './lib/categories'
import { parseIsoDate } from './lib/dates'
import { monthOfIso } from './lib/months'
import { useToday } from './lib/useToday'
import { SearchFilter, useExpenseFilter } from './features/search-filter'
import { ExportCsvButton } from './features/csv-export/ExportCsvButton'
import { MonthlySummary } from './features/monthly-summary/MonthlySummary'
import { ThemeToggle } from './features/dark-mode/ThemeToggle'
import { EditExpenseDialog } from './features/edit-expense'
import { BudgetsPanel } from './features/budgets'
import { RecurringPanel } from './features/recurring'
import { TrendsPanel } from './features/trends'
import { ImportCsvButton } from './features/csv-import'
import { CategoriesPanel } from './features/categories'

/** How long the "Undo" toast stays after a delete. */
const UNDO_WINDOW_MS = 6000

export default function App() {
  const { expenses, add, remove, restore, update, addMany, reassignCategory } = useExpenses()
  const { filter, setFilter, filtered, active: filterActive } = useExpenseFilter(expenses)
  const [lastDeleted, setLastDeleted] = useState<Expense | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  // Re-render everything when categories change (e.g. a rename shows up in every list).
  useCategories()

  // Today's date, updated at midnight. `now` is the stable Date form for older props.
  const today = useToday()
  const now = useMemo(() => parseIsoDate(today), [today])
  // null = follow the current month (so it moves on at midnight); otherwise the picked month.
  const [pickedMonth, setPickedMonth] = useState<string | null>(null)
  const month = pickedMonth ?? monthOfIso(today)

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
      <MonthlySummary
        expenses={expenses}
        now={now}
        month={month}
        onMonthChange={(m) => setPickedMonth(m === monthOfIso(today) ? null : m)}
      />
      <ExpenseForm onAdd={add} />
      {/* Round 2: budgets follow the month picked in the summary */}
      <BudgetsPanel expenses={expenses} now={now} month={month} />
      {/* Round 3 (step 1): spending trends */}
      <TrendsPanel expenses={expenses} today={today} />
      {/* Round 2: recurring expenses */}
      <RecurringPanel onGenerate={addMany} now={now} />
      {/* Round 3 (step 3): manage categories */}
      <CategoriesPanel expenses={expenses} onReassign={reassignCategory} />
      <div className="toolbar">
        {expenses.length > 0 && <SearchFilter filter={filter} onChange={setFilter} />}
        <div className="toolbar-actions">
          {/* Round 3 (step 2): CSV import — its only mount point */}
          <ImportCsvButton expenses={expenses} onImport={addMany} />
          {expenses.length > 0 && <ExportCsvButton expenses={expenses} />}
        </div>
      </div>
      {expenses.length > 0 && (
        <ExpenseList
          expenses={filtered}
          onRemove={handleRemove}
          onEdit={setEditing}
          emptyMessage={filterActive ? 'No matches. Try another search or category.' : undefined}
        />
      )}
      <EditExpenseDialog expense={editing} onSave={update} onClose={() => setEditing(null)} />
      <div role="status" aria-live="polite" aria-label="Notifications">
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
