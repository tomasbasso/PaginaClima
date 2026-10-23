# Phase 2: Pronóstico núcleo - Research

**Researched:** 2026-10-23
**Domain:** SVG data viz (d3-scale + d3-shape) in a Next 16 client component; touch scrubber on iOS Safari; pure forecast/headline rules over the existing `WeatherSnapshot`
**Confidence:** HIGH for stack and codebase mapping; MEDIUM for layout budget numbers (they need a browser check); LOW/ASSUMED for the meteorological thresholds of the headline

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Dónde va cada cosa
- **D-01:** El **meteograma de 48 h va en la home, debajo de Ahora**. Ahora sigue llenando la primera pantalla de 390×844 (fix UAT de la fase 1: no se rompe) y el meteograma aparece al hacer scroll.
- **D-02:** El **pronóstico diario vive en `/pronostico`**. En esta fase la pestaña Pronóstico pasa a `enabled: true` en `lib/sections.ts`. La home no lleva resumen diario.
- **D-03:** El **titular editorial va en el slot `headline` de `Ahora`**, que ya existe, con el rol Headline (Playfair itálica de 32 px e interlineado 1.19). Si el titular no entra en la primera pantalla, se ajusta el layout de Ahora para que todo siga entrando en 390×844.

#### Meteograma (FCST-01)
- **D-04:** **Las 48 h entran en un solo ancho**, sin scroll horizontal: etiquetas de hora cada 6 h, separadores de día con rótulos "hoy / mañana / pasado" (o el nombre del día) y lectura de la hora exacta al tocar o arrastrar (scrubber) sobre el gráfico.
- **D-05:** **Viento: una fila de flechas de dirección con km/h cada 3 h** debajo del gráfico. La ráfaga aparece solo cuando es fuerte (el umbral lo define el UI-SPEC o el planner).
- **D-06:** **Se hace en SVG a mano con `d3-scale` + `d3-shape`**, en un client component. No va Recharts: ejes mínimos, tipografía propia del sistema y barras de lluvia finas en mm. Las dependencias nuevas que se permiten son solo `d3-scale` y `d3-shape` (con sus tipos).
- **D-07:** Los datos salen de `snapshot.hourly48`, que ya existe. Las horas se muestran en `America/Argentina/Buenos_Aires` usando los helpers de `lib/time.ts`.

#### Diario (FCST-02)
- **D-08:** **Se muestran 7 días por defecto, con un botón "ver 14 días"** que expande la lista. Los días 8 a 14 llevan una nota de que son orientativos. El rango p10–p90 llega en la fase 4.
- **D-09:** **Cada fila tiene barra de rango**: día · ícono/estado · mín — barra de mín a máx sobre la escala común de los días visibles — máx · lluvia.
- **D-10:** **La lluvia se muestra en mm solo si es ≥ 1 mm** (por ejemplo "4 mm"). En los días secos o con menos de 1 mm no se muestra nada. **No** se usa `precipitation_probability` del determinístico: la probabilidad real es de la fase 4.
- **D-11:** **Tocar un día no hace nada**: la lista es estática. El detalle por día queda diferido.
- **D-12:** Los días son las claves locales de `daily.date` (ya vienen en hora argentina desde Open-Meteo). El primer día es "Hoy" y el segundo "Mañana".

#### Titular editorial (NOW-03) — a criterio de Claude (el usuario aceptó los defaults)
- **D-13:** Es una función pura en `lib/` con tests de Vitest. Recibe el snapshot y la hora local, y devuelve un string (o `null` si no hay datos).
- **D-14:** La ventana: de 05:00 a 20:59 local resume **lo que queda de hoy**. De 21:00 a 04:59 resume **mañana** y lo dice ("Mañana: …").
- **D-15:** La prioridad: tormenta > lluvia (con su momento: "a la tarde", "a la noche"…) > extremos de temperatura (helada, calor fuerte, fresco) > viento fuerte > estado general.
- **D-16:** Es corto (unas 6 palabras como máximo), en rioplatense y sin signos de exclamación. Ejemplos: "Mañana fresca, lluvia a la tarde", "Día de calor, tormentas a la noche". Cambia cuando cambia el pronóstico, porque se calcula en cada render del snapshot.

### Claude's Discretion
- Los extras del meteograma (sensación térmica, íconos de estado, franjas de noche, marca de "ahora"): el usuario no tuvo preferencia. Los decide el UI-SPEC/planner priorizando la legibilidad en 390 px.
- Los umbrales concretos del titular (helada, calor, viento fuerte) y el vocabulario de franjas horarias.
- Los íconos del diario: reusar los grupos WMO de `lib/weather/wmo.ts`.
- Los estados vacío y de error del meteograma y del diario: siguen el patrón de la fase 1 (Notice/NoData, último dato bueno).

### Deferred Ideas (OUT OF SCOPE)
- Detalle expandible por día (viento máximo, sol, mañana/tarde): después del MVP.
- Probabilidad de lluvia y rango p10–p90 en el diario: fase 4.
- Resumen de 3 días en la home: descartado por ahora.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FCST-01 | Meteograma de las próximas 48 h con temperatura, lluvia (mm) y viento, legible en un iPhone de 390 px | `hourly48` already carries every field needed (tempC, precipMm, windKmh, gustKmh, windDirDeg, isDay, weatherCode). Geometry math goes in a pure `lib/forecast/meteogram.ts` (d3-scale `scaleLinear` over the hour index, never `scaleTime`); a client `components/client/Meteogram.tsx` renders the SVG and the scrubber. Width budget and label plan in "Layout budget at 390 px". |
| FCST-02 | Pronóstico diario de 7 a 14 días con máxima, mínima, estado y lluvia esperada | `snapshot.daily` already has 14 local days (`date`, `tMaxC`, `tMinC`, `weatherCode`, `precipSumMm`). Pure `lib/forecast/daily.ts` (day labels, shared range scale, `≥ 1 mm` rule, drop past days). `/pronostico` server page plus a small client island for the "ver 14 días" toggle. |
| NOW-03 | Titular editorial por reglas que resume el día | Pure `lib/forecast/headline.ts` over `hourly48` + `daily` + `now: Date`. Window and priority rules, threshold proposals and phrase table in "Headline rule design". Rendered through the existing `headline` prop of `Ahora`, but the slot's styling must change (24 px → 32 px Headline role) and the first-screen budget has to be redone (Pitfall 1). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Everything free (Vercel Hobby, GitHub Actions, Supabase free). Non-commercial use.
- Stack: Next.js + TypeScript, Tailwind v4 (configured with `@theme` in CSS, no `tailwind.config.js`). The `## Alternatives Considered` section explicitly names **SVG + `d3-scale`/`d3-shape`** as the path for an editorial meteogram, which D-06 locks in.
- **No external API calls from the client.** Everything goes through the server cache. This phase adds no fetches: the meteogram and the daily list only consume `getWeatherSnapshot()`.
- Mobile first: the iPhone at 390 px is the target.
- TypeScript `^5` (5.9.3), not TS 7.
- `AGENTS.md`: "This is NOT the Next.js you know". Read `node_modules/next/dist/docs/` before writing Next-specific code. This phase needs no new Next APIs beyond a page file and `export const revalidate`.
- GSD workflow: edits only through GSD commands. Commit docs (`commit_docs: true`).
- Established code conventions (from the phase-1 code): pure logic in `lib/` with a `*.test.ts` file next to it. Server components in `components/`, client components in `components/client/`. Every UI string comes from local tables, never from upstream strings. Use `formatTemp` (U+2212 minus) for temperatures. Use the `.nums` class (tabular lining numbers) for figures.

