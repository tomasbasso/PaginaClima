# Phase 4: Pronóstico con confianza - Pattern Map

**Mapped:** 2026-11-01
**Files analyzed:** 42 (20 nuevos, 22 modificados)
**Analogs found:** 42 / 42 a nivel de archivo. Tres técnicas puntuales no tienen antecedente (ver "No Analog Found").

Las rutas de los módulos nuevos son las de `04-RESEARCH.md` §Recommended Project Structure. Las líneas citadas son del estado del repo en `b3b1ea6`.

## Trampas que el código real agrega al research

El planner debería convertir cada una en un criterio de una tarea. Ninguna figura en RESEARCH.md con este detalle.

| # | Dónde | Qué se rompe | Qué hacer |
|---|-------|--------------|-----------|
| 1 | `test/skeleton.e2e.test.ts:72-75` | Exige **una sola** llamada a `api.open-meteo.com` y toma `omCalls[0]` como URL del forecast. El multimodelo usa ese mismo host, y el stub (líneas 19-22) le devolvería el fixture del forecast. Además, `ensemble-api.open-meteo.com` lanza `unexpected host` | Rutear el stub por host **y** por `models=` en la query; sumar `ensemble-api.open-meteo.com`; filtrar `omCalls` para quedarse con la URL sin `models`. Este archivo no entra en el quick run del research: correrlo con `npm test` |
| 2 | `lib/weather/snapshot.test.ts:201,209` | `expect(s.sources.map((x) => x.status)).toEqual(['ok', 'ok'])` falla con 4 fuentes | Pasar a 4 valores. Sumar los dos adapters a `vi.hoisted` y a `vi.mock` (líneas 8-18), con `mockReset` y un valor por defecto en los dos `beforeEach` |
| 3 | `lib/weather/status.test.ts:19-30` y `app/dev/estados/fixtures.ts:56-62` | Arman un `WeatherSnapshot` literal: con `confidence` obligatorio, `npm run typecheck` falla | Agregar `confidence: []` en ambos |
| 4 | `lib/forecast/daily.test.ts:39,42,43` | `toEqual({ lo, hi })` falla si `DailyBar` suma `bandLo: null` y `bandHi: null`, como pide el UI-SPEC | Actualizar las aserciones a la forma nueva |
| 5 | `lib/forecast/daily.test.ts:91,93,103` | El `srText` del UI-SPEC termina en punto y usa el día largo ("Sábado 25"); hoy es `dom 25: ...` y sin punto | Actualizar los tests. No hay helper para "Sábado 25": `relativeDayLabel` da `dom 25` y `weekdayLong` da `sábado` en minúscula. Sumarlo a `lib/time.ts` con su test |
| 6 | `lib/forecast/daily.ts:33` y `daily.test.ts:94,134-136` | `rainText` usa espacio común y el UI-SPEC exige U+00A0 entre número y unidad | Usar `NBSP` como `lib/rain/lastRain.ts:14` y actualizar los tests. Escribir los esperados con ` `, para que se vean en el diff |
| 7 | `lib/weather/faults.ts:33-38` | `openmeteo-down` conserva el dato con `status: 'error'`. El UI-SPEC y el Patrón 4 asumen que `error` no trae dato | `ensemble-down` debe poner `ensemble: null` y `models-down`, `verdict: 'sinDato'` y `voters: 0`, además del estado. Si no, el aviso de falla convive con la fila completa |
| 8 | `lib/weather/wmo.ts:17` | `WMO` no se exporta y el test cartesiano del UI-SPEC recorre "todos los códigos WMO" | Exportar la lista de códigos (por ejemplo `WMO_CODES`), sin escribirla de nuevo en el test: un código nuevo tiene que entrar solo al test |
| 9 | UI-SPEC "Despacho" | Firma `buildDespacho(...): string \| null`, pero el color de la regla depende de **qué regla disparó** (1 y 7b → ink/30), y eso no se deduce de la frase | Devolver `{ text, tone } \| null`. Es un cambio de firma respecto del contrato, no de concepto: conviene anotarlo en el plan |
| 10 | `components/client/DailyList.tsx:63` | `pt-8` queda dentro de la isla, y el UI-SPEC pone aviso, despacho y leyenda entre la silueta y las filas | Mover los 32 px al contenedor de `below` en la página; la lista pasa a `pb-12`. El `NoData` conserva su `pb-12 pt-8` (`app/pronostico/page.tsx:42`) |
| 11 | Clases de Tailwind | Las clases armadas con interpolación (`border-${tone}`) no se generan | Tablas con la clase literal: `{ azure: 'border-azure', sun: 'border-sun', ember: 'border-ember', neutral: 'border-ink/30' }`. Lo mismo para los colores del `Rombo` y el `w-[320px]` de `DailyFrame` |

