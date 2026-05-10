import { render, screen, fireEvent } from '@testing-library/react'
import AttractionCard from '@/components/AttractionCard'
import type { Attraction } from '@/lib/types'

const mockAttraction: Attraction = {
  name: '卢浮宫',
  name_en: 'Louvre Museum',
  description: '世界最大博物馆',
  icon: '🏛',
}

describe('AttractionCard', () => {
  it('shows name, name_en, description and icon', () => {
    render(<AttractionCard attraction={mockAttraction} selected={false} onToggle={jest.fn()} />)
    expect(screen.getByText('卢浮宫')).toBeInTheDocument()
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument()
    expect(screen.getByText('世界最大博物馆')).toBeInTheDocument()
    expect(screen.getByText('🏛')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = jest.fn()
    render(<AttractionCard attraction={mockAttraction} selected={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('卢浮宫'))
    expect(onToggle).toHaveBeenCalled()
  })

  it('shows checkmark when selected', () => {
    const { container } = render(
      <AttractionCard attraction={mockAttraction} selected={true} onToggle={jest.fn()} />
    )
    expect(container.querySelector('[data-selected="true"]')).toBeInTheDocument()
  })
})
