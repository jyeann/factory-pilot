import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { useExpenses } from './useExpenses'
import { ExportCsvButton } from './features/csv-export/ExportCsvButton'

export default function App() {
  const { expenses, add, remove } = useExpenses()

  return (
    <main className="app">
      <header>
        <h1>Expense Tracker</h1>
      </header>
      <ExpenseForm onAdd={add} />
      {/* FEATURE SLOT: summaries / charts go here */}
      <ExpenseList expenses={expenses} onRemove={remove} />
      {/* FEATURE SLOT: export / tools go here */}
      <ExportCsvButton expenses={expenses} />
    </main>
  )
}