**Pregunta abierta 4 del research, resuelta:** `RAIN_DAY_MM` se puede reutilizar. `lib/rain/lastRain.ts` solo importa `type RainDay`, `lib/time` y `lib/weather/format`, y este último no tiene imports. No arrastra `server-only`.

## File Classification

### Nuevos

| Archivo | Rol | Flujo de datos | Analog más cercano | Calidad |
|---------|-----|----------------|--------------------|---------|
| `lib/sources/openMeteoEnsemble.schema.ts` | model (Zod) | transform | `lib/sources/openMeteoRecentRain.schema.ts` | role-match: `looseObject` es nuevo |
| `lib/sources/openMeteoEnsemble.ts` | service (adapter) | request-response + cache | `lib/sources/openMeteoRecentRain.ts` | exact |
| `lib/sources/openMeteoEnsemble.test.ts` | test | request-response | `lib/sources/openMeteoRecentRain.test.ts` | exact |
| `lib/sources/openMeteoModels.schema.ts` | model (Zod) | transform | `lib/sources/openMeteoRecentRain.schema.ts` | role-match |
| `lib/sources/openMeteoModels.ts` | service (adapter) | request-response + cache | `lib/sources/openMeteoRecentRain.ts` | exact |
| `lib/sources/openMeteoModels.test.ts` | test | request-response | `lib/sources/openMeteoRecentRain.test.ts` | exact |
| `lib/sources/__fixtures__/open-meteo-ensemble.json` | test (fixture) | file-I/O | `__fixtures__/open-meteo-recent-rain.json` | exact: captura real |
| `lib/sources/__fixtures__/open-meteo-models.json` | test (fixture) | file-I/O | `__fixtures__/open-meteo-recent-rain.json` | exact: captura real |
| `lib/forecast/localDayRain.ts` | utility | transform | `lib/rain/lastRain.ts` | role-match |
| `lib/forecast/localDayRain.test.ts` | test | transform | `lib/forecast/daily.test.ts` | role-match |
| `lib/forecast/ensemble.ts` | utility | transform (batch) | `lib/forecast/daily.ts` | role-match |
| `lib/forecast/ensemble.test.ts` | test | transform | `lib/forecast/daily.test.ts` | role-match |
| `lib/forecast/agreement.ts` | utility | transform | `lib/forecast/headline.ts` (umbrales exportados) | role-match |
| `lib/forecast/agreement.test.ts` | test | transform | `lib/forecast/headline.test.ts` | role-match |
| `lib/forecast/despacho.ts` | utility | transform | `lib/forecast/headline.ts` | exact |
| `lib/forecast/despacho.test.ts` | test | transform | `lib/forecast/headline.test.ts` | exact |
| `lib/forecast/rowStatus.ts` | utility | transform | `lib/weather/wmo.ts` (tabla local) | role-match |
| `lib/forecast/rowStatus.test.ts` | test | transform | `lib/forecast/daily.test.ts` | role-match |
| `components/Rombo.tsx` | component (server-safe) | render | `components/cielo/MoonDisc.tsx` + `Icon` de `TabBar.tsx` | exact |
| `components/Despacho.tsx` | component (server-safe) | render | `components/Notice.tsx` | exact |

### Modificados

| Archivo | Rol | Flujo de datos | Cambio | Patrón a seguir |
|---------|-----|----------------|--------|-----------------|
| `lib/config.ts` | config | — | 2 URLs y 2 TTL | Él mismo, líneas 26-37 y 121-128 |
| `lib/weather/types.ts` | model | — | 2 `SourceId`, `DayConfidence`, `confidence` | Él mismo |
| `lib/weather/faults.ts` | utility | transform | 2 faults y `confidence` en `empty` | Él mismo, líneas 29-52 |
| `lib/weather/snapshot.ts` | service | request-response | 2 fuentes más | Rama `om`, líneas 31-49 |
| `lib/weather/snapshot.test.ts` | test | — | Mocks y casos nuevos | Él mismo |
| `lib/weather/status.test.ts` | test | — | `confidence: []` | Trampa 3 |
| `test/skeleton.e2e.test.ts` | test | — | Stub por host y por query | Trampa 1 |
| `lib/forecast/daily.ts` | utility | transform | Tercer argumento, bandas, textos, `srText` | Él mismo |
| `lib/forecast/daily.test.ts` | test | — | Se extiende | Él mismo |
| `lib/forecast/__fixtures__/build.ts` | test (fixture) | — | Constructor sintético de horas locales y de `DayConfidence` | `makeDaily`, líneas 42-63 |
| `lib/weather/wmo.ts` | utility | — | Exportar códigos | Trampa 8 |
| `lib/time.ts`, `lib/time.test.ts` | utility, test | — | Día largo con mayúscula | `relativeDayLabel`, líneas 141-145 |
| `components/client/DailyList.tsx` | component (isla) | render | Fila nueva | Él mismo |
| `app/pronostico/page.tsx` | route | request-response | Aviso, despacho, descripción SEO | `components/Pronostico.tsx:41-46` para el aviso |
| `app/globals.css` | config | — | Token y keyframes | `@theme` líneas 4-16; `.sky-layer` para clases propias |
| `lib/sections.ts`, `lib/sections.test.ts` | config, test | — | Quitar Modelos | Patrón 5 del research |
| `components/TabBar.tsx` | component | render | Quitar Modelos | Patrón 5 del research |
| `app/dev/estados/page.tsx`, `fixtures.ts` | route (dev), fixture | render | 16 cuadros | `DailyFrame`, `buildCieloFixtures` |
| `.env.example` | config | — | Faults nuevos en el comentario de la línea 3 | Él mismo |

