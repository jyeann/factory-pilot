import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { STORAGE_KEY } from '../../lib/storage'

describe('Categories in the App', () => {
  it('deleting a category moves its expenses to the chosen one', async () => {
    const user = userEvent.setup()
    render(<App />)
    const addForm = within(screen.getByRole('form', { name: 'Add an expense' }))
    await user.type(addForm.getByLabelText('Amount'), '9')
    await user.type(addForm.getByLabelText('Description'), 'Lunch')
    await user.selectOptions(addForm.getByLabelText('Category'), 'food')
    await user.click(addForm.getByRole('button', { name: 'Add' }))

    const panel = within(screen.getByRole('region', { name: 'Categories' }))
    await user.click(panel.getByRole('button', { name: 'Manage categories' }))
    await user.click(panel.getByRole('button', { name: 'Delete category Food' }))
    await user.click(panel.getByRole('button', { name: 'Move and delete' }))

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    expect(stored).toEqual([expect.objectContaining({ description: 'Lunch', category: 'other' })])
  })
})