## Summary

Phase 2 is almost all **presentation and pure logic over data that already exists**. The Open-Meteo request in `lib/config.ts` asks for `forecast_hours=48` (counted from the current hour; the fixture starts at `2026-10-23T14:00` with `current.time` 14:30) and `forecast_days=14`. `normalize.ts` already fills `hourly48` with temperature, apparent temperature, precipitation, weather code, wind speed, gust, direction, humidity and `is_day`, and fills `daily` with max, min, code, precipitation sum, sunrise, sunset and max gust. **No schema, config or normalize change is required** for FCST-01, FCST-02 or NOW-03. [VERIFIED: codebase `lib/config.ts`, `lib/weather/normalize.ts`, fixture]

The only new packages are `d3-scale@4.0.2` and `d3-shape@3.2.0` (plus `@types/d3-scale@4.0.9` and `@types/d3-shape@3.2.0`). Both are ESM-only (`"type": "module"`), `sideEffects: false`, and stable for years (published 2021 and 2022, from the official `d3` GitHub org). Next 16's Turbopack bundles ESM deps natively and Vitest runs them without config. Use only `scaleLinear` (over the **hour index 0–47**, not over `Date`) and `line`/`area` with `curveMonotoneX` and `.defined()` for nulls. Avoid `scaleTime`: its ticks and `nice()` work in the **runtime's local timezone** (UTC on Vercel, whatever the phone uses on the client), which reintroduces exactly the trap phase 1 removed. [VERIFIED: npm registry; CITED: d3js.org/d3-scale/linear, d3js.org/d3-shape]

The two real planning risks are not about libraries. **(1) The first-screen budget:** the current `--band-h` formula in `globals.css` assumes ~487 px of Ahora content. Moving the headline to 32 px/1.19 (two lines ≈ 76 px + 24 px gap ≈ 100 px) overflows 390×844, because the band already sits close to its 120 px floor. Ahora's vertical spacing and the 632 px constant have to be redone and checked in the browser. **(2) Where the meteogram lives in the DOM:** `Hero` is the `<main>` whose `SkyBackdrop` gradient is computed as a percentage of `<main>`'s height, with the horizon pinned to `100% − bar-h`. If the meteogram is put inside `Hero`'s children, the horizon moves to the bottom of the whole scroll and the first screen loses its horizon. The meteogram must be rendered **after** the horizon band, on the `ground` colour, which needs a small `Hero` refactor (a `below` slot, with the sky wrapper sized to the first screen).

**Primary recommendation:** Put all geometry, label, day and headline logic in pure, Vitest-tested modules under `lib/forecast/`. Keep `components/client/Meteogram.tsx` a thin renderer: fixed-width SVG, measured with `ResizeObserver` and SSR default 342 px, with a single pointer-events overlay (`touch-action: pan-y`) acting as an ARIA slider whose readout sits in a fixed line above the chart, never a floating tooltip.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch and cache forecast | API / Backend (existing `getWeatherSnapshot`, `unstable_cache`) | — | Already done in phase 1; this phase adds no upstream calls. |
| Headline text | Frontend Server (SSR, page render) | — | Pure function of the snapshot plus the render instant. Computed in `app/page.tsx` and passed as the `headline` prop. ISR 600 s keeps it fresh enough. |
| Daily list (rows, scale, labels) | Frontend Server (RSC `/pronostico`) | Browser (toggle island) | Rows are static (D-11). Only the 7/14 toggle needs state, so a small client island receives the 14 precomputed rows. |
| Meteogram geometry | Pure lib (shared, runs on both) | — | `lib/forecast/meteogram.ts` is deterministic, so SSR and hydration produce the same SVG. |
| Meteogram rendering and scrubber | Browser / Client (`'use client'`) | Frontend Server (SSR first paint at default width) | Needs pointer events, `ResizeObserver` and selection state. |
| Day keys, hours, weekday names | Pure lib (`lib/time.ts` extensions) | — | Must be TZ-proof under `TZ=UTC` (Vercel) and on the phone. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `d3-scale` | 4.0.2 (published 2021-09-24) | `scaleLinear` for x (hour index → px), y temperature, y rain mm, and the daily range bar | Locked by D-06. The canonical d3 module. ESM-only, `sideEffects: false`. [VERIFIED: npm registry] |
| `d3-shape` | 3.2.0 (published 2022-12-20) | `line()` for temperature (and apparent temperature, optional) and `area()` for the fill under the curve, with `curveMonotoneX` and `.defined()` | Locked by D-06. `curveMonotoneX` doesn't overshoot, so a smoothed curve never shows a false min or max between hourly points. [VERIFIED: npm registry; CITED: d3js.org/d3-shape] |
| `@types/d3-scale` | 4.0.9 (dev) | Types | DefinitelyTyped, updated 2026-10-04. Pulls `@types/d3-time`. [VERIFIED: npm registry] |
| `@types/d3-shape` | 3.2.0 (dev) | Types | DefinitelyTyped, updated 2026-10-04. Pulls `@types/d3-path`. [VERIFIED: npm registry] |

