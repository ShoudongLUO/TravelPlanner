import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PreferencesClient from '@/components/PreferencesClient'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useSearchParams: () => new URLSearchParams('departure_city=上海&destination=巴黎&start_date=2025-06-15&days=5&budget=15000'),
}))

const mockAttractions = [
  { name: '卢浮宫', name_en: 'Louvre Museum', description: '世界最大博物馆', icon: '🏛' },
  { name: '埃菲尔铁塔', name_en: 'Eiffel Tower', description: '巴黎地标', icon: '🗼' },
]

describe('PreferencesClient', () => {
  beforeEach(() => {
    mockPush.mockClear()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ attractions: mockAttractions }),
    }) as jest.Mock
  })

  it('shows loading state initially', () => {
    render(<PreferencesClient />)
    expect(screen.getByText(/正在为你/i)).toBeInTheDocument()
  })

  it('shows attractions after loading', async () => {
    render(<PreferencesClient />)
    await waitFor(() => {
      expect(screen.getByText('卢浮宫')).toBeInTheDocument()
      expect(screen.getByText('埃菲尔铁塔')).toBeInTheDocument()
    })
  })

  it('navigates to /generate with selected attractions', async () => {
    render(<PreferencesClient />)
    await waitFor(() => {
      expect(screen.getByText('卢浮宫')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('卢浮宫'))
    fireEvent.click(screen.getByRole('button', { name: /生成攻略/i }))
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('preferred_attractions=%E5%8D%A2%E6%B5%AE%E5%AE%AB'))
  })
})
