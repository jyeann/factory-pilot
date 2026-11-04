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

---

# Round 2 (done): edit, budgets, recurring

Plan: `plans/round-2-edit-budgets-recurring.md`. The plan was contract-first: a foundation PR
landed every shared change plus stub components, then three agents worked in parallel.

| Step | PR | Result |
|---|---|---|
| 0 Foundation & contracts | #6 | Orchestrator; 122 tests |
| 1 Edit expenses | #8 | Agent, ~6 min, $1.59 |
| 2 Category budgets | #7 | Agent, ~5 min, $1.61 |
| 3 Recurring expenses | #9 | Agent, ~7 min, $2.48 |
| 4 Integrate & verify | — | 198 tests; browser cross-checks passed |

- **Merge conflicts: none** (round 1: all 4 PRs conflicted in `App.tsx`). Each feature PR
  changed only files in its own folder.
- The adversarial plan review caught 12 issues before any code was written (duplicate
  accessible names breaking App tests, 31st-of-month drift, regenerating deleted
  occurrences, the Escape key leaving the dialog stuck).
- Known limitations: the budget panel always shows the current month (not the summary's
  picked month); budget month and recurring generation don't roll over at midnight
  while the app stays open.

---

# Round 3 (done): trends, CSV import, custom categories (+ fix-ups, CI)

Plan: `plans/round-3-trends-import-categories.md` (adversarial review: 17 issues fixed
before coding).

| Step | PR | Result |
|---|---|---|
| 0 Foundation: category store, fix-ups, CI | #10 | Orchestrator; 216 tests; first CI run green |
| 1 Spending trends | #11 | Agent, CI green, $4.32 final |
| 2 CSV import | #13 | Agent, CI green, $6.68 final |
| 3 Custom categories | #12 | Agent, CI green, $3.80 final |
| 4 Integrate & verify | — | 340 tests; browser cross-checks passed |

- Merge conflicts: none again; each PR changed only its own folder.
- Browser checks: a new category appears in the add form, filter, budgets, hero and
  chart; export → import into the same data adds 0 (13 duplicates), into an empty app
  adds 13; deleting a category moves its expenses to Other; budgets follow the picked
  month.
- Lesson: agents scheduled their own follow-up check-ins after their PRs were green,
  which roughly doubled their cost (~$9 at hand-off → $14.80 final). Next time: tell
  workers to finish once CI is green and not schedule follow-ups.

## Cost across the pilot
| | Workers | Notes |
|---|---|---|
| Round 1 (4 features) | $4.34 | 4 conflicts, merged by hand |
| Round 2 (3 features) | $5.68 | 0 conflicts |
| Round 3 (3 features) | $14.80 | 0 conflicts; includes self-scheduled follow-ups |
| Orchestrator session | $24.24 | setup, base app, redesign, 3 foundations, reviews, merges |
| **Total** | **≈ $49** | 10 features + redesign + CI |