## Pattern Assignments

### `lib/sources/openMeteoEnsemble.ts` y `openMeteoModels.ts` (service, request-response + cache)

**Analog:** `lib/sources/openMeteoRecentRain.ts`, completo (63 líneas). Copiar la forma y cambiar tres cosas: el `SourceId`, el DTO y la agregación antes del `return`.

**Imports** (líneas 1-5):
```typescript
import 'server-only'
import { unstable_cache } from 'next/cache'
import { OPEN_METEO_RECENT_RAIN_URL, TTL, USER_AGENT } from '@/lib/config'
import { RecentRainDto } from './openMeteoRecentRain.schema'
import { SourceError, type Cached } from './errors'
```

**Fetch con errores gruesos** (líneas 15-47). El segundo argumento de `SourceError` nunca lleva texto del upstream:
```typescript
export async function fetchOpenMeteoRecentRainRaw(): Promise<Cached<RecentRainHour[]>> {
  let res: Response
  try {
    res = await fetch(OPEN_METEO_RECENT_RAIN_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    throw new SourceError(
      'open-meteo',
      name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    )
  }
  if (!res.ok) throw new SourceError('open-meteo', `http_${res.status}`)

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new SourceError('open-meteo', 'schema')
  }
  const parsed = RecentRainDto.safeParse(body)
  if (!parsed.success) throw new SourceError('open-meteo', 'schema')

  const { time, precipitation } = parsed.data.hourly
  console.info('[upstream] open-meteo recent rain fetched')
  return {
    data: time.map((t, i) => ({ time: t, mm: precipitation[i] })),
    fetchedAt: new Date().toISOString(),
  }
}
```

**Los dos getters** (líneas 49-63):
```typescript
export const getOpenMeteoRecentRain = unstable_cache(
  fetchOpenMeteoRecentRainRaw,
  ['open-meteo-recent-rain', 'v1'],
  { revalidate: TTL.openMeteoRecentRain, tags: ['open-meteo'] },
)

/** Time-bucketed getter for readThrough: `bucket` only feeds the cache key. */
export const getOpenMeteoRecentRainFresh = unstable_cache(
  (bucket: number) => {
    void bucket
    return fetchOpenMeteoRecentRainRaw()
  },
  ['open-meteo-recent-rain', 'v1', 'fresh'],
  { revalidate: TTL.openMeteoRecentRain, tags: ['open-meteo'] },
)
```

**Diferencias con el analog:**
- `data` es el agregado (`EnsembleDay[]` o `ModelsDay[]`), nunca el DTO (D-18). La agregación se delega a funciones puras de `lib/forecast/`, para poder testearla sin `server-only`.
- Keys de caché: `['open-meteo-ensemble','v1']` y `['open-meteo-models','v1']`, más `'fresh'`. Subir a `v2` ante cualquier cambio de forma (Pitfall 8).
- `SourceError` lleva `'open-meteo-ensemble'` o `'open-meteo-models'`, no `'open-meteo'` como el analog.

---

### `lib/sources/openMeteoEnsemble.schema.ts` y `openMeteoModels.schema.ts` (model, transform)

**Analog:** `lib/sources/openMeteoRecentRain.schema.ts`, líneas 1-17. Reutiliza helpers de `openMeteoForecast.schema.ts`, y no los redefine.

```typescript
// zod schema for the Open-Meteo forecast with past_days (hourly rain). No server-only.
import { z } from 'zod'
import { TZ } from '@/lib/config'
import { localDT, nums, sameLengthAsTime } from './openMeteoForecast.schema'

export const RecentRainDto = z.object({
  utc_offset_seconds: z.number().int(),
  timezone: z.literal(TZ),
  hourly: z
    .object({
      time: z.array(localDT),
      precipitation: nums,
    })
    .superRefine(sameLengthAsTime),
})
```

