import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { useExpenses } from './useExpenses'
import { MonthlySummary } from './features/monthly-summary/MonthlySummary'

export default function App() {
  const { expenses, add, remove } = useExpenses()

  return (
    <main className="app">
      <header>
        <h1>Expense Tracker</h1>
      </header>
      <ExpenseForm onAdd={add} />
      {/* FEATURE SLOT: summaries / charts go here */}
      <MonthlySummary expenses={expenses} />
      <ExpenseList expenses={expenses} onRemove={remove} />
      {/* FEATURE SLOT: export / tools go here */}
    </main>
  )
}
