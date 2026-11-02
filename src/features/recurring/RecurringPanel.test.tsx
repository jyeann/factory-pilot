import { StrictMode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Expense } from '../../types'
import { saveJson } from '../../lib/storage'
import { RECURRING_STORAGE_KEY, type RecurringRule } from './recurring'
import { RecurringPanel } from './RecurringPanel'

const now = new Date(2026, 10, 2) // 2026-11-02, a Monday

const storedRule = (overrides: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'r1',
  description: 'Rent',
  amountCents: 120000,
  category: 'housing',
  frequency: 'monthly',
  startDate: '2026-10-01',
  generatedThrough: null,
  ...overrides,
})

const storedRules = (): RecurringRule[] => JSON.parse(localStorage.getItem(RECURRING_STORAGE_KEY) ?? '[]')

async function openAndFill(user: ReturnType<typeof userEvent.setup>, fields: { description: string; amount: string; start?: string; repeats?: string }) {
  await user.click(screen.getByRole('button', { name: 'New rule' }))
  await user.type(screen.getByLabelText('Rule description'), fields.description)
  await user.type(screen.getByLabelText('Rule amount'), fields.amount)
  await user.selectOptions(screen.getByLabelText('Rule category'), 'housing')
  if (fields.repeats) await user.selectOptions(screen.getByLabelText('Repeats'), fields.repeats)
  if (fields.start) {
    await user.clear(screen.getByLabelText('Starts on'))
    await user.type(screen.getByLabelText('Starts on'), fields.start)
  }
}

