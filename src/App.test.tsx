import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('adds and deletes an expense', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Amount'), '12.50')
    await user.type(screen.getByLabelText('Description'), 'Pizza')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByLabelText('Total')).toHaveTextContent('12.50')

    await user.click(screen.getByRole('button', { name: 'Delete Pizza' }))
    expect(screen.queryByText('Pizza')).not.toBeInTheDocument()
  })

  it('shows a validation error for a bad amount', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Description'), 'Pizza')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toHaveTextContent('amount')
  })
})