Transitive deps of `d3-scale`: `d3-array`, `d3-format`, `d3-interpolate`, `d3-time`, `d3-time-format`. Transitive dep of `d3-shape`: `d3-path`. Every one is from the d3 org. Because `sideEffects: false` is set and only `scaleLinear` is imported, Turbopack's production build should tree-shake most of `d3-time-format` and `d3-format` away. [VERIFIED: npm registry `sideEffects`; ASSUMED: exact tree-shaken size — check with `next build` output if it matters]

### Supporting (already in the repo, reuse)
| Module | Purpose | When to Use |
|--------|---------|-------------|
| `lib/time.ts` | `localDateKey`, `formatHHmm`, `withOffset` | Day keys, the "ahora" marker, readout hours |
| `lib/weather/wmo.ts` `describeWeather` | Label and group per WMO code | Daily state and headline's "estado general"; also storm detection (group `tormenta`) |
| `lib/weather/wind.ts` `windSector` | 8-sector compass, SMN spelling | Arrow rotation labels and `aria-valuetext` ("del noreste") |
| `lib/weather/format.ts` `formatTemp` | U+2212 minus, rounding | Every temperature on the chart and in the list |
| `components/Notice.tsx`, `components/NoData.tsx` | Error and empty patterns | Meteogram and daily list empty and degraded states |
| `app/dev/estados/fixtures.ts` | Fixture snapshots | Add meteogram and daily frames (rain day, storm, frost, null gaps) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `scaleLinear` over the hour index | `scaleTime` / `scaleUtc` over `Date` | `scaleTime` ticks follow the runtime's local TZ and `scaleUtc` is 3 h off. The index is exact because `hourly48` is contiguous hourly data. **Use the index.** |
| Fixed-width SVG measured with `ResizeObserver` | `viewBox="0 0 342 H"` + `width="100%"` (scales everything) | Pure viewBox scaling also scales the text: at the 560 px max content width, 12 px labels become ~20 px. Acceptable as a fallback, but measured width keeps the type size exact. |
| Client island for "ver 14 días" | `?dias=14` searchParam | Reading `searchParams` makes the page dynamic and breaks ISR (`revalidate = 600`). Don't. |
| Client island for "ver 14 días" | `<details>`/`<summary>` | Works without JS, but D-09's "escala común de los días visibles" means the bar scale changes when expanded. Two precomputed scales could do it in CSS, but the island is simpler and clearer. |

**Installation:**
```bash
npm install d3-scale@^4.0.2 d3-shape@^3.2.0
npm install -D @types/d3-scale@^4.0.9 @types/d3-shape@^3.2.0
```

## Package Legitimacy Audit

slopcheck could not be run in this session (the shell command was denied by the permission system). Per protocol, packages are tagged `[ASSUMED]` for slopcheck. Every other signal is strong: these are the canonical d3 modules and DefinitelyTyped types, the same packages D-06 and CLAUDE.md name.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| d3-scale | npm | 4.0.2 published 2021-09 (package ~10 yrs) | very high (dependency of d3, recharts) [ASSUMED] | github.com/d3/d3-scale | not run [ASSUMED] | Approved (locked by D-06); no `postinstall` script |
| d3-shape | npm | 3.2.0 published 2022-12 | very high [ASSUMED] | github.com/d3/d3-shape | not run [ASSUMED] | Approved (locked by D-06); no `postinstall` script |
| @types/d3-scale | npm | updated 2026-10-04 | high [ASSUMED] | DefinitelyTyped | not run [ASSUMED] | Approved |
| @types/d3-shape | npm | updated 2026-10-04 | high [ASSUMED] | DefinitelyTyped | not run [ASSUMED] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none. `npm view <pkg> scripts.postinstall` returned empty for d3-scale and d3-shape.

## Architecture Patterns

### System Architecture Diagram

```
Open-Meteo (cached, phase 1) ──► getWeatherSnapshot() [React cache + unstable_cache, never throws]
                                          │
              ┌───────────────────────────┼─────────────────────────────┐
              ▼                           ▼                             ▼
     app/page.tsx (ISR 600)      app/page.tsx                  app/pronostico/page.tsx (ISR 600)
              │                           │                             │
   buildHeadline(snapshot, now)   hourly48 → selectFutureHours(now)   daily → buildDailyRows(daily, now)
   (lib/forecast/headline.ts)     (drop past hours of a stale        (drop past days, labels Hoy/Mañana/
              │                    last-good snapshot)                weekday, ≥1 mm rule, range scales)
              ▼                           │                             │
   <Ahora headline=…>                     ▼                             ▼
   (first screen, inside Hero)    <Meteogram points=… />  ('use client')   <DailyList rows7 rows14 /> (client toggle)
                                          │                             │
                                  lib/forecast/meteogram.ts         empty: NoData / degraded: Notice
                                  layout(width) → scales, paths,
                                  ticks, day separators, wind columns
                                          │
                                  pointer overlay (touch-action: pan-y)
                                  → selected index → readout line + aria-valuetext
```

### Recommended Project Structure
```
lib/
├── forecast/
│   ├── headline.ts          # NOW-03 rules (pure)
│   ├── headline.test.ts
│   ├── meteogram.ts         # geometry: scales, paths, ticks, wind columns, label plan (pure, uses d3)
│   ├── meteogram.test.ts
│   ├── daily.ts             # rows: labels, range scale, rain text, past-day filter (pure)
│   ├── daily.test.ts
│   ├── hours.ts             # localHour(d), hourOf(iso), weekday names, part-of-day buckets (or extend lib/time.ts)
│   └── hours.test.ts
components/
├── Pronostico.tsx           # server: header + states + <DailyList>
└── client/
    ├── Meteogram.tsx        # 'use client': SVG + scrubber
    └── DailyList.tsx        # 'use client': 7/14 toggle
app/
├── page.tsx                 # + headline, + meteogram below the horizon band
└── pronostico/page.tsx      # new; export const revalidate = 600
```

