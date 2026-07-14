'use client'

import dynamic from 'next/dynamic'
import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  applyTargetResults,
  buildGoogleMapsSegments,
  buildRouteModel,
  groupRouteByDay,
  type RouteCoordinate,
  type RouteLocationTarget,
} from '@/lib/itinerary-route'
import {
  loadRouteLocations,
  type ResolutionStatus,
} from '@/lib/route-location-client'
import type { ItineraryContent } from '@/lib/types'

export function RouteMapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-label="路线图加载中"
      className={`animate-pulse rounded-xl bg-slate-100 ${className}`}
    />
  )
}

const ItineraryRouteMapView = dynamic(
  () => import('./ItineraryRouteMapView'),
  {
    ssr: false,
    loading: () => <RouteMapSkeleton className="h-[360px]" />,
  }
)

interface Props {
  content: ItineraryContent
  destination: string
}

type ViewKey = `day-${number}` | 'all'

interface MapErrorBoundaryProps {
  children: ReactNode
  resetKey: string
}

interface MapErrorBoundaryState {
  failed: boolean
}

class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { failed: true }
  }

  componentDidUpdate(previousProps: MapErrorBoundaryProps) {
    if (
      this.state.failed &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          role="status"
          className="flex h-[180px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm text-amber-800"
        >
          地图暂时无法加载
        </div>
      )
    }

    return this.props.children
  }
}

const FALLBACK_STORAGE: Storage = {
  length: 0,
  clear() {
    // Deliberately unavailable: the loader still performs network requests.
  },
  getItem() {
    return null
  },
  key() {
    return null
  },
  removeItem() {
    // Deliberately unavailable.
  },
  setItem() {
    // Deliberately unavailable.
  },
}

