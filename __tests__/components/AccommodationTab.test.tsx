import { render, screen } from '@testing-library/react'
import AccommodationTab from '@/components/AccommodationTab'
import type { AccommodationArea } from '@/lib/types'

const mockAreas: AccommodationArea[] = [
  {
    area: '玛黑区',
    description: '步行 5 分钟到卢浮宫，咖啡馆林立',
    price_range: '¥800-1500/晚',
    vibe: '文艺青年聚集地',
  },
  {
    area: '左岸',
    description: '塞纳河南岸，文化氛围浓厚',
    price_range: '¥1000-2000/晚',
    vibe: '学术 / 老巴黎风情',
  },
]

const defaultProps = {
  accommodations: mockAreas,
  destination: '巴黎',
  start_date: '2025-06-15',
  days: 5,
  accommodation_budget: 6000,
}

describe('AccommodationTab', () => {
  it('renders accommodation areas', () => {
    render(<AccommodationTab {...defaultProps} />)
    expect(screen.getByText('玛黑区')).toBeInTheDocument()
    expect(screen.getByText('左岸')).toBeInTheDocument()
    expect(screen.getByText('步行 5 分钟到卢浮宫，咖啡馆林立')).toBeInTheDocument()
  })

  it('renders price ranges and vibes', () => {
    render(<AccommodationTab {...defaultProps} />)
    expect(screen.getByText('¥800-1500/晚')).toBeInTheDocument()
    expect(screen.getByText('文艺青年聚集地')).toBeInTheDocument()
  })

  it('renders Airbnb search link for each area with correct params', () => {
    render(<AccommodationTab {...defaultProps} />)
    const links = screen.getAllByRole('link', { name: /Airbnb/i })
    expect(links).toHaveLength(2)
    const href = links[0].getAttribute('href') ?? ''
    expect(href).toContain('airbnb.com/s/')
    expect(href).toContain('checkin=2025-06-15')
    expect(href).toContain('checkout=2025-06-20')
    expect(href).toContain('adults=2')
  })

  it('shows budget summary', () => {
    render(<AccommodationTab {...defaultProps} />)
    expect(screen.getByText(/6,000/)).toBeInTheDocument()
  })

  it('shows fallback when accommodations is empty', () => {
    render(<AccommodationTab {...defaultProps} accommodations={[]} />)
    expect(screen.getByText(/暂未生成/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Airbnb/i })).toBeInTheDocument()
  })
})
