# Itinerary Route Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lazy, collapsible itinerary route map to generated and saved itineraries, with per-day/all-day views, Wikipedia coordinates, Nominatim fallback, and Google Maps navigation links.

**Architecture:** Keep route extraction, cache/load orchestration, API adapters, Leaflet rendering, and UI state in separate focused modules. The client first resolves standard English attraction titles in one batched Wikipedia request, serially falls back to the existing Nominatim proxy, caches source-specific outcomes, and passes resolved points to a dynamically loaded Leaflet view. No itinerary schema, database, or prompt changes are required.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, Leaflet 1.9.4, React Leaflet 5, Jest 30, Testing Library, GitHub Actions.

---

## Execution constraints

- Work only on remote branch `feature/itinerary-route-map`; do not clone or pull the repository locally.
- Use GitHub Contents/Git Data APIs for remote file changes and task-sized commits.
- Preserve the accepted public-Nominatim fallback risk documented in the design; do not describe it as globally rate-safe.
- Before code, retain evidence that the following package-internal Next.js 16.2.6 docs were read from `/tmp/next-16.2.6.tgz`:
  - `package/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  - `package/dist/docs/01-app/01-getting-started/15-route-handlers.md`
  - `package/dist/docs/01-app/02-guides/lazy-loading.md`
  - `package/dist/docs/01-app/02-guides/caching-without-cache-components.md`
  - `package/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
- Because there is no local checkout, validation runs in GitHub Actions. Every red test and green implementation is a separate remote commit, and the next change waits for the workflow tied to that exact commit SHA.

## Remote red-green protocol

For every TDD task below:

1. Create one Git Data API commit containing all new/changed failing tests for that step.
2. Record its SHA as `RED_SHA`.
3. Find the CI run with `gh run list --workflow CI --branch feature/itinerary-route-map --commit "$RED_SHA" --json databaseId,headSha,status,conclusion`.
4. Run `gh run watch <red-run-id> --exit-status`; a nonzero conclusion is expected. Inspect `gh run view <red-run-id> --log` and confirm the failure is only the missing/incorrect behavior named in the step.
5. Create the smallest implementation commit and record it as `GREEN_SHA`.
6. Find the run for `GREEN_SHA`, then run `gh run watch <green-run-id> --exit-status`.
7. Inspect the full log with `gh run view <green-run-id> --log`; require a successful conclusion and no new warnings before continuing.

Never use `gh run list --limit 1` as proof because it may select a stale run.

## File map

**Create**

- `.github/workflows/ci.yml` — remote unit/lint/build validation.
- `lib/itinerary-route.ts` — occurrence extraction, unique timeline matching, view grouping, and Google Maps segments.
- `lib/route-location-client.ts` — browser cache plus Wikipedia-first/Nominatim-fallback orchestration.
- `app/api/route-locations/route.ts` — batch Wikipedia coordinate adapter.
- `components/ItineraryRouteMapView.tsx` — Leaflet-only map rendering and bounds fitting.
- `components/ItineraryRouteMap.tsx` — accessible collapsible UI, tabs, loading/error states, retry, and dynamic map import.
- `__tests__/lib/itinerary-route.test.ts`
- `__tests__/lib/route-location-client.test.ts`
- `__tests__/api/route-locations.test.ts`
- `__tests__/components/ItineraryRouteMapView.test.tsx`
- `__tests__/components/ItineraryRouteMap.test.tsx`
- `__tests__/components/ItineraryDetail.test.tsx`
- `__tests__/components/ItineraryStream.test.tsx`

**Modify**

- `app/api/geocode/route.ts` — return validated numeric coordinates and retryable upstream statuses.
- `__tests__/api/geocode.test.ts` — protect the expanded response contract and failure handling.
- `components/ItineraryStream.tsx` — render route map only after generation completes.
- `components/ItineraryDetail.tsx` — render route map in the itinerary tab.

## Task 0: Reconfirm the remote baseline

**Files:** Read-only; no changes.

- [ ] **Step 1: Record branch HEAD and instruction files**

Run:

