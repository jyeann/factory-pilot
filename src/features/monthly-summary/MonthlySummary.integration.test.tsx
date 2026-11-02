import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'

/** Value (`dd`) paired with the stat term (`dt`) of the given text. */
const statValue = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling

describe('MonthlySummary in App', () => {
  beforeEach(() => localStorage.clear())

  it('updates the summary when an expense is added for the current month', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('No expenses in this month.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Amount'), '12.50')
    await user.type(screen.getByLabelText('Description'), 'Pizza')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(statValue('Total spent')).toHaveTextContent('12.50')
    expect(statValue('Expenses')).toHaveTextContent('1')
  })
})
