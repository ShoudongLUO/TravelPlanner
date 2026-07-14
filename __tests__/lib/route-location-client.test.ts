import {
  abortableWait,
  cacheKey,
  loadRouteLocations,
  readCachedRouteLocation,
  writeCachedRouteLocation,
} from '@/lib/route-location-client'
import type {
  RouteCoordinate,
  RouteLocationTarget,
} from '@/lib/itinerary-route'

const DAY_MS = 24 * 60 * 60 * 1000

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

function fakeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response
}

function wikiTarget(index: number): RouteLocationTarget {
  return {
    key: `wiki:place-${index}`,
    name: `景点 ${index}`,
    destination: '巴黎',
    wikiTitle: `Place ${index}`,
  }
}

function fallbackTarget(index: number): RouteLocationTarget {
  return {
    key: `place:${index}`,
    name: `地点 ${index}`,
    destination: '京都',
    wikiTitle: null,
  }
}

function asFetcher(
  implementation: typeof fetch
): jest.MockedFunction<typeof fetch> {
  return jest.fn(implementation) as jest.MockedFunction<typeof fetch>
}

function requestUrl(input: RequestInfo | URL): URL {
  const value =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
  return new URL(value, 'http://localhost')
}

function requestedTitles(init?: RequestInit): string[] {
  const parsed = JSON.parse(String(init?.body)) as { titles: string[] }
  return parsed.titles
}

