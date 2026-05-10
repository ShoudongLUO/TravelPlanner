import { filterCities, CITIES } from '@/lib/cities'

describe('CITIES', () => {
  it('has at least 50 entries', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(50)
  })
  it('each city has name, nameEn, country, countryCode', () => {
    CITIES.forEach(c => {
      expect(c.name).toBeTruthy()
      expect(c.nameEn).toBeTruthy()
      expect(c.country).toBeTruthy()
      expect(c.countryCode).toBeTruthy()
    })
  })
})

describe('filterCities', () => {
  it('matches by Chinese name', () => {
    const results = filterCities('上海')
    expect(results.some(c => c.name === '上海')).toBe(true)
  })
  it('matches by English name (case insensitive)', () => {
    const results = filterCities('paris')
    expect(results.some(c => c.name === '巴黎')).toBe(true)
  })
  it('returns empty array for empty query', () => {
    expect(filterCities('')).toEqual([])
  })
  it('returns max 5 results', () => {
    expect(filterCities('a').length).toBeLessThanOrEqual(5)
  })
})