### Pattern 1: Hour index as the x domain, local hour from the string
**What:** `hourly48[i].time` is `"2026-10-23T14:00:00-03:00"` (the offset is attached by `withOffset`). The local hour and day key can be read straight from the string: `time.slice(11, 13)` gives the hour and `time.slice(0, 10)` gives the local day key. No `Date` parsing is needed for labelling, and `new Date(time)` is still correct for instants because the offset is explicit.
**When to use:** All hour labels, day separators and part-of-day buckets.
```ts
// lib/forecast/meteogram.ts (sketch)
import { scaleLinear } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import type { HourlyPoint } from '@/lib/weather/types'

const localHour = (t: string) => Number(t.slice(11, 13))
const dayKey = (t: string) => t.slice(0, 10)

export function layoutMeteogram(points: HourlyPoint[], width: number) {
  const n = points.length
  const x = scaleLinear().domain([0, Math.max(1, n - 1)]).range([PAD_L, width - PAD_R])
  const temps = points.flatMap((p) => (p.tempC === null ? [] : [p.tempC]))
  const y = scaleLinear().domain([Math.min(...temps) - 1, Math.max(...temps) + 1]).range([T_BOTTOM, T_TOP])
  const tempPath = line<HourlyPoint>()
    .defined((p) => p.tempC !== null)
    .x((_, i) => x(i))
    .y((p) => y(p.tempC as number))
    .curve(curveMonotoneX)
    .digits(1)(points) // fewer bytes and identical strings on server and client
  // hour ticks: indices where localHour % 6 === 0; day separators: indices where localHour === 0
  // ...
}
```
Source: d3js.org/d3-scale/linear, d3js.org/d3-shape/line (`defined`, `curve`, `digits`). [CITED]

### Pattern 2: Fixed readout plus slider overlay (scrubber)
**What:** A transparent `<rect>` or `<div>` over the plot area handles `pointerdown`, `pointermove`, `pointerup` and `pointercancel`. The selected index = `Math.round(x.invert(clientX − rect.left))`, clamped to `[0, n−1]`. The overlay has `role="slider"`, `tabIndex={0}`, `aria-valuemin={0}`, `aria-valuemax={n−1}`, `aria-valuenow={i}` and `aria-valuetext="sábado 15:00, 18 grados, 0,4 milímetros, viento 12 km/h del noreste"`. Keyboard: ←/→ ±1 h, PageUp/PageDown ±6 h, Home/End. The reading goes in a **fixed text line above the chart** (default: the current hour, "Ahora · 18° · sin lluvia · 12 km/h NE"), with a vertical hairline at the selected x. Nothing floats, so nothing can overlap or clip at the edges.
**Key CSS:** `touch-action: pan-y` on the overlay. A vertical swipe still scrolls the page, and a horizontal drag is delivered as pointer events. `touch-action` has been Baseline since September 2019, which covers iOS 13+. [CITED: developer.mozilla.org/en-US/docs/Web/CSS/touch-action] Add `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none` so a long press doesn't open the iOS text callout or magnifier on SVG text. [ASSUMED: iOS callout behaviour on SVG `<text>`, verify on the device]
**Pointer capture:** call `el.setPointerCapture(e.pointerId)` on `pointerdown` so the drag keeps tracking when the finger leaves the rect. On `pointercancel` (iOS fires it when the browser takes over for a vertical pan), **keep the last selection**; don't snap back mid-gesture.
**Release behaviour (recommendation):** keep the selection after lifting the finger, and reset it to "Ahora" when the user taps outside or after the next data refresh. A sticky selection is easier to read on a phone than one that disappears on lift.

### Pattern 3: Deterministic SSR, then measure
**What:** `const [width, setWidth] = useState(342)` (390 − 2×24 margins), then a `ResizeObserver` on the wrapper updates it. The geometry is a pure function of `(points, width)`, so the server HTML and the first client render match (no hydration warning). On a 390 phone the width doesn't change. On wider screens (max content width 560 px, from `Hero`) the chart re-lays out once.
**Never** compute anything from `new Date()` inside the client render path for the first paint. Pass `renderedAt` (as `Ahora` and `LiveClock` already do) and derive the "ahora" index from the data.

### Pattern 4: Render the meteogram outside the sky wrapper
`Hero` today: `<main min-h-svh pb-[bar]>` → `SkyBackdrop` (absolute, gradient stops in % of `<main>`) → content column → `min-h-16 flex-1` spacer → horizon band (`h-(--band-h)`). Recommendation:
```
<main data-sky … pb-[bar]>
  <div class="relative isolate flex min-h-[calc(100svh-56px-env(safe-area-inset-bottom))] flex-col">  ← first screen
     <SkyBackdrop/>  (gradient now relative to this wrapper, with --bar-h: 0px here)
     content column (Ahora) · spacer · horizon band
  </div>
  {below}   ← meteogram section on bg-ground (same 24 px margins, max-w 560)
</main>
```
`app/loading.tsx`, `app/error.tsx` and `/dev/estados` also render `Hero` or its pieces, so keep `below` optional and re-run the phase-1 UAT-01 check (Ahora + horizon in the first 390×844) after the refactor. The exact CSS is the UI-SPEC's and planner's call. The point is that **the meteogram must not be a child inside the sky gradient's sizing box.** [VERIFIED: codebase `components/Hero.tsx`, `app/globals.css` `.sky-layer`]

The same question applies to `/pronostico`. If the daily list sits inside a `Hero`, 14 rows stretch the gradient and move the horizon. Options: (a) a `Hero` with the list in the first-screen column and a short header, or (b) a plain `<main>` on `ground` with a compact sky strip. This is a UI-SPEC decision; flag it there.

### Anti-Patterns to Avoid
- **`scaleTime`, `Date#getHours()`, `toLocaleTimeString()` without `timeZone`:** these depend on the runtime TZ. The server is UTC, the phone is ART. Use the string slice or `lib/time.ts`.
- **Labelling every point:** 48 temperature labels in 342 px overlap. Label only each local day's max and min (at most about 6 labels), plus the scrubber readout.
- **Floating tooltip near the finger:** the finger covers it and it clips at the edges. Use a fixed readout line.
- **Using `hourly48[0]` as "now":** with a last-good snapshot (refresh failed), the first points can be in the past. Filter `time >= floor(now to the hour)`.
- **Using `precipitation_probability`:** locked out by D-10 (phase 4).
- **Fetching in the client:** CLAUDE.md forbids it. The meteogram gets its data as props from the server page.

## Layout budget at 390 px (meteogram)

