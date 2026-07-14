import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ItineraryRouteMapView from '@/components/ItineraryRouteMapView'
import type {
  ResolvedRouteOccurrence,
  RouteCoordinate,
} from '@/lib/itinerary-route'

const mockFitBounds = jest.fn()
const mockMap = { fitBounds: mockFitBounds }

interface MockIcon {
  html?: string
}

interface MockMapContainerProps {
  center: [number, number]
  zoom: number
  className?: string
  style?: Record<string, string | number>
  children?: ReactNode
}

interface MockTileLayerProps {
  url: string
  attribution: string
}

interface MockMarkerProps {
  position: [number, number]
  icon?: MockIcon
  children?: ReactNode
}

interface MockPopupProps {
  children?: ReactNode
}

interface MockPolylineProps {
  positions: [number, number][]
  pathOptions?: { color?: string }
}

jest.mock('react-leaflet', () => ({
  MapContainer: ({
    center,
    zoom,
    className,
    style,
    children,
  }: MockMapContainerProps) => (
    <div
      data-testid="map-container"
      data-center={JSON.stringify(center)}
      data-zoom={zoom}
      data-class-name={className}
      data-style={JSON.stringify(style)}
    >
      {children}
    </div>
  ),
  TileLayer: ({ url, attribution }: MockTileLayerProps) => (
    <div
      data-testid="tile-layer"
      data-url={url}
      data-attribution={attribution}
    />
  ),
  Marker: ({ position, icon, children }: MockMarkerProps) => (
    <div
      data-testid="route-marker"
      data-position={JSON.stringify(position)}
      data-icon-html={icon?.html ?? ''}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: MockPopupProps) => (
    <div data-testid="route-popup">{children}</div>
  ),
  Polyline: ({ positions, pathOptions }: MockPolylineProps) => (
    <div
      data-testid="route-polyline"
      data-positions={JSON.stringify(positions)}
      data-color={pathOptions?.color}
    />
  ),
  useMap: () => mockMap,
}))

jest.mock('leaflet', () => ({
  __esModule: true,
  default: {
    divIcon: jest.fn((options: MockIcon) => options),
  },
}))

function coordinate(
  lat: number,
  lng: number,
  source: RouteCoordinate['source'] = 'wikipedia'
): RouteCoordinate {
  return { lat, lng, source }
}

function occurrence(
  id: string,
  dayIndex: number,
  order: number,
  name: string,
  routeCoordinate: RouteCoordinate | null
): ResolvedRouteOccurrence {
  return {
    id,
    dayIndex,
    order,
    name,
    wikiTitle: null,
    targetKey: `target:${id}`,
    coordinate: routeCoordinate,
  }
}

function markerNumbers(): string[] {
  return screen
    .queryAllByTestId('route-marker')
    .map((marker) => marker.getAttribute('data-icon-html') ?? '')
    .map((html) => html.match(/data-route-number="(\d+)"/)?.[1] ?? '')
}

