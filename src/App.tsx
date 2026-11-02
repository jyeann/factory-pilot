import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { useExpenses } from './useExpenses'
import { SearchFilter, useExpenseFilter } from './features/search-filter'

export default function App() {
  const { expenses, add, remove } = useExpenses()
  const { filter, setFilter, filtered, active: filterActive } = useExpenseFilter(expenses)

  return (
    <main className="app">
      <header>
        <h1>Expense Tracker</h1>
      </header>
      <ExpenseForm onAdd={add} />
      {/* FEATURE SLOT: summaries / charts go here */}
      {(expenses.length > 0 || filterActive) && <SearchFilter filter={filter} onChange={setFilter} />}
      <ExpenseList
        expenses={filtered}
        onRemove={remove}
        emptyMessage={filterActive && expenses.length > 0 ? 'No matches' : undefined}
      />
      {/* FEATURE SLOT: export / tools go here */}
    </main>
  )
}