describe('RecurringPanel', () => {
  it('shows an empty state with the add-rule form collapsed', () => {
    render(<RecurringPanel onGenerate={vi.fn()} now={now} />)
    expect(screen.getByRole('heading', { name: 'Repeating expenses' })).toBeInTheDocument()
    expect(screen.getByText(/add a rule/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New rule' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Rule description')).not.toBeInTheDocument()
  })

  it('generates due occurrences for stored rules once on mount, even in StrictMode', () => {
    saveJson(RECURRING_STORAGE_KEY, [storedRule()])
    const onGenerate = vi.fn<(expenses: Expense[]) => void>()
    render(
      <StrictMode>
        <RecurringPanel onGenerate={onGenerate} now={now} />
      </StrictMode>,
    )

    // StrictMode may repeat the effect; every call carries the same deterministic ids.
    const ids = new Set(onGenerate.mock.calls.flatMap(([list]) => list.map((e) => e.id)))
    expect(ids).toEqual(new Set(['rec:r1:2026-10-01', 'rec:r1:2026-11-01']))
    expect(storedRules()[0].generatedThrough).toBe('2026-11-01')
  })

  it('calls onGenerate exactly once without StrictMode', () => {
    saveJson(RECURRING_STORAGE_KEY, [storedRule()])
    const onGenerate = vi.fn()
    render(<RecurringPanel onGenerate={onGenerate} now={now} />)
    expect(onGenerate).toHaveBeenCalledTimes(1)
    expect(onGenerate.mock.calls[0][0].map((e: Expense) => e.date)).toEqual(['2026-10-01', '2026-11-01'])
  })

  it('does not call onGenerate when nothing is due', () => {
    saveJson(RECURRING_STORAGE_KEY, [storedRule({ generatedThrough: '2026-11-01' })])
    const onGenerate = vi.fn()
    render(<RecurringPanel onGenerate={onGenerate} now={now} />)
    expect(onGenerate).not.toHaveBeenCalled()
  })

  it('adds a rule, persists it and creates the occurrence due today', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    render(<RecurringPanel onGenerate={onGenerate} now={now} />)

    await openAndFill(user, { description: 'Rent', amount: '1200' })
    await user.click(screen.getByRole('button', { name: 'Add rule' }))

    expect(screen.getByText('Rent, $1,200.00 every month on the 2nd')).toBeInTheDocument()
    expect(screen.queryByLabelText('Rule description')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New rule' })).toHaveFocus()
    expect(onGenerate).toHaveBeenCalledTimes(1)
    expect(onGenerate.mock.calls[0][0]).toEqual([
      expect.objectContaining({ amountCents: 120000, description: 'Rent', category: 'housing', date: '2026-11-02' }),
    ])
    const [saved] = storedRules()
    expect(saved).toMatchObject({ description: 'Rent', frequency: 'monthly', startDate: '2026-11-02', generatedThrough: '2026-11-02' })
    expect(onGenerate.mock.calls[0][0][0]).toMatchObject({ id: `rec:${saved.id}:2026-11-02`, recurringId: saved.id })
  })

  it('backfills a weekly rule that started in the past', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    render(<RecurringPanel onGenerate={onGenerate} now={now} />)

    await openAndFill(user, { description: 'Gym', amount: '9.99', repeats: 'weekly', start: '2026-10-12' })
    await user.click(screen.getByRole('button', { name: 'Add rule' }))

    expect(screen.getByText('Gym, $9.99 every week on Monday')).toBeInTheDocument()
    expect(onGenerate).toHaveBeenCalledTimes(1)
    expect(onGenerate.mock.calls[0][0].map((e: Expense) => e.date)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'])
  })

  it('does not generate for a rule starting in the future', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    render(<RecurringPanel onGenerate={onGenerate} now={now} />)

    await openAndFill(user, { description: 'Insurance', amount: '50', start: '2026-12-15' })
    await user.click(screen.getByRole('button', { name: 'Add rule' }))

    expect(onGenerate).not.toHaveBeenCalled()
    expect(screen.getByText(/next on/)).toBeInTheDocument()
  })

  it('shows validation errors and keeps the form open', async () => {
    const user = userEvent.setup()
    render(<RecurringPanel onGenerate={vi.fn()} now={now} />)
    await user.click(screen.getByRole('button', { name: 'New rule' }))

    await user.click(screen.getByRole('button', { name: 'Add rule' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/description/i)

    await user.type(screen.getByLabelText('Rule description'), 'Rent')
    await user.type(screen.getByLabelText('Rule amount'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Add rule' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/amount/i)
    expect(storedRules()).toEqual([])
  })

  it('cancel collapses the form and returns focus to the toggle', async () => {
    const user = userEvent.setup()
    render(<RecurringPanel onGenerate={vi.fn()} now={now} />)
    await user.click(screen.getByRole('button', { name: 'New rule' }))
    expect(screen.getByLabelText('Rule description')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('Rule description')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New rule' })).toHaveFocus()
  })

  it('deleting a rule keeps created expenses and does not regenerate on remount', async () => {
    saveJson(RECURRING_STORAGE_KEY, [storedRule()])
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    const { unmount } = render(<RecurringPanel onGenerate={onGenerate} now={now} />)
    expect(onGenerate).toHaveBeenCalledTimes(1)

    const list = screen.getByRole('list')
    expect(within(list).getByText(/Rent/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete rule Rent' }))

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(storedRules()).toEqual([])
    unmount()

    render(<RecurringPanel onGenerate={onGenerate} now={now} />)
    expect(onGenerate).toHaveBeenCalledTimes(1)
  })

  it('does not recreate an occurrence after remount (generatedThrough persisted)', () => {
    saveJson(RECURRING_STORAGE_KEY, [storedRule()])
    const onGenerate = vi.fn()
    const { unmount } = render(<RecurringPanel onGenerate={onGenerate} now={now} />)
    unmount()
    render(<RecurringPanel onGenerate={onGenerate} now={now} />)
    expect(onGenerate).toHaveBeenCalledTimes(1)
  })

  it('never uses the app-level names Amount, Description, Add, Total or Undo', async () => {
    const user = userEvent.setup()
    render(<RecurringPanel onGenerate={vi.fn()} now={now} />)
    await user.click(screen.getByRole('button', { name: 'New rule' }))
    for (const name of ['Amount', 'Description', 'Add', 'Total', 'Undo']) {
      expect(screen.queryByRole('textbox', { name })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })
})
