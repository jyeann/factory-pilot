# Expense Tracker (factory pilot)

Small React 19 + TypeScript + Vite app. Data lives in `localStorage`, no backend.
This repo is used to pilot a "factory": several agent sessions work in parallel,
each on ONE feature from `FACTORY.md`, each opening its own PR.

## Commands
- `npm install` then `npm test` (Vitest + Testing Library), `npm run build`, `npm run lint`
- All three must pass before you open a PR.

## Layout
- `src/types.ts` — `Expense` model. Amounts are integer **cents** (`amountCents`).
- `src/lib/` — pure helpers (money, categories, expenses, storage). No React here.
- `src/useExpenses.ts` — the single state hook; persists to localStorage.
- `src/components/` — base UI (form, list).
- `src/features/<feature-name>/` — **new features go here**, one folder each,
  with their own components, helpers and tests.
- `src/App.tsx` — composes everything. Has `FEATURE SLOT` comments.

## Rules for factory agents
1. Work only on your assigned feature. Put new code in `src/features/<feature-name>/`.
2. Touch shared files as little as possible. In `App.tsx`, add your import and
   render your component at the matching `FEATURE SLOT` — don't restructure it.
   Don't edit `types.ts`, `useExpenses.ts` or `lib/` unless your task says so;
   if you must, keep the change additive (new exports, no renames).
3. No new runtime dependencies unless the task allows it. Prefer plain SVG/CSS.
4. Write tests for your feature (colocated `*.test.ts(x)`). Keep existing tests green.
5. Styles: reuse the CSS variables in `src/index.css`. Feature-specific CSS goes in
   a CSS file inside your feature folder, imported by your component.
6. Accessible by default: labelled inputs, buttons with names, keyboard usable.
7. Branch name: `feature/<feature-name>`. Commit messages: conventional commits.
8. Finish by opening a PR against `main` describing what changed and how you tested it.
