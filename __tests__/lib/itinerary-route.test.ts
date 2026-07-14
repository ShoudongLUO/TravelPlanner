import {
  applyTargetResults,
  buildGoogleMapsSegments,
  buildRouteModel,
  groupRouteByDay,
  type RouteCoordinate,
  type RouteOccurrence,
} from '@/lib/itinerary-route'
import type { DayPlan, TimelineItem } from '@/lib/types'

const restaurant = {
  name: '',
  location: '',
  reason: '',
  dishes: '',
  price_range: '',
}

function makeDay(
  attractions: string[],
  timeline: TimelineItem[] = []
): DayPlan {
  return {
    title: '',
    attractions,
    timeline,
    lunch: restaurant,
    dinner: restaurant,
    daily_budget: 0,
  }
}

function timelineItem(name: string, name_en: string): TimelineItem {
  return { time: '', name, name_en, description: '' }
}

function makeOccurrences(names: string[]): RouteOccurrence[] {
  return buildRouteModel([makeDay(names)], '巴黎').occurrences
}

describe('buildRouteModel', () => {
  it('prefers one normalized exact timeline match and preserves display text', () => {
    const displayName = '  LoUvRe   MUSEUM  '
    const { occurrences } = buildRouteModel(
      [
        makeDay(
          [displayName],
          [
            timelineItem('louvre museum', 'Louvre Museum'),
            timelineItem('Louvre Museum Annex', 'Louvre Museum Annex'),
          ]
        ),
      ],
      'Paris'
    )

    expect(occurrences).toHaveLength(1)
    expect(occurrences[0]).toMatchObject({
      dayIndex: 0,
      order: 0,
      name: displayName,
      wikiTitle: 'Louvre Museum',
    })
  })

  it('uses a unique containment match when there is no exact match', () => {
    const { occurrences } = buildRouteModel(
      [
        makeDay(
          ['塞纳河'],
          [timelineItem('塞纳河游船', 'Seine')]
        ),
      ],
      '巴黎'
    )

    expect(occurrences[0].wikiTitle).toBe('Seine')
  })

  it('does not guess for zero or ambiguous containment matches', () => {
    const { occurrences } = buildRouteModel(
      [
        makeDay(
          ['凯旋门', '公园'],
          [
            timelineItem('中央公园', 'Central Park'),
            timelineItem('城市公园', 'City Park'),
          ]
        ),
      ],
      '巴黎'
    )

    expect(occurrences.map(({ wikiTitle }) => wikiTitle)).toEqual([null, null])
  })

  it('does not guess when multiple exact matches exist', () => {
    const { occurrences } = buildRouteModel(
      [
        makeDay(
          ['博物馆'],
          [
            timelineItem('博物馆', 'Museum One'),
            timelineItem(' 博物馆 ', 'Museum Two'),
          ]
        ),
      ],
      '北京'
    )

    expect(occurrences[0].wikiTitle).toBeNull()
  })

  it('filters blank attractions and compacts the remaining order', () => {
    const { occurrences } = buildRouteModel(
      [makeDay(['卢浮宫', '   ', '\n\t', '埃菲尔铁塔'])],
      '巴黎'
    )

    expect(occurrences.map(({ name, order }) => [name, order])).toEqual([
      ['卢浮宫', 0],
      ['埃菲尔铁塔', 1],
    ])
  })

  it('deduplicates location targets without removing cross-day occurrences', () => {
    const { occurrences, targets } = buildRouteModel(
      [
        makeDay(
          ['卢浮宫', '卢浮宫别名'],
          [
            timelineItem('卢浮宫', 'Louvre Museum'),
            timelineItem('卢浮宫别名', ' louvre   museum '),
          ]
        ),
        makeDay(
          ['卢浮宫'],
          [timelineItem('卢浮宫', 'LOUVRE MUSEUM')]
        ),
      ],
      '巴黎'
    )

    expect(occurrences).toHaveLength(3)
    expect(new Set(occurrences.map(({ targetKey }) => targetKey)).size).toBe(1)
    expect(targets).toHaveLength(1)
    expect(targets[0]).toMatchObject({
      name: '卢浮宫',
      destination: '巴黎',
      wikiTitle: 'Louvre Museum',
    })
  })

  it('shares fallback targets for normalized repeated names and destination', () => {
    const { occurrences, targets } = buildRouteModel(
      [makeDay(['  老城  ']), makeDay(['老城'])],
      '  Kyoto  '
    )

    expect(occurrences).toHaveLength(2)
    expect(occurrences[0].targetKey).toBe(occurrences[1].targetKey)
    expect(targets).toHaveLength(1)
    expect(targets[0]).toMatchObject({
      name: '  老城  ',
      destination: '  Kyoto  ',
      wikiTitle: null,
    })
  })
})

