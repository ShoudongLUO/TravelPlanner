import { render, screen, fireEvent } from '@testing-library/react'
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
})
