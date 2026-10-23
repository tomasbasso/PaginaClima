# Phase 2: Pronóstico núcleo - Pattern Map

**Mapped:** 2026-10-23
**Files analyzed:** 24 (13 new, 11 modified)
**Analogs found:** 23 / 24 (the SVG chart has a partial analog only)

All paths are relative to the repo root `C:\Users\UD\Desktop\PaginaClima`. Every analog listed was read in full for this map.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/forecast/headline.ts` (new) | utility (pure rules) | transform (snapshot + now → string\|null) | `lib/sky/state.ts` (snapshot + now → state, uses `describeWeather`) | exact |
| `lib/forecast/headline.test.ts` (new) | test | — | `lib/sky/state.test.ts` + `lib/weather/wind.test.ts` (`it.each`) | exact |
| `lib/forecast/meteogram.ts` (new) | utility (pure geometry, d3) | transform (points, width → layout) | `lib/weather/wind.ts` (pure, named constants) + RESEARCH Pattern 1 | role-match |
| `lib/forecast/meteogram.test.ts` (new) | test | — | `lib/weather/wind.test.ts` | role-match |
| `lib/forecast/daily.ts` (new) | utility (pure rows) | transform (daily[], now → rows + scales) | `lib/weather/wind.ts` / `lib/weather/format.ts` | role-match |
| `lib/forecast/daily.test.ts` (new) | test | — | `lib/time.test.ts` (TZ=UTC boundary tests) | exact |
| `lib/forecast/__fixtures__/*.ts` or extension of `app/dev/estados/fixtures.ts` (new) | test fixture builder | — | `app/dev/estados/fixtures.ts` (`localIso`, `nowData`, `snapshot`) | exact |
| `lib/time.ts` (modify: add `localHour`, maybe weekday helpers) | utility | transform | itself (`parts()` + `Intl.DateTimeFormat` with `timeZone: TZ`, `hourCycle: 'h23'`) | exact |
| `lib/time.test.ts` (modify) | test | — | itself | exact |
| `lib/sections.ts` (modify: `pronostico.enabled = true`) | config | — | itself | exact |
| `lib/sections.test.ts` (modify) | test | — | itself | exact |
| `components/client/Meteogram.tsx` (new) | component (client) | event-driven (pointer/keyboard) + render | `components/client/LiveClock.tsx` (SSR-stable initial state) + `components/TabBar.tsx` (inline SVG conventions) | partial (no chart exists) |
| `components/client/DailyList.tsx` (new) | component (client island) | request-response (props) + local toggle state | `components/client/RetryButton.tsx` (button styling) + `LiveClock.tsx` (client skeleton) | role-match |
| `components/Pronostico.tsx` (new) | component (server) | request-response | `components/Ahora.tsx` (variants, Header, Notice/NoData/Freshness) | exact |
| `components/Header.tsx` (new, extracted from Ahora) | component (server-safe) | render | `components/Ahora.tsx` lines 21-31 | exact (move) |
| `components/MeteogramSection.tsx` (new, optional server wrapper for `below`) | component (server) | request-response | `components/Ahora.tsx` (section + LABEL constants + states) | role-match |
| `components/Hero.tsx` (modify: sky box + `below` + `compact`) | component (layout shell) | render | itself | exact |
| `components/Ahora.tsx` (modify: Headline role, gaps, use extracted Header) | component (server) | render | itself | exact |
| `app/page.tsx` (modify: headline + meteogram `below`) | route/page (RSC, ISR) | request-response | itself | exact |
| `app/pronostico/page.tsx` (new) | route/page (RSC, ISR 600) | request-response | `app/page.tsx` | exact |
| `app/pronostico/loading.tsx` (new) | route loading | render | `app/loading.tsx` | exact |
| `app/globals.css` (modify: `--bar-h` to `:root`, `--band-h` 644, `.sky-layer`) | config (tokens) | — | itself | exact |
| `app/dev/estados/page.tsx` + `fixtures.ts` (modify: new frames) | dev page / fixtures | — | itself | exact |
| `package.json` (modify: d3-scale, d3-shape, @types) | config | — | itself | exact |

## Pattern Assignments

### `lib/forecast/headline.ts` (utility, transform)

**Analog:** `lib/sky/state.ts`

**Header comment + imports pattern** (lines 1-4): every pure module opens with a one-line comment citing the UI-SPEC section and "Pure.", imports via the `@/` alias, and imports types with `type`:
```ts
// Sky state for Winifreda (UI-SPEC "Estados del cielo" steps 1–2 + phase-3 contract). Pure:
// callers always pass `now`, so server render and client recompute share one code path.
import { describeWeather, type WeatherGroup } from '@/lib/weather/wmo'
import { getSolarPhase, type SolarPhase } from './phase'
```

**Core pattern: snapshot + explicit `now`, narrow structural input** (lines 47-54):
```ts
export function skyFromSnapshot(
  snapshot: { now: { weatherCode: number | null } | null },
  now: Date,
): SkyState {
  const night = getSolarPhase(now).phase === 'noche'
  const { group } = describeWeather(snapshot.now?.weatherCode ?? null, { night })
  return resolveSkyState(now, group)
}
```
Apply: `buildHeadline(s: Pick<WeatherSnapshot, 'hourly48' | 'daily'>, now: Date): string | null`. Never `new Date()` inside; `now` is always passed.

**Closed-union / switch mapping** (lines 15-29) for group → fragment:
```ts
function toSkyWeather(group: WeatherGroup | null): SkyWeather {
  switch (group) {
    case 'tormenta':
    ...
    default:
      return 'despejado'
  }
}
```

**Named threshold constants** (copy style from `lib/weather/wind.ts` line 15 and `RetryButton.tsx` line 16):
```ts
const CALM_KMH = 2
```
→ `export const FROST_C = 0`, `STRONG_FROST_C = -3`, `HEAT_C = 32`, `STRONG_HEAT_C = 35`, `COLD_MAX_C = 12`, `COOL_MORNING_C = 5`, `RAIN_SUM_MM = 1`, `RAIN_HOUR_MM = 0.5`, `STRONG_WIND_KMH = 40`, `STRONG_GUST_KMH = 60` (UI-SPEC "Umbrales").

**Reuse, do not re-implement:** `describeWeather(code, { night: false })` from `lib/weather/wmo.ts` lines 52-63 for groups (storm = group `tormenta`; drizzle = `llovizna`; chaparrones = codes 80-82, labels in lines 38-40); `windSector(deg).long` from `lib/weather/wind.ts` lines 9-13 for "Viento fuerte del {sector}"; `localDateKey(d)` from `lib/time.ts` lines 26-28. Local hour of an `HourlyPoint.time` (`"2026-10-23T14:00:00-03:00"`) = `Number(time.slice(11, 13))`, day key = `time.slice(0, 10)` (RESEARCH Pattern 1).

---

### `lib/forecast/headline.test.ts`, `meteogram.test.ts`, `daily.test.ts` (tests)

**Analog:** `lib/sky/state.test.ts` + `lib/weather/wind.test.ts` + `lib/time.test.ts`

**Imports + fixed UTC instants** (`state.test.ts` lines 1-9):
```ts
import { describe, expect, it } from 'vitest'
import type { WeatherGroup } from '@/lib/weather/wmo'
import { resolveSkyState, skyFromSnapshot, skyToken } from './state'

// Instants proven in phase.test.ts for Winifreda (2026-10-23).
const DIA = new Date('2026-10-23T15:00:00Z')
const NOCHE = new Date('2026-10-23T03:00:00Z')
```
Headline boundaries as UTC instants: 04:59 ART = `'2026-10-23T07:59:00Z'`, 05:00 ART = `'…T08:00:00Z'`, 20:59 ART = `'…T23:59:00Z'`, 21:00 ART = `'2026-10-24T00:00:00Z'`.

**Table-driven cases** (`wind.test.ts` lines 5-18):
```ts
it.each([
  [0, 'N', 'norte'],
  [22.4, 'N', 'norte'],
  ...
])('%s° → %s', (deg, short, long) => {
  expect(windSector(deg)).toEqual({ short, long })
})
```
Use for the UI-SPEC "Ejemplos válidos" list and for ≤ 6 words / ≤ 34 chars / no "!" checks.

**TZ guard test** (`time.test.ts` lines 10-13) — copy into each new test file that touches hours:
```ts
describe('lib/time (D-08, DATA-04) under TZ=UTC', () => {
  it('runs in UTC like Vercel', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(0)
  })
```

**Null handling test style (WR-09)** (`wind.test.ts` lines 42-47):
```ts
it('handles missing values (WR-09)', () => {
  expect(describeWind(null, 90, 30)).toEqual({ value: '—', gustLine: null })
  ...
})
```

**Real fixture option** (`lib/weather/normalize.test.ts` lines 1-9): `import fixture from '@/lib/sources/__fixtures__/open-meteo-forecast.json'` → `ForecastDto.parse(fixture)` → `normalizeForecast(dto)` yields a real 48-point `hourly48` starting `2026-10-23T14:00` and 14 `daily` rows. Good for one integration-style test per module.

Config: `vitest.config.ts` already sets `process.env.TZ = 'UTC'`, `include: ['**/*.test.ts']`, `@` alias. No change needed.