describe('applyTargetResults', () => {
  it('maps one target result back to every occurrence and preserves nulls', () => {
    const { occurrences } = buildRouteModel(
      [makeDay(['卢浮宫']), makeDay(['卢浮宫', '未知地点'])],
      '巴黎'
    )
    const louvreKey = occurrences[0].targetKey
    const unknownKey = occurrences[2].targetKey
    const coordinate: RouteCoordinate = {
      lat: 48.8606,
      lng: 2.3376,
      source: 'wikipedia',
    }

    const resolved = applyTargetResults(
      occurrences,
      new Map([
        [louvreKey, coordinate],
        [unknownKey, null],
      ])
    )

    expect(resolved).toHaveLength(3)
    expect(resolved[0].coordinate).toEqual(coordinate)
    expect(resolved[1].coordinate).toEqual(coordinate)
    expect(resolved[2].coordinate).toBeNull()
  })
})

describe('groupRouteByDay', () => {
  it('keeps all-view occurrences in independent day groups and day order', () => {
    const model = buildRouteModel(
      [makeDay(['A', 'B']), makeDay(['C'])],
      'Paris'
    )
    const resolved = applyTargetResults(model.occurrences, new Map())

    const groups = groupRouteByDay([...resolved].reverse())

    expect(groups.map((group) => group.map(({ name }) => name))).toEqual([
      ['A', 'B'],
      ['C'],
    ])
  })
})

describe('buildGoogleMapsSegments', () => {
  it('returns no links for an empty route', () => {
    expect(buildGoogleMapsSegments([], '巴黎')).toEqual([])
  })

  it('uses a search URL for one original attraction name', () => {
    const [segment] = buildGoogleMapsSegments(makeOccurrences(['卢浮宫']), '巴黎')
    const url = new URL(segment.url)

    expect(segment.names).toEqual(['卢浮宫'])
    expect(url.pathname).toBe('/maps/search/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('query')).toBe('卢浮宫, 巴黎')
  })

  it('uses origin, destination, and encoded waypoints for 2 to 5 stops', () => {
    for (const names of [
      ['A', 'B'],
      ['A', 'B', 'C', 'D', 'E'],
    ]) {
      const [segment] = buildGoogleMapsSegments(makeOccurrences(names), 'New York')
      const url = new URL(segment.url)

      expect(url.pathname).toBe('/maps/dir/')
      expect(url.searchParams.get('api')).toBe('1')
      expect(url.searchParams.get('origin')).toBe('A, New York')
      expect(url.searchParams.get('destination')).toBe(
        `${names.at(-1)}, New York`
      )
      expect(url.searchParams.get('waypoints')).toBe(
        names
          .slice(1, -1)
          .map((name) => `${name}, New York`)
          .join('|') || null
      )
      expect(segment.names).toEqual(names)
    }
  })

  it('splits 6 or more stops into overlapping segments of at most five', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const segments = buildGoogleMapsSegments(makeOccurrences(names), '巴黎')

    expect(segments.map(({ label, names: segmentNames }) => [label, segmentNames])).toEqual([
      ['第 1/2 段', ['A', 'B', 'C', 'D', 'E']],
      ['第 2/2 段', ['E', 'F', 'G']],
    ])
    expect(segments.every(({ names: segmentNames }) => segmentNames.length <= 5)).toBe(true)

    const secondUrl = new URL(segments[1].url)
    expect(secondUrl.searchParams.get('origin')).toBe('E, 巴黎')
    expect(secondUrl.searchParams.get('destination')).toBe('G, 巴黎')
    expect(secondUrl.searchParams.get('waypoints')).toBe('F, 巴黎')
  })

  it('builds links from names even when all coordinates are null', () => {
    const occurrences = makeOccurrences(['原始名称 A', '原始名称 B'])
    const resolved = applyTargetResults(occurrences, new Map())

    const [segment] = buildGoogleMapsSegments(resolved, '目的地')

    expect(segment.names).toEqual(['原始名称 A', '原始名称 B'])
  })
})
