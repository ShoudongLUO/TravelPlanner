'use client'
import { useState, useEffect, useRef } from 'react'
import { filterCities } from '@/lib/cities'
import type { City } from '@/lib/cities'

interface GeoResult {
  city: string
  country: string
  country_code: string
}

interface LocationInputProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export default function LocationInput({ id, label, placeholder, value, onChange }: LocationInputProps) {
  const [query, setQuery] = useState(value)
  const [nominatimResults, setNominatimResults] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  const localMatches = query.trim().length >= 1 ? filterCities(query) : []

  useEffect(() => {
    if (query.trim().length < 2) { setNominatimResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const localNames = new Set(localMatches.map(c => c.name))
        setNominatimResults((data.results ?? []).filter((r: GeoResult) => !localNames.has(r.city)))
      } catch {
        setNominatimResults([])
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (name: string) => {
    setQuery(name)
    onChange(name)
    setOpen(false)
    setNominatimResults([])
  }

  const showDropdown = open && query.trim().length >= 1 && (localMatches.length > 0 || nominatimResults.length > 0)

  return (
    <div ref={containerRef} className="flex flex-col gap-1 relative">
      <label htmlFor={id} className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        type="text"
        className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-slate-50"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        autoComplete="off"
      />
      {showDropdown && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {localMatches.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase bg-slate-50">⚡ 快速匹配</div>
              {localMatches.map((city: City) => (
                <button key={city.name} type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2"
                  onClick={() => select(city.name)}>
                  <span className="font-medium text-slate-700">{city.name}</span>
                  <span className="text-slate-400 text-xs ml-auto">{city.country}</span>
                </button>
              ))}
            </>
          )}
          {nominatimResults.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase bg-slate-50 border-t border-slate-100">🌐 更多结果</div>
              {nominatimResults.map((r, i) => (
                <button key={i} type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2"
                  onClick={() => select(r.city)}>
                  <span className="font-medium text-slate-700">{r.city}</span>
                  <span className="text-slate-400 text-xs ml-auto">{r.country}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
