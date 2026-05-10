import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AttractionModal from '@/components/AttractionModal'

const defaultProps = {
  name: '卢浮宫',
  name_en: 'Louvre Museum',
  description: '世界最大博物馆，藏品超38万件。',
  onClose: jest.fn(),
}

describe('AttractionModal', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ images: [] }),
    }) as jest.Mock
  })

  it('shows attraction name and description', async () => {
    render(<AttractionModal {...defaultProps} />)
    expect(screen.getByText('卢浮宫')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('世界最大博物馆，藏品超38万件。')).toBeInTheDocument()
    })
  })

  it('calls onClose when close button clicked', async () => {
    const onClose = jest.fn()
    render(<AttractionModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop clicked', async () => {
    const onClose = jest.fn()
    const { container } = render(<AttractionModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(container.firstChild!)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows placeholder when no images loaded', async () => {
    render(<AttractionModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
    expect(screen.getByText('卢')).toBeInTheDocument()
  })

  it('fetches wiki images on mount', async () => {
    render(<AttractionModal {...defaultProps} />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('Louvre%20Museum')
      )
    })
  })
})
