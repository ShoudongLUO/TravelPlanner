import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ItineraryRouteMap from '@/components/ItineraryRouteMap'
import { loadRouteLocations } from '@/lib/route-location-client'
import type { RouteCoordinate } from '@/lib/itinerary-route'
import type { DayPlan, ItineraryContent } from '@/lib/types'

interface DynamicTestState {
  behavior: 'ok' | 'dynamic-reject' | 'render-error'
  options: { ssr?: boolean; loading?: () => React.ReactNode } | null
}

const dynamicTestState = globalThis as typeof globalThis & {
  __routeMapDynamicTestState?: DynamicTestState
}

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: jest.fn(
    (
      _loader: () => Promise<unknown>,
      options: { ssr?: boolean; loading?: () => React.ReactNode }
    ) => {
      const root = (
        globalThis as typeof globalThis & {
          __routeMapDynamicTestState?: DynamicTestState
        }
      )
      const state = (root.__routeMapDynamicTestState ??= {
        behavior: 'ok',
        options: null,
      })
      state.options = options
      return function MockRouteMapView({
        groups,
        mode,
      }: {
        groups: Array<Array<{ name: string; coordinate: RouteCoordinate | null }>>
        mode: 'day' | 'all'
      }) {
        const behavior = (
          globalThis as typeof globalThis & {
            __routeMapDynamicTestState?: DynamicTestState
          }
        ).__routeMapDynamicTestState?.behavior
        if (behavior === 'dynamic-reject') {
          throw new Error('dynamic import rejected')
        }
        if (behavior === 'render-error') {
          throw new Error('map render failed')
        }
        return (
          <div data-testid="route-map-view">
            {mode}:{groups.flat().map((item) => item.name).join('|')}
          </div>
        )
      }
    }
  ),
}))

jest.mock('@/lib/route-location-client', () => ({
  loadRouteLocations: jest.fn(),
}))

const mockLoadRouteLocations = loadRouteLocations as jest.MockedFunction<
  typeof loadRouteLocations
>

function day(attractions: string[], index = 0): DayPlan {
  return {
    title: `第 ${index + 1} 天`,
    attractions,
    timeline: attractions
      .filter((name) => name.trim())
      .map((name, order) => ({
        time: `${9 + order}:00`,
        name,
        name_en: `${name.trim()} English`,
        description: '',
      })),
    lunch: {
      name: '',
      location: '',
      reason: '',
      dishes: '',
      price_range: '',
    },
    dinner: {
      name: '',
      location: '',
      reason: '',
      dishes: '',
      price_range: '',
    },
    daily_budget: 0,
  }
}

