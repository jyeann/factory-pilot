import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Expense } from '../../types'
import { mergeExpenses } from '../../lib/expenses'
import { buildExpensesCsv } from '../csv-export/csv'
import { ImportCsvButton } from './ImportCsvButton'

const HEADER = 'date,description,category,amount\r\n'

function csvFile(text: string, name = 'expenses.csv') {
  return new File([text], name, { type: 'text/csv' })
}

/** Behaves like App: onImport merges into state, which flows back as `expenses`. */
function Harness({ initial = [], onImport }: { initial?: Expense[]; onImport?: (e: Expense[]) => void }) {
  const [expenses, setExpenses] = useState(initial)
  return (
    <>
      <ImportCsvButton
        expenses={expenses}
        onImport={(incoming) => {
          onImport?.(incoming)
          setExpenses((list) => mergeExpenses(list, incoming))
        }}
      />
      <p data-testid="count">{expenses.length}</p>
    </>
  )
}

function setup(props: Parameters<typeof Harness>[0] = {}) {
  const user = userEvent.setup()
  const onImport = vi.fn<(e: Expense[]) => void>()
  render(<Harness onImport={onImport} {...props} />)
  const upload = async (text: string, name?: string) => {
    await user.upload(screen.getByLabelText('CSV file to import'), csvFile(text, name))
    return screen.findByRole('dialog', { name: 'Import expenses' })
  }
  return { user, onImport, upload, count: () => screen.getByTestId('count').textContent }
}

describe('ImportCsvButton', () => {
  it('shows an "Import CSV" button and no dialog or status region by default', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('opens the file picker from the button and only accepts CSV', async () => {
    const { user } = setup()
    const input = screen.getByLabelText<HTMLInputElement>('CSV file to import')
    const clicked = vi.fn()
    input.addEventListener('click', clicked)
    await user.click(screen.getByRole('button', { name: 'Import CSV' }))
    expect(clicked).toHaveBeenCalled()
    expect(input).toHaveAttribute('accept', '.csv,text/csv')
  })

  it('previews counts and the first 5 rows, then imports and confirms inside the dialog', async () => {
    const stored: Expense = { id: 's', date: '2025-01-01', description: 'Row 1', category: 'food', amountCents: 100 }
    const rows = Array.from({ length: 7 }, (_, i) => `2025-01-01,Row ${i + 1},Food,1\r\n`).join('')
    const { user, onImport, upload, count } = setup({ initial: [stored] })
    const dialog = await upload(`${HEADER}${rows}2025-01-02,Broken,Food,abc\r\n`, 'january.csv')
    const inDialog = within(dialog)

    expect(inDialog.getByText('january.csv')).toBeInTheDocument()
    const summary = inDialog.getByRole('list', { name: 'Summary' })
    expect(summary).toHaveTextContent('6 new')
    expect(summary).toHaveTextContent('1 duplicate')
    expect(summary).toHaveTextContent('1 invalid')
    expect(inDialog.getAllByRole('row')).toHaveLength(1 + 5)
    expect(inDialog.getByText("Row 9: amount 'abc' isn't a number")).toBeInTheDocument()

    await user.click(inDialog.getByRole('button', { name: 'Import 6 expenses' }))
    expect(onImport).toHaveBeenCalledTimes(1)
    expect(onImport.mock.calls[0][0]).toHaveLength(6)
    expect(count()).toBe('7')
    expect(inDialog.getByRole('status')).toHaveTextContent('Imported 6 expenses')
    expect(inDialog.queryByRole('button', { name: /^Import \d/ })).not.toBeInTheDocument()

    await user.click(inDialog.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows unknown categories going to Other', async () => {
    const { upload } = setup()
    const dialog = await upload(`${HEADER}2025-01-01,A,Groceries,1\r\n2025-01-01,B,Gym,1\r\n2025-01-01,C,Gym,2\r\n`)
    expect(within(dialog).getByText(/3 rows → Other/)).toHaveTextContent('(unknown: Groceries, Gym)')
  })

  it('asks for the date format when slash dates are ambiguous', async () => {
    const { user, onImport, upload } = setup()
    const dialog = await upload(`${HEADER}03/04/2025,Coffee,Food,3\r\n`)
    const inDialog = within(dialog)
    const importButton = inDialog.getByRole('button', { name: 'Import 0 expenses' })
    expect(importButton).toBeDisabled()

    await user.selectOptions(inDialog.getByLabelText('Date format'), 'mdy')
    expect(inDialog.getByRole('cell', { name: '2025-03-04' })).toBeInTheDocument()
    await user.selectOptions(inDialog.getByLabelText('Date format'), 'dmy')
    await user.click(inDialog.getByRole('button', { name: 'Import 1 expense' }))
    expect(onImport.mock.calls[0][0][0].date).toBe('2025-04-03')
  })

  it('does not ask when the file shows its date format', async () => {
    const { upload } = setup()
    const dialog = await upload(`${HEADER}03/04/2025,Coffee,Food,3\r\n25/04/2025,Tea,Food,2\r\n`)
    expect(within(dialog).queryByLabelText('Date format')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('cell', { name: '2025-04-03' })).toBeInTheDocument()
  })

  it.each([
    ['mixed date formats', `${HEADER}13/04/2025,A,Food,1\r\n04/13/2025,B,Food,1\r\n`, /Use one format for the whole file/],
    ['missing columns', 'when,what\r\n2025-01-01,x\r\n', /Missing: date, description, amount/],
    ['an unclosed quote', `${HEADER}2025-01-01,"Oops,Food,1\r\n`, /Row 2: a quoted value is never closed/],
  ])('explains a file that cannot be imported: %s', async (_name, text, message) => {
    const { user, onImport, upload } = setup()
    const dialog = await upload(text)
    expect(within(dialog).getByRole('alert')).toHaveTextContent(message)
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onImport).not.toHaveBeenCalled()
  })

  it('refuses files over 5 MB without reading them', async () => {
    const { upload } = setup()
    const dialog = await upload('x'.repeat(5 * 1024 * 1024 + 1))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('too big')
  })

  it('cancels without importing, and Escape closes the dialog', async () => {
    const { user, onImport, upload } = setup()
    let dialog = await upload(`${HEADER}2025-01-01,Coffee,Food,3\r\n`)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    dialog = await upload(`${HEADER}2025-01-01,Coffee,Food,3\r\n`)
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onImport).not.toHaveBeenCalled()
  })

  it('re-importing the same exported file adds nothing', async () => {
    const existing: Expense[] = [
      { id: 'a', date: '2025-02-01', description: 'Rent', category: 'housing', amountCents: 90000 },
      { id: 'b', date: '2025-02-02', description: '=cheeky', category: 'food', amountCents: 450 },
    ]
    const csv = '﻿' + buildExpensesCsv(existing)
    const { user, upload, count } = setup()

    let dialog = await upload(csv)
    await user.click(within(dialog).getByRole('button', { name: 'Import 2 expenses' }))
    expect(count()).toBe('2')
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))

    dialog = await upload(csv)
    expect(within(dialog).getByRole('list', { name: 'Summary' })).toHaveTextContent('2 duplicates')
    expect(within(dialog).getByRole('button', { name: 'Import 0 expenses' })).toBeDisabled()
    expect(count()).toBe('2')
  })
})