**`sameLengthAsTime`** (`openMeteoForecast.schema.ts:14-24`) recorre `Object.entries(block)`, así que con `z.looseObject` valida también las columnas por miembro y por modelo. No hace falta otro chequeo de largo. Lo que sí falta, y es nuevo, es el `superRefine` del Patrón 2 del research: ≥ 40 columnas `MEMBER`, cada una con números o `null`.

---

### `lib/sources/openMeteoEnsemble.test.ts` y `openMeteoModels.test.ts` (test)

**Analog:** `lib/sources/openMeteoRecentRain.test.ts`, completo. Copiar `load`, `stub` y `json` (líneas 5-20), `beforeEach`/`afterEach` (23-31) y los casos `http_500`, `http_400` sin filtrar el `reason`, `network`, `timeout`, `schema` por largos, `schema` por otra zona horaria y el getter `Fresh` (48-108).

```typescript
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

async function load() {
  return import('./openMeteoRecentRain')
}

function stub(impl: (input: unknown) => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status = 200) =>
  async () => new Response(JSON.stringify(body), { status })
```

**Aserción sobre la URL** (líneas 42-45): aplicarla a `models`, `hourly`, `daily`, `forecast_days=15` y `timezone`.

**Casos propios:** los valores crudos no se guardan (`JSON.stringify(r.data)` sin `member`), y un día con menos de la mitad de los miembros no se publica. En multimodelo, un horizonte nulo no vota.

---

### `lib/forecast/localDayRain.ts`, `ensemble.ts`, `agreement.ts` (utility, transform)

**Analog de módulo puro con umbral exportado:** `lib/rain/lastRain.ts:1-12` y `lib/forecast/headline.ts:9-23`.

```typescript
// "Última lluvia" line (D-04, UI-SPEC "Última lluvia"). Pure. Uses the same stitched series as
// the totals, so it never disagrees with them.
import type { RainDay } from './stitch'
import { addDaysToKey, formatDayOfMonth } from '@/lib/time'
import { formatMm } from '@/lib/weather/format'

/**
 * A rain day is a local day with ≥ 1.0 mm (R1mm convention of ETCCDI). ...
 */
export const RAIN_DAY_MM = 1
```

**Convenciones:** primera línea de comentario con la referencia y la palabra "Pure"; umbrales `export const` con el porqué; `addDaysToKey` en vez de aritmética de fechas (`lib/time.ts:87`); sin `server-only`. El código de cada función ya está en RESEARCH.md (Patrones 1, 2 y 3, y Code Examples): no hace falta inventarlo.

**Tipo `Verdict`:** vive en `agreement.ts`. `lib/weather/types.ts` hoy no importa nada, y `errors.ts` depende de él. Si `DayConfidence` referencia `Verdict` o `EnsembleDay`, usar `import type` para que el contrato siga sin peso de runtime.

---

### `lib/forecast/despacho.ts` (utility, transform)

**Analog:** `lib/forecast/headline.ts`. Es el mismo problema: una frase por reglas, a partir de tablas locales.

**Encabezado y límites exportados** (líneas 1-3, 21-23):
```typescript
// Editorial headline (UI-SPEC 'Titular editorial', D-13..D-16). Pure: callers pass now.
// Only numbers and WMO codes come from upstream; every word comes from the local table below.
import { addDaysToKey, localDateKey, localHour } from '@/lib/time'
...
export const MAX_WORDS = 7
export const MAX_CHARS = 34
```

**Tablas locales tipadas** (líneas 29-37): `const EVENT_NOUN: Record<EventKind, string> = { ... }`.

**Diferencia:** recibe los veredictos con su fecha y `todayKey`. Para nombrar días: `hoy`/`mañana` comparando con `addDaysToKey(todayKey, 1)`, y `el ${weekdayLong(key)}` (`lib/time.ts:106`). Exportar `MAX_DESPACHO_CHARS = 82`. Ver la trampa 9 sobre el tono.

---

### `lib/forecast/despacho.test.ts` y `agreement.test.ts` (test)

**Analog:** `lib/forecast/headline.test.ts`, líneas 16-30.

```typescript
const at = (local: string) => new Date(`${local}-03:00`)

function withinLimits(h: string) {
  expect(h.split(/\s+/).length).toBeLessThanOrEqual(MAX_WORDS)
  expect(h.length).toBeLessThanOrEqual(MAX_CHARS)
  expect(h).not.toContain('!')
  expect(h.endsWith('.')).toBe(false)
}

describe('buildHeadline (NOW-03, D-13..D-16) under TZ=UTC', () => {
  it('runs in UTC like Vercel', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(0)
  })

  const cases: Array<[string, { hourly48: HourlyPoint[] }, Date, string]> = [
```

