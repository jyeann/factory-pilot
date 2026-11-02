# Blueprint: Round 3 — trends, CSV import, custom categories (+ fix-ups, CI)

- **Repo:** `jyeann/factory-pilot` (React 19 + TS + Vite, localStorage, Vitest)
- **Objective:** (a) spending trends chart, (b) CSV import, (c) custom categories,
  plus the round 2 fix-ups and GitHub CI. Same contract-first approach as round 2.
- **Status:** draft v2 (after adversarial review) — see "Review log".

## Strategy

Custom categories and the fix-ups change code used by almost every feature (category
lists, colours, the selected month). Doing those in parallel would collide, so **Step 0
does all shared work**: a category store that every consumer reads, the lifted month
state, midnight roll-over, the layout change, CI, and stubs for the three new features.
Steps 1–3 then each change only their own `src/features/<name>/` folder.

```
Step 0 (foundation + fix-ups + CI, serial) ──┬── Step 1 trends ──────────┐
                                             ├── Step 2 csv-import ──────┼── Step 4 integrate + verify
                                             └── Step 3 categories UI ───┘
```

| Step | Branch | Depends on | Parallel with | Executor |
|---|---|---|---|---|
| 0 Foundation, fix-ups, CI | `feature/r3-foundation` | — | — | orchestrator |
| 1 Spending trends | `feature/trends` | 0 | 2, 3 | agent |
| 2 CSV import | `feature/csv-import` | 0 | 1, 3 | agent |
| 3 Custom categories UI | `feature/categories` | 0 | 1, 2 | agent |
| 4 Integrate & verify | `main` | 1–3 | — | orchestrator |

### Invariants (every step)
1. `npm test`, `npm run build`, `npm run lint` pass locally **and** the GitHub CI check
   on the PR is green.
2. Steps 1–3 change only files under their own `src/features/<name>/`. Anything else in
   the diff = plan violation; stop and report.
3. Existing localStorage data keeps loading; no key renames; new fields optional.
4. Integer cents; local `YYYY-MM-DD` dates via `src/lib/dates.ts` (never `new Date('YYYY-MM-DD')`).
5. Design tokens from `src/index.css`; no new runtime dependencies.
6. Never use the exact accessible names "Amount", "Description", "Add", "Total", "Undo",
   "Category", "Date" for feature inputs/buttons (App tests use them).
7. Categories: always read them through `useCategories()` (components) or
   `getCategories()` / `categoryLabel()` / `categoryColor()` (plain code). Never import a
   fixed list for display or pickers.

---

## Step 0 — Foundation, fix-ups, CI (orchestrator)

**Category store** (`src/lib/categories.ts`, keeps existing exports working):
1. `Category = { id, label, color?: PaletteKey, archived?: true }`. Colours are palette
   keys (`CATEGORY_PALETTE` = `p1`…`p10`, theme-aware `--cat-p*` tokens in all three theme
   blocks of `index.css`), never raw hex. Built-ins keep `--cat-<id>` unless recoloured.
   `other` can't be deleted (it's the fallback).
2. Store persisted under `factory-pilot.categories.v1` with `loadJson/saveJson`; first run
   = built-ins. Functions: `getCategories()`, `subscribeCategories(fn)`,
   `addCategory(label, color) → Category` (id from a slug of the label, made unique),
   `renameCategory(id, label)`, `recolorCategory(id, color)`, `removeCategory(id)`
   **archives** instead of deleting (hidden from pickers; labels/colours still resolve, so
   old expenses, rules and budgets keep working) and refuses `other`;
   `resetCategoriesForTests()`. New ids are unique against archived ids too; an empty
   slug (e.g. "日本") becomes `c-<n>`. The store loads lazily on first read and returns
   the **same frozen array** until a change (required by `useSyncExternalStore`).
   `test-setup.ts` calls `resetCategoriesForTests()` after `localStorage.clear()`.
3. `useCategories()` hook via `useSyncExternalStore`. `categoryLabel(id)` and
   `categoryColor(id)` read the current store (unknown id → its id / `other` colour).
   `DEFAULT_CATEGORIES` stays exported but only as the built-in seed.
