import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchForm from '@/components/SearchForm'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('SearchForm', () => {
  it('renders all input fields', () => {
    render(<SearchForm />)
    expect(screen.getByPlaceholderText(/目的地/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/旅行天数/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/总预算/i)).toBeInTheDocument()
  })

  it('submit button is disabled when fields are empty', () => {
    render(<SearchForm />)
    expect(screen.getByRole('button', { name: /生成攻略/i })).toBeDisabled()
  })

  it('submit button enables when all fields filled', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.type(screen.getByPlaceholderText(/目的地/i), '京都')
    await user.type(screen.getByLabelText(/旅行天数/i), '5')
    await user.type(screen.getByLabelText(/总预算/i), '8000')
    const dateInput = screen.getByLabelText(/出发日期/i)
    await user.type(dateInput, '2025-06-15')
    expect(screen.getByRole('button', { name: /生成攻略/i })).toBeEnabled()
  })
})
