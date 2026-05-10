import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchForm from '@/components/SearchForm'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/components/LocationInput', () =>
  function MockLocationInput({ id, label, onChange }: {
    id: string; label: string; placeholder: string; onChange: (v: string) => void
  }) {
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input id={id} onChange={e => onChange(e.target.value)} />
      </div>
    )
  }
)

describe('SearchForm', () => {
  it('renders departure city and destination inputs', () => {
    render(<SearchForm />)
    expect(screen.getByLabelText(/出发城市/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/目的地/i)).toBeInTheDocument()
  })

  it('renders date, days and budget fields', () => {
    render(<SearchForm />)
    expect(screen.getByLabelText(/出发日期/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/旅行天数/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/总预算/i)).toBeInTheDocument()
  })

  it('submit button is disabled when fields are empty', () => {
    render(<SearchForm />)
    expect(screen.getByRole('button', { name: /浏览景点偏好/i })).toBeDisabled()
  })

  it('submit button enables when all fields filled', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.type(screen.getByLabelText(/出发城市/i), '上海')
    await user.type(screen.getByLabelText(/目的地/i), '京都')
    await user.type(screen.getByLabelText(/旅行天数/i), '5')
    await user.type(screen.getByLabelText(/总预算/i), '8000')
    await user.type(screen.getByLabelText(/出发日期/i), '2025-06-15')
    expect(screen.getByRole('button', { name: /浏览景点偏好/i })).toBeEnabled()
  })

  it('shows two action buttons (browse and direct)', () => {
    render(<SearchForm />)
    expect(screen.getByRole('button', { name: /浏览景点偏好/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /直接生成/i })).toBeInTheDocument()
  })
})
