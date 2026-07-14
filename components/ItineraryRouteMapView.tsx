'use client'

import { Fragment, useEffect, useMemo } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { ResolvedRouteOccurrence } from '@/lib/itinerary-route'

const DAY_COLORS = [
  '#4f46e5',
  '#059669',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#0891b2',
] as const

const DEFAULT_CENTER: [number, number] = [20, 0]
const FIT_BOUNDS_OPTIONS = {
  padding: [24, 24] as [number, number],
  maxZoom: 15,
}

interface Props {
  groups: ResolvedRouteOccurrence[][]
  mode: 'day' | 'all'
}

interface NumberedOccurrence {
  occurrence: ResolvedRouteOccurrence
  number: number
  position: [number, number] | null
}

function isValidCoordinate(
  occurrence: ResolvedRouteOccurrence
): occurrence is ResolvedRouteOccurrence & {
  coordinate: NonNullable<ResolvedRouteOccurrence['coordinate']>
} {
  const coordinate = occurrence.coordinate
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate.lat) &&
      Number.isFinite(coordinate.lng) &&
      coordinate.lat >= -90 &&
      coordinate.lat <= 90 &&
      coordinate.lng >= -180 &&
      coordinate.lng <= 180
  )
}

function dayColor(dayIndex: number): string {
  const paletteIndex = Math.abs(dayIndex) % DAY_COLORS.length
  return DAY_COLORS[paletteIndex]
}

function numberedIcon(number: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div data-route-number="${number}" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:${color};color:#fff;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35);font-size:13px;font-weight:700;line-height:1">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, FIT_BOUNDS_OPTIONS)
    }
  }, [map, positions])

  return null
}

export default function ItineraryRouteMapView({ groups, mode }: Props) {
  const orderedGroups = useMemo(
    () =>
      groups.map((group) =>
        [...group].sort((left, right) => left.order - right.order)
      ),
    [groups]
  )

  const numberedGroups = useMemo(() => {
    let allViewNumber = 1

    return orderedGroups.map((group) =>
      group.map((occurrence, groupIndex): NumberedOccurrence => {
        const number = mode === 'all' ? allViewNumber++ : groupIndex + 1
        return {
          occurrence,
          number,
          position: isValidCoordinate(occurrence)
            ? [occurrence.coordinate.lat, occurrence.coordinate.lng]
            : null,
        }
      })
    )
  }, [mode, orderedGroups])

  const allPositions = useMemo(
    () =>
      numberedGroups.flatMap((group) =>
        group.flatMap((item) => (item.position ? [item.position] : []))
      ),
    [numberedGroups]
  )

  const center = allPositions[0] ?? DEFAULT_CENTER

  return (
    <div className="overflow-hidden rounded-xl border-2 border-slate-100">
      <MapContainer
        center={center}
        zoom={allPositions.length === 1 ? 13 : 3}
        className="h-[360px] w-full"
        style={{ height: 360, width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds positions={allPositions} />

        {numberedGroups.map((group, groupIndex) => {
          const validItems = group.filter(
            (
              item
            ): item is NumberedOccurrence & { position: [number, number] } =>
              item.position !== null
          )
          const color = dayColor(
            group[0]?.occurrence.dayIndex ?? groupIndex
          )

          return (
            <Fragment key={`route-day-${groupIndex}`}>
              {validItems.length >= 2 && (
                <Polyline
                  positions={validItems.map((item) => item.position)}
                  pathOptions={{ color, weight: 4, opacity: 0.8 }}
                />
              )}
              {validItems.map(({ occurrence, number, position }) => (
                <Marker
                  key={`${occurrence.dayIndex}:${occurrence.id}`}
                  position={position}
                  icon={numberedIcon(number, color)}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{occurrence.name}</strong>
                      <div className="mt-1 text-slate-500">
                        第 {occurrence.dayIndex + 1} 天 · 第{' '}
                        {occurrence.order + 1} 站
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
}