Copiar la tabla de casos y el `withinLimits`, sin el `endsWith('.')`: las frases del despacho terminan en punto. Una fila por regla 0–12 y los casos de hoy y mañana. En `agreement`: `it.each` con el borde exacto de cada umbral, por el problema de punto flotante del Pitfall 3.

---

### `lib/forecast/rowStatus.ts` (utility, transform)

**Analog:** `lib/weather/wmo.ts:13-46`, tabla local con helper, y labels en sentence case porque la UI pone las mayúsculas por CSS (línea 2). Los anchos en px del UI-SPEC van en tablas locales como estas: no se mide texto en runtime.

---

### `lib/forecast/daily.ts` (utility, transform, se extiende)

**Tipos a extender** (líneas 9-25):
```typescript
export interface DailyBar {
  lo: number
  hi: number
}

export interface DailyRow {
  key: string // local 'YYYY-MM-DD'
  label: string // 'Hoy' · 'Mañana' · 'dom 25'
  stateLabel: string | null
  minText: string
  maxText: string
  rainText: string | null
  bar7: DailyBar | null // scale of rows 0..6; null for rows 7..13
  bar14: DailyBar | null // scale of all rows
  tentative: boolean // days 8..14 (D-08)
  srText: string
}
```

**Escala a extender** (líneas 40-58). `scaleFor` recibe hoy `DailyPoint[]`; hay que sumarle `tMinP10C` y `tMaxP90C` por día, respetando `bandLo = min(p10, mínima)` y `bandHi = max(p90, máxima)`:
```typescript
function scaleFor(days: DailyPoint[]): Scale | null {
  const values: number[] = []
  for (const d of days) {
    if (d.tMinC !== null) values.push(d.tMinC)
    if (d.tMaxC !== null) values.push(d.tMaxC)
  }
  if (values.length === 0) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null
  return { lo, hi }
}

// Same clamped linear map as d3 scaleLinear().clamp(true), inline so this module needs no d3.
function barFor(d: DailyPoint, scale: Scale | null): DailyBar | null {
  if (!scale || d.tMinC === null || d.tMaxC === null) return null
  const frac = (v: number) => Math.min(1, Math.max(0, (v - scale.lo) / (scale.hi - scale.lo)))
  return { lo: frac(d.tMinC), hi: frac(d.tMaxC) }
}
```

**Armado de la fila** (líneas 74-96): `buildDailyRows(daily, now, confidence?)`, con el join por `date` como en el Patrón 4. Los tres usos actuales con dos argumentos siguen compilando (`app/pronostico/page.tsx:32`, `app/dev/estados/page.tsx:211,252,255`). Los índices 0-2 usan `rainText`, y del 3 en adelante `rainRangeText` si hay ensemble.

---

### `components/client/DailyList.tsx` (component, isla de cliente)

**Sigue siendo la única isla de la página.** El único estado es `expanded` (línea 55), y `barOf` (línea 60) sigue eligiendo la escala. `Rombo` no usa hooks, así que se importa desde acá sin problema.

**Constantes de tipografía a reutilizar** (líneas 9-12):
```typescript
const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const BODY = 'text-[15px] leading-[1.6]'
```

**Fila actual** (líneas 28-44), lo que cambia está en los comentarios:
```tsx
<li className={`py-4 ${first ? '' : 'border-t border-ink/12'}`}>  {/* suma relative; hairline define top: -1px del pluviómetro */}
  <span className="sr-only">{row.srText}</span>
  <div aria-hidden="true">
    <div className="grid grid-cols-[64px_36px_1fr_36px_48px] items-center gap-x-2">  {/* tablas de 4 grillas del UI-SPEC */}
      ...
    </div>
    {row.stateLabel ? <p className={`${LABEL} mt-1 text-ink/75`}>{row.stateLabel}</p> : null}  {/* línea 2 siempre, con min-h-4 */}
  </div>
</li>
```

**Barra actual** (líneas 14-26). El mismo patrón de `style` inline en porcentajes se repite en `components/cielo/LluviaAcumulada.tsx:53` y `SolLuna.tsx:47`:
```tsx
<div className="relative h-4">
  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/12" />
  {bar ? (
    <div
      className={`absolute top-1/2 h-1 -translate-y-1/2 ${tentative ? 'bg-ink/55' : 'bg-ink'}`}
      style={{ left: `${bar.lo * 100}%`, width: `max(4px, ${(bar.hi - bar.lo) * 100}%)` }}
    />
  ) : null}
</div>
```
La geometría pasa a las fórmulas `calc(4px + lo * U)` del UI-SPEC. `--i` va por `style`, y como es un valor derivado del índice, coincide entre servidor y cliente.

