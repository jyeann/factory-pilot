import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'

/** Value (`dd`) paired with the stat term (`dt`) of the given text. */
const statValue = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling

describe('MonthlySummary in App', () => {
  beforeEach(() => localStorage.clear())

  it('updates the summary when an expense is added for the current month', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText(/Nothing spent yet this month/)).toBeInTheDocument()

    const form = within(screen.getByRole('form', { name: 'Add an expense' }))
    await user.type(form.getByLabelText('Amount'), '12.50')
    await user.type(form.getByLabelText('Description'), 'Pizza')
    await user.click(form.getByRole('button', { name: 'Add' }))

    expect(statValue('Total spent')).toHaveTextContent('12.50')
    expect(statValue('Expenses')).toHaveTextContent('1')
  })
})