---

### `lib/forecast/meteogram.ts` (utility, transform with d3)

**Analog:** `lib/weather/wind.ts` (pure, constants, null handling) + RESEARCH "Pattern 1" sketch (no d3 usage exists yet in the repo).

**Pure-module shape** (`wind.ts` lines 1-13, 15-32):
```ts
// Wind direction and copy (UI-SPEC "Direcciones del viento"). Pure. SMN spelling: 'O', not 'W'.

const SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const
...
const CALM_KMH = 2

/** Missing values (WR-09): no speed → "—"; no direction → speed only; either → no gust line. */
export function describeWind(kmh: number | null, deg: number | null, gustKmh: number | null) {
  if (kmh === null) return { value: '—', gustLine: null }
  if (kmh < CALM_KMH) return { value: 'Calma', gustLine: null }
  ...
}
```
Apply: export `STRONG_GUST_KMH = 50`, `CALM_KMH` (reuse value 2 — consider exporting it from `wind.ts` rather than duplicating), band heights (`TEMP_H = 120`, `RAIN_H = 40`, `RAIN_FLOOR_MM = 4`, `MIN_TEMP_SPAN_C = 8`). Return plain serialisable data (path strings, numbers, label arrays) so the client component only maps it to SVG.

**d3 usage (RESEARCH Pattern 1):** `import { scaleLinear } from 'd3-scale'`, `import { area, curveMonotoneX, line } from 'd3-shape'`; x over the **index** `[0, n-1] → [0, width]`; `.defined(p => p.tempC !== null)`, `.curve(curveMonotoneX)`, `.digits(1)`. Never `scaleTime`.

