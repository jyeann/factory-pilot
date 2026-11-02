import { useCategories } from '../../lib/categories'
import { ALL_CATEGORIES, EMPTY_FILTER, isFilterActive, type ExpenseFilter } from './filterExpenses'
import './search-filter.css'

interface Props {
  filter: ExpenseFilter
  onChange: (filter: ExpenseFilter) => void
}

export function SearchFilter({ filter, onChange }: Props) {
  const categories = useCategories()
  return (
    <section className="search-filter" role="search" aria-label="Filter expenses">
      <label>
        <span className="visually-hidden">Search</span>
        <input
          type="search"
          value={filter.query}
          placeholder="Search descriptions"
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
        />
      </label>
      <label>
        <span className="visually-hidden">Category filter</span>
        <select value={filter.category} onChange={(e) => onChange({ ...filter, category: e.target.value })}>
          <option value={ALL_CATEGORIES}>All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="ghost search-filter-clear"
        disabled={!isFilterActive(filter)}
        onClick={() => onChange(EMPTY_FILTER)}
      >
        Clear filters
      </button>
    </section>
  )
}
