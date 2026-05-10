import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DayCard from '@/components/DayCard'
import type { DayPlan } from '@/lib/types'

const mockDay: DayPlan = {
  title: 'Day 1 · 抵达巴黎',
  attractions: ['卢浮宫', '塞纳河'],
  timeline: [
    { time: '09:00', name: '卢浮宫', name_en: 'Louvre Museum', description: '世界最大博物馆之一' },
  ],
  lunch: {
    name: 'Café Marly',
    location: '卢浮宫拱廊内',
    reason: '位置便利，法式轻餐',
    dishes: 'Croque Madame',
    price_range: '人均¥120',
  },
  dinner: {
    name: 'Au Pied de Cochon',
    location: 'Les Halles 区',
    reason: '法式经典地标',
    dishes: '洋葱汤、猪蹄',
    price_range: '人均¥200',
  },
  daily_budget: 1800,
}

describe('DayCard', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ images: [] }),
    }) as jest.Mock
  })

  it('shows title and attraction chips in collapsed state', () => {
    render(<DayCard day={mockDay} index={0} />)
    expect(screen.getByText('Day 1 · 抵达巴黎')).toBeInTheDocument()
    expect(screen.getByText('卢浮宫')).toBeInTheDocument()
    expect(screen.getByText('塞纳河')).toBeInTheDocument()
  })

  it('shows lunch and dinner summary in collapsed state', () => {
    render(<DayCard day={mockDay} index={0} />)
    expect(screen.getByText('Café Marly')).toBeInTheDocument()
    expect(screen.getByText('Au Pied de Cochon')).toBeInTheDocument()
  })

  it('hides timeline when collapsed by default', () => {
    render(<DayCard day={mockDay} index={0} />)
    expect(screen.queryByText('今日行程')).not.toBeInTheDocument()
  })

  it('shows timeline when defaultOpen is true', () => {
    render(<DayCard day={mockDay} index={0} defaultOpen />)
    expect(screen.getByText('今日行程')).toBeInTheDocument()
    expect(screen.getByText('世界最大博物馆之一')).toBeInTheDocument()
  })

  it('toggles open and closed on header button click', () => {
    render(<DayCard day={mockDay} index={0} />)
    expect(screen.queryByText('今日行程')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('今日行程')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('今日行程')).not.toBeInTheDocument()
  })

  it('shows restaurant details and daily budget when expanded', () => {
    render(<DayCard day={mockDay} index={0} defaultOpen />)
    expect(screen.getByText('位置便利，法式轻餐')).toBeInTheDocument()
    expect(screen.getByText('法式经典地标')).toBeInTheDocument()
    expect(screen.getByText('¥1,800')).toBeInTheDocument()
  })

  it('clicking attraction chip opens modal', () => {
    render(<DayCard day={mockDay} index={0} />)
    // chip is the only '卢浮宫' when collapsed
    fireEvent.click(screen.getByText('卢浮宫'))
    expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument()
  })

  it('clicking timeline item opens modal', () => {
    render(<DayCard day={mockDay} index={0} defaultOpen />)
    // with defaultOpen, '卢浮宫' appears twice: chip + timeline item
    const items = screen.getAllByText('卢浮宫')
    fireEvent.click(items[1]) // click the timeline item (second occurrence)
    expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument()
  })

  it('clicking chip fuzzy-matches a longer timeline name to get name_en', async () => {
    const fuzzyDay: DayPlan = {
      ...mockDay,
      attractions: ['卢浮宫'],
      timeline: [
        { time: '11:00', name: '卢浮宫游览（建议2小时）', name_en: 'Louvre Museum', description: '世界最大博物馆' },
      ],
    }
    render(<DayCard day={fuzzyDay} index={0} />)
    fireEvent.click(screen.getByText('卢浮宫'))
    // Modal opens and fetch is called with the matched name_en (Louvre%20Museum), not the Chinese chip name
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('Louvre%20Museum'))
    })
  })
})
