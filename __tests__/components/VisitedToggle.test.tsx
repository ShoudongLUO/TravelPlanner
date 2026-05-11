import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VisitedToggle from '@/components/VisitedToggle'

describe('VisitedToggle', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ itinerary: { visited: true } }),
    }) as jest.Mock
  })

  it('renders 想去 button when initialVisited is false', () => {
    render(<VisitedToggle itineraryId="itin-1" initialVisited={false} />)
    expect(screen.getByRole('button', { name: /想去/i })).toBeInTheDocument()
  })

  it('renders 已去过 button when initialVisited is true', () => {
    render(<VisitedToggle itineraryId="itin-1" initialVisited={true} />)
    expect(screen.getByRole('button', { name: /已去过/i })).toBeInTheDocument()
  })

  it('toggles state and calls PATCH on click', async () => {
    render(<VisitedToggle itineraryId="itin-1" initialVisited={false} />)
    fireEvent.click(screen.getByRole('button', { name: /想去/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/itineraries/itin-1/visited',
        expect.objectContaining({ method: 'PATCH' })
      )
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /已去过/i })).toBeInTheDocument()
    })
  })

  it('rolls back state on fetch failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock
    render(<VisitedToggle itineraryId="itin-1" initialVisited={false} />)
    fireEvent.click(screen.getByRole('button', { name: /想去/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /想去/i })).toBeInTheDocument()
    })
  })
})
