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
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('wiki-summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ summary: 'Wikipedia summary text about Louvre' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ images: [] }),
      })
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

  it('fetches wiki images and summary on mount', async () => {
    render(<AttractionModal {...defaultProps} />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('wiki-images'))
    })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('wiki-summary'))
    })
  })

  it('shows Wikipedia summary text when loaded', async () => {
    render(<AttractionModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/Wikipedia summary text/i)).toBeInTheDocument()
    })
  })
})