**Readout copy reuse:** `formatTemp` (`lib/weather/format.ts` lines 6-10, U+2212), `windSector(deg).short/long` (`wind.ts` 9-13). Rain readout `0,4 mm` uses a comma decimal — add a small local formatter (no existing analog; `formatInt` lines 12-15 is the nearest).

**Past-hour filter (Pitfall 3):** filter `hourly48` by `time >= floor(now to hour)`; compare instants with `Date.parse(p.time)` (offset is explicit, so safe) or compare day key + hour strings.

---

### `lib/forecast/daily.ts` (utility, transform)

**Analog:** `lib/weather/wmo.ts` (local copy table) + `lib/time.ts` (`localDateKey`)

**Local copy table pattern** (`wmo.ts` lines 13-17 and `wind.ts` line 3):
```ts
const SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const
```
→ `const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const`; weekday from `new Date(\`${key}T12:00:00Z\`).getUTCDay()` (TZ-proof).

**State label:** `describeWeather(d.weatherCode, { night: false }).label` (`wmo.ts` 52-63); null label → no second line.

**Filter:** `daily.filter(d => d.date >= localDateKey(now))` (`time.ts` 26-28). Return two precomputed fraction scales (7 and 14 rows) as plain numbers (`{ lo: number, hi: number }` fractions per row) so the client island gets serialisable props.

