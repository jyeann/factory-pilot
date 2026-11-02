import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { useExpenses } from './useExpenses'
import { ThemeToggle } from './features/dark-mode/ThemeToggle'

export default function App() {
  const { expenses, add, remove } = useExpenses()

  return (
    <main className="app">
      <header className="app-header">
        <h1>Expense Tracker</h1>
        <ThemeToggle />
      </header>
      <ExpenseForm onAdd={add} />
      {/* FEATURE SLOT: summaries / charts go here */}
      <ExpenseList expenses={expenses} onRemove={remove} />
      {/* FEATURE SLOT: export / tools go here */}
    </main>
  )
}