```bash
gh api repos/ShoudongLUO/TravelPlanner/git/ref/heads/feature/itinerary-route-map
gh api -H 'Accept: application/vnd.github.raw+json' \
  'repos/ShoudongLUO/TravelPlanner/contents/AGENTS.md?ref=feature/itinerary-route-map'
```

Expected: branch contains the approved design and plan commits; `AGENTS.md` still requires Next package-internal docs.

- [ ] **Step 2: Re-read remote build/test configuration**

Read `.github/workflows/`, `package.json`, `package-lock.json`, `jest.config.ts`, `jest.setup.ts`, `next.config.ts`, `lib/types.ts`, `LocationInput.tsx`, `ItineraryStream.tsx`, `ItineraryDetail.tsx`, and both existing map components via `gh api`.

Expected: no pre-existing `ci.yml`; scripts remain `test`, `lint`, and `build`; Jest remains based on `next/jest`; `destination` and completed content are available at both integration sites.

- [ ] **Step 3: Stop if the baseline changed materially**

If another commit changed the relevant files or introduced CI since planning, update the plan and obtain confirmation before writing.

## Task 1: Establish remote CI validation

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add a branch/PR workflow**

```yaml
name: CI

on:
  push:
    branches: [feature/itinerary-route-map]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY: test-anon-key
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test -- --runInBand
      - run: npm run lint
      - run: npm run build
```

- [ ] **Step 2: Commit the workflow remotely**

Commit message: `ci: validate route map branch`

- [ ] **Step 3: Verify the workflow for its exact commit**

Record the workflow commit SHA, query the run using `--commit <sha>`, then run `gh run watch <run-id> --exit-status` and `gh run view <run-id> --log`.

Expected: workflow `CI` completes successfully on the unchanged baseline.

## Task 2: Implement route-domain helpers with TDD

**Files:**

- Create: `lib/itinerary-route.ts`
- Create: `__tests__/lib/itinerary-route.test.ts`

- [ ] **Step 1: Write failing extraction and matching tests**

Cover unique exact match, unique fuzzy containment match, zero match, ambiguous match, empty attractions, repeated attractions across days, and preservation of display text/order. Normalization may only trim/collapse whitespace and compare case-insensitively; it must never change display text.

```ts
const { occurrences } = buildRouteModel([
  {
    ...day,
    attractions: ['卢浮宫', '塞纳河'],
    timeline: [
      { time: '09:00', name: '卢浮宫', name_en: 'Louvre Museum', description: '' },
      { time: '12:00', name: '塞纳河游船', name_en: 'Seine', description: '' },
    ],
  },
], '巴黎')

expect(occurrences.map(item => [item.name, item.wikiTitle])).toEqual([
  ['卢浮宫', 'Louvre Museum'],
  ['塞纳河', 'Seine'],
])
```

- [ ] **Step 2: Add failing grouping, target, result-mapping, and Google Maps tests**

Test that duplicate occurrences share a `RouteLocationTarget`, target results map back to every occurrence, all-view groups remain per-day, raw names are used even when coordinates are null, per-view numbering restarts as specified, blank attractions are excluded from the `X/Y` denominator, and 1/2/5/6+ points yield search/directions/overlapping segments of at most five stops.

- [ ] **Step 3: Commit tests and verify the exact red run**

Expected failing subset in the red CI log: `__tests__/lib/itinerary-route.test.ts`.

Expected: FAIL because `lib/itinerary-route.ts` does not exist.

- [ ] **Step 4: Implement route types, model construction, and result mapping**

```ts
export interface RouteOccurrence {
  id: string
  dayIndex: number
  order: number
  name: string
  wikiTitle: string | null
  targetKey: string
}

export interface RouteLocationTarget {
  key: string
  name: string
  destination: string
  wikiTitle: string | null
}

export interface RouteCoordinate {
  lat: number
  lng: number
  source: 'wikipedia' | 'nominatim'
}

export interface ResolvedRouteOccurrence extends RouteOccurrence {
  coordinate: RouteCoordinate | null
}

export function buildRouteModel(
  days: DayPlan[],
  destination: string
): { occurrences: RouteOccurrence[]; targets: RouteLocationTarget[] }

export function applyTargetResults(
  occurrences: RouteOccurrence[],
  results: Map<string, RouteCoordinate | null>
): ResolvedRouteOccurrence[]
```