4. Migrate every picker/display (form, filter, list, budgets, recurring, monthly summary,
   CSV export) to the store. `App` calls `useCategories()` so a rename re-renders all.
   Fallbacks for deleted categories: the add form and add-rule form fall back to the first
   active category; the edit form keeps an expense's deleted category as a "(deleted)"
   option; the filter falls back to "All". Budgets list active categories in store order.
5. `useExpenses` gains `reassignCategory(fromId, toId)`; budgets drop entries for removed
   categories at read time (unknown ids are ignored).

**Fix-ups**
6. Lift the selected month to `App`: `MonthlySummary` gets optional `month` /
   `onMonthChange` (uncontrolled fallback keeps its tests); `App` keeps
   `pickedMonth: string | null` (null = follow today, so midnight needs no effect).
   `BudgetsPanel` gains an optional `month` prop. Existing `now?: Date` props stay; App
   passes a memoised `parseIsoDate(today)`.
6b. Month helpers move to `src/lib/months.ts` (`currentMonth`, `shiftMonth`,
   `monthRange`, `formatMonthLabel`, `formatShortMonth`, `monthOfIso`); monthly-summary
   re-exports them.
7. `useToday()` hook (`src/lib/useToday.ts`): today's ISO date; timer to next local
   midnight + 1 s, cleared on cleanup; re-checks on `visibilitychange`/`focus`. Tests fake
   only `Date` (`vi.useFakeTimers({ toFake: ['Date'] })`) so `user-event` keeps working.
8. Mobile layout: the add form comes right after the hero; budgets and recurring move
   below it. Same order on desktop.

**CI**
9. `.github/workflows/ci.yml`: on push to `main` and on pull requests — Node 22,
   `npm ci`, `npm run lint`, `npm test`, `npm run build` (pushing it worked without extra
   token scopes). ESLint ignores `.claude/`.
9b. App's toast region is `role="status"` named "Notifications"; App tests query it by name.

**Stubs + contracts** (each `<Name>.tsx` rendering `null` + `index.ts` barrel)
10. `features/trends/TrendsPanel.tsx` — `{ expenses: Expense[]; today: string }`
11. `features/csv-import/ImportCsvButton.tsx` — `{ expenses: Expense[]; onImport: (expenses: Expense[]) => void }`
    (App passes `addMany`; **one** mount point: the toolbar, which is always shown —
    Import is visible even with no expenses)
12. `features/categories/CategoriesPanel.tsx` — `{ expenses: Expense[]; onReassign: (fromId: string, toId: string) => void }`
13. `CLAUDE.md` "Round 3" rules; tests for the store, hook, reassign, month lifting,
    `useToday` (fake timers).

**Verify:** invariants 1, 3; UI unchanged except layout order and budgets following the
picked month. **Exit:** PR merged (user approves). **Rollback:** revert merge.

---

## Step 1 — Spending trends (agent)

**Context.** `App` renders `<TrendsPanel expenses today />` below the budgets panel.
Implement inside `src/features/trends/` only.

**Tasks**
1. Use `src/lib/months.ts` (`monthRange`, `formatShortMonth`). Pure `monthlyTotals(expenses, today, months = 6)` → oldest→newest
   `{ month: 'YYYY-MM', totalCents, byCategory: Record<id, cents> }`, including empty months.
2. Chart: plain SVG stacked columns (one per month, segments in `categoryColor`),
   month labels ("Jun", "Jul"…), the current month highlighted. Responsive (viewBox),
   readable at 390px.
3. Text summary for everyone (and screen readers): "This month $1,011.50, 12% less than
   last month" (handle zero last month: "first month with spending").
4. An accessible data table (visually hidden or toggled "Show numbers") with the same data.
5. Empty state when fewer than 2 months have spending. Heading "Spending trends".
6. Tests: totals math incl. empty months and year boundary; percent change incl. zero;
   chart renders one column per month; table matches data.

## Step 2 — CSV import (agent)

**Context.** `App` renders `<ImportCsvButton onImport={addMany} />`. `addMany` skips ids
already present. Implement inside `src/features/csv-import/` only.

