'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import type { Itinerary } from '@/lib/types'

const visitedIcon = L.divIcon({
  className: '',
  html: '<div style="background:#10b981;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const plannedIcon = L.divIcon({
  className: '',
  html: '<div style="background:#6366f1;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

interface MapViewProps {
  itineraries: Itinerary[]
}

export default function MapView({ itineraries }: MapViewProps) {
  const pinned = itineraries.filter(i => i.destination_lat && i.destination_lng)

  if (pinned.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl h-[400px] flex items-center justify-center text-slate-400 text-sm">
        生成第一份攻略，开启你的足迹之旅
      </div>
    )
  }

  const first = pinned[0]
  const center: [number, number] = [first.destination_lat!, first.destination_lng!]

  return (
    <div className="rounded-xl overflow-hidden border-2 border-slate-100" style={{ height: 500 }}>
      <MapContainer center={center} zoom={pinned.length === 1 ? 8 : 2} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {pinned.map(it => (
          <Marker
            key={it.id}
            position={[it.destination_lat!, it.destination_lng!]}
            icon={it.visited ? visitedIcon : plannedIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>{it.destination}</strong> · {it.days}天<br />
                <span className="text-slate-500">{it.start_date} · ¥{it.budget.toLocaleString()}</span><br />
                <Link href={`/itineraries/${it.id}`} className="text-indigo-600 underline">查看详情 →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