Matching rule: compare attraction with `timeline[].name`; accept one exact match, otherwise one and only one containment match. Never guess when multiple timeline entries match.

Build one stable target per unique Wikipedia title when available; otherwise use normalized attraction plus destination. Multiple occurrences, including cross-day repeats, may share a target. Result application maps that target back to every occurrence without removing repeats.

- [ ] **Step 5: Implement grouping and URL segments**

```ts
export interface GoogleMapsSegment {
  label: string
  url: string
  names: string[]
}

export function groupRouteByDay(
  occurrences: ResolvedRouteOccurrence[]
): ResolvedRouteOccurrence[][]

export function buildGoogleMapsSegments(
  occurrences: RouteOccurrence[],
  destination: string
): GoogleMapsSegment[]
```

Split after five stops and share the preceding segment endpoint with the next segment.

- [ ] **Step 6: Commit implementation and verify the exact green run**

Expected in the green CI log: `__tests__/lib/itinerary-route.test.ts` passes within the full `npm test -- --runInBand` step.

Expected: PASS.

- [ ] **Step 7: Commit labels**

Red commit: `test: specify itinerary route helpers`

Green commit: `feat: add itinerary route helpers`

## Task 3: Implement source-specific browser cache and loader with TDD

**Files:**

- Create: `lib/route-location-client.ts`
- Create: `__tests__/lib/route-location-client.test.ts`

- [ ] **Step 1: Write failing cache tests**

Test separate keys, schema validation, coordinate bounds, 30-day positive/Wikipedia-null TTL, 24-hour Nominatim-null TTL, LRU cap of 300, corrupt JSON recovery, localStorage read/write/quota/security exceptions, and transient errors not being cached.

```ts
expect(cacheKey('wikipedia', 'Louvre Museum')).toBe('wiki:louvre museum')
expect(cacheKey('nominatim', '卢浮宫', '巴黎')).toBe('nominatim:卢浮宫|巴黎')
```

- [ ] **Step 2: Write failing loader tests**

Cover 0/1/50/51/100+ Wikipedia targets, cached Wikipedia coordinate, cached Wikipedia-null still running Nominatim, no-English-title direct fallback, one failed Wikipedia batch falling back only for that batch, serial fallback order, first valid Nominatim candidate selection, one fallback failure continuing to the next target, retryable/malformed responses not negatively cached, progressive `onResult` calls, retrying only failed targets, and abort during fetch or delay.

- [ ] **Step 3: Commit tests and verify the exact red run**

Expected failing subset in the red CI log: `__tests__/lib/route-location-client.test.ts`.

Expected: FAIL because the client module does not exist.

- [ ] **Step 4: Implement the versioned localStorage cache**

```ts
const STORAGE_KEY = 'travelai:route-location-cache:v1'
const MAX_ENTRIES = 300
const POSITIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const NOMINATIM_NULL_TTL_MS = 24 * 60 * 60 * 1000
```

Expose cache functions that accept a `Storage` and `now` dependency so tests do not rely on real time.

- [ ] **Step 5: Implement the dependency-injected loader**

```ts
export interface RouteLocationLoaderOptions {
  fetcher?: typeof fetch
  storage: Storage
  signal: AbortSignal
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>
  now?: () => number
  onResult?: (
    targetKey: string,
    result: RouteCoordinate | null,
    status: 'resolved' | 'not-found' | 'retryable-error'
  ) => void
}

export async function loadRouteLocations(
  targets: RouteLocationTarget[],
  options: RouteLocationLoaderOptions
): Promise<Map<string, RouteCoordinate | null>>
```

Split Wikipedia titles into sequential batches of at most 50. Query each target key once, then run Nominatim fallbacks sequentially with at least 1000 ms between fallback starts. Call `onResult` after each cached/Wikipedia/Nominatim resolution so the component can update immediately. Treat malformed JSON/contracts, 429, 5xx, and timeout as retryable and do not negative-cache them. An abort-aware delay must clear its timer and reject with `AbortError`.

- [ ] **Step 6: Commit implementation and verify the exact green run**

Expected in the green CI log: `__tests__/lib/route-location-client.test.ts` passes within the full Jest step.