**Tasks**
1. Button "Import CSV" opens a file picker (`.csv`); read with `File.text()`.
2. Parser (own code, RFC 4180: quotes, escaped quotes, CRLF/LF, BOM) → rows.
3. Column mapping: auto-detect headers `date`, `description`, `category`, `amount`
   (case-insensitive; also matches our own Export format). Undo our export: strip the
   UTF-8 BOM, handle CRLF, and remove the leading `'` that export adds before `= + - @`
   tab/CR. Dates: `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, detected **per file**: any
   first part > 12 → DD/MM; any second part > 12 → MM/DD; both → error; neither → ask with
   a select "Date format". Reject impossible dates (round-trip via `parseIsoDate`/`toIsoDate`).
   Amounts: "12.50", "$12.50", "1,234.50"; negative or zero rows are skipped as invalid.
4. Category: match by label or id (case-insensitive) against `getCategories()`; unknown →
   `other`, shown in the preview ("3 rows → Other").
5. Preview dialog (native `<dialog>`, reuse edit-dialog patterns): counts of valid /
   invalid / duplicate rows, first 5 rows, "Import N expenses" button, and an
   "Imported N expenses" message inside the dialog afterwards (no new page-level status
   region). Duplicates are counted as a **multiset** of (date, description, amount): if
   the file has 2 identical coffees and 1 is already stored, 1 is added.
6. Imported ids: `imp:<fnv1a(date|description|amountCents)>:<k>` where `k` is the
   occurrence index of that tuple within the file (not the row number); FNV-1a written in
   the feature folder (synchronous). Re-importing the same file adds nothing.
7. Accessible errors ("Row 4: amount 'abc' isn't a number"). Max 5,000 rows.
8. Tests: parser edge cases, date formats, amount formats, category mapping, duplicate
   detection, re-import idempotency, our own Export → Import round-trip.

## Step 3 — Custom categories UI (agent)

**Context.** The store and every consumer already exist (Step 0). `App` renders
`<CategoriesPanel expenses onReassign />`. Implement the management UI inside
`src/features/categories/` only, calling the store functions.

**Tasks**
1. Collapsed sheet "Categories" with a "Manage categories" toggle (like Budgets).
2. List each category: colour swatch, label, expense count. Rename inline
   ("Rename Food"), recolour from a palette of 10 accessible swatches that work on both
   themes (radio group "Colour for Food"), delete ("Delete category Food").
3. Add: "New category name" + colour + "Add category". Validation: non-empty, ≤ 24 chars,
   unique (case-insensitive).
4. Delete: if the category has expenses, ask where they go (select "Move expenses to",
   default Other) then call `onReassign(from, to)` before `removeCategory`. `other` has
   no delete button.
5. Recolour uses `CATEGORY_PALETTE` keys only. Labels: the rename input is labelled
   "Name for <Category>"; buttons "Delete category <Category>", "Add category".
6. Tests: mostly component + store level (add/rename/recolour/delete; uniqueness; reassign
   called with right ids; `other` protected). At most one App-level check, scoped with
   `within(...)`. The foundation already tests that pickers update.

## Step 4 — Integrate & verify (orchestrator)
1. Check scope (own folder only) and CI green on each PR; merge in any order.
2. Browser: create a category → use it in add form, budgets, recurring, filter, chart;
   import our own exported CSV twice (second time adds 0); delete a category with
   expenses → moved; trends with recurring rent; budgets follow the picked month;
   390px mobile + dark mode.
3. Rebuild (`base: './'`), republish the test site, record results in `FACTORY.md`,
   archive the worker sessions.

## Plan mutation protocol
Same as round 2: split steps over ~500 changed lines; agents never edit shared files —
if a contract is missing they stop and report, and the orchestrator patches Step 0.

## Review log
- **v1 → v2** (adversarial review: 4 critical, 7 high, 6 medium — all applied): import gets
  `expenses` for duplicate checks and a single mount point; store loads lazily, returns
  stable frozen snapshots and resets between tests; delete = archive (rules, budgets and old
  expenses keep resolving; ids never reused; forms/filter fall back); import id = FNV-1a +
  occurrence index with multiset dedup; theme-aware palette keys instead of hex; optional
  controlled month with `pickedMonth = null` meaning "follow today"; `useToday` timer,
  wake checks and Date-only fake timers; named toast status region; import undoes our
  export (BOM, CRLF, `'` prefix) and detects date format per file; month helpers moved to
  `lib/months.ts`; ESLint ignores `.claude`; App-level test scoping and reserved names.
