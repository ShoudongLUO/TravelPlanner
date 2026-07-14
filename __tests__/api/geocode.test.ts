/**
 * @jest-environment node
 */
import { GET } from '@/app/api/geocode/route'
import { NextRequest } from 'next/server'

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'

function geocodeRequest(query?: string, signal?: AbortSignal) {
  const url = new URL('http://localhost/api/geocode')
  if (query !== undefined) url.searchParams.set('q', query)
  return new NextRequest(url, { signal })
}

function nominatimResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

const mockNominatimResponse = [
  {
    display_name: '上海市, 中国',
    lat: '31.2304',
    lon: '121.4737',
    address: { city: '上海市', country: '中国', country_code: 'cn' },
  },
]

describe('GET /api/geocode', () => {
  const fetchMock = jest.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns 400 without fetching when q is missing or blank', async () => {
    for (const request of [geocodeRequest(), geocodeRequest('   ')]) {
      const response = await GET(request)

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: expect.any(String) })
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects excessive surrounding whitespace without fetching', async () => {
    const response = await GET(geocodeRequest(`${' '.repeat(200)}Paris`))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.any(String) })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a trimmed query longer than 200 characters without fetching', async () => {
    const response = await GET(geocodeRequest('界'.repeat(201)))

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: expect.any(String) })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns numeric coordinates through the existing result contract', async () => {
    fetchMock.mockReturnValue(nominatimResponse(mockNominatimResponse))

    const response = await GET(geocodeRequest('  上海  '))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      results: [
        {
          display_name: '上海市, 中国',
          city: '上海市',
          country: '中国',
          country_code: 'cn',
          lat: 31.2304,
          lng: 121.4737,
        },
      ],
    })
  })

  it('uses the fixed Nominatim request and a meaningful user agent', async () => {
    fetchMock.mockReturnValue(nominatimResponse([]))

    await GET(geocodeRequest(' A&B / C '))
    const [input, init] = fetchMock.mock.calls[0]
    const url = new URL(String(input))

    expect(url.origin + url.pathname).toBe(NOMINATIM_ENDPOINT)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'A&B / C',
      format: 'json',
      limit: '5',
      addressdetails: '1',
    })
    expect(init).toEqual(
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'User-Agent': expect.stringMatching(/TravelPlanner.+github\.com/i),
        }),
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('filters malformed candidates and keeps valid candidates in provider order', async () => {
    fetchMock.mockReturnValue(
      nominatimResponse([
        {
          display_name: 'bad latitude',
          lat: 'NaN',
          lon: '2.3',
          address: { city: 'bad' },
        },
        {
          display_name: 'first valid',
          lat: '48.8566',
          lon: '2.3522',
          address: { city: 'Paris', country: 'France', country_code: 'fr' },
        },
        {
          display_name: 'bad latitude range',
          lat: '90.0001',
          lon: '0',
        },
        {
          display_name: 'bad longitude range',
          lat: '0',
          lon: '-180.0001',
        },
        null,
        {
          display_name: 'second valid',
          lat: '-33.8688',
          lon: '151.2093',
          address: { town: 'Sydney' },
        },
      ]),
    )

    const response = await GET(geocodeRequest('Paris'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results.map((item: { display_name: string }) => item.display_name)).toEqual([
      'first valid',
      'second valid',
    ])
    expect(body.results[0]).toEqual(
      expect.objectContaining({ lat: 48.8566, lng: 2.3522 }),
    )
  })

  it('sanitizes optional address fields and does not expose provider metadata', async () => {
    fetchMock.mockReturnValue(
      nominatimResponse([
        {
          display_name: '  Mont-Saint-Michel, France  ',
          lat: 48.636,
          lon: -1.5115,
          importance: 0.9,
          address: {
            city: 7,
            village: 'Mont-Saint-Michel',
            country: { secret: true },
            country_code: 'fr',
            postcode: '50170',
          },
        },
        {
          display_name: 'Louvre Museum, Paris',
          lat: '48.8606',
          lon: '2.3376',
          address: 'unexpected',
        },
      ]),
    )

    const response = await GET(geocodeRequest('France'))

    expect(await response.json()).toEqual({
      results: [
        {
          display_name: '  Mont-Saint-Michel, France  ',
          city: 'Mont-Saint-Michel',
          country: '',
          country_code: 'fr',
          lat: 48.636,
          lng: -1.5115,
        },
        {
          display_name: 'Louvre Museum, Paris',
          city: 'Louvre Museum',
          country: '',
          country_code: '',
          lat: 48.8606,
          lng: 2.3376,
        },
      ],
    })
  })

  it('returns an empty successful response for a genuine empty result', async () => {
    fetchMock.mockReturnValue(nominatimResponse([]))

    const response = await GET(geocodeRequest('Nowhere'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ results: [] })
  })

  it.each([
    ['invalid JSON', new Response('{', { status: 200 })],
    ['non-array root', new Response('{}', { status: 200 })],
  ])('maps an %s upstream contract to 503', async (_label, upstream) => {
    fetchMock.mockResolvedValue(upstream)

    const response = await GET(geocodeRequest('Paris'))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ results: [] })
  })

  it('maps an upstream 429 response to 429', async () => {
    fetchMock.mockReturnValue(nominatimResponse({ error: 'rate limited' }, 429))

    const response = await GET(geocodeRequest('Paris'))

    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ results: [] })
  })

  it.each([500, 502, 503])('maps an upstream %s response to 503', async status => {
    fetchMock.mockReturnValue(nominatimResponse({ error: 'upstream' }, status))

    const response = await GET(geocodeRequest('Paris'))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ results: [] })
  })

  it('maps network failures to 503', async () => {
    fetchMock.mockRejectedValue(new TypeError('network unavailable'))

    const response = await GET(geocodeRequest('Paris'))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ results: [] })
  })

  it('aborts at exactly 10 seconds, returns 503, and clears the timer', async () => {
    jest.useFakeTimers()
    let upstreamSignal: AbortSignal | undefined
    let settled = false
    fetchMock.mockImplementation((_input, init) => {
      upstreamSignal = init?.signal ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        upstreamSignal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const responsePromise = GET(geocodeRequest('Paris'))
    void responsePromise.then(() => {
      settled = true
    })
    await jest.advanceTimersByTimeAsync(0)

    expect(upstreamSignal).toBeInstanceOf(AbortSignal)
    expect(upstreamSignal?.aborted).toBe(false)
    expect(settled).toBe(false)

    await jest.advanceTimersByTimeAsync(9_999)

    expect(upstreamSignal?.aborted).toBe(false)
    expect(settled).toBe(false)

    await jest.advanceTimersByTimeAsync(1)
    const response = await responsePromise

    expect(upstreamSignal?.aborted).toBe(true)
    expect(settled).toBe(true)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ results: [] })
    expect(jest.getTimerCount()).toBe(0)
  })

  it('forwards request cancellation and releases timer resources', async () => {
    jest.useFakeTimers()
    const requestController = new AbortController()
    let upstreamSignal: AbortSignal | undefined
    fetchMock.mockImplementation((_input, init) => {
      upstreamSignal = init?.signal ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        upstreamSignal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const responsePromise = GET(geocodeRequest('Paris', requestController.signal))
    await jest.advanceTimersByTimeAsync(0)
    expect(upstreamSignal?.aborted).toBe(false)

    requestController.abort()
    expect(upstreamSignal?.aborted).toBe(true)
    const response = await responsePromise

    expect(response.status).toBe(503)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('clears the timeout after a successful request', async () => {
    jest.useFakeTimers()
    fetchMock.mockReturnValue(nominatimResponse([]))

    const response = await GET(geocodeRequest('Paris'))

    expect(response.status).toBe(200)
    expect(jest.getTimerCount()).toBe(0)
  })
})