---

### Fixture builders (`lib/forecast/__fixtures__/` or `app/dev/estados/fixtures.ts`)

**Analog:** `app/dev/estados/fixtures.ts`

**Local ISO builder** (lines 6-13) — reuse to build hourly times:
```ts
const MIN = 60_000

/** Local ISO with the fixed Argentina offset (UTC−3, no DST), on the hour like Open-Meteo. */
function localIso(ms: number): string {
  const d = new Date(ms - 3 * 60 * MIN)
  d.setUTCMinutes(0, 0, 0)
  return `${d.toISOString().slice(0, 16)}-03:00`
}
```
Note: this produces `"…T14:00-03:00"` (no seconds), while `withOffset` produces `"…T14:00:00-03:00"`. `slice(11,13)` and `slice(0,10)` work on both; keep the test builder consistent with `withOffset` (`lib/time.ts` lines 9-16) if any code compares full strings.

**Override-builder pattern** (lines 15-30):
```ts
function nowData(nowMs: number, over: Partial<NowData> = {}): NowData {
  return { time: localIso(nowMs), tempC: 24, ..., ...over }
}
```
→ `makeHourly(startMs, n, over: (i) => Partial<HourlyPoint>)`, `makeDaily(startKey, n, over)`.

**Snapshot builder currently empties the arrays** (lines 32-44): `hourly48: [], daily: []`. Phase 2 frames must pass populated arrays — extend `snapshot()` with optional `hourly48`/`daily` params rather than duplicating it.

---

### `lib/time.ts` (modify: add `localHour`)

**Analog:** itself, lines 41-58 and 66-70:
```ts
const hhmmFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parts(fmt: Intl.DateTimeFormat, d: Date): Partial<Record<Intl.DateTimeFormatPartTypes, string>> { ... }

/** "00:05" in Argentina time, 24 h. */
export function formatHHmm(d: Date): string {
  const p = parts(hhmmFormat, d)
  return `${p.hour}:${p.minute}`
}
```
Add `export function localHour(d: Date): number` reusing `hhmmFormat` + `parts` → `Number(p.hour)`. Always `hourCycle: 'h23'` (comment line 30 explains the "24:05" trap). Test in `lib/time.test.ts` following lines 15-18 (`02:59Z → 23`, `03:00Z → 0`).

---

### `lib/sections.ts` + `lib/sections.test.ts` (config)

**Analog:** itself, line 12:
```ts
{ id: 'pronostico', label: 'Pronóstico', href: '/pronostico', enabled: false },
```
Flip to `true`. The header comment (lines 1-2) already anticipates this. Add a test asserting `SECTIONS.find(s => s.id === 'pronostico')?.enabled === true` and that `modelos`/`cielo` stay `false`. `TabBar.tsx` (lines 83-111) needs no change: enabled sections render as `Link` with `aria-current`.

---

### `components/client/Meteogram.tsx` (client component, event-driven)

**Analogs:** `components/client/LiveClock.tsx` (SSR-stable state), `components/TabBar.tsx` (inline SVG attrs), `components/client/SkyBackdrop.tsx` (effects with cleanup).