**Cola y botón** (líneas 69-91): `hidden={!expanded}` (línea 71) produce el `display: none` del que depende la animación al expandir, así que hay que conservarlo. La nota de la línea 72 suma `relative` y su tramo de riel. El crédito va después del botón, y el comentario de la línea 81 sobre el foco sigue valiendo.

**Comentario de cabecera** (línea 5): dice "no animation". Actualizarlo, porque D-03 lo revisa.

**Sin scroll horizontal:** ni `Hero.tsx:57` ni `app/layout.tsx` declaran `overflow`, y el margen derecho del `below` es de al menos 24 px, de modo que el `-right-4 w-2` entra. Lo confirma el criterio 2 de la verificación.

---

### `components/Rombo.tsx` (component, server-safe)

**Analog:** `components/cielo/MoonDisc.tsx:1-11` (SVG decorativo con un comentario de contrato) y `components/TabBar.tsx:13-30` (props de accesibilidad).

```tsx
// Moon disc of /cielo (UI-SPEC "Luna"): 64×64, shaded disc ink/8 with a 1px ink/20 outline and the
// lit part in ink. Decorative (aria-hidden): the name and percent are in text. No accent.
// Server component, pure; the path comes from lib/sky/moon.ts (southern hemisphere).
export function MoonDisc({ path }: { path: string | null }) {
  return (
    <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden="true" className="shrink-0">
```
```tsx
aria-hidden="true"
focusable="false"
strokeLinejoin="miter"
```
Geometría y colores exactos: tabla "Rombos" del UI-SPEC. `kind` usa `Exclude<Verdict, 'sinDato'>`, y con `sinDato` no se renderiza glifo.

---

### `components/Despacho.tsx` (component, server-safe)

**Analog:** `components/Notice.tsx:1-11`, misma regla izquierda, otro color y otra tipografía.

```tsx
// Editorial notice (UI-SPEC "Desactualizado" / "Aviso"): 2px peach rule on the left, Body 15
// in ink/75. Server-safe (no hooks); reused by plan 06 for "fuente caída".
import type { ReactNode } from 'react'

export function Notice({ children, role }: { children: ReactNode; role?: 'status' }) {
  return (
    <div role={role} className="border-l-2 border-peach pl-4 text-[15px] leading-[1.6] text-ink/75">
      {children}
    </div>
  )
}
```

**Tipografía** a tomar de `components/Pronostico.tsx:12`, donde el rol es `font-serif ... italic`; el UI-SPEC fija 24/1.33 y tracking 0. El `<ul>` de la leyenda se renderiza en el mismo componente, porque ambos aparecen y desaparecen juntos.

---

### `lib/weather/snapshot.ts` (service, request-response)

**Analog:** el mismo archivo. Las fuentes nuevas siguen la **rama `om`** (readThrough, puede quedar `stale`), no la de `met`.

**Llamada** (líneas 30-38):
```typescript
const [om, met] = await Promise.allSettled([
  readThrough({
    getCached: getOpenMeteoForecast,
    getFresh: getOpenMeteoForecastFresh,
    ttlS: TTL.openMeteoForecast,
    nowMs,
  }),
  getMetNorway(),
])
```

**`SourceInfo`** (líneas 40-49):
```typescript
let omInfo: SourceInfo
if (om.status === 'fulfilled') {
  const status = deriveSourceStatus(om)
  omInfo = { id: 'open-meteo', status, fetchedAt: om.value.value.fetchedAt }
  if (status === 'stale') omInfo.errorCode = om.value.refreshError
} else {
  const errorCode = errorCodeOf(om.reason)
  console.error(`[snapshot] open-meteo unavailable: ${errorCode}`)
  omInfo = { id: 'open-meteo', status: 'error', fetchedAt: null, errorCode }
}
```
Con tres copias conviene un helper local `infoFrom(id, settled)`, sin tocar el comportamiento de `met`.

**Armado** (líneas 60-71): `const sources = [omInfo, metInfo, ensembleInfo, modelsInfo]`, siempre con `open-meteo` primero (lo leen `lib/weather/status.ts:17`, `components/Pronostico.tsx:25` y `scripts/smoke.mjs:201`). Las dos ramas de `built` suman `confidence`. El veredicto se calcula acá, con `agreementFor`, para que cambiar un umbral no exija invalidar la caché.

**Referencia cruzada:** `lib/rain/series.ts:32-45` muestra dos `readThrough` en un mismo `allSettled`, con getters envueltos.

**`/api/weather`:** `app/api/weather/route.ts:9` serializa el snapshot completo. Por eso los valores por modelo y por miembro no pueden entrar en `confidence`.

---

### `lib/weather/faults.ts` (utility, transform)

**Extender** las líneas 6 y 8 (`WeatherFault` y `FAULTS`). El `switch` de las líneas 32-66 es exhaustivo, así que el compilador pide los casos nuevos. Forma de un caso (líneas 39-43):

