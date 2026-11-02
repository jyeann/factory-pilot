# Factory task board

Each task is sized for one agent session and one PR. Tasks are independent, so
they can run in parallel. Read `CLAUDE.md` first.

## 1. monthly-summary
Add a "This month" summary card at the summaries `FEATURE SLOT`.
- Month picker (default: current month; previous/next buttons).
- Total spent in the month, number of expenses, and a per-category breakdown.
- Horizontal bar chart of spending by category, plain SVG or CSS, no chart library.
- Empty state when the month has no expenses.
- Pure helpers (e.g. `expensesInMonth`, `totalsByCategory`) with unit tests.

## 2. csv-export
Add an "Export CSV" button at the export/tools `FEATURE SLOT`.
- Columns: date, description, category (label), amount (decimal, e.g. 12.50).
- Proper CSV escaping (commas, quotes, newlines in descriptions).
- Downloads `expenses-YYYY-MM-DD.csv`. Disabled when there are no expenses.
- Unit tests for the CSV builder, including escaping.

## 3. search-filter
Let users narrow the expense list.
- Text search on description (case-insensitive) and a category dropdown ("All" default).
- The list and its total reflect the filters; show "No matches" when empty.
- Put the filter UI and `filterExpenses` helper in `src/features/search-filter/`.
  In `App.tsx`, filter the expenses before passing them to `ExpenseList`.
- Tests for the helper and one UI test.

## 4. dark-mode
Add a light/dark theme toggle in the header.
- Default follows the OS (`prefers-color-scheme`); the toggle overrides it and is
  remembered in localStorage.
- Define dark values for the existing CSS variables in `src/index.css`.
- Toggle is a real button with an accessible name that reflects the current state.
- Test that toggling switches the theme and persists.