function browserStorage(): Storage {
  try {
    return window.localStorage
  } catch {
    return FALLBACK_STORAGE
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function viewDayIndex(view: ViewKey): number | null {
  if (view === 'all') {
    return null
  }
  return Number(view.slice('day-'.length))
}

interface ControllerProps {
  model: ReturnType<typeof buildRouteModel>
  modelKey: string
  destination: string
}

export default function ItineraryRouteMap({ content, destination }: Props) {
  const model = useMemo(
    () => buildRouteModel(content.days ?? [], destination),
    [content.days, destination]
  )
  const modelKey = useMemo(
    () =>
      JSON.stringify([
        destination.trim(),
        model.occurrences.map((item) => [item.id, item.name, item.targetKey]),
      ]),
    [destination, model.occurrences]
  )

  if (!destination.trim() || model.occurrences.length === 0) {
    return null
  }

  return (
    <RouteMapController
      key={modelKey}
      model={model}
      modelKey={modelKey}
      destination={destination}
    />
  )
}

function RouteMapController({
  model,
  modelKey,
  destination,
}: ControllerProps) {
  const reactId = useId()
  const idBase = `itinerary-route-${reactId.replace(/:/g, '')}`
  const panelId = `${idBase}-content`
  const nonEmptyDayIndexes = useMemo(
    () => [...new Set(model.occurrences.map((item) => item.dayIndex))],
    [model.occurrences]
  )
  const firstView: ViewKey = nonEmptyDayIndexes.length
    ? `day-${nonEmptyDayIndexes[0]}`
    : 'all'
  const [open, setOpen] = useState(false)
  const [selectedView, setSelectedView] = useState<ViewKey>(firstView)
  const [results, setResults] = useState(
    () => new Map<string, RouteCoordinate | null>()
  )
  const [statuses, setStatuses] = useState(
    () => new Map<string, ResolutionStatus>()
  )
  const [loading, setLoading] = useState(false)
  const [mapReset, setMapReset] = useState(0)
  const mountedRef = useRef(true)
  const activeTaskRef = useRef(false)
  const loadedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const tabRefs = useRef(new Map<ViewKey, HTMLButtonElement>())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  const runLoad = useCallback(
    async (targets: RouteLocationTarget[], retry = false) => {
      if (activeTaskRef.current || targets.length === 0) {
        return
      }

      activeTaskRef.current = true
      setLoading(true)
      if (retry) {
        setMapReset((value) => value + 1)
      }
      if (
        abortControllerRef.current === null ||
        abortControllerRef.current.signal.aborted
      ) {
        abortControllerRef.current = new AbortController()
      }
      const controller = abortControllerRef.current

      const updateResult = (
        targetKey: string,
        result: RouteCoordinate | null,
        status: ResolutionStatus
      ) => {
        if (!mountedRef.current || controller.signal.aborted) {
          return
        }
        setResults((current) => {
          const next = new Map(current)
          next.set(targetKey, result)
          return next
        })
        setStatuses((current) => {
          const next = new Map(current)
          next.set(targetKey, status)
          return next
        })
      }

      try {
        const loaded = await loadRouteLocations(targets, {
          storage: browserStorage(),
          signal: controller.signal,
          onResult: updateResult,
        })
        if (mountedRef.current && !controller.signal.aborted) {
          setResults((current) => {
            const next = new Map(current)
            loaded.forEach((value, key) => next.set(key, value))
            return next
          })
        }
      } catch (error) {
        if (!isAbortError(error) && mountedRef.current) {
          setStatuses((current) => {
            const next = new Map(current)
            targets.forEach((target) => {
              if (!next.has(target.key)) {
                next.set(target.key, 'retryable-error')
              }
            })
            return next
          })
        }
      } finally {
        activeTaskRef.current = false
        if (!retry) {
          loadedRef.current = true
        }
        if (mountedRef.current && !controller.signal.aborted) {
          setLoading(false)
        }
      }
    },
    []
  )

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }

    setOpen(true)
    if (!loadedRef.current && !activeTaskRef.current) {
      void runLoad(model.targets)
    }
  }

  const retryableTargets = model.targets.filter(
    (target) => statuses.get(target.key) === 'retryable-error'
  )
  const retryFailed = () => {
    if (retryableTargets.length > 0) {
      void runLoad(retryableTargets, true)
    }
  }

  const resolvedOccurrences = applyTargetResults(model.occurrences, results)
  const allGroups = groupRouteByDay(resolvedOccurrences).filter(
    (group) => group.length > 0
  )
  const selectedDayIndex = viewDayIndex(selectedView)
  const currentGroups =
    selectedView === 'all'
      ? allGroups
      : [
          resolvedOccurrences.filter(
            (item) => item.dayIndex === selectedDayIndex
          ),
        ]
  const currentOccurrences = currentGroups.flat()
  const locatedCount = resolvedOccurrences.filter(
    (item) => item.coordinate !== null
  ).length
  const totalCount = model.occurrences.length
  const hasAnyCoordinate = currentOccurrences.some(
    (item) => item.coordinate !== null
  )
  const hasAnyFailure = [...statuses.values()].some(
    (status) => status !== 'resolved'
  )
  const hasReportedStatus = statuses.size > 0
  const notFoundCount = model.occurrences.filter(
    (item) => statuses.get(item.targetKey) === 'not-found'
  ).length
  const retryableCount = model.occurrences.filter(
    (item) => statuses.get(item.targetKey) === 'retryable-error'
  ).length

  const tabs: Array<{ key: ViewKey; label: string }> = [
    ...nonEmptyDayIndexes.map((dayIndex) => ({
      key: `day-${dayIndex}` as ViewKey,
      label: `Day ${dayIndex + 1}`,
    })),
    { key: 'all', label: '全部行程' },
  ]

  const selectTab = (key: ViewKey, focus = false) => {
    setSelectedView(key)
    if (focus) {
      tabRefs.current.get(key)?.focus()
    }
  }

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    key: ViewKey
  ) => {
    const currentIndex = tabs.findIndex((tab) => tab.key === key)
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1
    }
    if (nextIndex !== null) {
      event.preventDefault()
      selectTab(tabs[nextIndex].key, true)
    }
  }

  const navigationGroups =
    selectedView === 'all'
      ? currentGroups.map((group) => ({
          dayIndex: group[0].dayIndex,
          segments: buildGoogleMapsSegments(group, destination),
        }))
      : [
          {
            dayIndex: selectedDayIndex ?? 0,
            segments: buildGoogleMapsSegments(
              currentOccurrences,
              destination
            ),
          },
        ]

  const selectedTabId = `${idBase}-tab-${selectedView}`
  const tabPanelId = `${idBase}-panel-${selectedView}`

  return (
    <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <span aria-hidden="true" className="text-xl">
          🗺️
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-800">
            行程路线图
          </span>
          <span className="block text-xs text-slate-500">
            按天浏览景点顺序，也可查看全部行程
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-slate-400 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div id={panelId} className="space-y-4 border-t border-slate-100 p-4">
          <div
            role="tablist"
            aria-label="路线图日期"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {tabs.map((tab) => {
              const selected = tab.key === selectedView
              return (
                <button
                  key={tab.key}
                  ref={(node) => {
                    if (node) tabRefs.current.set(tab.key, node)
                    else tabRefs.current.delete(tab.key)
                  }}
                  id={`${idBase}-tab-${tab.key}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${idBase}-panel-${tab.key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(tab.key)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div
            id={tabPanelId}
            role="tabpanel"
            aria-labelledby={selectedTabId}
            className="space-y-4"
          >
            <div aria-live="polite" className="text-sm text-slate-600">
              已定位 {locatedCount}/{totalCount} 个景点
              {loading && <span className="ml-2 text-indigo-600">正在定位…</span>}
            </div>

            {hasAnyFailure && locatedCount > 0 && (
              <p className="text-sm text-amber-700">
                部分地点暂时无法定位，路线会跳过这些坐标。
                {notFoundCount > 0 && ` 未找到 ${notFoundCount} 个。`}
                {retryableCount > 0 &&
                  ` 有 ${retryableCount} 个地点可重试。`}
              </p>
            )}

            {loading && !hasAnyCoordinate ? (
              <RouteMapSkeleton className="h-[360px]" />
            ) : hasAnyCoordinate ? (
              <MapErrorBoundary
                resetKey={`${modelKey}:${selectedView}:${mapReset}`}
              >
                <ItineraryRouteMapView
                  groups={currentGroups}
                  mode={selectedView === 'all' ? 'all' : 'day'}
                />
              </MapErrorBoundary>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                {hasReportedStatus
                  ? '暂时没有可显示的坐标，仍可使用下方地点列表和 Google Maps。'
                  : '正在准备地点坐标，仍可使用下方地点列表和 Google Maps。'}
              </div>
            )}

            <ol className="grid gap-2 sm:grid-cols-2">
              {currentOccurrences.map((item, index) => (
                <li
                  key={`${item.dayIndex}:${item.id}`}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span>{item.name}</span>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-2">
              {navigationGroups.flatMap(({ dayIndex, segments }) =>
                segments.map((segment) => {
                  const label =
                    selectedView === 'all'
                      ? `Day ${dayIndex + 1} · ${segment.label}`
                      : segment.label
                  return (
                    <a
                      key={`${dayIndex}:${segment.label}`}
                      href={segment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                    >
                      {label}
                    </a>
                  )
                })
              )}
            </div>

            {retryableTargets.length > 0 && (
              <button
                type="button"
                onClick={retryFailed}
                disabled={loading}
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                重试失败地点
              </button>
            )}

            <p className="text-xs leading-relaxed text-slate-400">
              展开后会向 Wikipedia、Nominatim 和 OpenStreetMap 请求地点与地图数据；查询结果会保存在此浏览器。地图连线仅表示游览顺序，并非道路导航。
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