**Client header + SSR-deterministic initial state** (`LiveClock.tsx` lines 1-11):
```tsx
'use client'

import { useEffect, useState } from 'react'
import { formatHeaderDate } from '@/lib/time'

/**
 * Argentina-time header date. First render uses the server's renderedAt so SSR and
 * hydration produce identical text; the client then ticks every 60 s.
 */
export function LiveClock({ renderedAt }: { renderedAt: string }) {
  const [date, setDate] = useState(() => new Date(renderedAt))
```
Apply: `const [width, setWidth] = useState(342)` and `const [sel, setSel] = useState(0)`; never `new Date()` in render. Reset `sel` to 0 when `points` identity changes (new data).

**Effect with cleanup** (`SkyBackdrop.tsx` lines 55-60; `LiveClock.tsx` lines 13-18):
```tsx
useEffect(() => {
  const tick = () => setDate(new Date())
  tick()
  const id = setInterval(tick, 60000)
  return () => clearInterval(id)
}, [])
```
→ `ResizeObserver` on the wrapper ref, `return () => ro.disconnect()`; document `pointerdown` listener for "tap outside resets to 0", removed in cleanup.

**Inline SVG conventions** (`TabBar.tsx` lines 13-29, 11-12 comment):
```tsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
```
Wind arrow glyph per UI-SPEC: `M6 11V1` + `M2 5L6 1L10 5`, strokeWidth 1.5, square/miter, rotated `windDirDeg + 180`. Main chart `<svg role="img" aria-label=…>` (not aria-hidden). Text classes via Tailwind on `<text>` (font-sans comes from body; use `className="nums"` + `fill-ink/75`).

**Typography constants** (copy from `Ahora.tsx` lines 17-19):
```ts
const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const BODY = 'text-[15px] leading-[1.6]'
```

**Scrubber overlay:** no analog. Use UI-SPEC "Scrubber" table + RESEARCH "Scrubber handlers" sketch, on an absolutely positioned `<div role="slider">` (not the SVG `<rect>`), `style={{ touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}`.

---

### `components/client/DailyList.tsx` (client island)

**Analog:** `components/client/RetryButton.tsx` (button styling) + `LiveClock.tsx` (client skeleton)

**Button classes to copy verbatim, then make full-width** (`RetryButton.tsx` line 58):
```tsx
className="h-11 border border-ink/30 bg-transparent px-6 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink transition-colors hover:border-accent hover:bg-ink/8 focus-visible:border-accent focus-visible:bg-ink/8 active:bg-ink/12 disabled:cursor-default"
```
Add `w-full`, `type="button"`, `aria-expanded`, `aria-controls="dias-8-14"`. Copy `VER 14 DÍAS` / `VER 7 DÍAS`.

**Row separators / hairlines** (`Ahora.tsx` lines 48, 230): `border-l border-ink/12`, `<div className="mt-4 h-px w-full bg-ink/12" aria-hidden="true" />` → rows use `border-t border-ink/12` except the first.

**sr-only full text + aria-hidden visuals** (`Ahora.tsx` lines 195, 209):
```tsx
<div className="flex flex-col items-end gap-2 pb-1 text-right" aria-hidden="true"> ... </div>
{weather.label ? <p className="sr-only">{weather.label}</p> : null}
```

Props must be serialisable precomputed rows (from `lib/forecast/daily.ts`), no `Date` objects.

---

### `components/Pronostico.tsx` (server component)

**Analog:** `components/Ahora.tsx`

**Imports** (lines 3-15): `Notice`, `NoData`, `Freshness`, `RetryButton`, `formatHHmm`, types from `@/lib/weather/types` and `@/lib/weather/status`.

