import type { DayPlan, TimelineItem } from '@/lib/types'

export interface RouteOccurrence {
  id: string
  dayIndex: number
  order: number
  name: string
  wikiTitle: string | null
  targetKey: string
}

export interface RouteLocationTarget {
  key: string
  name: string
  destination: string
  wikiTitle: string | null
}

export interface RouteCoordinate {
  lat: number
  lng: number
  source: 'wikipedia' | 'nominatim'
}

export interface ResolvedRouteOccurrence extends RouteOccurrence {
  coordinate: RouteCoordinate | null
}

export interface GoogleMapsSegment {
  label: string
  url: string
  names: string[]
}

function normalizeForComparison(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function timelineWikiTitle(
  attractionName: string,
  timeline: TimelineItem[]
): string | null {
  const normalizedAttraction = normalizeForComparison(attractionName)
  const exactMatches = timeline.filter(
    (item) => normalizeForComparison(item.name) === normalizedAttraction
  )

  if (exactMatches.length > 1) {
    return null
  }

  if (exactMatches.length === 1) {
    return exactMatches[0].name_en.trim() || null
  }

  const containmentMatches = timeline.filter((item) => {
    const normalizedTimelineName = normalizeForComparison(item.name)
    return (
      normalizedTimelineName.length > 0 &&
      (normalizedTimelineName.includes(normalizedAttraction) ||
        normalizedAttraction.includes(normalizedTimelineName))
    )
  })

  if (containmentMatches.length !== 1) {
    return null
  }

  return containmentMatches[0].name_en.trim() || null
}

function fallbackTargetKey(
  attractionName: string,
  destination: string
): string {
  return `place:${JSON.stringify([
    normalizeForComparison(attractionName),
    normalizeForComparison(destination),
  ])}`
}

interface RouteOccurrenceCandidate {
  id: string
  dayIndex: number
  order: number
  name: string
  matchedWikiTitle: string | null
  groupKey: string
}

export function buildRouteModel(
  days: DayPlan[],
  destination: string
): { occurrences: RouteOccurrence[]; targets: RouteLocationTarget[] } {
  const candidates: RouteOccurrenceCandidate[] = []

  days.forEach((day, dayIndex) => {
    let order = 0

    day.attractions.forEach((name) => {
      if (!normalizeForComparison(name)) {
        return
      }

      candidates.push({
        id: `day-${dayIndex}-stop-${order}`,
        dayIndex,
        order,
        name,
        matchedWikiTitle: timelineWikiTitle(name, day.timeline),
        groupKey: fallbackTargetKey(name, destination),
      })
      order += 1
    })
  })

  const wikiTitlesByGroup = new Map<string, Map<string, string>>()

  candidates.forEach((candidate) => {
    let titles = wikiTitlesByGroup.get(candidate.groupKey)
    if (!titles) {
      titles = new Map()
      wikiTitlesByGroup.set(candidate.groupKey, titles)
    }

    if (candidate.matchedWikiTitle) {
      const normalizedTitle = normalizeForComparison(
        candidate.matchedWikiTitle
      )
      if (!titles.has(normalizedTitle)) {
        titles.set(normalizedTitle, candidate.matchedWikiTitle)
      }
    }
  })

  const wikiTitleByGroup = new Map<string, string | null>()
  wikiTitlesByGroup.forEach((titles, groupKey) => {
    wikiTitleByGroup.set(
      groupKey,
      titles.size === 1 ? [...titles.values()][0] : null
    )
  })

  const targetByKey = new Map<string, RouteLocationTarget>()
  const occurrences = candidates.map((candidate): RouteOccurrence => {
    const wikiTitle = wikiTitleByGroup.get(candidate.groupKey) ?? null
    const key = wikiTitle
      ? `wiki:${normalizeForComparison(wikiTitle)}`
      : candidate.groupKey
    const occurrence: RouteOccurrence = {
      id: candidate.id,
      dayIndex: candidate.dayIndex,
      order: candidate.order,
      name: candidate.name,
      wikiTitle,
      targetKey: key,
    }

    if (!targetByKey.has(key)) {
      targetByKey.set(key, {
        key,
        name: candidate.name,
        destination,
        wikiTitle,
      })
    }

    return occurrence
  })

  return { occurrences, targets: [...targetByKey.values()] }
}

export function applyTargetResults(
  occurrences: RouteOccurrence[],
  results: Map<string, RouteCoordinate | null>
): ResolvedRouteOccurrence[] {
  return occurrences.map((occurrence) => ({
    ...occurrence,
    coordinate: results.get(occurrence.targetKey) ?? null,
  }))
}

export function groupRouteByDay(
  occurrences: ResolvedRouteOccurrence[]
): ResolvedRouteOccurrence[][] {
  if (occurrences.length === 0) {
    return []
  }

  const lastDayIndex = Math.max(
    ...occurrences.map((occurrence) => occurrence.dayIndex)
  )
  const groups = Array.from(
    { length: lastDayIndex + 1 },
    (): ResolvedRouteOccurrence[] => []
  )

  occurrences.forEach((occurrence) => {
    groups[occurrence.dayIndex].push(occurrence)
  })

  groups.forEach((group) => {
    group.sort((left, right) => left.order - right.order)
  })

  return groups
}

function googlePlace(name: string, destination: string): string {
  const trimmedName = name.trim()
  const trimmedDestination = destination.trim()
  return trimmedDestination
    ? `${trimmedName}, ${trimmedDestination}`
    : trimmedName
}

function googleMapsUrl(names: string[], destination: string): string {
  if (names.length === 1) {
    const parameters = new URLSearchParams({
      api: '1',
      query: googlePlace(names[0], destination),
    })
    return `https://www.google.com/maps/search/?${parameters.toString()}`
  }

  const parameters = new URLSearchParams({
    api: '1',
    origin: googlePlace(names[0], destination),
    destination: googlePlace(names[names.length - 1], destination),
  })
  const waypoints = names.slice(1, -1)

  if (waypoints.length > 0) {
    parameters.set(
      'waypoints',
      waypoints.map((name) => googlePlace(name, destination)).join('|')
    )
  }

  return `https://www.google.com/maps/dir/?${parameters.toString()}`
}

export function buildGoogleMapsSegments(
  occurrences: RouteOccurrence[],
  destination: string
): GoogleMapsSegment[] {
  const names = occurrences
    .filter((occurrence) => normalizeForComparison(occurrence.name))
    .map((occurrence) => occurrence.name)

  if (names.length === 0) {
    return []
  }

  const segmentNames: string[][] = []

  for (let start = 0; start < names.length; start += 4) {
    segmentNames.push(names.slice(start, start + 5))
    if (start + 5 >= names.length) {
      break
    }
  }

  return segmentNames.map((currentNames, index) => ({
    label:
      segmentNames.length === 1
        ? '在 Google Maps 打开'
        : `第 ${index + 1}/${segmentNames.length} 段`,
    url: googleMapsUrl(currentNames, destination),
    names: currentNames,
  }))
}
