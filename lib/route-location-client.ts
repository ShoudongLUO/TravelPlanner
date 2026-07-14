import type {
  RouteCoordinate,
  RouteLocationTarget,
} from '@/lib/itinerary-route'

const STORAGE_KEY = 'travelai:route-location-cache:v1'
const CACHE_VERSION = 1
const MAX_ENTRIES = 300
const POSITIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const WIKIPEDIA_NULL_TTL_MS = POSITIVE_TTL_MS
const NOMINATIM_NULL_TTL_MS = 24 * 60 * 60 * 1000
const WIKIPEDIA_BATCH_SIZE = 50
const NOMINATIM_INTERVAL_MS = 1_000

type CacheSource = 'wikipedia' | 'nominatim'
export type ResolutionStatus =
  | 'resolved'
  | 'not-found'
  | 'retryable-error'

interface CacheEntry {
  value: RouteCoordinate | null
  expiresAt: number
  lastAccessed: number
}

interface CacheDocument {
  version: 1
  entries: Record<string, CacheEntry>
}

export interface CachedRouteLocation {
  found: boolean
  value: RouteCoordinate | null
}

export interface RouteLocationLoaderOptions {
  fetcher?: typeof fetch
  storage: Storage
  signal: AbortSignal
  wait?: (
    milliseconds: number,
    signal: AbortSignal
  ) => Promise<void>
  now?: () => number
  onResult?: (
    targetKey: string,
    result: RouteCoordinate | null,
    status: ResolutionStatus
  ) => void
}