describe('route location cache', () => {
  it('uses separate normalized Wikipedia and Nominatim keys', () => {
    expect(cacheKey('wikipedia', '  Louvre   Museum ')).toBe(
      'wiki:louvre museum'
    )
    expect(cacheKey('nominatim', '卢浮宫', '巴黎')).toBe(
      'nominatim:["卢浮宫","巴黎"]'
    )
  })

  it('keeps Nominatim name and destination boundaries collision-free', () => {
    expect(cacheKey('nominatim', 'a|b', 'c')).not.toBe(
      cacheKey('nominatim', 'a', 'b|c')
    )
  })

  it('round-trips source-specific positive coordinates', () => {
    const storage = new MemoryStorage()
    const wikipedia: RouteCoordinate = {
      lat: 48.8606,
      lng: 2.3376,
      source: 'wikipedia',
    }
    const nominatim: RouteCoordinate = {
      lat: 35.0116,
      lng: 135.7681,
      source: 'nominatim',
    }

    writeCachedRouteLocation(
      storage,
      cacheKey('wikipedia', 'Louvre Museum'),
      wikipedia,
      () => 100
    )
    writeCachedRouteLocation(
      storage,
      cacheKey('nominatim', '祇园', '京都'),
      nominatim,
      () => 101
    )

    expect(
      readCachedRouteLocation(
        storage,
        cacheKey('wikipedia', 'Louvre Museum'),
        () => 102
      )
    ).toEqual({ found: true, value: wikipedia })
    expect(
      readCachedRouteLocation(
        storage,
        cacheKey('nominatim', '祇园', '京都'),
        () => 102
      )
    ).toEqual({ found: true, value: nominatim })
  })

  it('applies 30-day TTL to positives and Wikipedia nulls', () => {
    const storage = new MemoryStorage()
    const wikiKey = cacheKey('wikipedia', 'Unknown Place')
    const nominatimKey = cacheKey('nominatim', '景点', '城市')
    const coordinate: RouteCoordinate = {
      lat: 1,
      lng: 2,
      source: 'nominatim',
    }

    writeCachedRouteLocation(storage, wikiKey, null, () => 0)
    writeCachedRouteLocation(storage, nominatimKey, coordinate, () => 0)

    expect(
      readCachedRouteLocation(storage, wikiKey, () => 30 * DAY_MS - 1)
        .found
    ).toBe(true)
    expect(
      readCachedRouteLocation(
        storage,
        nominatimKey,
        () => 30 * DAY_MS - 1
      ).found
    ).toBe(true)
    expect(
      readCachedRouteLocation(storage, wikiKey, () => 30 * DAY_MS).found
    ).toBe(false)
    expect(
      readCachedRouteLocation(storage, nominatimKey, () => 30 * DAY_MS).found
    ).toBe(false)
  })

  it('expires a Nominatim null after 24 hours', () => {
    const storage = new MemoryStorage()
    const key = cacheKey('nominatim', '未知', '巴黎')
    writeCachedRouteLocation(storage, key, null, () => 0)

    expect(
      readCachedRouteLocation(storage, key, () => DAY_MS - 1)
    ).toEqual({ found: true, value: null })
    expect(
      readCachedRouteLocation(storage, key, () => DAY_MS).found
    ).toBe(false)
  })

  it('rejects invalid coordinates, schemas, versions, and corrupt JSON', () => {
    const storage = new MemoryStorage()
    const key = cacheKey('wikipedia', 'Bad Place')

    writeCachedRouteLocation(
      storage,
      key,
      { lat: 91, lng: 0, source: 'wikipedia' },
      () => 0
    )
    expect(readCachedRouteLocation(storage, key, () => 1).found).toBe(false)

    for (const value of [
      '{broken',
      JSON.stringify({ version: 2, entries: {} }),
      JSON.stringify({ version: 1, entries: [] }),
      JSON.stringify({
        version: 1,
        entries: {
          [key]: {
            value: { lat: 1, lng: 181, source: 'wikipedia' },
            expiresAt: 100,
            lastAccessed: 0,
          },
        },
      }),
    ]) {
      storage.setItem('travelai:route-location-cache:v1', value)
      expect(readCachedRouteLocation(storage, key, () => 1).found).toBe(false)
    }
  })

  it('keeps the 300 most recently used entries', () => {
    const storage = new MemoryStorage()

    for (let index = 0; index < 300; index += 1) {
      writeCachedRouteLocation(
        storage,
        cacheKey('wikipedia', `Place ${index}`),
        { lat: 1, lng: index / 10, source: 'wikipedia' },
        () => index
      )
    }

    const firstKey = cacheKey('wikipedia', 'Place 0')
    const secondKey = cacheKey('wikipedia', 'Place 1')
    expect(
      readCachedRouteLocation(storage, firstKey, () => 1_000).found
    ).toBe(true)
    writeCachedRouteLocation(
      storage,
      cacheKey('wikipedia', 'Place 300'),
      { lat: 1, lng: 30, source: 'wikipedia' },
      () => 1_001
    )

    expect(
      readCachedRouteLocation(storage, firstKey, () => 1_002).found
    ).toBe(true)
    expect(
      readCachedRouteLocation(storage, secondKey, () => 1_002).found
    ).toBe(false)
  })

  it('survives localStorage read, write, quota, and security exceptions', () => {
    const brokenRead = {
      getItem: () => {
        throw new DOMException('Denied', 'SecurityError')
      },
      setItem: jest.fn(),
    } as unknown as Storage
    const brokenWrite = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Full', 'QuotaExceededError')
      },
    } as unknown as Storage
    const key = cacheKey('wikipedia', 'Safe')

    expect(() => readCachedRouteLocation(brokenRead, key, () => 0)).not.toThrow()
    expect(() =>
      writeCachedRouteLocation(brokenWrite, key, null, () => 0)
    ).not.toThrow()
  })

  it('strips unknown fields when writing and reading coordinates', () => {
    const storage = new MemoryStorage()
    const key = cacheKey('wikipedia', 'Sanitized Place')
    const taintedCoordinate = {
      lat: 1,
      lng: 2,
      source: 'wikipedia',
      metadata: { private: true },
    } as RouteCoordinate

    writeCachedRouteLocation(storage, key, taintedCoordinate, () => 0)
    expect(readCachedRouteLocation(storage, key, () => 1)).toEqual({
      found: true,
      value: { lat: 1, lng: 2, source: 'wikipedia' },
    })

    const raw = JSON.parse(
      storage.getItem('travelai:route-location-cache:v1') ?? '{}'
    ) as { entries: Record<string, { value: unknown }> }
    expect(raw.entries[key].value).toEqual({
      lat: 1,
      lng: 2,
      source: 'wikipedia',
    })

    storage.setItem(
      'travelai:route-location-cache:v1',
      JSON.stringify({
        version: 1,
        entries: {
          [key]: {
            value: {
              lat: 3,
              lng: 4,
              source: 'wikipedia',
              nested: { upstream: 'discard' },
            },
            expiresAt: 1_000,
            lastAccessed: 0,
          },
        },
      })
    )

    expect(readCachedRouteLocation(storage, key, () => 2)).toEqual({
      found: true,
      value: { lat: 3, lng: 4, source: 'wikipedia' },
    })
    const persisted = JSON.parse(
      storage.getItem('travelai:route-location-cache:v1') ?? '{}'
    ) as { entries: Record<string, { value: unknown }> }
    expect(persisted.entries[key].value).toEqual({
      lat: 3,
      lng: 4,
      source: 'wikipedia',
    })
  })

  it('trims an externally oversized valid cache before persisting it', () => {
    const storage = new MemoryStorage()
    const entries = Object.fromEntries(
      Array.from({ length: 302 }, (_, index) => [
        cacheKey('wikipedia', `External ${index}`),
        {
          value: { lat: 1, lng: 2, source: 'wikipedia' },
          expiresAt: 10_000,
          lastAccessed: index,
        },
      ])
    )
    storage.setItem(
      'travelai:route-location-cache:v1',
      JSON.stringify({ version: 1, entries })
    )
    const newestKey = cacheKey('wikipedia', 'External 301')

    expect(
      readCachedRouteLocation(storage, newestKey, () => 500).found
    ).toBe(true)
    const persisted = JSON.parse(
      storage.getItem('travelai:route-location-cache:v1') ?? '{}'
    ) as { entries: Record<string, unknown> }
    expect(Object.keys(persisted.entries)).toHaveLength(300)
    expect(persisted.entries[newestKey]).toBeDefined()
    expect(
      persisted.entries[cacheKey('wikipedia', 'External 0')]
    ).toBeUndefined()
  })
})