function content(days: DayPlan[]): ItineraryContent {
  return {
    summary: '',
    days,
    budget_breakdown: {
      transport: 0,
      local_transport: 0,
      accommodation: 0,
      food: 0,
      tickets: 0,
      misc: 0,
    },
    accommodations: [],
    tips: [],
    xhs_queries: [],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function coordinate(lat = 48, lng = 2): RouteCoordinate {
  return { lat, lng, source: 'wikipedia' }
}

async function expand(user = userEvent.setup()) {
  await user.click(screen.getByRole('button', { name: /行程路线图/ }))
  return user
}

describe('ItineraryRouteMap', () => {
  beforeEach(() => {
    dynamicTestState.__routeMapDynamicTestState = {
      behavior: 'ok',
      options:
        dynamicTestState.__routeMapDynamicTestState?.options ?? null,
    }
    mockLoadRouteLocations.mockReset()
    mockLoadRouteLocations.mockResolvedValue(new Map())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('is collapsed by default and neither loads nor renders browser-dependent content', async () => {
    render(<ItineraryRouteMap content={content([day(['卢浮宫'])])} destination="巴黎" />)

    const toggle = screen.getByRole('button', { name: /行程路线图/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls')
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
    expect(mockLoadRouteLocations).not.toHaveBeenCalled()
    expect(dynamicTestState.__routeMapDynamicTestState?.options).toMatchObject({
      ssr: false,
    })
    expect(
      dynamicTestState.__routeMapDynamicTestState?.options?.loading?.()
    ).toBeTruthy()

    await expand()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(mockLoadRouteLocations).toHaveBeenCalledTimes(1)
  })

  it('starts on the first click and applies progressive shared-target results to every occurrence', async () => {
    const pending = deferred<Map<string, RouteCoordinate | null>>()
    mockLoadRouteLocations.mockReturnValue(pending.promise)
    const trip = content([day(['卢浮宫']), day(['卢浮宫'], 1)])

    render(<ItineraryRouteMap content={trip} destination="巴黎" />)
    await expand()

    const [targets, options] = mockLoadRouteLocations.mock.calls[0]
    expect(targets).toHaveLength(1)
    expect(screen.getByText('已定位 0/2 个景点')).toBeInTheDocument()

    act(() => {
      options.onResult?.(targets[0].key, coordinate(), 'resolved')
    })
    expect(screen.getByText('已定位 2/2 个景点')).toBeInTheDocument()
    expect(screen.getByTestId('route-map-view')).toHaveTextContent('day:卢浮宫')

    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '全部行程' }))
    expect(screen.getByTestId('route-map-view')).toHaveTextContent(
      'all:卢浮宫|卢浮宫'
    )

    await act(async () => pending.resolve(new Map([[targets[0].key, coordinate()]])))
  })

  it('offers only non-empty days plus all and supports looping tab keyboard navigation', async () => {
    render(
      <ItineraryRouteMap
        content={content([day(['A']), day(['  '], 1), day(['C'], 2)])}
        destination="Paris"
      />
    )
    await expand()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Day 1', 'Day 3', '全部行程'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' })
    expect(tabs[2]).toHaveFocus()
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(tabs[2], { key: 'Home' })
    expect(tabs[0]).toHaveFocus()
    fireEvent.keyDown(tabs[0], { key: 'End' })
    expect(tabs[2]).toHaveFocus()
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' })
    expect(tabs[0]).toHaveFocus()
  })

  it('distinguishes partial results and retries only retryable targets', async () => {
    const first = deferred<Map<string, RouteCoordinate | null>>()
    const retry = deferred<Map<string, RouteCoordinate | null>>()
    mockLoadRouteLocations
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(retry.promise)
    render(
      <ItineraryRouteMap
        content={content([day(['成功', '未找到', '暂时失败'])])}
        destination="巴黎"
      />
    )
    const user = await expand()
    const [targets, options] = mockLoadRouteLocations.mock.calls[0]

    act(() => {
      options.onResult?.(targets[0].key, coordinate(), 'resolved')
      options.onResult?.(targets[1].key, null, 'not-found')
      options.onResult?.(targets[2].key, null, 'retryable-error')
    })
    await act(async () => first.resolve(new Map([[targets[0].key, coordinate()]])))

    expect(screen.getByText('已定位 1/3 个景点')).toBeInTheDocument()
    expect(screen.getByText(/部分地点暂时无法定位/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重试失败地点' }))
    expect(mockLoadRouteLocations).toHaveBeenCalledTimes(2)
    expect(mockLoadRouteLocations.mock.calls[1][0].map((target) => target.key)).toEqual([
      targets[2].key,
    ])

    const retryOptions = mockLoadRouteLocations.mock.calls[1][1]
    act(() => retryOptions.onResult?.(targets[2].key, coordinate(49, 3), 'resolved'))
    await act(async () => retry.resolve(new Map([[targets[2].key, coordinate(49, 3)]])))
    expect(screen.getByText('已定位 2/3 个景点')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '重试失败地点' })).not.toBeInTheDocument()
  })

  it('shows a total failure without hiding the ordered list or raw-name Google link', async () => {
    mockLoadRouteLocations.mockImplementation(async (targets, options) => {
      targets.forEach((target) =>
        options.onResult?.(target.key, null, 'retryable-error')
      )
      return new Map(targets.map((target) => [target.key, null]))
    })
    render(<ItineraryRouteMap content={content([day(['A', 'B'])])} destination="Paris" />)
    await expand()

    expect(await screen.findByText('已定位 0/2 个景点')).toBeInTheDocument()
    expect(screen.getByText(/暂时没有可显示的坐标/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('A'),
      expect.stringContaining('B'),
    ])
    const link = screen.getByRole('link', { name: '在 Google Maps 打开' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link.getAttribute('href')).toContain('/maps/dir/')
  })

  it.each([
    { count: 1, links: 1, kind: '/maps/search/' },
    { count: 2, links: 1, kind: '/maps/dir/' },
    { count: 5, links: 1, kind: '/maps/dir/' },
    { count: 6, links: 2, kind: '/maps/dir/' },
  ])('renders Google navigation for $count raw stops', async ({ count, links, kind }) => {
    const names = Array.from({ length: count }, (_, index) => `景点 ${index + 1}`)
    render(<ItineraryRouteMap content={content([day(names)])} destination="巴黎" />)
    await expand()

    const googleLinks = screen.getAllByRole('link', { name: /Google Maps|第 \d+\/\d+ 段/ })
    expect(googleLinks).toHaveLength(links)
    googleLinks.forEach((link) => expect(link.getAttribute('href')).toContain(kind))
  })

  it('keeps all-view navigation separated by day and excludes blank attractions from X/Y', async () => {
    render(
      <ItineraryRouteMap
        content={content([day(['A', ' ']), day(['B', 'C'], 1)])}
        destination="Paris"
      />
    )
    const user = await expand()
    expect(screen.getByText('已定位 0/3 个景点')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '全部行程' }))
    expect(screen.getByRole('link', { name: /Day 1.*Google Maps/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Day 2.*Google Maps/ })).toBeInTheDocument()
  })

  it('does not duplicate an in-flight or completed load across collapse and re-expand', async () => {
    const pending = deferred<Map<string, RouteCoordinate | null>>()
    mockLoadRouteLocations.mockReturnValue(pending.promise)
    render(<ItineraryRouteMap content={content([day(['A'])])} destination="Paris" />)
    const user = await expand()

    await user.click(screen.getByRole('button', { name: /行程路线图/ }))
    expect(mockLoadRouteLocations.mock.calls[0][1].signal.aborted).toBe(false)
    await user.click(screen.getByRole('button', { name: /行程路线图/ }))
    expect(mockLoadRouteLocations).toHaveBeenCalledTimes(1)

    await act(async () => pending.resolve(new Map()))
    await user.click(screen.getByRole('button', { name: /行程路线图/ }))
    await user.click(screen.getByRole('button', { name: /行程路线图/ }))
    expect(mockLoadRouteLocations).toHaveBeenCalledTimes(1)
  })

  it('aborts on unmount and StrictMode still starts one load per click', async () => {
    const pending = deferred<Map<string, RouteCoordinate | null>>()
    mockLoadRouteLocations.mockReturnValue(pending.promise)
    const { unmount } = render(
      <StrictMode>
        <ItineraryRouteMap content={content([day(['A'])])} destination="Paris" />
      </StrictMode>
    )
    await expand()
    expect(mockLoadRouteLocations).toHaveBeenCalledTimes(1)
    const signal = mockLoadRouteLocations.mock.calls[0][1].signal
    unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => pending.reject(new DOMException('Aborted', 'AbortError')))
  })

  it.each(['dynamic-reject', 'render-error'] as const)(
    'contains a %s inside the map boundary and resets on a view change',
    async (behavior) => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      dynamicTestState.__routeMapDynamicTestState!.behavior = behavior
      mockLoadRouteLocations.mockImplementation(async (targets, options) => {
        options.onResult?.(targets[0].key, coordinate(), 'resolved')
        return new Map([[targets[0].key, coordinate()]])
      })
      render(<ItineraryRouteMap content={content([day(['A'])])} destination="Paris" />)
      const user = await expand()

      expect(await screen.findByText('地图暂时无法加载')).toBeInTheDocument()
      expect(screen.getByRole('listitem')).toHaveTextContent('A')
      expect(screen.getByRole('link', { name: '在 Google Maps 打开' })).toBeInTheDocument()

      dynamicTestState.__routeMapDynamicTestState!.behavior = 'ok'
      await user.click(screen.getByRole('tab', { name: '全部行程' }))
      expect(screen.getByTestId('route-map-view')).toBeInTheDocument()
      expect(consoleError).toHaveBeenCalled()
    }
  )

  it('keeps a single marker map and the list, while empty data or destination renders no control', async () => {
    mockLoadRouteLocations.mockImplementation(async (targets, options) => {
      options.onResult?.(targets[0].key, coordinate(0, 0), 'resolved')
      return new Map([[targets[0].key, coordinate(0, 0)]])
    })
    const { rerender } = render(
      <ItineraryRouteMap content={content([day(['本初子午线'])])} destination="伦敦" />
    )
    await expand()
    expect(await screen.findByTestId('route-map-view')).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('本初子午线')
    expect(screen.getByText(/Wikipedia、Nominatim 和 OpenStreetMap/)).toBeInTheDocument()

    rerender(<ItineraryRouteMap content={content([day(['  '])])} destination="伦敦" />)
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /行程路线图/ })).not.toBeInTheDocument()
    )
    rerender(<ItineraryRouteMap content={content([day(['A'])])} destination="  " />)
    expect(screen.queryByRole('button', { name: /行程路线图/ })).not.toBeInTheDocument()
  })
})