```typescript
case 'metno-down':
  return {
    ...s,
    sources: mapSource('met-norway', (src) => ({ ...src, status: 'error', errorCode: 'fault' })),
  }
```

Sumar el borrado de datos de la trampa 7, y `confidence: []` en `empty` (líneas 53-65). Actualizar `it.each` en `snapshot.test.ts:194` para probar que se ignoran en producción, y `.env.example:3`.

---

### `lib/config.ts` (config)

**TTL** (líneas 26-37), con comentario del motivo:
```typescript
  /** ERA5 updates once a day: 6 h keeps the ~455-day archive request cheap (D-10). */
  openMeteoArchive: 21_600,
  openMeteoRecentRain: 1_800,
```
Sumar `openMeteoEnsemble: 10_800` y `openMeteoModels: 3_600`.

**URL** (líneas 120-128), con el mismo formato que el ejemplo del research:
```typescript
/** Hourly rain of the last 14 days + today, to fill the days ERA5 does not cover yet (D-10). */
export const OPEN_METEO_RECENT_RAIN_URL = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
  latitude: String(LAT),
  longitude: String(LON),
  hourly: 'precipitation',
  past_days: '14',
  forecast_days: '1',
  timezone: TZ,
}).toString()}`
```

---

### `lib/weather/types.ts` (model)

Línea 4: sumar los dos `SourceId` (`SourceError` los toma de ahí, `lib/sources/errors.ts:1`). Línea 60: mantener el comentario "sources[0] is always 'open-meteo'". `DayConfidence`: Patrón 4 del research.

---

### `app/pronostico/page.tsx` (route)

**Punto de integración** (líneas 32-46):
```tsx
const rows = buildDailyRows(snapshot.daily, now)

