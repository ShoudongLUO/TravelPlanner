import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationInput from '@/components/LocationInput'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({ results: [] }),
}) as jest.Mock

describe('LocationInput', () => {
  const defaultProps = {
    id: 'test-location',
    label: '📍 测试地点',
    placeholder: '输入城市',
    value: '',
    onChange: jest.fn(),
  }

  it('renders label and input', () => {
    render(<LocationInput {...defaultProps} />)
    expect(screen.getByLabelText(/测试地点/i)).toBeInTheDocument()
  })

  it('calls onChange when typing', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<LocationInput {...defaultProps} onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), '上')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows local city suggestions when typing', async () => {
    const user = userEvent.setup()
    render(<LocationInput {...defaultProps} />)
    await user.type(screen.getByRole('combobox'), '上海')
    expect(await screen.findByText('上海')).toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(<LocationInput {...defaultProps} />)
    await user.type(screen.getByRole('combobox'), '上海')
    await screen.findByText('上海')
    await user.click(document.body)
    await waitFor(() => {
      expect(screen.queryByText('上海')).not.toBeInTheDocument()
    })
  })
})
