import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Expense } from '../../types'
import { ExportCsvButton } from './ExportCsvButton'

const expenses: Expense[] = [
  { id: '1', amountCents: 1250, description: 'Pizza', category: 'food', date: '2026-11-01' },
]

describe('ExportCsvButton', () => {
  it('is disabled with an explanatory hint when there are no expenses', async () => {
    const user = userEvent.setup()
    const download = vi.fn()
    render(<ExportCsvButton expenses={[]} download={download} />)

    const button = screen.getByRole('button', { name: 'Export CSV' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Add an expense to enable export.')

    await user.click(button)
    expect(download).not.toHaveBeenCalled()
  })

  it.each([
    [1, '1 expense will be exported'],
    [2, '2 expenses will be exported'],
  ])('shows the count for %i expense(s)', (n, text) => {
    const list = Array.from({ length: n }, (_, i) => ({ ...expenses[0], id: String(i) }))
    render(<ExportCsvButton expenses={list} />)
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
  })

  it('downloads a dated CSV file when clicked', async () => {
    const user = userEvent.setup()
    const download = vi.fn()
    render(<ExportCsvButton expenses={expenses} download={download} now={() => new Date(2026, 10, 2)} />)

    await user.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith(
      'expenses-2026-11-02.csv',
      'date,description,category,amount\r\n2026-11-01,Pizza,Food,12.50\r\n',
    )
  })
})