Expected: PASS.

- [ ] **Step 7: Commit labels**

Red commit: `test: specify route location loading`

Green commit: `feat: add route location cache and loader`

## Task 4: Add the Wikipedia coordinate API with TDD

**Files:**

- Create: `app/api/route-locations/route.ts`
- Create: `__tests__/api/route-locations.test.ts`

- [ ] **Step 1: Write failing route tests**

Test invalid request JSON, missing/non-array titles, 0/1/50 titles, >50 titles, oversized title, normalized title mapping, redirect mapping, page without coordinates, invalid upstream JSON/contract, invalid/out-of-range coordinates, upstream 429, upstream 5xx, and thrown timeout.

```ts
const response = await POST(new Request('http://localhost/api/route-locations', {
  method: 'POST',
  body: JSON.stringify({ titles: ['Louvre Museum', 'Eiffel Tower'] }),
}))

expect(await response.json()).toEqual({
  locations: {
    'Louvre Museum': { lat: 48.8606, lng: 2.3376 },
    'Eiffel Tower': null,
  },
})
```

- [ ] **Step 2: Commit tests and verify the exact red run**

Expected failing subset in the red CI log: `__tests__/api/route-locations.test.ts`.

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the POST adapter**

Use a server-side GET request to:

```text
https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=coordinates&coprimary=primary&colimit=1&redirects=1&titles=...
```

Set a meaningful `User-Agent`, a request timeout, and `next: { revalidate: 2592000 }`. Resolve `query.normalized` then `query.redirects` before mapping pages back to every input title. Return retryable 429/503 status for transient upstream errors.

- [ ] **Step 4: Commit implementation and verify the exact green run**

Expected in the green CI log: `__tests__/api/route-locations.test.ts` passes within the full Jest step.

Expected: PASS.

- [ ] **Step 5: Commit labels**

Red commit: `test: specify Wikipedia route locations API`

Green commit: `feat: add Wikipedia route locations API`

## Task 5: Extend Nominatim proxy coordinates safely with TDD

**Files:**

- Modify: `app/api/geocode/route.ts`
- Modify: `__tests__/api/geocode.test.ts`

- [ ] **Step 1: Extend failing API assertions**

Add `lat` and `lng` fixtures and assert numeric output. Add tests for query length >200, invalid JSON/contract, NaN, latitude outside `[-90, 90]`, longitude outside `[-180, 180]`, deterministic first-valid-candidate selection, timeout, 429, and 5xx.

- [ ] **Step 2: Commit tests and verify the exact red run**

Expected failing subset in the red CI log: `__tests__/api/geocode.test.ts`.

Expected: FAIL because coordinates are omitted and transient status is not preserved.

- [ ] **Step 3: Implement the smallest compatible response change**

```ts
interface GeoResult {
  display_name: string
  city: string
  country: string
  country_code: string
  lat: number
  lng: number
}
```

Keep the existing `{ results: GeoResult[] }` body used by `LocationInput`; extra fields are backward compatible. Return `{ results: [] }` with status 429 for upstream 429 and status 503 for timeout/5xx so the route loader can distinguish transient failures. Preserve status 200 for a genuine empty result.

- [ ] **Step 4: Commit implementation and verify the exact green run**

Expected in the green CI log: `__tests__/api/geocode.test.ts` and `__tests__/components/LocationInput.test.tsx` pass within the full Jest step.

Expected: PASS.

- [ ] **Step 5: Commit labels**

Red commit: `test: specify geocode coordinate responses`

Green commit: `feat: return coordinates from geocode API`

## Task 6: Build the Leaflet route renderer with TDD

**Files:**

- Create: `components/ItineraryRouteMapView.tsx`
- Create: `__tests__/components/ItineraryRouteMapView.test.tsx`

- [ ] **Step 1: Write a failing renderer test with mocked React Leaflet**

Mock `MapContainer`, `TileLayer`, `Marker`, `Popup`, `Polyline`, and `useMap`. Verify numbering restarts in a single-day view and follows itinerary occurrence order in all view, per-day independent polylines, a visible marker when only one coordinate exists, no line for one valid point, fit-bounds updates, popup text, and OSM attribution. The ordered text list belongs to the controller test in Task 7.