function normalizeKeyPart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function cacheKey(
  source: CacheSource,
  value: string,
  destination = ''
): string {
  if (source === 'wikipedia') {
    return `wiki:${normalizeKeyPart(value)}`
  }

  return `nominatim:${normalizeKeyPart(value)}|${normalizeKeyPart(destination)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteCoordinate(
  value: unknown
): value is Record<string, unknown> &
  Pick<RouteCoordinate, 'lat' | 'lng'> {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    value.lng >= -180 &&
    value.lng <= 180
  )
}

function isRouteCoordinate(value: unknown): value is RouteCoordinate {
  if (!isRecord(value) || !isFiniteCoordinate(value)) {
    return false
  }

  return value.source === 'wikipedia' || value.source === 'nominatim'
}

function coordinateMatchesKey(
  key: string,
  coordinate: RouteCoordinate
): boolean {
  return (
    (key.startsWith('wiki:') && coordinate.source === 'wikipedia') ||
    (key.startsWith('nominatim:') && coordinate.source === 'nominatim')
  )
}

function isCacheKey(key: string): boolean {
  return key.startsWith('wiki:') || key.startsWith('nominatim:')
}

function parseCacheEntry(key: string, value: unknown): CacheEntry | null {
  if (!isRecord(value)) {
    return null
  }

  const rawCoordinate = value.value
  let coordinate: RouteCoordinate | null
  if (rawCoordinate === null) {
    coordinate = null
  } else if (
    isRouteCoordinate(rawCoordinate) &&
    coordinateMatchesKey(key, rawCoordinate)
  ) {
    coordinate = rawCoordinate
  } else {
    return null
  }

  if (
    typeof value.expiresAt !== 'number' ||
    !Number.isFinite(value.expiresAt) ||
    typeof value.lastAccessed !== 'number' ||
    !Number.isFinite(value.lastAccessed)
  ) {
    return null
  }

  return {
    value: coordinate,
    expiresAt: value.expiresAt,
    lastAccessed: value.lastAccessed,
  }
}

function emptyCache(): CacheDocument {
  return { version: CACHE_VERSION, entries: {} }
}

function readCacheDocument(storage: Storage): CacheDocument {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) {
      return emptyCache()
    }

    const parsed: unknown = JSON.parse(raw)
    if (
      !isRecord(parsed) ||
      parsed.version !== CACHE_VERSION ||
      !isRecord(parsed.entries)
    ) {
      return emptyCache()
    }

    const entries: Record<string, CacheEntry> = {}
    Object.entries(parsed.entries).forEach(([key, value]) => {
      if (!isCacheKey(key)) {
        return
      }
      const entry = parseCacheEntry(key, value)
      if (entry) {
        entries[key] = entry
      }
    })

    return { version: CACHE_VERSION, entries }
  } catch {
    return emptyCache()
  }
}

function persistCacheDocument(
  storage: Storage,
  document: CacheDocument
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(document))
  } catch {
    // Cache failures must never prevent route loading.
  }
}

export function readCachedRouteLocation(
  storage: Storage,
  key: string,
  now: () => number = Date.now
): CachedRouteLocation {
  if (!isCacheKey(key)) {
    return { found: false, value: null }
  }

  const document = readCacheDocument(storage)
  const entry = document.entries[key]
  if (!entry) {
    return { found: false, value: null }
  }

  const currentTime = now()
  if (entry.expiresAt <= currentTime) {
    delete document.entries[key]
    persistCacheDocument(storage, document)
    return { found: false, value: null }
  }

  entry.lastAccessed = currentTime
  persistCacheDocument(storage, document)
  return { found: true, value: entry.value }
}

function ttlFor(key: string, value: RouteCoordinate | null): number {
  if (value !== null) {
    return POSITIVE_TTL_MS
  }
  return key.startsWith('wiki:')
    ? WIKIPEDIA_NULL_TTL_MS
    : NOMINATIM_NULL_TTL_MS
}

export function writeCachedRouteLocation(
  storage: Storage,
  key: string,
  value: RouteCoordinate | null,
  now: () => number = Date.now
): void {
  if (
    !isCacheKey(key) ||
    (value !== null &&
      (!isRouteCoordinate(value) || !coordinateMatchesKey(key, value)))
  ) {
    return
  }

  const currentTime = now()
  const document = readCacheDocument(storage)
  document.entries[key] = {
    value,
    expiresAt: currentTime + ttlFor(key, value),
    lastAccessed: currentTime,
  }

  const orderedEntries = Object.entries(document.entries).sort(
    ([, left], [, right]) => left.lastAccessed - right.lastAccessed
  )
  while (orderedEntries.length > MAX_ENTRIES) {
    const oldest = orderedEntries.shift()
    if (oldest) {
      delete document.entries[oldest[0]]
    }
  }

  persistCacheDocument(storage, document)
}

function createAbortError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Aborted', 'AbortError')
  }
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw createAbortError()
  }
}

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  return (
    signal.aborted ||
    (isRecord(error) && error.name === 'AbortError')
  )
}

export function abortableWait(
  milliseconds: number,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError())
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(createAbortError())
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

interface TargetState {
  target: RouteLocationTarget
  resolved: boolean
}

interface WikipediaGroup {
  cacheKey: string
  title: string
  states: TargetState[]
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function parseWikipediaLocations(
  payload: unknown,
  titles: string[]
): Map<string, Pick<RouteCoordinate, 'lat' | 'lng'> | null> | null {
  if (!isRecord(payload) || !isRecord(payload.locations)) {
    return null
  }

  const locations = new Map<
    string,
    Pick<RouteCoordinate, 'lat' | 'lng'> | null
  >()
  for (const title of titles) {
    if (!Object.prototype.hasOwnProperty.call(payload.locations, title)) {
      return null
    }
    const value = payload.locations[title]
    if (value !== null && !isFiniteCoordinate(value)) {
      return null
    }
    locations.set(title, value)
  }
  return locations
}

function parseNominatimCoordinate(payload: unknown):
  | { kind: 'resolved'; coordinate: Pick<RouteCoordinate, 'lat' | 'lng'> }
  | { kind: 'not-found' }
  | { kind: 'retryable-error' } {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    return { kind: 'retryable-error' }
  }
  if (payload.results.length === 0) {
    return { kind: 'not-found' }
  }

  const coordinate = payload.results.find(isFiniteCoordinate)
  return coordinate
    ? { kind: 'resolved', coordinate }
    : { kind: 'retryable-error' }
}

function fallbackQuery(target: RouteLocationTarget): string {
  const name = target.name.trim()
  const destination = target.destination.trim()
  return destination ? `${name}, ${destination}` : name
}

export async function loadRouteLocations(
  targets: RouteLocationTarget[],
  options: RouteLocationLoaderOptions
): Promise<Map<string, RouteCoordinate | null>> {
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? Date.now
  const wait = options.wait ?? abortableWait
  const { storage, signal, onResult } = options
  const results = new Map<string, RouteCoordinate | null>()
  const uniqueTargets = new Map<string, RouteLocationTarget>()
  targets.forEach((target) => {
    if (!uniqueTargets.has(target.key)) {
      uniqueTargets.set(target.key, target)
    }
  })

  const states: TargetState[] = [...uniqueTargets.values()].map((target) => ({
    target,
    resolved: false,
  }))
  if (states.length === 0) {
    return results
  }
  throwIfAborted(signal)

  const resolve = (
    state: TargetState,
    coordinate: RouteCoordinate | null,
    status: ResolutionStatus
  ) => {
    state.resolved = true
    results.set(state.target.key, coordinate)
    onResult?.(state.target.key, coordinate, status)
  }

  const wikipediaGroups = new Map<string, WikipediaGroup>()
  states.forEach((state) => {
    const title = state.target.wikiTitle?.trim()
    if (!title) {
      return
    }

    const key = cacheKey('wikipedia', title)
    let group = wikipediaGroups.get(key)
    if (!group) {
      group = { cacheKey: key, title, states: [] }
      wikipediaGroups.set(key, group)
    }
    group.states.push(state)
  })

  const wikipediaMisses: WikipediaGroup[] = []
  wikipediaGroups.forEach((group) => {
    const cached = readCachedRouteLocation(storage, group.cacheKey, now)
    if (!cached.found) {
      wikipediaMisses.push(group)
      return
    }
    if (cached.value) {
      const coordinate = cached.value
      group.states.forEach((state) =>
        resolve(state, coordinate, 'resolved')
      )
    }
  })

  for (const batch of chunk(wikipediaMisses, WIKIPEDIA_BATCH_SIZE)) {
    throwIfAborted(signal)
    const titles = batch.map((group) => group.title)
    try {
      const response = await fetcher('/api/route-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles }),
        signal,
      })
      throwIfAborted(signal)
      if (!response.ok) {
        continue
      }

      const payload: unknown = await response.json()
      throwIfAborted(signal)
      const locations = parseWikipediaLocations(payload, titles)
      if (!locations) {
        continue
      }

      batch.forEach((group) => {
        const location = locations.get(group.title)
        if (location === null) {
          writeCachedRouteLocation(
            storage,
            group.cacheKey,
            null,
            now
          )
          return
        }
        if (!location) {
          return
        }
        const coordinate: RouteCoordinate = {
          ...location,
          source: 'wikipedia',
        }
        writeCachedRouteLocation(
          storage,
          group.cacheKey,
          coordinate,
          now
        )
        group.states.forEach((state) =>
          resolve(state, coordinate, 'resolved')
        )
      })
    } catch (error) {
      if (isAbortError(error, signal)) {
        throw createAbortError()
      }
      // A transient Wikipedia failure leaves this batch eligible for fallback.
    }
  }

  let lastFallbackStart: number | null = null
  for (const state of states) {
    if (state.resolved) {
      continue
    }
    throwIfAborted(signal)

    const nominatimKey = cacheKey(
      'nominatim',
      state.target.name,
      state.target.destination
    )
    const cached = readCachedRouteLocation(storage, nominatimKey, now)
    if (cached.found) {
      resolve(
        state,
        cached.value,
        cached.value ? 'resolved' : 'not-found'
      )
      continue
    }

    if (lastFallbackStart !== null) {
      const remaining = NOMINATIM_INTERVAL_MS - (now() - lastFallbackStart)
      if (remaining > 0) {
        await wait(remaining, signal)
      }
      throwIfAborted(signal)
    }
    lastFallbackStart = now()

    try {
      const parameters = new URLSearchParams({ q: fallbackQuery(state.target) })
      const response = await fetcher(`/api/geocode?${parameters.toString()}`, {
        signal,
      })
      throwIfAborted(signal)
      if (!response.ok) {
        resolve(state, null, 'retryable-error')
        continue
      }

      const payload: unknown = await response.json()
      throwIfAborted(signal)
      const parsed = parseNominatimCoordinate(payload)
      if (parsed.kind === 'retryable-error') {
        resolve(state, null, 'retryable-error')
        continue
      }
      if (parsed.kind === 'not-found') {
        writeCachedRouteLocation(storage, nominatimKey, null, now)
        resolve(state, null, 'not-found')
        continue
      }

      const coordinate: RouteCoordinate = {
        ...parsed.coordinate,
        source: 'nominatim',
      }
      writeCachedRouteLocation(storage, nominatimKey, coordinate, now)
      resolve(state, coordinate, 'resolved')
    } catch (error) {
      if (isAbortError(error, signal)) {
        throw createAbortError()
      }
      resolve(state, null, 'retryable-error')
    }
  }

  return results
}
