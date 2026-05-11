import { geocodeDestination } from '@/lib/geocode'

describe('geocodeDestination', () => {
  it('returns coords and country on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{
        lat: '48.8566',
        lon: '2.3522',
        address: { country: 'France' },
      }]),
    }) as jest.Mock
    const result = await geocodeDestination('Paris')
    expect(result).toEqual({ lat: 48.8566, lng: 2.3522, country: 'France' })
  })

  it('returns null when Nominatim returns empty array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    }) as jest.Mock
    expect(await geocodeDestination('Unknown')).toBeNull()
  })

  it('returns null on fetch error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as jest.Mock
    expect(await geocodeDestination('Paris')).toBeNull()
  })

  it('returns null on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock
    expect(await geocodeDestination('Paris')).toBeNull()
  })

  it('handles missing country field gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{
        lat: '35.6762',
        lon: '139.6503',
        address: {},
      }]),
    }) as jest.Mock
    const result = await geocodeDestination('Tokyo')
    expect(result).toEqual({ lat: 35.6762, lng: 139.6503, country: null })
  })
})