- [ ] **Step 2: Commit tests and verify the exact red run**

Expected failing subset in the red CI log: `__tests__/components/ItineraryRouteMapView.test.tsx`.

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the client-only renderer**

```tsx
'use client'

interface Props {
  groups: ResolvedRouteOccurrence[][]
  mode: 'day' | 'all'
}
```

Use `L.divIcon` for numbered markers, fixed palette colors by Day, one `Polyline` per group, and a small `FitBounds` child using `useMap`. Import `leaflet/dist/leaflet.css` here and retain OpenStreetMap attribution.

- [ ] **Step 4: Commit implementation and verify the exact green run**

Expected in the green CI log: `__tests__/components/ItineraryRouteMapView.test.tsx` passes within the full Jest step.

Expected: PASS.

- [ ] **Step 5: Commit labels**

Red commit: `test: specify Leaflet route rendering`

Green commit: `feat: render itinerary routes with Leaflet`

## Task 7: Build the collapsible route-map controller with TDD

**Files:**

- Create: `components/ItineraryRouteMap.tsx`
- Create: `__tests__/components/ItineraryRouteMap.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Cover default collapsed state, no request before expansion, accessible `aria-expanded`/`aria-controls`, first-expand load, Day/all tab keyboard selection, loading progress updated by each `onResult`, partial and total failure states, `X/Y` excluding blank attractions, retry-failed action, Google Maps segment buttons, external `target="_blank"` and `rel="noopener noreferrer"`, collapse/re-expand without duplicate load, unmount abort, `<StrictMode>` click/load behavior, dynamic component rejection/render failure, fewer than two coordinates, and empty itinerary/destination behavior.

- [ ] **Step 2: Commit tests and verify the exact red run**

Expected failing subset in the red CI log: `__tests__/components/ItineraryRouteMap.test.tsx`.

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the controller and exact lazy-load boundary**

```tsx
'use client'

const ItineraryRouteMapView = dynamic(
  () => import('./ItineraryRouteMapView'),
  { ssr: false, loading: () => <RouteMapSkeleton className="h-[360px]" /> }
)

