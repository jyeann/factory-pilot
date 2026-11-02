import { DEFAULT_CATEGORIES } from '../../lib/categories'
import { ALL_CATEGORIES, EMPTY_FILTER, isFilterActive, type ExpenseFilter } from './filterExpenses'
import './search-filter.css'

interface Props {
  filter: ExpenseFilter
  onChange: (filter: ExpenseFilter) => void
}

export function SearchFilter({ filter, onChange }: Props) {
  return (
    <section className="card search-filter" role="search" aria-label="Filter expenses">
      <label>
        Search
        <input
          type="search"
          value={filter.query}
          placeholder="Search descriptions"
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
        />
      </label>
      <label>
        Category filter
        <select value={filter.category} onChange={(e) => onChange({ ...filter, category: e.target.value })}>
          <option value={ALL_CATEGORIES}>All</option>
          {DEFAULT_CATEGORIES.map((c) => (
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
