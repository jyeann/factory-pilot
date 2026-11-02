import { useId, useMemo, useState } from 'react'
import type { Expense } from '../../types'
import { categoryColor, categoryLabel, useCategories } from '../../lib/categories'
import { formatCents } from '../../lib/money'
import { formatMonthLabel, formatShortMonth } from '../../lib/months'
import { categoriesInUse, hasTrend, monthlyTotals, trendSummary, type MonthTotal } from './trends'
import './trends.css'

export interface TrendsPanelProps {
  /** All expenses. */
  expenses: Expense[]
  /** Today as `YYYY-MM-DD` (from `useToday`); the chart ends with this month. */
  today: string
}

// Chart geometry in viewBox units; the SVG scales to its container.
const CHART_WIDTH = 320
const CHART_HEIGHT = 150
const TOP_PAD = 6
const LABEL_SPACE = 22
const PLOT_BOTTOM = CHART_HEIGHT - LABEL_SPACE
const PLOT_HEIGHT = PLOT_BOTTOM - TOP_PAD
const BAR_WIDTH_RATIO = 0.56
const BAR_RADIUS = 5

interface ChartProps {
  totals: readonly MonthTotal[]
  categories: readonly string[]
  idPrefix: string
  describedBy: string
}

function TrendsChart({ totals, categories, idPrefix, describedBy }: ChartProps) {
  const max = Math.max(...totals.map((t) => t.totalCents), 1)
  const slot = CHART_WIDTH / totals.length
  const barWidth = slot * BAR_WIDTH_RATIO
  const first = formatMonthLabel(totals[0].month)
  const last = formatMonthLabel(totals[totals.length - 1].month)

  return (
    <svg
      className="trends-chart"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label={`Spending per month from ${first} to ${last}, stacked by category`}
      aria-describedby={describedBy}
    >
      {totals.map((t, i) => {
        const isCurrent = i === totals.length - 1
        const x = i * slot + (slot - barWidth) / 2
        const barHeight = (t.totalCents / max) * PLOT_HEIGHT
        const clipId = `${idPrefix}-col-${i}`
        let y = PLOT_BOTTOM
        return (
          <g key={t.month} className={`trend-column${isCurrent ? ' trend-current' : ''}`} data-month={t.month}>
            <title>{`${formatMonthLabel(t.month)}: ${formatCents(t.totalCents)}`}</title>
            {isCurrent && <rect className="trend-highlight" x={i * slot + 2} y={0} width={slot - 4} height={CHART_HEIGHT} rx={10} />}
            <clipPath id={clipId}>
              <rect x={x} y={PLOT_BOTTOM - barHeight} width={barWidth} height={barHeight} rx={BAR_RADIUS} />
            </clipPath>
            <g clipPath={`url(#${clipId})`}>
              {categories.map((id) => {
                const cents = t.byCategory[id]
                if (!cents) return null
                const h = (cents / max) * PLOT_HEIGHT
                y -= h
                return <rect key={id} className="trend-segment" x={x} y={y} width={barWidth} height={h} style={{ fill: categoryColor(id) }} />
              })}
            </g>
            <text className="trend-label" x={i * slot + slot / 2} y={CHART_HEIGHT - 6} textAnchor="middle">
              {formatShortMonth(t.month)}
            </text>
          </g>
        )
      })}
      <line className="trend-baseline" x1={0} x2={CHART_WIDTH} y1={PLOT_BOTTOM} y2={PLOT_BOTTOM} />
    </svg>
  )
}

function TrendsLegend({ categories }: { categories: readonly string[] }) {
  return (
    <ul className="trends-legend" aria-label="Chart key">
      {categories.map((id) => (
        <li key={id}>
          <span className="cat-dot" aria-hidden="true" style={{ background: categoryColor(id) }} />
          {categoryLabel(id)}
        </li>
      ))}
    </ul>
  )
}

function TrendsTable({ id, totals, categories }: { id: string; totals: readonly MonthTotal[]; categories: readonly string[] }) {
  return (
    <div id={id} className="trends-table-wrap" role="region" aria-label="Monthly figures" tabIndex={0}>
      <table className="trends-table">
        <caption className="visually-hidden">Spending by month and category</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {categories.map((c) => (
              <th key={c} scope="col">
                {categoryLabel(c)}
              </th>
            ))}
            <th scope="col">Spent</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t, i) => (
            <tr key={t.month} className={i === totals.length - 1 ? 'trend-current' : undefined}>
              <th scope="row">{formatMonthLabel(t.month)}</th>
              {categories.map((c) => (
                <td key={c} className="amount">
                  {formatCents(t.byCategory[c] ?? 0)}
                </td>
              ))}
              <td className="amount trends-month-total">{formatCents(t.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Stacked monthly spending for the last six months, with a text summary and a data table. */
export function TrendsPanel({ expenses, today }: TrendsPanelProps) {
  const [showNumbers, setShowNumbers] = useState(false)
  const baseId = useId()
  const idPrefix = `trends${baseId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const titleId = `${idPrefix}-title`
  const tableId = `${idPrefix}-table`
  const summaryId = `${idPrefix}-summary`

  // Subscribing makes renames and recolours redraw the chart.
  const storeCategories = useCategories()
  const totals = useMemo(() => monthlyTotals(expenses, today), [expenses, today])
  const ready = hasTrend(totals)
  // storeCategories is a dependency so a store change re-orders the stacks.
  const categories = useMemo(() => (ready && storeCategories ? categoriesInUse(totals) : []), [ready, totals, storeCategories])

  return (
    <section className="trends" aria-labelledby={titleId}>
      <div className="trends-header">
        <h2 id={titleId}>Spending trends</h2>
        {ready && (
          <button
            type="button"
            className="ghost"
            aria-expanded={showNumbers}
            aria-controls={showNumbers ? tableId : undefined}
            onClick={() => setShowNumbers((v) => !v)}
          >
            Show numbers
          </button>
        )}
      </div>

      {ready ? (
        <>
          <p id={summaryId} className="trends-summary">{trendSummary(totals)}</p>
          <TrendsChart totals={totals} categories={categories} idPrefix={idPrefix} describedBy={summaryId} />
          <TrendsLegend categories={categories} />
          {showNumbers && <TrendsTable id={tableId} totals={totals} categories={categories} />}
        </>
      ) : (
        <p className="muted small trends-empty">Trends show up once you've spent in at least two of the last six months.</p>
      )}
    </section>
  )
}