Inner width = 390 − 24 − 24 = **342 px** (from `Hero`'s `pl/pr max(24px, safe-area)`; in portrait the safe-area insets are 0). [VERIFIED: codebase]

| Element | Count | Space each | Feasibility |
|---------|-------|------------|-------------|
| Hourly step | 48 points | 342/47 ≈ **7.3 px** | Fine for a line or area |
| Rain bars | up to 48 | ~5 px bar + ~2 px gap | Fine. Draw only for `precipMm ≥ 0.1`. Fixed mm scale with a floor (e.g. a max of `max(4, data max)` mm) so 0.2 mm doesn't look like a downpour |
| Hour ticks every 6 h | 8 | ≈ 43 px | Fine for "00 06 12 18" at 12 px (2 tabular digits ≈ 15 px) |
| Day separators | 2–3 | — | A label at the start of each day ("hoy", "mañana", weekday). Clamp the first label's x so it doesn't sit on top of the first hour tick |
| Wind columns every 3 h | 16 | ≈ **21 px** | Tight but OK: arrow (10–12 px) on one row and km/h number (2 digits at 12 px ≈ 14 px) on the next. 3-digit winds are rare in Winifreda; the font can drop to 11 px if needed |
| Max/min temperature labels | ≤ 2 per local day | — | Place above the max and below the min. Test for collision with the plot edges and clamp inside |

Suggested vertical stack (≈ 230–260 px total, UI-SPEC to finalise): readout line (24) · temperature plot (≈110) · rain bars band (≈36, sharing the x axis, own mm scale, baseline at the bottom) · hour ticks (16) · wind arrows (14) · wind km/h (16). Strong gusts (proposal: `gustKmh ≥ 50`) show as a small number in the readout and/or a dot over the wind column. Don't add a third row. [ASSUMED: threshold]

Arrow direction: meteorological `windDirDeg` is where the wind comes **from**. An arrow showing where the air goes points to `deg + 180`. Decide once (SMN and most apps draw the arrow pointing downwind) and test it. Rotation: `transform="rotate(deg+180, cx, cy)"` on an arrow drawn pointing north. [ASSUMED: convention choice, low risk]

Night bands (discretion): `isDay === 0` hours as a subtle `ink/5` rect behind the plot is cheap and helps reading. The "ahora" marker is the readout's default index.

## Headline rule design (NOW-03)

### Inputs and window
```ts
export function buildHeadline(s: WeatherSnapshot, now: Date): string | null
```
- `h = localHour(now)` comes from an `Intl.DateTimeFormat` with `timeZone: TZ`, `hour: '2-digit'` and `hourCycle: 'h23'`, added to `lib/time.ts` and tested under `TZ=UTC`. **Never** `now.getHours()`.
- `todayKey = localDateKey(now)`. When `h ∈ [5, 20]`, the window is the `hourly48` points with `dayKey === todayKey` and `hour ≥ h` (rest of today). When `h ≥ 21`, the window is the points of the next local day (`localDateKey(now + 24h)`; Argentina has no DST, so that's safe). When `h < 5`, the window is the points of **today's** date key, because after midnight "mañana" in the user's head is the day that just started. Prefix it with "Mañana:" only when the target day ≠ `todayKey`; at 02:00 the target is today, so recommend no prefix there (or "Hoy:"). **Flag this for the UI-SPEC:** D-14 says 21:00–04:59 summarises "mañana". The literal reading at 02:00 is the calendar tomorrow, which is ~22 h away. Recommendation: from 00:00 to 04:59, summarise the current calendar day without a prefix (it reads as "today"). [ASSUMED: interpretation, needs confirmation]
- Coverage: `hourly48` starts at the current hour and runs 48 h, so at 21:00 the whole next day is inside it. For temperature extremes of a whole day, `daily[]` matching the key gives `tMaxC`/`tMinC`. For "rest of today", use the window's own hourly min and max (by 15:00 the daily min already happened).
- Return `null` when `now` is null or the window has fewer than ~3 points, for example a very stale last-good snapshot. `Ahora` then shows no slot, which is the phase-1 behaviour.

### Priority (D-15) and proposed thresholds [ASSUMED, tune with the user]
| Rank | Condition (in window) | Phrase fragment |
|------|-----------------------|-----------------|
| 1 | Any hour with `weatherCode ∈ {95, 96, 99}` (group `tormenta`) | "tormentas {momento}" |
| 2 | Window precipitation sum ≥ 1 mm, or any hour ≥ 0.5 mm | "lluvia {momento}" ("llovizna" if every rainy hour is group `llovizna`; "chaparrones" for codes 80–82) |
| 3a | Min ≤ 0 °C | "helada" (≤ −3 °C: "helada fuerte") |
| 3b | Max ≥ 35 °C / ≥ 32 °C | "calor fuerte" / "día de calor" |
| 3c | Max ≤ 12 °C, or morning min ≤ 5 °C (outside helada) | "día frío" / "mañana fresca" |
| 4 | Max sustained wind ≥ 40 km/h or gust ≥ 60 km/h | "viento fuerte" (add the sector if it's stable: "viento fuerte del norte") |
| 5 | Dominant group | "Día despejado", "Nublado todo el día", "Niebla a la mañana", etc. |

Thresholds have no official source here. The SMN alert thresholds for Santa Rosa couldn't be retrieved in this session (the search only returned press notes). Calibrate them with the user and keep them as named constants (`FROST_C`, `HEAT_C`, `STRONG_HEAT_C`, `COLD_MAX_C`, `STRONG_WIND_KMH`, `STRONG_GUST_KMH`) so tests document them. The **helada at ≤ 0 °C** (air temperature at shelter height) is the standard meteorological definition. [ASSUMED]

### Composition
- Use at most two fragments: the highest-ranked "event" (storm or rain, with its time) plus, if present, a temperature or wind "context". Example: "Día de calor, tormentas a la noche". With no event, use context + general state: "Helada y después sol" / "Mañana fresca, tarde templada". Cap the length at about 6 words and roughly 32 characters, so it fits in 2 lines at 32 px within 342 px. Enforce this in tests: `expect(words(h)).toBeLessThanOrEqual(6)` and `expect(h.length).toBeLessThanOrEqual(34)`. [ASSUMED: character budget, check in the browser]
- **Time-of-day buckets** (local hour of the first hour that meets the condition): `madrugada` 0–5, `mañana` 6–11, `mediodía` 12–13, `tarde` 14–19, `noche` 20–23. Phrase: "a la madrugada", "a la mañana", "al mediodía", "a la tarde", "a la noche". If the condition starts in the current hour, use "ahora" ("Llueve ahora", "Tormenta ahora"). If it covers ≥ 3 buckets, use "todo el día" ("Lluvia todo el día"). If it starts and ends in different buckets, use the first ("desde la tarde" is acceptable too).
- **Ambiguity of "mañana":** "Mañana fresca, lluvia a la tarde" (roadmap example) reads as "morning". With the night-time prefix it becomes "Mañana: mañana fresca…", which is clumsy. Rule: when the prefix "Mañana:" is used, never use the bucket "mañana" for temperature; say "arranque fresco" or "fresco temprano" instead. Write a test for it.
- No exclamation marks, sentence case, rioplatense vocabulary ("chaparrones", "llovizna", "fresco", "templado", "pesado" for heat + humidity ≥ 70 %, optional). Phrases come from a fixed table, never from upstream strings (same rule as `wmo.ts`).
- Lightning-in-the-past case: only future hours are in the window, so a storm that already ended doesn't trigger.

## Daily list (FCST-02)

- **Rows:** `daily.filter(d => d.date >= todayKey)`, because a last-good snapshot fetched yesterday would otherwise start with yesterday. Show 7 rows, then 14 on toggle. If fewer than 7 remain, show what's there.
- **Labels:** "Hoy", "Mañana", then the weekday plus the day ("sáb 25"). Derive the weekday from the key, not from ICU: `new Date(\`${key}T12:00:00Z\`).getUTCDay()` → a local table `['dom','lun','mar','mié','jue','vie','sáb']`. This is TZ-proof and avoids ICU short forms that vary ("sáb." vs "sáb"). [VERIFIED: technique is standard JS; ICU variance ASSUMED]
- **State:** `describeWeather(weatherCode, { night: false })`. For daily rows, always use the day label. Icon or diamond per `group` (reuse the phase-1 diamond + label pattern, or the UI-SPEC defines group glyphs).
- **Range bar:** `scaleLinear().domain([min(tMin of visible rows), max(tMax of visible rows)]).range([0, 1])`. Store fractions (0–1) and render with CSS `left`/`width` percentages, so no SVG and no measuring are needed. Compute two scales (7 and 14 rows) on the server and pass both to the island, so the toggle is instant and stays deterministic. Rows with null min or max show "—" and no bar.
- **Rain:** `precipSumMm !== null && precipSumMm >= 1` → `${Math.round(mm)} mm`. Proposal: one decimal below 10 is not needed; "4 mm", "12 mm" is enough. Otherwise render nothing, but keep the column width so the bars stay aligned.
- **Days 8–14:** a single note above them ("Del día 8 en adelante, el pronóstico es orientativo") styled like `Notice` or as a label. Copy belongs to the UI-SPEC.
- **Toggle button:** a `<button aria-expanded aria-controls>` "Ver 14 días" / "Ver 7 días", with a ≥ 44 px touch target.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth temperature curve with gaps | Custom Bézier math | `d3-shape` `line().curve(curveMonotoneX).defined()` | Monotone interpolation avoids fake peaks; `defined` splits the path cleanly at nulls |
| Linear mapping and inversion for the scrubber | Ad-hoc arithmetic scattered in JSX | `scaleLinear` + `.invert()` | One source of truth for x, testable |
| Local hour, day key and weekday | `Date#getHours`, `toLocaleDateString` without TZ | `lib/time.ts` helpers (+ new `localHour`) and string slicing of `-03:00` ISO times | Phase 1's DATA-04 discipline; tests run with `TZ=UTC` |
| WMO → label and group | New mapping | `lib/weather/wmo.ts` | Already validated copy |
| Wind sector names | New table | `lib/weather/wind.ts` `windSector` | SMN spelling ("O", "sudoeste") |
| Temperature formatting | `Math.round` + "-" | `formatTemp` | U+2212 minus; "−0" → "0" |

**Key insight:** every hard part of this phase (TZ, nulls, copy) already has a tested helper. The risk lies in re-implementing them inside the component.

## Runtime State Inventory

Not a rename or migration phase. Omitted.

## Common Pitfalls

### Pitfall 1: The headline breaks the 390×844 first screen (UAT-01 regression)
**What goes wrong:** `--band-h: clamp(120px, 100svh − 632px − safe areas, 240px)`. At 844 px with typical iPhone insets (≈ 47 top + 34 bottom) the band is ≈ 131 px, only 11 px above its floor. A 2-line 32 px headline + 24 px gap adds ≈ 100 px, so the content overflows and the horizon leaves the first screen.
**Why:** the phase-1 budget (`632px = 24 + ~487 + 64 + 56`) assumed no headline. Also, `NowBlock` currently renders the slot at **24 px** (`text-[24px] leading-[1.33]`), not the 32 px/1.19 Headline role. [VERIFIED: codebase `Ahora.tsx`, `globals.css`]
**How to avoid:** the UI-SPEC re-budgets the vertical rhythm. Candidates: the header→headline gap 48 → 24, the minimum spacer 64 → 24–32, `mb-6` → `mb-4`, and the temperature block → data row gap. Update the 632 constant, cap the headline at 2 lines (tests on length), and verify at 390×844 in the browser **with the longest headline from the fixtures**. Update `/dev/estados` frames to pass a headline.
**Warning signs:** the horizon silhouette isn't visible without scrolling on 390×844, or the band computes to 120 px with content cut off.

### Pitfall 2: Meteogram inside the sky box moves the horizon
See Pattern 4. **Warning sign:** on the home, the horizon appears only after scrolling past the meteogram.

### Pitfall 3: Stale last-good snapshot shows past hours and days
`hourly48` starts at the fetch hour. If Open-Meteo has been down for 5 h, the first 5 points are history. The same goes for `daily[0]` after midnight. **Avoid:** filter by `now` (server `renderedAt`) in pure functions. Tests: a snapshot fetched at 22:00 rendered at 01:00 the next day.

### Pitfall 4: TZ drift between server and client
Formatting hours with `toLocaleTimeString()` or `getHours()` in the client gives ART on the phone and UTC in SSR, so hydration mismatches and the labels are wrong on the server. **Avoid:** string slice or `lib/time.ts` with explicit `timeZone`. Vitest already forces `TZ=UTC`.

### Pitfall 5: Hydration mismatch from measured width or `Date.now()`
**Avoid:** initial width constant (342), and selection index derived from props, not from `new Date()` at render time. Measurement happens in `useEffect`/`ResizeObserver`.

### Pitfall 6: Scrubber steals vertical scroll on iOS
With `touch-action: none` the user can't scroll past the chart. **Use `pan-y`.** Also don't call `preventDefault()` on `touchmove` (that's unnecessary with pointer events plus `touch-action`).

### Pitfall 7: Rain scale exaggerates drizzle
With an auto domain `[0, max]`, 0.2 mm fills the band. **Use a floor** (domain `[0, Math.max(4, max)]`) and render bars only for values ≥ 0.1 mm. [ASSUMED: floor value, design call]

### Pitfall 8: Nulls in hourly data (WR-09)
Every `HourlyPoint` field is nullable. `Math.min(...[])` is `Infinity`. **Avoid:** an all-null guard (render the meteogram's empty state), `.defined()` on paths, and skip the wind column when the speed is null ("—"), with no arrow when the direction is null.

### Pitfall 9: ESM-only d3 in tooling
`d3-scale`/`d3-shape` are `"type": "module"` with no CJS build. Next 16 (Turbopack) and Vitest 5 handle ESM natively, so nothing is needed. Don't add `transpilePackages` unless the build actually complains. [VERIFIED: npm `type: module`; ASSUMED: no Turbopack config needed, confirm with `next build`]

## Code Examples

### Pure daily rows (sketch)
```ts
// lib/forecast/daily.ts
import { scaleLinear } from 'd3-scale'
import type { DailyPoint } from '@/lib/weather/types'

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const

export function dayLabel(key: string, index: number): string {
  if (index === 0) return 'Hoy'
  if (index === 1) return 'Mañana'
  const d = new Date(`${key}T12:00:00Z`) // noon UTC: same calendar day in every TZ we care about
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`
}

export function rainText(mm: number | null): string | null {
  return mm !== null && mm >= 1 ? `${Math.round(mm)} mm` : null
}

export function rangeScale(rows: DailyPoint[]) {
  const lo = Math.min(...rows.flatMap((r) => (r.tMinC === null ? [] : [r.tMinC])))
  const hi = Math.max(...rows.flatMap((r) => (r.tMaxC === null ? [] : [r.tMaxC])))
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) return null
  return scaleLinear().domain([lo, hi]).range([0, 1]).clamp(true)
}
```
Note: index 0 is "Hoy" only after filtering `date >= todayKey` (Pitfall 3).

### Scrubber handlers (sketch)
```tsx
// components/client/Meteogram.tsx
'use client'
const onPointer = (e: React.PointerEvent<SVGRectElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  const i = Math.round(layout.x.invert(e.clientX - r.left + PAD_L))
  setSel(Math.min(n - 1, Math.max(0, i)))
}
<rect
  role="slider" tabIndex={0}
  aria-label="Hora del pronóstico"
  aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={sel}
  aria-valuetext={valueText(points[sel])}
  style={{ touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none' }}
  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onPointer(e) }}
  onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) onPointer(e) }}
  onKeyDown={onKey}
  fill="transparent" x={PAD_L} y={0} width={plotW} height={plotH}