**Variant resolution + states** (lines 91-124):
```tsx
const now = snapshot?.now ?? null
const fetchedAt = snapshot?.sources[0]?.fetchedAt ?? null
const resolved: AhoraVariant =
  variant === 'loading' ? 'loading' : !now ? 'empty' : (variant ?? 'normal')
...
{resolved === 'empty' ? <NoData action={retry ?? <RetryButton />} /> : null}
...
<Freshness fetchedAt={fetchedAt} renderedAt={renderedAt} autoRefresh={autoRefresh}
  suppressOutdatedNotice={resolved === 'degraded'} />
{resolved === 'degraded' && fetchedAt ? (
  <Notice role="status">
    No pudimos actualizar el pronóstico. Te mostramos el último dato bueno, de las{' '}
    {formatHHmm(new Date(fetchedAt))}.
  </Notice>
) : null}
```
For `/pronostico`, "empty" should key off "no usable daily rows" rather than only `now` (UI-SPEC "Diario · Sin datos"). Keep `autoRefresh` prop for `/dev/estados`. Title: `<h1 className="font-serif text-[32px] italic leading-[1.19] tracking-[-0.01em] text-ink">Los próximos días</h1>`.

---

### `components/Header.tsx` (extracted)

**Analog:** `components/Ahora.tsx` lines 21-31 — move verbatim, export, import back into `Ahora`:
```tsx
function Header({ renderedAt }: { renderedAt: string }) {
  return (
    <header className="flex flex-col items-center text-center">
      <p className="text-[12px] font-semibold leading-[1.33] tracking-[0.18em] text-ink">
        WINIFREDA, LA PAMPA
      </p>
      <div className="my-2 h-px w-40 bg-ink/30" aria-hidden="true" />
      <LiveClock renderedAt={renderedAt} />
    </header>
  )
}
```
Must stay hook-free and server-import-free (Ahora is also rendered by client `app/error.tsx`).

---

### `components/Hero.tsx` (modify)

**Analog:** itself (whole file, lines 1-36). Current structure:
```tsx
<main data-sky={skyToken(sky)}
  className="relative isolate flex min-h-svh flex-col bg-ground pb-[calc(56px+env(safe-area-inset-bottom))]">
  <SkyBackdrop state={sky} live />
  <div className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px)]">
    <div className="mx-auto w-full max-w-[calc(560px+48px)] pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))]">
      {children}
    </div>
    <div className="min-h-16 flex-1" />
  </div>
  <div className="relative h-(--band-h) w-full shrink-0" aria-hidden="true">
    <div className="absolute inset-x-0 bottom-0"><PampaHorizon /></div>
  </div>
</main>
```
Target (UI-SPEC "Refactor de Hero"): keep `data-sky` on `<main>` (WR-06 comment lines 11-13 — the tab bar accent depends on `html:has(main[data-sky=…])` in `globals.css` lines 99-112); wrap SkyBackdrop + content + spacer + band in a `relative isolate flex flex-col` sky box (`min-h-[calc(100svh-var(--bar-h))]` in full, auto in compact); spacer `min-h-4 flex-1` (full) / `h-6` (compact); band `h-(--band-h)` (full) / `h-[120px]` (compact); then `{below}` after the sky box with the same padding/max-width classes as the content column. Props: `{ sky, children, below?: ReactNode, compact?: boolean }`. Stay hook-free (comment lines 1-3). Consumers to re-check: `app/page.tsx`, `app/loading.tsx`, `app/error.tsx`.

`SkyBackdrop` (`components/client/SkyBackdrop.tsx` line 40-41) sets `data-sky` on `rootRef.current?.parentElement` only if it has `data-sky`. After the refactor its parent is the sky box, not `<main>` — either put `data-sky` on the sky box too, or move the lookup to `closest('[data-sky]')`/`closest('main')`. Flag for the planner.

---

### `components/Ahora.tsx` (modify)

**Analog:** itself, `NowBlock` lines 176-179 and 211, 228-230:
```tsx
<div className="mt-12 flex flex-col">
  {headline && (
    <p className="mb-6 font-serif text-[24px] italic leading-[1.33] text-ink">{headline}</p>
  )}
```
→ `mt-6` when headline present / `mt-12` when not; headline `<p className="mb-4 font-serif text-[32px] italic leading-[1.19] tracking-[-0.01em] text-ink [text-wrap:balance]">`; data row `mt-8` → `mt-6` (line 211). Replace local `Header` with the extracted one. `headline?: string` prop already plumbed (lines 72, 80, 107).

