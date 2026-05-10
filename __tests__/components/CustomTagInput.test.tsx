import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomTagInput from '@/components/CustomTagInput'

describe('CustomTagInput', () => {
  it('renders existing tags', () => {
    render(<CustomTagInput tags={['凡尔赛宫', '老佛爷百货']} onChange={jest.fn()} />)
    expect(screen.getByText('凡尔赛宫')).toBeInTheDocument()
    expect(screen.getByText('老佛爷百货')).toBeInTheDocument()
  })

  it('adds tag on Enter key', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<CustomTagInput tags={[]} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, '巴黎迪士尼{Enter}')
    expect(onChange).toHaveBeenCalledWith(['巴黎迪士尼'])
  })

  it('does not add empty tag', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<CustomTagInput tags={[]} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, '   {Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not add duplicate tag', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<CustomTagInput tags={['巴黎迪士尼']} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, '巴黎迪士尼{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes tag when × clicked', () => {
    const onChange = jest.fn()
    render(<CustomTagInput tags={['凡尔赛宫', '老佛爷百货']} onChange={onChange} />)
    const xButtons = screen.getAllByRole('button', { name: /删除/i })
    fireEvent.click(xButtons[0])
    expect(onChange).toHaveBeenCalledWith(['老佛爷百货'])
  })
})