describe('loadRouteLocations', () => {
  it('returns an empty map without requesting anything', async () => {
    const fetcher = asFetcher(async () => fakeResponse({}))
    const controller = new AbortController()

    await expect(
      loadRouteLocations([], {
        fetcher,
        storage: new MemoryStorage(),
        signal: controller.signal,
      })
    ).resolves.toEqual(new Map())
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    [1, [1]],
    [50, [50]],
    [51, [50, 1]],
    [101, [50, 50, 1]],
  ])(
    'loads %i Wikipedia targets in sequential batches of at most 50',
    async (count, expectedBatchSizes) => {
      const targets = Array.from({ length: count }, (_, index) =>
        wikiTarget(index)
      )
      const requestedBatches: string[][] = []
      const fetcher = asFetcher(async (_input, init) => {
        const titles = requestedTitles(init)
        requestedBatches.push(titles)
        return fakeResponse({
          locations: Object.fromEntries(
            titles.map((title) => [title, { lat: 10, lng: 20 }])
          ),
        })
      })
      const controller = new AbortController()

      const results = await loadRouteLocations(targets, {
        fetcher,
        storage: new MemoryStorage(),
        signal: controller.signal,
      })

      expect(requestedBatches.map((batch) => batch.length)).toEqual(
        expectedBatchSizes
      )
      expect(requestedBatches.flat()).toEqual(
        targets.map((target) => target.wikiTitle)
      )
      expect(results.size).toBe(count)
      expect(
        [...results.values()].every(
          (coordinate) => coordinate?.source === 'wikipedia'
        )
      ).toBe(true)
    }
  )

  it('uses cached Wikipedia coordinates and reports them progressively', async () => {
    const storage = new MemoryStorage()
    const target = wikiTarget(1)
    const coordinate: RouteCoordinate = {
      lat: 48.8606,
      lng: 2.3376,
      source: 'wikipedia',
    }
    writeCachedRouteLocation(
      storage,
      cacheKey('wikipedia', target.wikiTitle ?? ''),
      coordinate,
      () => 0
    )
    const fetcher = asFetcher(async () => fakeResponse({}))
    const onResult = jest.fn()

    const results = await loadRouteLocations([target], {
      fetcher,
      storage,
      signal: new AbortController().signal,
      now: () => 1,
      onResult,
    })

    expect(fetcher).not.toHaveBeenCalled()
    expect(results.get(target.key)).toEqual(coordinate)
    expect(onResult).toHaveBeenCalledWith(
      target.key,
      coordinate,
      'resolved'
    )
  })

  it('isolates observer exceptions after committing and caching a result', async () => {
    const storage = new MemoryStorage()
    const target = wikiTarget(3)
    const onResult = jest.fn(() => {
      throw new Error('observer failed')
    })
    const fetcher = asFetcher(async () =>
      fakeResponse({
        locations: {
          'Place 3': {
            lat: 12,
            lng: 34,
            extra: { shouldNotLeak: true },
          },
        },
      })
    )

    const results = await loadRouteLocations([target], {
      fetcher,
      storage,
      signal: new AbortController().signal,
      now: () => 0,
      onResult,
    })

    const expected = { lat: 12, lng: 34, source: 'wikipedia' }
    expect(results.get(target.key)).toEqual(expected)
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(
      readCachedRouteLocation(
        storage,
        cacheKey('wikipedia', target.wikiTitle ?? ''),
        () => 1
      )
    ).toEqual({ found: true, value: expected })
  })

  it('stops a Wikipedia batch when an observer synchronously aborts', async () => {
    const storage = new MemoryStorage()
    const controller = new AbortController()
    const targets = [wikiTarget(0), wikiTarget(1)]
    const onResult = jest.fn(() => controller.abort())
    const fetcher = asFetcher(async () =>
      fakeResponse({
        locations: {
          'Place 0': { lat: 1, lng: 2 },
          'Place 1': { lat: 3, lng: 4 },
        },
      })
    )

    await expect(
      loadRouteLocations(targets, {
        fetcher,
        storage,
        signal: controller.signal,
        now: () => 0,
        onResult,
      })
    ).rejects.toMatchObject({ name: 'AbortError' })

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(
      readCachedRouteLocation(
        storage,
        cacheKey('wikipedia', targets[0].wikiTitle ?? ''),
        () => 1
      ).found
    ).toBe(true)
    expect(
      readCachedRouteLocation(
        storage,
        cacheKey('wikipedia', targets[1].wikiTitle ?? ''),
        () => 1
      ).found
    ).toBe(false)
  })

  it('falls back after a cached Wikipedia null and uses the first valid candidate', async () => {
    const storage = new MemoryStorage()
    const target = wikiTarget(2)
    writeCachedRouteLocation(
      storage,
      cacheKey('wikipedia', target.wikiTitle ?? ''),
      null,
      () => 0
    )
    const fetcher = asFetcher(async (input) => {
      expect(requestUrl(input).pathname).toBe('/api/geocode')
      return fakeResponse({
        results: [
          { lat: 91, lng: 0 },
          { lat: Number.NaN, lng: 10 },
          {
            lat: 48.861,
            lng: 2.335,
            address: { private: 'discard' },
          },
          { lat: 40, lng: 3 },
        ],
      })
    })

    const results = await loadRouteLocations([target], {
      fetcher,
      storage,
      signal: new AbortController().signal,
      now: () => 1,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(results.get(target.key)).toEqual({
      lat: 48.861,
      lng: 2.335,
      source: 'nominatim',
    })
  })

  it('sends targets without English titles directly to Nominatim', async () => {
    const target = fallbackTarget(0)
    const fetcher = asFetcher(async (input) => {
      const url = requestUrl(input)
      expect(url.pathname).toBe('/api/geocode')
      expect(url.searchParams.get('q')).toBe('地点 0, 京都')
      return fakeResponse({ results: [] })
    })
    const onResult = jest.fn()

    const results = await loadRouteLocations([target], {
      fetcher,
      storage: new MemoryStorage(),
      signal: new AbortController().signal,
      onResult,
    })

    expect(results.get(target.key)).toBeNull()
    expect(onResult).toHaveBeenCalledWith(
      target.key,
      null,
      'not-found'
    )
  })

  it('falls back only for the failed Wikipedia batch and continues later batches', async () => {
    const targets = Array.from({ length: 51 }, (_, index) => wikiTarget(index))
    let wikipediaCall = 0
    let clock = 0
    const fallbackNames: string[] = []
    const fetcher = asFetcher(async (input, init) => {
      const url = requestUrl(input)
      if (url.pathname === '/api/route-locations') {
        wikipediaCall += 1
        if (wikipediaCall === 1) {
          return fakeResponse({ error: 'upstream unavailable' }, 503)
        }
        const titles = requestedTitles(init)
        return fakeResponse({
          locations: Object.fromEntries(
            titles.map((title) => [title, { lat: 10, lng: 20 }])
          ),
        })
      }
      fallbackNames.push(url.searchParams.get('q') ?? '')
      return fakeResponse({ results: [{ lat: 30, lng: 40 }] })
    })

    const results = await loadRouteLocations(targets, {
      fetcher,
      storage: new MemoryStorage(),
      signal: new AbortController().signal,
      now: () => clock,
      wait: async (milliseconds) => {
        clock += milliseconds
      },
    })

    expect(wikipediaCall).toBe(2)
    expect(fallbackNames).toHaveLength(50)
    expect(fallbackNames[0]).toBe('景点 0, 巴黎')
    expect(fallbackNames.at(-1)).toBe('景点 49, 巴黎')
    expect(results.get(targets[0].key)?.source).toBe('nominatim')
    expect(results.get(targets[50].key)?.source).toBe('wikipedia')
  })

  it('paces fallback request starts serially by at least 1000ms', async () => {
    const targets = [fallbackTarget(0), fallbackTarget(1), fallbackTarget(2)]
    let clock = 250
    const starts: number[] = []
    const order: string[] = []
    const fetcher = asFetcher(async (input) => {
      starts.push(clock)
      order.push(requestUrl(input).searchParams.get('q') ?? '')
      return fakeResponse({ results: [{ lat: 10, lng: 20 }] })
    })

    await loadRouteLocations(targets, {
      fetcher,
      storage: new MemoryStorage(),
      signal: new AbortController().signal,
      now: () => clock,
      wait: async (milliseconds) => {
        clock += milliseconds
      },
    })

    expect(starts).toEqual([250, 1_250, 2_250])
    expect(order).toEqual([
      '地点 0, 京都',
      '地点 1, 京都',
      '地点 2, 京都',
    ])
  })

  it('does not wait again when the preceding fallback took at least 1000ms', async () => {
    const targets = [fallbackTarget(0), fallbackTarget(1)]
    let clock = 0
    const starts: number[] = []
    const wait = jest.fn(async () => undefined)
    const fetcher = asFetcher(async () => {
      starts.push(clock)
      clock += 1_000
      return fakeResponse({ results: [{ lat: 10, lng: 20 }] })
    })

    await loadRouteLocations(targets, {
      fetcher,
      storage: new MemoryStorage(),
      signal: new AbortController().signal,
      now: () => clock,
      wait,
    })

    expect(starts).toEqual([0, 1_000])
    expect(wait).not.toHaveBeenCalled()
  })

  it('continues after one fallback fails', async () => {
    const targets = [fallbackTarget(0), fallbackTarget(1)]
    let clock = 0
    const onResult = jest.fn()
    const fetcher = asFetcher(
      jest
        .fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(fakeResponse({ results: [{ lat: 1, lng: 2 }] })) as typeof fetch
    )

    const results = await loadRouteLocations(targets, {
      fetcher,
      storage: new MemoryStorage(),
      signal: new AbortController().signal,
      now: () => clock,
      wait: async (milliseconds) => {
        clock += milliseconds
      },
      onResult,
    })

    expect(results.get(targets[0].key)).toBeNull()
    expect(results.get(targets[1].key)).toEqual({
      lat: 1,
      lng: 2,
      source: 'nominatim',
    })
    expect(onResult).toHaveBeenNthCalledWith(
      1,
      targets[0].key,
      null,
      'retryable-error'
    )
    expect(onResult).toHaveBeenNthCalledWith(
      2,
      targets[1].key,
      { lat: 1, lng: 2, source: 'nominatim' },
      'resolved'
    )
  })

  it('does not negatively cache malformed or retryable Nominatim responses', async () => {
    const storage = new MemoryStorage()
    const target = fallbackTarget(0)
    const fetcher = asFetcher(
      jest
        .fn()
        .mockResolvedValueOnce(fakeResponse({ results: 'invalid' }))
        .mockResolvedValueOnce(fakeResponse({ results: [{ lat: 1, lng: 2 }] })) as typeof fetch
    )
    const firstResult = jest.fn()
    const secondResult = jest.fn()

    await loadRouteLocations([target], {
      fetcher,
      storage,
      signal: new AbortController().signal,
      onResult: firstResult,
    })
    const results = await loadRouteLocations([target], {
      fetcher,
      storage,
      signal: new AbortController().signal,
      onResult: secondResult,
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(firstResult).toHaveBeenCalledWith(
      target.key,
      null,
      'retryable-error'
    )
    expect(secondResult).toHaveBeenCalledWith(
      target.key,
      { lat: 1, lng: 2, source: 'nominatim' },
      'resolved'
    )
    expect(results.get(target.key)?.source).toBe('nominatim')
  })

  it('emits final results progressively after Wikipedia and fallback resolutions', async () => {
    const targets = [wikiTarget(0), wikiTarget(1)]
    const onResult = jest.fn()
    const fetcher = asFetcher(async (input, init) => {
      if (requestUrl(input).pathname === '/api/route-locations') {
        const titles = requestedTitles(init)
        return fakeResponse({
          locations: {
            [titles[0]]: { lat: 1, lng: 2 },
            [titles[1]]: null,
          },
        })
      }
      return fakeResponse({ results: [{ lat: 3, lng: 4 }] })
    })

    await loadRouteLocations(targets, {
      fetcher,
      storage: new MemoryStorage(),
      signal: new AbortController().signal,
      onResult,
    })

    expect(onResult).toHaveBeenNthCalledWith(
      1,
      targets[0].key,
      { lat: 1, lng: 2, source: 'wikipedia' },
      'resolved'
    )
    expect(onResult).toHaveBeenNthCalledWith(
      2,
      targets[1].key,
      { lat: 3, lng: 4, source: 'nominatim' },
      'resolved'
    )
  })

  it('uses cached Nominatim nulls without repeating requests', async () => {
    const storage = new MemoryStorage()
    const target = fallbackTarget(0)
    writeCachedRouteLocation(
      storage,
      cacheKey('nominatim', target.name, target.destination),
      null,
      () => 0
    )
    const fetcher = asFetcher(async () => fakeResponse({}))
    const onResult = jest.fn()

    const results = await loadRouteLocations([target], {
      fetcher,
      storage,
      signal: new AbortController().signal,
      now: () => 1,
      onResult,
    })

    expect(fetcher).not.toHaveBeenCalled()
    expect(results.get(target.key)).toBeNull()
    expect(onResult).toHaveBeenCalledWith(
      target.key,
      null,
      'not-found'
    )
  })

  it('retries only targets that previously failed transiently', async () => {
    const storage = new MemoryStorage()
    const targets = [wikiTarget(0), fallbackTarget(1)]
    const fetcher = asFetcher(
      jest
        .fn()
        .mockResolvedValueOnce(
          fakeResponse({ locations: { 'Place 0': { lat: 1, lng: 2 } } })
        )
        .mockResolvedValueOnce(fakeResponse({ error: 'busy' }, 429))
        .mockResolvedValueOnce(fakeResponse({ results: [{ lat: 3, lng: 4 }] })) as typeof fetch
    )

    await loadRouteLocations(targets, {
      fetcher,
      storage,
      signal: new AbortController().signal,
    })
    const results = await loadRouteLocations(targets, {
      fetcher,
      storage,
      signal: new AbortController().signal,
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(requestUrl(fetcher.mock.calls[2][0]).pathname).toBe('/api/geocode')
    expect(results.get(targets[0].key)?.source).toBe('wikipedia')
    expect(results.get(targets[1].key)?.source).toBe('nominatim')
  })

  it('deduplicates repeated target keys before making requests', async () => {
    const target = wikiTarget(0)
    const fetcher = asFetcher(async (_input, init) => {
      const titles = requestedTitles(init)
      return fakeResponse({
        locations: { [titles[0]]: { lat: 1, lng: 2 } },
      })
    })

    const results = await loadRouteLocations([target, { ...target }], {
      fetcher,
      storage: new MemoryStorage(),
      signal: new AbortController().signal,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(results.size).toBe(1)
  })

  it('stops and rejects with AbortError when a fetch is aborted', async () => {
    const controller = new AbortController()
    const fetcher = asFetcher(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          )
        })
    )

    const loading = loadRouteLocations([wikiTarget(0)], {
      fetcher,
      storage: new MemoryStorage(),
      signal: controller.signal,
    })
    await Promise.resolve()
    controller.abort()

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('stops before the next fallback when its pacing delay is aborted', async () => {
    const controller = new AbortController()
    const fetcher = asFetcher(async () =>
      fakeResponse({ results: [{ lat: 1, lng: 2 }] })
    )
    const wait = jest.fn(async () => {
      controller.abort()
      throw new DOMException('Aborted', 'AbortError')
    })

    const loading = loadRouteLocations(
      [fallbackTarget(0), fallbackTarget(1)],
      {
        fetcher,
        storage: new MemoryStorage(),
        signal: controller.signal,
        now: () => 0,
        wait,
      }
    )

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' })
    expect(wait).toHaveBeenCalledWith(1_000, controller.signal)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('clears the default delay timer when aborted', async () => {
    jest.useFakeTimers()
    const controller = new AbortController()
    const waiting = abortableWait(1_000, controller.signal)

    expect(jest.getTimerCount()).toBe(1)
    controller.abort()

    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
    expect(jest.getTimerCount()).toBe(0)
    jest.useRealTimers()
  })
})
