'use client'
import dynamic from 'next/dynamic'
import MapStats from './MapStats'
import type { Itinerary } from '@/lib/types'

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="bg-slate-50 rounded-xl h-[500px] flex items-center justify-center text-slate-400 text-sm">
      地图加载中...
    </div>
  ),
})

interface MapClientProps {
  itineraries: Itinerary[]
}

export default function MapClient({ itineraries }: MapClientProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <MapStats itineraries={itineraries} />
      <MapView itineraries={itineraries} />

      {itineraries.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-3">📋 攻略列表</h2>
          <div className="space-y-2">
            {itineraries.map(it => (
              <div key={it.id} className="bg-white border-2 border-slate-100 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">{it.visited ? '✅' : '⏳'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800">{it.destination}</div>
                  <div className="text-xs text-slate-500">
                    {it.destination_country ?? '未知地区'} · {it.start_date} · {it.days}天 · ¥{it.budget.toLocaleString()}
                  </div>
                </div>
                <a
                  href={`/itineraries/${it.id}`}
                  className="text-xs text-indigo-600 underline font-semibold"
                >
                  查看 →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