---

### `app/page.tsx` (modify) and `app/pronostico/page.tsx` (new)

**Analog:** `app/page.tsx` (whole file):
```tsx
import { Ahora } from '@/components/Ahora'
import { Hero } from '@/components/Hero'
import { skyFromSnapshot } from '@/lib/sky/state'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'
import { selectAhoraVariant } from '@/lib/weather/status'

export const revalidate = 600

// Never fails: getWeatherSnapshot() resolves even with every source down, ...
export default async function Page() {
  const snapshot = await getWeatherSnapshot()
  const now = new Date() // server render instant (ISR)
  const renderedAt = now.toISOString()
  const sky = skyFromSnapshot(snapshot, now)
  const variant = selectAhoraVariant(snapshot)

  return (
    <Hero sky={sky}>
      <Ahora snapshot={snapshot} renderedAt={renderedAt} variant={variant} />
    </Hero>
  )
}
```
Home: add `const headline = buildHeadline(snapshot, now) ?? undefined`, pass `headline`, and `below={snapshot.now ? <MeteogramSection points={selectFutureHours(snapshot.hourly48, now)} /> : undefined}` (section hidden when Ahora is empty). `/pronostico`: same skeleton, `<Hero sky={sky} compact below={<DailyList … />}>` with `<Pronostico>` as children, plus `export const metadata: Metadata = { title: 'Pronóstico en Winifreda', description: 'Pronóstico de 7 a 14 días para Winifreda, La Pampa, en hora argentina.' }` (Metadata import style: `app/dev/estados/page.tsx` lines 4, 17-20). Do **not** read `searchParams` (breaks ISR).

---

### `app/pronostico/loading.tsx` (new)

**Analog:** `app/loading.tsx` (whole file):
```tsx
export default function Loading() {
  const now = new Date()
  return (
    <Hero sky={skyFromSnapshot({ now: null }, now)}>
      <Ahora snapshot={null} variant="loading" renderedAt={now.toISOString()} />
    </Hero>
  )
}
```
→ `<Hero compact …>` with `<Header>` + title + `below` = `<p className={LABEL + ' text-ink/75'}>CARGANDO</p>`. No skeletons.

---

### `app/globals.css` (modify)

**Analog:** itself, lines 23-39 (`:root` with `--band-h`) and 117-131 (`.sky-layer`):
```css
--band-h: clamp(
  120px,
  calc(100svh - 632px - env(safe-area-inset-top) - env(safe-area-inset-bottom)),
  240px
);
...
.sky-layer {
  --bar-h: calc(56px + env(safe-area-inset-bottom));
  --band-top: calc(100% - var(--bar-h) - var(--band-h));
  --horizon: calc(100% - var(--bar-h));
```
Change per UI-SPEC: `--bar-h` moves to `:root`; `632px` → `644px` (update the explanatory comment the same way); inside the sky box `.sky-layer` uses `--bar-h: 0px` so `--horizon` = 100% of the box. In compact, `--band-h` must resolve to 120px in the sky box (set `[--band-h:120px]` on the compact box, as `/dev/estados` does with `[--band-h:240px]` on line 46 of its page). Keep comments in the existing explanatory style.

---

### `app/dev/estados/page.tsx` + `fixtures.ts` (modify)

**Analog:** itself. `Frame` (page lines 22-69) duplicates the Hero structure inside a fixed `h-[844px] w-[390px]` box with `[--band-h:240px]`; after the Hero refactor, either mirror the new sky-box/below structure or render `Hero` content directly. Add frames listed at UI-SPEC line 358 (long headline 34 chars, "Mañana: …", meteogram rain/storm/frost/gusts/nulls/degraded/empty, daily 7/14/nulls/degraded/empty). Keep `if (process.env.VERCEL_ENV === 'production') notFound()` (line 72) and `autoRefresh={false}` (line 55). Note: the 390×844 frame uses `--band-h: 240px` which hides first-screen overflow checks — the UAT-01 check must run on the real home in devtools.