return (
  <Hero
    sky={sky}
    compact
    below={
      rows.length > 0 ? (
        <DailyList rows={rows} />
      ) : (
        <div className="pb-12 pt-8">
          <NoData action={<RetryButton />} />
        </div>
      )
    }
  >
```

Pasar `snapshot.confidence` como tercer argumento. La rama con filas suma, en este orden, `Notice`, `Despacho` y `DailyList`, en la página (componentes de servidor), no dentro de la isla. La rama sin filas queda igual: el UI-SPEC prohíbe despacho y aviso propio ahí.

**Aviso con hora**, como `components/Pronostico.tsx:41-46`:
```tsx
<Notice role="status">
  No pudimos actualizar el pronóstico. Te mostramos el último dato bueno, de las{' '}
  {formatHHmm(new Date(fetchedAt))}.
</Notice>
```
Elegir la copy con una función pura en `lib/forecast/` a partir de `sources` y exportarla con tests: las cuatro combinaciones del UI-SPEC son lógica, y la página no tiene tests.

**Descripción SEO** (línea 22): reemplazar por la copy del UI-SPEC, respetando el comentario de la línea 17.

---

### `app/globals.css` (config)

**Token**, en `@theme` después de la línea 15:
```css
  --color-peach: #fcd5ce;        /* avisos (desactualizado / fuente caída) */
  --color-ember: #e8603a;        /* brasa: "no se ponen de acuerdo". Solo rombo vacío y SIN ACUERDO */
```

**Clases propias:** seguir el patrón de `.sky-layer` (líneas 121-134), con un comentario de referencia al UI-SPEC encima. Los keyframes están en el UI-SPEC. **No agregar** reglas de `prefers-reduced-motion`: las líneas 226-233 ya ponen `animation: none !important` y `transition: none !important` para todo.

---

### `lib/sections.ts`, `lib/sections.test.ts`, `components/TabBar.tsx` (config, component)

Según el Patrón 5 del research, sin `enabled` ni rama `aria-disabled`:

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `lib/sections.ts` | 1-2 | Reescribir el comentario, que menciona Modelos y `enabled` |
| `lib/sections.ts` | 3, 5-15 | Quitar `'modelos'`, el campo `enabled` y la entrada |
| `lib/sections.test.ts` | 4-13 | Reemplazar por una aserción sobre los ids: `['ahora', 'pronostico', 'cielo']` |
| `components/TabBar.tsx` | 5 | Quitar el comentario de secciones deshabilitadas |
| `components/TabBar.tsx` | 54-63 | Quitar el ícono. `Record<SectionId, ...>` hace que el compilador lo exija |
| `components/TabBar.tsx` | 84, 102-111 | Quitar el `if` y el `<span aria-disabled>`, dejando el `<Link>` |

`ITEM` (líneas 72-73) ya usa `flex-1`, así que las tres pestañas se reparten el ancho solas.

---

### `app/dev/estados/page.tsx` y `fixtures.ts` (route dev, fixture)

**`DailyFrame`** (`page.tsx:117-151`): sumar la prop de ancho; la línea 134 fija `w-[390px]`. Trampa 11: pasar la clase literal.

```tsx
<section aria-label={`Pronóstico diario ${name}`} className="w-[390px] shrink-0 bg-ground">
```

**Sección nueva**, misma forma que `page.tsx:243-269`:
```tsx
<h2 className="mb-8 mt-16 font-serif text-[24px] text-white">Pronóstico diario</h2>
<div className="flex flex-col gap-12">
  <DailyFrame name="7 días" sky={normalSky} head={head(states.normal)}>
    <DailyList rows={semanaRows} />
  </DailyFrame>
```

**Fixtures:** builder nuevo junto a `buildCieloFixtures` (`fixtures.ts:341`), que se importa en `page.tsx:25`. El UI-SPEC pide filas del modelo de vista; la forma más segura es pasar `DailyPoint[]` y `DayConfidence[]` por `buildDailyRows`, para que los cuadros no se desfasen del código real. Valores reales de lluvia (Pitfall 4: "0–17 mm", no solo "5–15 mm").

**`okSources`** (`fixtures.ts:65-71`): sumar las dos fuentes, para que los cuadros existentes representen el caso sano.

---

## Shared Patterns

### Validación y errores en el borde
**Source:** `lib/sources/errors.ts:6-20`, `lib/sources/openMeteoForecast.schema.ts:14-24`
**Apply to:** ambos adapters y schemas
Solo códigos `network`, `timeout`, `http_N`, `schema`. Nunca el `reason` del upstream (test en `openMeteoRecentRain.test.ts:58-68`).

### Último dato bueno
**Source:** `lib/sources/readThrough.ts:12-35`, `lib/weather/status.ts:8-13`
**Apply to:** `snapshot.ts`
`stale` sale solo de `refreshError`, nunca de la edad. `readThrough` rechaza únicamente si no hay ningún dato previo.

### Lógica en `lib/`, tests al lado, sin tests de componentes
**Source:** `vitest.config.ts:15-16` (`environment: 'node'`, `**/*.test.ts`)
**Apply to:** todo
Lo que quede dentro de un `.tsx` solo se verifica en el navegador. Por eso la selección de textos, de aviso y de tono tiene que vivir en funciones puras.

### Fechas
**Source:** `lib/time.ts:26,87,106,141`
**Apply to:** `localDayRain`, `despacho`, `daily`
Claves `YYYY-MM-DD` comparadas como strings, `localDateKey`, `addDaysToKey`. Los tests corren con `TZ=UTC` y lo afirman (`daily.test.ts:6-8`).

### Espacio duro
**Source:** `lib/rain/lastRain.ts:14,46`
**Apply to:** `"70 %"`, `"5–15 mm"`, `rainText`
U+00A0 entre número y unidad. Los anchos de `rowStatus` asumen una sola línea.

### Copy
**Source:** `lib/forecast/headline.ts:1-2`, `lib/weather/wmo.ts:1-2`
**Apply to:** despacho, leyenda, palabras, avisos, crédito
Tablas locales en sentence case, mayúsculas por CSS (`LABEL` en `DailyList.tsx:9`), rioplatense y sin signos de exclamación.

### Aislamiento de módulos de servidor
**Source:** `lib/sources/openMeteoRecentRain.ts:1` frente a `.schema.ts:1`
**Apply to:** adapters nuevos
`server-only` va en el adapter, no en el schema. `snapshot.test.ts` mockea los adapters enteros, porque de lo contrario cargaría `next/cache` real.

## No Analog Found

Ningún archivo queda sin analog, pero estas técnicas no tienen antecedente en el repo. El planner debe usar RESEARCH.md y el UI-SPEC.

| Técnica | Dónde | Fuente | Riesgo |
|---------|-------|---------|--------|
| Keyframes CSS y `animation-delay` por `--i` | `app/globals.css`, `DailyList.tsx` | UI-SPEC "Animación de entrada" | Bajo: el repo no tiene ningún `@keyframes`; el `globals.css` sí resuelve reducir movimiento |
| Container queries (`@container`, `@max-[327px]:`) | `DailyList.tsx` | UI-SPEC "Qué se acorta" y Context7 | Bajo: core de Tailwind v4, sin uso previo en el repo. Probar primero en el cuadro 15 |
| Columnas dinámicas con `z.looseObject` | Ambos schemas | RESEARCH Patrón 2 | Bajo: probado contra la respuesta real |

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `scripts/`, `test/`
**Files scanned:** 36 leídos, de 170 archivos versionados fuera de `.planning/` y `.claude/`
**Project skills:** ninguno
**Pattern extraction date:** 2026-11-01