/>
```
`role="slider"` on an SVG `<rect>` with `tabIndex` works in modern browsers. If VoiceOver on iOS has trouble with it, move the overlay to an absolutely positioned `<div>` on top of the SVG (same handlers). [ASSUMED: VoiceOver behaviour, check on the device] Also note that `setPointerCapture` on SVG elements is supported, and the `div` fallback avoids any doubt.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `touchstart`/`touchmove` + `preventDefault` | Pointer Events + `touch-action` | Safari 13 (2019) | One code path for mouse, touch and pen; no passive-listener warnings |
| d3 v5 CJS/UMD bundles | d3 v7 modules are ESM-only (`d3-scale` 4, `d3-shape` 3) | 2021 | Import named functions; no `require` |
| Recharts for everything | Hand-made SVG for the editorial chart | Project decision D-06 | Full control of type and layout; more code to own (keep it pure and tested) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Headline thresholds (helada ≤ 0 °C, calor 32/35 °C, frío max ≤ 12 °C, viento 40 km/h / ráfaga 60 km/h) | Headline rule design | The headline says "calor" too often or too rarely; tune with the user. Low technical risk |
| A2 | 00:00–04:59 summarises the current calendar day (no "Mañana:" prefix) | Headline window | Contradicts a literal reading of D-14; confirm with the user or the UI-SPEC |
| A3 | A ~32-character, ≤ 6-word headline fits in 2 lines at Playfair italic 32 px in 342 px | Headline composition, Pitfall 1 | Needs a browser check. If it takes 3 lines, the first-screen budget fails |
| A4 | Strong gust threshold 50 km/h for the meteogram | Layout budget | Cosmetic |
| A5 | Rain band domain floor 4 mm | Pitfall 7 | Cosmetic |
| A6 | Turbopack builds d3 ESM without `transpilePackages` | Pitfall 9 | Build error, trivial fix |
| A7 | VoiceOver exposes `role="slider"` on an SVG `<rect>` correctly | Code Examples | Use the `<div>` overlay fallback |
| A8 | iOS long-press callout appears on SVG text without `-webkit-touch-callout: none` | Pattern 2 | Cosmetic |
| A9 | slopcheck verdicts for the 4 packages (not run) | Package audit | Very low: canonical d3 and DefinitelyTyped packages |
| A10 | Arrow points downwind (`deg + 180`) | Layout budget | Convention; pick one and label it in the UI-SPEC |

## Open Questions

1. **What does `/pronostico` look like with respect to the sky and horizon?**
   - What we know: `Hero`'s gradient is sized to `<main>`, and 14 rows are long.
   - What's unclear: whether `/pronostico` keeps the full sky + horizon composition.
   - Recommendation: the UI-SPEC for phase 2 decides. The technical constraint is in Pattern 4.
2. **Headline window between 00:00 and 04:59** (A2). Recommendation: current calendar day, no prefix.
3. **Headline type size if 2 lines at 32 px don't fit.** Recommendation: keep 32 px (D-03), shorten the copy (≤ 32 characters) and tighten spacing. Fall back to 28 px only if the browser check fails.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build, tests | ✓ (engines `24.x`) | per repo | — |
| npm registry access | installing d3 | ✓ (`npm view` worked) | — | — |
| Vitest | pure tests | ✓ | ^5.0.5, `vitest.config.ts` with `TZ=UTC` | — |
| Browser at 390×844 | success criteria 1 and 3 (no overlap, first screen) | manual, or Chrome devtools / Playwright (not installed) | — | Manual check in devtools device mode + `/dev/estados` frames |
| slopcheck | package audit | ✗ (command denied) | — | Packages tagged `[ASSUMED]` |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (`environment: 'node'`, `include: ['**/*.test.ts']`, `process.env.TZ = 'UTC'`) |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run lib/forecast` |
| Full suite command | `npm test && npm run typecheck && npm run lint` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FCST-01 | x scale maps 0..n−1 to the plot and `invert` round-trips; ticks at local hours 0/6/12/18 only; day separators at local 00; wind columns every 3 h (16 for 48 points); null temps split the path; all-null → empty layout; past hours dropped vs `now` | unit | `npx vitest run lib/forecast/meteogram.test.ts` | ❌ Wave 0 |
| FCST-01 | No label overlap at width 342: pairwise bounding boxes of tick, day and max/min labels don't intersect (estimate width = chars × 7 px at 12 px) | unit | same | ❌ Wave 0 |
| FCST-01 | 390 px: no horizontal scroll, labels legible, scrubber drags and page still scrolls vertically | manual (browser 390×844 + iPhone) | — | manual |
| FCST-02 | Past days filtered; labels Hoy/Mañana/"sáb 25" (TZ=UTC); `rainText` null below 1 mm, "4 mm" otherwise; range scale shared and clamped; null min/max rows | unit | `npx vitest run lib/forecast/daily.test.ts` | ❌ Wave 0 |
| FCST-02 | Toggle 7 ↔ 14, note on days 8–14 | manual / visual in `/pronostico` and `/dev/estados` | — | manual |
| NOW-03 | Window by local hour (04:59 / 05:00 / 20:59 / 21:00 boundaries, under TZ=UTC); priority storm > rain > temp > wind > general; time buckets; "Mañana:" prefix; no "mañana" bucket after the prefix; ≤ 6 words and ≤ 34 chars; no "!"; `null` without data | unit | `npx vitest run lib/forecast/headline.test.ts` | ❌ Wave 0 |
| NOW-03 | Ahora + headline + horizon fit 390×844 | manual browser check (repeat UAT-01) | — | manual |
| — | `localHour(d)` under TZ=UTC | unit | `npx vitest run lib/time.test.ts` | ✅ (extend) |
| — | `sections.ts`: pronostico enabled | unit | `npx vitest run lib/sections.test.ts` | ✅ (update expectation) |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/forecast lib/time.test.ts`
- **Per wave merge:** `npm test && npm run typecheck && npm run lint`
- **Phase gate:** full suite green + `next build` + browser check at 390×844 (home first screen with the longest fixture headline, meteogram readable, `/pronostico` 7 and 14 rows) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `lib/forecast/headline.test.ts` — NOW-03 (fixture builders for hourly windows: storm at 20 h, rain at 15 h, frost, heat, wind, nulls)
- [ ] `lib/forecast/meteogram.test.ts` — FCST-01 geometry and overlap
- [ ] `lib/forecast/daily.test.ts` — FCST-02
- [ ] Shared fixture helper: `makeHourly(startIso, n, overrides)` / `makeDaily(startKey, n)` in `lib/forecast/__fixtures__/` (or extend `app/dev/estados/fixtures.ts`)
- [ ] Install: `npm install d3-scale d3-shape && npm install -D @types/d3-scale @types/d3-shape`

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | `/dev/estados` already hidden in production (keep it that way when adding frames) |
| V5 Input Validation | yes (indirect) | Upstream data already validated with zod in `openMeteoForecast.schema.ts`. The headline and daily copy come only from local tables; no upstream strings are rendered |
| V6 Cryptography | no | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Injection through rendered upstream strings | Tampering | Only numbers cross the boundary (zod); text from local tables; React escapes; no `dangerouslySetInnerHTML` in the SVG |
| Upstream abuse via client fetching | DoS / ToS violation | No client fetch; data passed as props from ISR pages |
| Dependency supply chain | Tampering | Only the 4 canonical packages; lockfile committed; no postinstall scripts |

## Sources

### Primary (HIGH confidence)
- Codebase: `lib/config.ts` (OPEN_METEO_URL: `forecast_hours=48`, `forecast_days=14`, hourly/daily fields), `lib/weather/types.ts`, `lib/weather/normalize.ts`, `lib/time.ts`, `lib/weather/wmo.ts`, `lib/weather/wind.ts`, `components/Ahora.tsx`, `components/Hero.tsx`, `app/globals.css`, `app/page.tsx`, `vitest.config.ts`, fixture `lib/sources/__fixtures__/open-meteo-forecast.json` (48 hourly points from 14:00, 14 days)
- npm registry (`npm view`, 2026-10-23): d3-scale 4.0.2, d3-shape 3.2.0, @types/d3-scale 4.0.9, @types/d3-shape 3.2.0 — `type: module`, `sideEffects: false`, repos github.com/d3/*, no postinstall
- Context7 `/websites/d3js`: `line`/`area` `.defined()`, `.curve(curveMonotoneX)`, `.digits()`; `scaleLinear`, `.nice()`
- https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action — `pan-y` semantics, Baseline since September 2019

### Secondary (MEDIUM confidence)
- d3js.org/d3-scale/time — `scaleTime` uses local time (training knowledge consistent with d3 docs; not re-fetched this session)

### Tertiary (LOW confidence)
- SMN heat thresholds for Santa Rosa: not found. Press notes only ([La Gaceta](https://www.lagaceta.com.ar/nota/1118875/sociedad/ola-calor-extremo-cuales-fueron-ciudades-mas-calientes-pais-segun-servicio-meteorologico-nacional.html), [Informe ola de calor SMN via DIB](https://dib.com.ar/wp-content/uploads/2024/02/Informe_ola_calor_SMN.pdf)). The thresholds are therefore `[ASSUMED]`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — locked by D-06, versions verified on npm
- Data mapping: HIGH — read directly from code and fixture; no new fields needed
- Architecture (Hero/below slot, scrubber): MEDIUM-HIGH — derived from the actual CSS; the exact layout is the UI-SPEC's call
- Layout numbers at 390 px: MEDIUM — arithmetic is exact, font widths estimated
- Headline thresholds: LOW (ASSUMED) — discretion area; tune with the user

**Research date:** 2026-10-23
**Valid until:** 2026-11-22 (stable libraries; codebase-dependent findings valid until Hero/Ahora change)
