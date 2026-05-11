import { render, screen, fireEvent } from '@testing-library/react'
import FeedbackTab from '@/components/FeedbackTab'
import type { ItineraryReview } from '@/lib/types'

const mockReview: ItineraryReview = {
  id: 'rev-1',
  itinerary_id: 'itin-1',
  user_id: 'user-1',
  rating: 4,
  actual_budget: 18200,
  highlights: '凡尔赛宫清早人少，建议早9点前到',
  improvements: 'Day 4 行程太赶，建议拆成两天',
  visited_at: '2025-06-20',
  created_at: '2025-06-26T00:00:00Z',
}

describe('FeedbackTab', () => {
  it('shows empty state when no review', () => {
    render(<FeedbackTab review={null} planned_budget={15000} onWriteFeedback={jest.fn()} />)
    expect(screen.getByText(/还没有为这份攻略评分/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /写下你的反馈/i })).toBeInTheDocument()
  })

  it('calls onWriteFeedback when empty state button clicked', () => {
    const onWriteFeedback = jest.fn()
    render(<FeedbackTab review={null} planned_budget={15000} onWriteFeedback={onWriteFeedback} />)
    fireEvent.click(screen.getByRole('button', { name: /写下你的反馈/i }))
    expect(onWriteFeedback).toHaveBeenCalled()
  })

  it('renders review fields when review exists', () => {
    render(<FeedbackTab review={mockReview} planned_budget={15000} onWriteFeedback={jest.fn()} />)
    expect(screen.getByText(/4\s*\/\s*5/i)).toBeInTheDocument()
    expect(screen.getByText('凡尔赛宫清早人少，建议早9点前到')).toBeInTheDocument()
    expect(screen.getByText('Day 4 行程太赶，建议拆成两天')).toBeInTheDocument()
    expect(screen.getByText(/超支/i)).toBeInTheDocument()
  })

  it('renders edit button when review exists', () => {
    const onWriteFeedback = jest.fn()
    render(<FeedbackTab review={mockReview} planned_budget={15000} onWriteFeedback={onWriteFeedback} />)
    fireEvent.click(screen.getByRole('button', { name: /修改/i }))
    expect(onWriteFeedback).toHaveBeenCalled()
  })

  it('shows "节省" when actual_budget < planned_budget', () => {
    render(
      <FeedbackTab
        review={{ ...mockReview, actual_budget: 12000 }}
        planned_budget={15000}
        onWriteFeedback={jest.fn()}
      />
    )
    expect(screen.getByText(/节省/i)).toBeInTheDocument()
  })

  it('shows "精确符合预算" when actual_budget === planned_budget', () => {
    render(
      <FeedbackTab
        review={{ ...mockReview, actual_budget: 15000 }}
        planned_budget={15000}
        onWriteFeedback={jest.fn()}
      />
    )
    expect(screen.getByText(/精确符合预算/i)).toBeInTheDocument()
  })

  it('hides highlights section when empty', () => {
    render(
      <FeedbackTab
        review={{ ...mockReview, highlights: '' }}
        planned_budget={15000}
        onWriteFeedback={jest.fn()}
      />
    )
    expect(screen.queryByText(/旅行亮点/i)).not.toBeInTheDocument()
  })
})
