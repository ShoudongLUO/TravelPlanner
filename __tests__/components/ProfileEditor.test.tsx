import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileEditor from '@/components/ProfileEditor'

describe('ProfileEditor', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: {} }),
    }) as jest.Mock
  })

  it('renders all three sections', () => {
    render(<ProfileEditor onSaved={jest.fn()} ctaLabel="完成" />)
    expect(screen.getByText(/旅行风格/i)).toBeInTheDocument()
    expect(screen.getByText(/节奏偏好/i)).toBeInTheDocument()
    expect(screen.getByText(/消费风格/i)).toBeInTheDocument()
  })

  it('shows all travel style options', () => {
    render(<ProfileEditor onSaved={jest.fn()} ctaLabel="完成" />)
    expect(screen.getByText('文化深度')).toBeInTheDocument()
    expect(screen.getByText('美食爱好')).toBeInTheDocument()
    expect(screen.getByText('亲子游')).toBeInTheDocument()
  })

  it('CTA button is disabled when no styles selected', () => {
    render(<ProfileEditor onSaved={jest.fn()} ctaLabel="完成" />)
    expect(screen.getByRole('button', { name: /完成/i })).toBeDisabled()
  })

  it('CTA enables after selecting a style', () => {
    render(<ProfileEditor onSaved={jest.fn()} ctaLabel="完成" />)
    fireEvent.click(screen.getByText('文化深度'))
    expect(screen.getByRole('button', { name: /完成/i })).toBeEnabled()
  })

  it('initializes from initialProfile', () => {
    const initialProfile = {
      user_id: 'u1',
      travel_styles: ['美食爱好'],
      pace: '慢节奏',
      budget_style: '高端体验',
      created_at: '',
      updated_at: '',
    }
    render(<ProfileEditor initialProfile={initialProfile} onSaved={jest.fn()} ctaLabel="保存" />)
    expect(screen.getByRole('button', { name: /保存/i })).toBeEnabled()
  })

  it('calls fetch PUT and onSaved when CTA clicked', async () => {
    const onSaved = jest.fn()
    render(<ProfileEditor onSaved={onSaved} ctaLabel="完成" />)
    fireEvent.click(screen.getByText('文化深度'))
    fireEvent.click(screen.getByRole('button', { name: /完成/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PUT' }))
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })
})