## Shared Patterns

### Pure logic in `lib/` with sibling Vitest tests under TZ=UTC
**Source:** `lib/time.ts`, `lib/sky/state.ts`, `lib/weather/*.ts` + `vitest.config.ts`
**Apply to:** `lib/forecast/*.ts`, `lib/time.ts` additions
- Header comment naming the UI-SPEC section + "Pure."
- `@/` alias imports, `type` imports.
- `now: Date` always passed in; never `new Date()`, `getHours()`, `toLocaleTimeString()` without `timeZone`.
- Named exported constants for thresholds.

### Copy only from local tables
**Source:** `lib/weather/wmo.ts` lines 1-2 ("Labels are sentence case; the UI uppercases them with CSS"), `Ahora.tsx` lines 1-2
**Apply to:** headline phrases, day labels, readout, aria strings. Uppercase via `uppercase` class, never in the string. No `!`.

### Number formatting
**Source:** `lib/weather/format.ts` lines 3-15 (`formatTemp` with U+2212, `formatInt`), `.nums` class (`globals.css` lines 150-152)
**Apply to:** every temperature / km/h / mm in chart, readout and daily list.

### Typography constants
**Source:** `components/Ahora.tsx` lines 17-19, `components/client/Freshness.tsx` line 12
```ts
const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const BODY = 'text-[15px] leading-[1.6]'
```
Add `HEADLINE = 'font-serif text-[32px] italic leading-[1.19] tracking-[-0.01em]'` (UI-SPEC Headline role). Consider moving these into a shared module if three or more files need them.

### Data states (empty / degraded / outdated / loading)
**Source:** `components/Ahora.tsx` lines 91-124, `components/Notice.tsx`, `components/NoData.tsx`, `components/client/Freshness.tsx`, `lib/weather/status.ts` `selectAhoraVariant` (lines 15-18)
**Apply to:** `Pronostico.tsx`, meteogram section. One error message per screen; degraded = `<Notice role="status">` with the fixed phase-1 copy.

### SSR/hydration determinism in client components
**Source:** `components/client/LiveClock.tsx` lines 6-11, `Freshness.tsx` lines 26-27, `SkyBackdrop.tsx` line 22
**Apply to:** `Meteogram.tsx`, `DailyList.tsx` — initial state from props/constants; measurement and time-dependent work only inside effects.

### Buttons and focus
**Source:** `RetryButton.tsx` line 58 (classes), `globals.css` lines 154-157 (`:focus-visible` accent ring)
**Apply to:** "VER 14 DÍAS" button and the scrubber's focusable overlay.

### Server pages: ISR, never throw
**Source:** `app/page.tsx` lines 7-16
**Apply to:** `app/pronostico/page.tsx` — `export const revalidate = 600`, `await getWeatherSnapshot()`, one `now = new Date()` per render passed down as `renderedAt`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| SVG chart body + scrubber in `components/client/Meteogram.tsx` | component | event-driven (pointer events) | No charts, d3 usage or pointer-capture handlers exist yet. Use RESEARCH "Pattern 1/2/3" and "Scrubber handlers" sketch plus UI-SPEC "Meteograma" / "Scrubber" tables. Component skeleton conventions still come from `LiveClock.tsx` / `TabBar.tsx` above. |

## Metadata

**Analog search scope:** `app/`, `components/`, `components/client/`, `lib/`, `lib/weather/`, `lib/sky/`, `lib/sources/`, `vitest.config.ts`, `package.json`
**Files scanned:** 74 tracked source files listed; 24 read in full
**Pattern extraction date:** 2026-10-23