describe('ItineraryRouteMapView', () => {
  beforeEach(() => {
    mockFitBounds.mockReset()
  })

  it('restarts day numbering and preserves gaps for missing coordinates', () => {
    const group = [
      occurrence('third', 2, 2, '第三站', coordinate(48.87, 2.35)),
      occurrence('first', 2, 0, '第一站', coordinate(48.86, 2.34)),
      occurrence('second', 2, 1, '第二站', null),
    ]

    render(<ItineraryRouteMapView groups={[group]} mode="day" />)

    expect(markerNumbers()).toEqual(['1', '3'])
    expect(screen.getAllByTestId('route-polyline')).toHaveLength(1)
    expect(screen.getByTestId('route-polyline')).toHaveAttribute(
      'data-positions',
      JSON.stringify([
        [48.86, 2.34],
        [48.87, 2.35],
      ])
    )
  })

  it('numbers all days continuously and draws separate day-colored lines', () => {
    const dayOne = [
      occurrence('d1-a', 0, 0, 'A', coordinate(1, 1)),
      occurrence('d1-b', 0, 1, 'B', null),
      occurrence('d1-c', 0, 2, 'C', coordinate(2, 2)),
    ]
    const dayTwo = [
      occurrence('d2-a', 1, 0, 'D', coordinate(3, 3)),
      occurrence('d2-b', 1, 1, 'E', coordinate(4, 4)),
    ]

    render(
      <ItineraryRouteMapView groups={[dayOne, dayTwo]} mode="all" />
    )

    expect(markerNumbers()).toEqual(['1', '3', '4', '5'])
    const lines = screen.getAllByTestId('route-polyline')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveAttribute(
      'data-positions',
      JSON.stringify([
        [1, 1],
        [2, 2],
      ])
    )
    expect(lines[1]).toHaveAttribute(
      'data-positions',
      JSON.stringify([
        [3, 3],
        [4, 4],
      ])
    )
    expect(lines[0]).toHaveAttribute('data-color', '#4f46e5')
    expect(lines[1]).toHaveAttribute('data-color', '#059669')
  })

  it('renders coordinate zero, skips invalid coordinates, and omits short lines', () => {
    const group = [
      occurrence('zero', 0, 0, '本初子午线', coordinate(0, 0)),
      occurrence('nan', 0, 1, 'NaN', coordinate(Number.NaN, 2)),
      occurrence('infinite', 0, 2, 'Infinity', coordinate(2, Infinity)),
      occurrence('latitude', 0, 3, 'Bad latitude', coordinate(90.1, 2)),
      occurrence('longitude', 0, 4, 'Bad longitude', coordinate(2, -180.1)),
    ]

    render(<ItineraryRouteMapView groups={[group]} mode="day" />)

    expect(screen.getAllByTestId('route-marker')).toHaveLength(1)
    expect(screen.getByTestId('route-marker')).toHaveAttribute(
      'data-position',
      JSON.stringify([0, 0])
    )
    expect(screen.queryByTestId('route-polyline')).not.toBeInTheDocument()
  })

  it('handles a group with no valid coordinates without fitting bounds', () => {
    render(
      <ItineraryRouteMapView
        groups={[[occurrence('missing', 0, 0, '无坐标', null)]]}
        mode="day"
      />
    )

    expect(screen.queryByTestId('route-marker')).not.toBeInTheDocument()
    expect(screen.queryByTestId('route-polyline')).not.toBeInTheDocument()
    expect(mockFitBounds).not.toHaveBeenCalled()
  })

  it('fits all valid points on first render and when they change', async () => {
    const firstGroups = [
      [occurrence('first', 0, 0, '第一站', coordinate(10, 20))],
    ]
    const { rerender } = render(
      <ItineraryRouteMapView groups={firstGroups} mode="day" />
    )

    await waitFor(() => {
      expect(mockFitBounds).toHaveBeenLastCalledWith([[10, 20]], {
        padding: [24, 24],
        maxZoom: 15,
      })
    })

    rerender(
      <ItineraryRouteMapView
        groups={[
          [
            occurrence('first', 0, 0, '第一站', coordinate(10, 20)),
            occurrence('second', 0, 1, '第二站', coordinate(30, 40)),
          ],
        ]}
        mode="day"
      />
    )

    await waitFor(() => {
      expect(mockFitBounds).toHaveBeenLastCalledWith(
        [
          [10, 20],
          [30, 40],
        ],
        { padding: [24, 24], maxZoom: 15 }
      )
    })
  })

  it('shows safe popup text and fixed OpenStreetMap attribution', () => {
    render(
      <ItineraryRouteMapView
        groups={[
          [
            occurrence(
              'popup',
              1,
              2,
              '<img src=x onerror=alert(1)>',
              coordinate(48, 2)
            ),
          ],
        ]}
        mode="day"
      />
    )

    expect(
      screen.getByText('<img src=x onerror=alert(1)>')
    ).toBeInTheDocument()
    expect(screen.getByText('第 2 天 · 第 3 站')).toBeInTheDocument()
    expect(document.querySelector('img')).not.toBeInTheDocument()

    const tiles = screen.getByTestId('tile-layer')
    expect(tiles).toHaveAttribute(
      'data-url',
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    )
    expect(tiles.getAttribute('data-attribution')).toContain(
      'OpenStreetMap'
    )
    expect(tiles.getAttribute('data-attribution')).toContain('contributors')
  })
})