interface Props {
  content: ItineraryContent
  destination: string
}
```

Keep `dynamic(..., { ssr:false })` at module top level inside this Client Component, per the Next.js 16.2.6 lazy-loading guide. Start loading from the user toggle handler, not a mount effect, and guard only concurrent active tasks; this avoids React Strict Mode effect cleanup preventing the real request. Collapsing hides but does not cancel in-flight work; unmount aborts and clears timers. Retry starts a new task for retryable/failed target keys only. Render Day tabs and all view only when non-empty occurrences exist.

- [ ] **Step 4: Implement failure-safe external navigation**

Build Google Maps buttons from original attraction names, never from coordinate success. In all view, show per-day links; within a day, show segment labels when >5 stops. Always render a compact ordered place list so the feature remains useful when there are fewer than two coordinates.

- [ ] **Step 5: Implement the map error boundary**

Wrap only the dynamic map area in a small class-based Error Boundary. If the dynamic chunk or renderer throws, replace the map area with “地图暂时无法加载”; keep the ordered place list, status, retry, and Google Maps links outside the boundary. Do not claim this catches third-party tile network failures.

- [ ] **Step 6: Commit implementation and verify the exact green run**

Expected in the green CI log: `__tests__/components/ItineraryRouteMap.test.tsx` passes within the full Jest step.

Expected: PASS.

- [ ] **Step 7: Audit the exact green run**

The full log must have no React act, unhandled rejection, or Strict Mode warning.

- [ ] **Step 8: Commit labels**

Red commit: `test: specify collapsible itinerary route map`

Green commit: `feat: add collapsible itinerary route map`

## Task 8: Integrate generated and saved itinerary pages with TDD

**Files:**

- Modify: `components/ItineraryStream.tsx`
- Modify: `components/ItineraryDetail.tsx`
- Create: `__tests__/components/ItineraryStream.test.tsx`
- Create: `__tests__/components/ItineraryDetail.test.tsx`

- [ ] **Step 1: Write failing integration tests**

Mock child cards and `ItineraryRouteMap`. For `ItineraryStream`, mock `useSearchParams`, the SSE reader, and a `done` payload; assert no route card during streaming and one route card after completion. For `ItineraryDetail`, assert the route card appears at the end of the itinerary tab and not in budget/tips tabs.

- [ ] **Step 2: Commit tests and verify the exact red run**

Expected failing subsets in the red CI log: `__tests__/components/ItineraryStream.test.tsx` and `__tests__/components/ItineraryDetail.test.tsx`.

Expected: FAIL because neither parent renders `ItineraryRouteMap`.

- [ ] **Step 3: Add the route map to both parents**

In `ItineraryStream`, render after all `DayCard` components only when `state.content` exists and generation is complete. In `ItineraryDetail`, render after all `DayCard` components inside `tab === 'itinerary'`.

```tsx
<ItineraryRouteMap content={content} destination={destination} />
```

- [ ] **Step 4: Commit implementation and verify the exact green run**

Expected in the green CI log: the two new parent tests and `__tests__/components/DayCard.test.tsx` all pass within the full Jest step.

Expected: PASS.

- [ ] **Step 5: Commit labels**

Red commit: `test: specify route map parent integration`

Green commit: `feat: show route maps for generated itineraries`

## Task 9: Full remote validation, visual review, and PR

**Files:**

- Review all files changed in Tasks 1–8.

- [ ] **Step 1: Wait for full GitHub Actions validation**

Record the final head SHA, locate the CI run using `--commit <final-sha>`, then run:

```bash
gh run watch --repo ShoudongLUO/TravelPlanner <run-id> --exit-status
gh run view --repo ShoudongLUO/TravelPlanner <run-id> --log
```

Expected: Jest, ESLint, and `next build` all pass with no failed step.

- [ ] **Step 2: Audit warnings and errors**

Inspect the complete Actions log for React act warnings, unhandled rejections, lint warnings, Next.js deprecations, hydration errors, and fetch-cache warnings. Treat new warnings as failures unless justified.

- [ ] **Step 3: Perform an independent code review**

Review requested behavior, Next.js client/server boundaries, route input validation, coordinate mapping, cache privacy/TTL, Nominatim serial fallback, abort/timer cleanup, Leaflet lifecycle, accessibility, no schema/prompt changes, and unintended scope.

- [ ] **Step 4: Prepare the initial PR body and open the pull request**

Create `/tmp/itinerary-route-map-pr.md` with `apply_patch`. It must link the design and plan, summarize behavior and the accepted public-Nominatim limitation, list the final CI run URL/result, and include a “Preview validation: pending” section.

Run:

```bash
gh pr create --repo ShoudongLUO/TravelPlanner \
  --base main \
  --head feature/itinerary-route-map \
  --title "feat: add itinerary route maps" \
  --body-file /tmp/itinerary-route-map-pr.md
```

Expected: the command returns the new PR URL.

- [ ] **Step 5: Discover and inspect a deployed preview when available**

For the newly created PR, query `gh pr checks <pr-number>` plus GitHub deployments/check-runs for `feature/itinerary-route-map`. Wait for relevant checks and use the returned deployment `environment_url` or Vercel check link; never guess a preview URL.

On desktop and narrow viewport, verify collapsed/expanded layout, Day/all tabs, progressive coordinate loading, numbered markers, independent daily lines, bounds fitting, partial-failure message, Google Maps segmentation, retry, saved-detail parity, and map fallback if third-party tiles fail.

If no preview integration exists, mark manual preview inspection as unavailable. Do not claim it passed. Dynamic-module fallback remains automated; tile-network behavior is a separate manual observation.

- [ ] **Step 6: Update the PR body with final preview evidence**

Update `/tmp/itinerary-route-map-pr.md` using `apply_patch`, replacing “pending” with screenshots/check URLs or the explicit unavailable reason, then run:

```bash
gh pr edit --repo ShoudongLUO/TravelPlanner <pr-number> \
  --body-file /tmp/itinerary-route-map-pr.md
```

- [ ] **Step 7: Report completion without merging**

Report changed files, test/build run URLs, warning audit, manual checks, accepted upstream-service limitation, and any skipped preview validation. Do not merge without separate user authorization.
