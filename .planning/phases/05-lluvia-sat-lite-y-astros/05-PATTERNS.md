# Fase 5: Lluvia, satélite y astros — Mapa de patrones

**Mapeado:** 2026-10-25
**Archivos analizados:** 33 (nuevos o modificados, sin contar fixtures binarios)
**Con análogo:** 31 / 33

Todo el código nuevo copia convenciones que ya existen. No hay dependencias nuevas. Las convenciones que hay que respetar en todos los archivos están en "Patrones compartidos", al final.

## Clasificación de archivos

| Archivo nuevo/modificado | Rol | Flujo de datos | Análogo más cercano | Calidad |
|--------------------------|-----|----------------|---------------------|---------|
| `app/cielo/page.tsx` | page (ISR) | request-response (server render) | `app/pronostico/page.tsx` | exacta |
| `app/cielo/loading.tsx` | page (loading) | — | `app/pronostico/loading.tsx` | exacta |
| `app/api/satelite/[stamp]/route.ts` | route handler | request-response binario | `app/api/weather/route.ts` + `app/api/health/route.ts` | parcial (no hay rutas binarias ni con segmento dinámico) |
| `components/cielo/Cielo.tsx` (cabeza: Header + h1, opcional) | component (server) | — | `components/Pronostico.tsx` | exacta |
| `components/cielo/SolLuna.tsx` | component (server) | transform (props precalculadas) | `components/MeteogramSection.tsx` | rol |
| `components/cielo/LluviaAcumulada.tsx` | component (server) | transform | `components/MeteogramSection.tsx` + `RangeBar` de `components/client/DailyList.tsx` | rol |
| `components/cielo/Satelite.tsx` | component (server) | transform | `components/MeteogramSection.tsx` | rol |
| `components/cielo/MoonDisc.tsx` | component SVG (server) | transform | `RangeBar` (`DailyList.tsx` l. 14-26), SVG de `components/PampaHorizon.tsx` | parcial |
| `components/client/SateliteImg.tsx` (isla `onError`, opcional) | component (client) | event-driven | `components/client/RetryButton.tsx` | rol |
| `lib/rain/stitch.ts` (+ test) | utility pura | transform | `lib/forecast/daily.ts` | rol |
| `lib/rain/periods.ts` (+ test) | utility pura | transform (fechas) | `lib/time.ts` | rol |
| `lib/rain/normal.ts` (+ test) | utility pura | transform | `lib/forecast/daily.ts` | rol |
| `lib/rain/compare.ts` (+ test) | utility pura | transform (copy) | `lib/forecast/meteogram.ts` (`rainAmount`, `readoutFor`) | rol |
| `lib/rain/lastRain.ts` (+ test) | utility pura | transform | `lib/forecast/daily.ts` | rol |
| `lib/rain/climatology-1991-2020.json` | config/data estática | — | `lib/sources/__fixtures__/*.json` (import JSON) | parcial |
| `scripts/climatology.mjs` | script one-shot | batch / file-I/O | `scripts/smoke.mjs` | rol |
| `lib/sources/openMeteoArchive.ts` | service (adapter) | request-response + caché | `lib/sources/openMeteoForecast.ts` | exacta |
| `lib/sources/openMeteoArchive.schema.ts` | model (zod) | validación | `lib/sources/openMeteoForecast.schema.ts` | exacta |
| `lib/sources/openMeteoArchive.test.ts` | test | — | `lib/sources/openMeteoForecast.test.ts` | exacta |
| `lib/sources/openMeteoRecentRain.ts/.schema.ts/.test.ts` | service + model + test | request-response + caché | `lib/sources/openMeteoForecast.*` | exacta |
| `lib/sources/gibs.ts` | service (adapter, binario) | request-response + caché | `lib/sources/openMeteoForecast.ts` / `metNorway.ts` | rol (el body es binario, no JSON) |
| `lib/sources/gibs.test.ts` | test (fetch mockeado) | — | `lib/sources/openMeteoForecast.test.ts` | exacta |
| `lib/satellite/frame.ts` (+ test) | utility pura | transform | `lib/config.ts` (constantes) + `lib/time.ts` | rol |
| `lib/sky/sun.ts` (+ test) | utility pura | transform | `lib/sky/astro.ts` + `astro.test.ts` | exacta |
| `lib/sky/moon.ts` (+ test) | utility pura | transform | `lib/sky/astro.ts` + `astro.test.ts` | exacta |
| `lib/rain/series.ts` o `lib/cielo/data.ts` (orquestador: `getRainSeries`, no throw) | service (server-only) | request-response, agregación | `lib/weather/snapshot.ts` | exacta |
| `lib/config.ts` (MOD: TTLs, URLs, `GIBS_LAYER`, `SMN_RADAR_URL`) | config | — | el mismo archivo | exacta |
| `lib/weather/types.ts` (MOD: `SourceId` ampliado) | model | — | el mismo archivo | exacta |
| `lib/sections.ts` + `lib/sections.test.ts` (MOD: `cielo.enabled = true`) | config + test | — | el mismo archivo | exacta |
| `lib/time.ts` (MOD opcional: `formatDayLong` "miércoles 5 de noviembre", `monthLong`) | utility | — | el mismo archivo (`weekdayLong`, `formatHeaderDate`) | exacta |
| `app/dev/estados/page.tsx` + `fixtures.ts` (MOD: cuadros Luna/Sol/Lluvia/Satélite) | page dev | — | `DailyFrame`/`MeteogramFrame` del mismo archivo | exacta |
| `lib/sources/__fixtures__/{open-meteo-archive-era5.json, open-meteo-recent-rain.json, gibs-domains.xml, gibs-blank.jpg, gibs-frame.jpg}` | fixtures | — | `lib/sources/__fixtures__/open-meteo-forecast.json` | exacta (json) / sin análogo (binarios) |
| `CLAUDE.md` (MOD: nombre de la capa GIBS) | docs | — | — | n/a |

---

## Asignación de patrones

### `app/cielo/page.tsx` (page ISR)

**Análogo:** `app/pronostico/page.tsx` (48 líneas). Copiar la estructura entera.

**Cabecera, imports, ISR y metadata** (l. 1-20):
```tsx
// /pronostico (FCST-02): compact sky with the header and title, the 120px Pampa horizon, and the
// 7/14-day list on ground. ISR over the same cached snapshot as the home: no query params (that
// would make the page dynamic and hit the cache per visit), never throws (DATA-03).
import type { Metadata } from 'next'
import { Hero } from '@/components/Hero'
...
import { skyFromSnapshot } from '@/lib/sky/state'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Pronóstico en Winifreda',
  description: 'Pronóstico de 7 a 14 días para Winifreda, La Pampa, en hora argentina.',
}
```
Para `/cielo`: `title: 'El cielo en Winifreda'`, `description: 'Lluvia acumulada contra lo normal, imagen satelital, sol y luna en Winifreda, La Pampa.'` (UI-SPEC, Copywriting).

**Render** (l. 22-47):
```tsx
export default async function PronosticoPage() {
  const snapshot = await getWeatherSnapshot()
  const now = new Date() // server render instant (ISR)
  const renderedAt = now.toISOString()
  const sky = skyFromSnapshot(snapshot, now)
  ...
  return (
    <Hero sky={sky} compact below={ ... }>
      <Pronostico snapshot={snapshot} renderedAt={renderedAt} variant={...} />
    </Hero>
  )
}
```
Para `/cielo`:
- El snapshot se sigue pidiendo solo para el cielo del hero (`skyFromSnapshot`).
- Los datos de lluvia y satélite se piden en paralelo con `Promise.all` sobre orquestadores que **nunca lanzan** (ver `lib/weather/snapshot.ts`).
- `below` = los tres `<section>` en orden Sol y luna → Lluvia → Satélite, con `border-t border-ink/12` entre bloques (UI-SPEC: 48 + hairline + 32).
- Sin `<Freshness>` en el hero (UI-SPEC [default] 1).
- Prohibido leer `searchParams` (comentario l. 2-3).

---

### `app/cielo/loading.tsx`

**Análogo:** `app/pronostico/loading.tsx` (22 líneas). Copia casi literal: cambiar `<Pronostico … variant="loading">` por la cabeza de `/cielo` (Header + h1 "Mirando para arriba").
```tsx
export default function Loading() {
  const now = new Date()
  return (
    <Hero
      sky={skyFromSnapshot({ now: null }, now)}
      compact
      below={
        <p className="pb-12 pt-8 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink/75">
          CARGANDO
        </p>
      }
    >
      <Pronostico snapshot={null} variant="loading" renderedAt={now.toISOString()} />
    </Hero>
  )
}
```

---

### `components/cielo/Cielo.tsx` (cabeza del hero: Header + h1)

**Análogo:** `components/Pronostico.tsx` (l. 4-32). Reusar la constante `HEADLINE` y `<Header renderedAt>`:
```tsx
import { Header } from '@/components/Header'
// Same Headline role as Ahora's headline (28/1.21 fallback applied in 02-01).
const HEADLINE = 'font-serif text-[28px] italic leading-[1.21] tracking-[-0.01em]'
...
<section className="flex flex-col" aria-busy={variant === 'loading' || undefined}>
  <Header renderedAt={renderedAt} />
  <h1 className={`mt-8 text-ink ${HEADLINE}`}>Los próximos días</h1>
```
h1: `Mirando para arriba`. Sin Freshness ni Notice en la cabeza.

---

### `components/cielo/SolLuna.tsx`, `LluviaAcumulada.tsx`, `Satelite.tsx` (secciones server)

**Análogo:** `components/MeteogramSection.tsx` (31 líneas). Sección sobre ground con h2 Label y estado vacío inline:
```tsx
const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'

export function MeteogramSection({ points, todayKey }: { points: HourlyPoint[]; todayKey: string }) {
  ...
  return (
    <section aria-labelledby="meteograma-titulo" className="pb-12 pt-8">
      <h2 id="meteograma-titulo" className={`${LABEL} text-ink/75`}>
        PRÓXIMAS 48 HORAS
      </h2>
      {withTemp < MIN_METEOGRAM_HOURS ? (
        <p className="mt-4 text-[15px] leading-[1.6] text-ink/75">
          No tenemos el pronóstico por hora en este momento. ...
        </p>
      ) : ( <div className="mt-4">…</div> )}
    </section>
  )
}
```
- `pb-12 pt-8` = 48/32 px del UI-SPEC; `mt-4` = 16 px h2 → contenido. Ids únicos (`sol-luna-titulo`, `lluvia-titulo`, `satelite-titulo`). Ojo: en `/dev/estados` se renderizan varias instancias, así que conviene `useId()` o recibir el id por prop (ver `DailyList.tsx` l. 56-57, `useId().replace(/:/g, '')`). `useId` funciona en server components.
- Las mayúsculas van por CSS (`uppercase`), aunque el análogo tenga el texto en mayúsculas en el string. UI-SPEC: "Mayúsculas por CSS, nunca en el string".
- Los componentes reciben **datos ya calculados** (strings y fracciones) desde `lib/`, igual que `DailyRow` (ver `lib/forecast/daily.ts`). No hay lógica de formato dentro del componente.

**Barra de lluvia (LluviaAcumulada).** Copiar `RangeBar` de `components/client/DailyList.tsx` l. 14-26 (sin `'use client'`; es puro markup):
```tsx
function RangeBar({ bar, tentative }: { bar: DailyBar | null; tentative: boolean }) {
  return (
    <div className="relative h-4">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/12" />
      {bar ? (
        <div
          className={`absolute top-1/2 h-1 -translate-y-1/2 ${tentative ? 'bg-ink/55' : 'bg-ink'}`}
          style={{ left: `${bar.lo * 100}%`, width: `max(4px, ${(bar.hi - bar.lo) * 100}%)` }}
        />
      ) : null}
    </div>
  )
}
```
Adaptación: segmento `bg-azure` desde 0 hasta `observado/máx` (mínimo 4 px si > 0), más la marca de normal (`w-px h-3 bg-ink` en `left: normal/máx`) con el rótulo `NORMAL` arriba, clampeado. Alto total 32 px. Sirve la misma técnica de regla del día en SolLuna (segmento `bg-ink` de salida a puesta y marca `bg-ink/55` en "ahora").

**sr-only por fila** (análogo `DailyList.tsx` l. 30-32):
```tsx
<li className={`py-4 ${first ? '' : 'border-t border-ink/12'}`}>
  <span className="sr-only">{row.srText}</span>
  <div aria-hidden="true"> … </div>
</li>
```

**Notice de datos atrasados** (lluvia): reusar `components/Notice.tsx` sin cambios:
```tsx
<Notice role="status">Los datos de lluvia llegan hasta el {jueves 23}. Sumamos los días que faltan cuando estén disponibles.</Notice>
```

**Link SMN (Satelite).** Copiar la cadena de clases `BUTTON` de `DailyList.tsx` l. 11-12 (o `RetryButton.tsx` l. 58), agregando `flex w-full items-center justify-center`:
```ts
const BUTTON =
  'h-11 border border-ink/30 bg-transparent px-6 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink transition-colors hover:border-accent hover:bg-ink/8 focus-visible:border-accent focus-visible:bg-ink/8 active:bg-ink/12'
```
Con `<a href={SMN_RADAR_URL} target="_blank" rel="noopener noreferrer">`, flecha `↗` en `aria-hidden` y sr-only ` (se abre en otra pestaña)`.

**Estado vacío de lluvia:** no usar `NoData` (su copy está fija a "Ahora no tenemos el tiempo…", `components/NoData.tsx` l. 8-13). Copiar solo la forma (Body 15 ink + Body 15 ink/75), sin `RetryButton` (desvío deliberado de DATA-03 documentado en el UI-SPEC).

---

### `components/cielo/MoonDisc.tsx` (SVG server)

**Análogo parcial:** no hay SVG geométrico parecido. Copiar la convención de componente puro sin hooks y `aria-hidden` (`RangeBar` arriba, `PampaHorizon`). El `d` del path viene de `moonPath()` en `lib/sky/moon.ts`; el componente solo pinta:
- `<svg viewBox="0 0 64 64" width={64} height={64} aria-hidden="true">`
- `<circle cx=32 cy=32 r=31 className="fill-ink/8 stroke-ink/20" strokeWidth=1>` + `<path d={…} className="fill-ink">`.

---

### `components/client/SateliteImg.tsx` (isla cliente opcional, `onError`)

**Análogo:** `components/client/RetryButton.tsx` (l. 1-2, 11, 27-29): `'use client'` arriba, comentario que explica por qué es isla, `useState` mínimo. Estado inicial estable entre SSR e hidratación (`DailyList.tsx` l. 54-55: `// SSR-stable initial state`). Al fallar, renderiza el mismo contenido que "Sin imagen (servidor)".

---

### `app/api/satelite/[stamp]/route.ts` (route handler binario)

**Análogos:** `app/api/weather/route.ts` (runtime y comentario de ISR) y `app/api/health/route.ts` (headers `Cache-Control` explícitos):
```ts
// app/api/weather/route.ts
export const revalidate = 600
export const runtime = 'nodejs'
// No query params: a single cache key for everyone. ...
export async function GET() {
  return Response.json(await getWeatherSnapshot())
}
```
```ts
// app/api/health/route.ts l. 7-14
export function GET() {
  return Response.json({ ... }, { headers: { 'Cache-Control': 'no-store' } })
}
```
El cuerpo concreto ya está en RESEARCH §"Ruta binaria" (`RouteContext<'/api/satelite/[stamp]'>`, `await params`, `parseStamp` → 404 sin fetch, `Buffer.from(b64,'base64')`, `Cache-Control: public, max-age=86400, s-maxage=31536000, immutable`, `X-Content-Type-Options: nosniff`, 502 `no-store` en el catch). No hay análogo de segmento dinámico en el repo. **No** exportar `revalidate` en esta ruta (las respuestas se controlan con headers). `proxy.ts` solo matchea `/dev/:path*`: no afecta esta ruta.

---

### `lib/sources/openMeteoArchive.ts` y `lib/sources/openMeteoRecentRain.ts` (adapters)

**Análogo:** `lib/sources/openMeteoForecast.ts` (66 líneas). Copiar el archivo completo y cambiar URL, schema, `SourceId`, clave y TTL.

**Imports** (l. 1-7):
```ts
import 'server-only'
import { unstable_cache } from 'next/cache'
import { OPEN_METEO_URL, TTL, USER_AGENT } from '@/lib/config'
import { ForecastDto } from './openMeteoForecast.schema'
import { SourceError, type Cached } from './errors'
```

**Fetch crudo + errores gruesos** (l. 14-42):
```ts
export async function fetchOpenMeteoForecastRaw(): Promise<Cached<ForecastDto>> {
  let res: Response
  try {
    res = await fetch(OPEN_METEO_URL, {
      cache: 'no-store', // explicit; forced anyway inside unstable_cache
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
  const parsed = ForecastDto.safeParse(body)
  if (!parsed.success) throw new SourceError('open-meteo', 'schema')

  console.info('[upstream] open-meteo forecast fetched')
  return { data: parsed.data, fetchedAt: new Date().toISOString() }
}
```

**Getter cacheado + getter `Fresh(bucket)`** (l. 46-66):
```ts
export const getOpenMeteoForecast = unstable_cache(
  fetchOpenMeteoForecastRaw,
  ['open-meteo-forecast', 'v1'],
  { revalidate: TTL.openMeteoForecast, tags: ['open-meteo'] },
)

export const getOpenMeteoForecastFresh = unstable_cache(
  (bucket: number) => {
    void bucket
    return fetchOpenMeteoForecastRaw()
  },
  ['open-meteo-forecast', 'v1', 'fresh'],
  { revalidate: TTL.openMeteoForecast, tags: ['open-meteo'] },
)
```
Diferencias para el archivo ERA5:
- La URL depende de `start`/`end` (`end = localDateKey(now)`), así que el fetch crudo recibe argumentos (`fetchArchiveRaw(start, end)`). `unstable_cache` incluye `JSON(args)` en la clave: pasar solo strings de fecha, nunca `Date` ni `Date.now()` adentro (Pitfall 9).
- Clave `['open-meteo-archive', 'v1']`, TTL nuevo `TTL.openMeteoArchive = 21_600`; recent: `['open-meteo-recent-rain', 'v1']`, `TTL.openMeteoRecentRain = 1_800`.
- Construir la URL con `URLSearchParams` (igual que `OPEN_METEO_URL` en `lib/config.ts` l. 38-77).
- **Cachear solo lo chico.** Copiar la idea de `metNorway.ts` l. 7-8 (`// Tiny cached value: the ~40 KB body never enters the Data Cache`): devolver `{ date, mm }[]` ya reducidos, no el DTO crudo.

---

### `lib/sources/openMeteoArchive.schema.ts` y `openMeteoRecentRain.schema.ts`

**Análogo:** `lib/sources/openMeteoForecast.schema.ts` (69 líneas). Reusar `sameLengthAsTime` (l. 14-24); conviene exportarlo desde ahí o copiarlo:
```ts
// zod schema for the Open-Meteo forecast response. No server-only: testable in isolation.
import { z } from 'zod'
import { TZ } from '@/lib/config'

const localDT = z.iso.datetime({ local: true }) // "2026-10-23T12:00" (naive local time)
const nums = z.array(z.number().nullable())

function sameLengthAsTime(block: { time: unknown[] } & Record<string, unknown>, ctx: z.RefinementCtx) { … }

export const ForecastDto = z.object({
  utc_offset_seconds: z.number().int(),
  timezone: z.literal(TZ),
  ...
  daily: z.object({
    time: z.array(z.iso.date()),
    precipitation_sum: nums,
    ...
  }).superRefine(sameLengthAsTime),
})
export type ForecastDto = z.infer<typeof ForecastDto>
```
Archivo: `daily: { time: z.array(z.iso.date()), precipitation_sum: nums }` (los `null` del día parcial son válidos). Recent: `hourly: { time: z.array(localDT), precipitation: nums }`.

---

### Tests de adapters (`openMeteoArchive.test.ts`, `openMeteoRecentRain.test.ts`, `gibs.test.ts`)

**Análogo:** `lib/sources/openMeteoForecast.test.ts` (96 líneas).

**Mock de `unstable_cache` + stub de fetch** (l. 3-22):
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/open-meteo-forecast.json'

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

async function load() {
  return import('./openMeteoForecast')
}

function stub(impl: () => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status = 200) =>
  async () => new Response(JSON.stringify(body), { status })
```
**Ciclo** (l. 25-33): `vi.resetModules()` + `vi.spyOn(console, 'info')` en `beforeEach`; `vi.unstubAllGlobals()` + `vi.restoreAllMocks()` en `afterEach`.

**Casos a replicar** (l. 35-95): `http_500`, `http_400` sin filtrar `reason`, `network`, `timeout`, `schema`, fixture real, `…Fresh(bucket)`.

Para GIBS: el stub devuelve bytes, por ejemplo `new Response(readFileSync('…/gibs-blank.jpg'), { headers: { 'content-type': 'image/jpeg' } })`, y un `text/xml` 200 para la ServiceException. Usar `vi.fn` con `mockImplementationOnce` para la secuencia de candidatos T → T−10 → T−20.

---

### `lib/sources/gibs.ts` (adapter binario)

**Análogo:** `lib/sources/openMeteoForecast.ts` (mismo esqueleto de try/catch, `SourceError`, `unstable_cache`) más el código de RESEARCH §Patrón 3 y §Code Examples (`latestSlotFromDomains`, `gibsWmsUrl`, `BLANK_MAX_BYTES`).

Diferencias con el análogo:
- Validar `res.headers.get('content-type')?.startsWith('image/jpeg')` **antes** de leer el body. Si no, `throw new SourceError('nasa-gibs', 'schema')`.
- `const buf = Buffer.from(await res.arrayBuffer())`. Si `buf.length <= BLANK_MAX_BYTES`, `throw new SourceError('nasa-gibs', 'blank')`. Si supera 1 MB, `'schema'`.
- `getSatelliteFrame = unstable_cache(async (stamp: string) => …, ['gibs-frame', 'v1'], { revalidate: 86_400 })` devuelve `Cached<{ b64: string; stamp: string }>`.
- `getSatelliteLatest` usa `readThrough` + getter `Fresh(bucket)` con TTL 600, igual que el forecast. Cachea solo `{ stamp, timeISO }`.
- Tiene que recibir `nowMs` por argumento (o usar el bucket) para armar la ventana de DescribeDomains. Nada de `Date.now()` dentro de la función cacheada sin pasar por la clave.

---

### Orquestador de la página (`lib/rain/series.ts` / `lib/cielo/data.ts`)

**Análogo:** `lib/weather/snapshot.ts` (72 líneas). Es la única forma probada de combinar dos adapters con `readThrough` sin lanzar.

**Imports y memo por render** (l. 1-11, 27):
```ts
import 'server-only'
import { cache } from 'react'
import { TTL } from '@/lib/config'
import { getOpenMeteoForecast, getOpenMeteoForecastFresh } from '@/lib/sources/openMeteoForecast'
import { SourceError } from '@/lib/sources/errors'
import { readThrough } from '@/lib/sources/readThrough'
...
export const getWeatherSnapshot = cache(async (): Promise<WeatherSnapshot> => {
```

**`allSettled` + `readThrough` + degradación parcial** (l. 28-49):
```ts
  const nowMs = Date.now()
  const [om, met] = await Promise.allSettled([
    readThrough({
      getCached: getOpenMeteoForecast,
      getFresh: getOpenMeteoForecastFresh,
      ttlS: TTL.openMeteoForecast,
      nowMs,
    }),
    getMetNorway(),
  ])

  if (om.status === 'fulfilled') { … } else {
    const errorCode = errorCodeOf(om.reason)
    console.error(`[snapshot] open-meteo unavailable: ${errorCode}`)
    …
  }
```
`errorCodeOf` (l. 13-15):
```ts
function errorCodeOf(reason: unknown): string {
  return reason instanceof SourceError ? reason.code : 'unknown'
}
```
Aplicación: ERA5 caído → bloque "Sin datos"; solo recent caído → serie hasta el último día ERA5 + Notice (RESEARCH "Fallo parcial"). El satélite va en un orquestador aparte que devuelve `{ stamp, timeISO } | null`.

`readThrough` (`lib/sources/readThrough.ts` l. 12-35) se usa tal cual, sin cambios. Como `getCached` no recibe argumentos, para el archivo con fechas hay que envolverlo: `getCached: () => getArchive(start, end)` y `getFresh: (b) => getArchiveFresh(start, end, b)`.

---

### Funciones puras `lib/rain/*.ts`

**Análogo:** `lib/forecast/daily.ts` (96 líneas).

**Cabecera y tipos de salida planos** (l. 1-25):
```ts
// Daily rows for /pronostico (UI-SPEC "Anatomía de la fila", D-08..D-12). Pure.
// Everything the client island needs is precomputed here as plain serialisable data.
import { localDateKey, relativeDayLabel } from '@/lib/time'
...
export interface DailyRow {
  key: string // local 'YYYY-MM-DD'
  label: string
  ...
  srText: string
}
```
**Constantes con nombre y comentario de decisión** (l. 27-34):
```ts
/** Max rows shown when expanded; the first DEFAULT_DAYS are the collapsed list (D-08). */
export const MAX_DAYS = 14
/** Rounded mm only from 1 mm (D-10). The probability of precipitation is never used. */
export function rainText(mm: number | null): string | null {
  return mm !== null && mm >= 1 ? `${Math.round(mm)} mm` : null
}
```
→ `RAIN_DAY_MM = 1`, `EARLY_NORMAL_MM = 2`, `NOTHING_MM = 0.5`, `NEAR_BAND = 0.1`.

**Comparar días como strings `YYYY-MM-DD`, hoy con `localDateKey(now)`** (l. 70-76):
```ts
export function buildDailyRows(daily: DailyPoint[], now: Date): DailyRow[] {
  const todayKey = localDateKey(now)
  const days = daily.filter((d) => d.date >= todayKey).slice(0, MAX_DAYS)
```

**Formato de mm con coma** (`lib/forecast/meteogram.ts` l. 372-377). Es la regla de cifra de la fase 2 que pide el UI-SPEC (`{x,x}` bajo 10, entero desde 10):
```ts
function rainAmount(mm: number): string | null {
  if (mm < RAIN_MIN_MM) return null
  const one = Math.round(mm * 10) / 10
  return one < 10 ? one.toFixed(1).replace('.', ',') : formatInt(mm)
}
```
Conviene extraerla a `lib/weather/format.ts` (junto a `formatInt`, l. 12-15) como `formatMm(mm)` con la regla "0 si no llovió". Así la reusan lluvia acumulada, última lluvia y normal.

**Copy en castellano desde tablas locales:** igual que `WEEKDAY_LONG` en `lib/time.ts` l. 92-94. Nunca ICU para nombres de mes o día.

**Tests:** formato de `lib/sky/astro.test.ts`. Instantes fijos como constantes UTC al principio del archivo y `it.each` para tablas de bordes (`process.env.TZ='UTC'` ya lo pone `vitest.config.ts` l. 1).

---

### `lib/rain/periods.ts`

**Análogo:** `lib/time.ts`. Usar sus helpers, no reimplementarlos:
- `localDateKey(d)` (l. 26-28), `addDaysToKey(key, n)` (l. 87-90) y `weekdayIndex` (l. 96-98). Este último hoy es privado: exportarlo, o derivar el lunes con `weekdayShort`.
- Patrón de mediodía UTC para no cambiar de día (l. 86-89):
```ts
/** Shift a "YYYY-MM-DD" key by n days. Noon UTC keeps the calendar day (Argentina has no DST). */
export function addDaysToKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12) + n * DAY_MS).toISOString().slice(0, 10)
}
```
Lunes: `addDaysToKey(todayKey, -((weekdayIndex(todayKey) + 6) % 7))`. Mes: `todayKey.slice(0, 8) + '01'`. Año: `todayKey.slice(0, 4) + '-01-01'`.

---

### `lib/sky/sun.ts` y `lib/sky/moon.ts`

**Análogo:** `lib/sky/astro.ts` (33 líneas). Mismo encabezado, mismos imports de suncalc y mismo offset:
```ts
// Sun and moon for the sky renderer (UI-SPEC "Resplandores"). Pure: callers pass `now`.
// suncalc 2.x returns degrees, azimuth clockwise from north (0 = N, 90 = E): no conversion here.
import { getMoonIllumination, getMoonPosition, getPosition, getTimes } from 'suncalc'
import { LAT, LON } from '@/lib/config'

/** Argentina civil day offset in minutes (UTC−3, no DST), for suncalc's day selection. */
const UTC_OFFSET_MIN = -180
...
  const { solarNoon } = getTimes(now, LAT, LON, 0, UTC_OFFSET_MIN)
  const { fraction } = getMoonIllumination(now)
```
- `UTC_OFFSET_MIN` hoy es privado de `astro.ts`: exportarlo desde ahí (o moverlo a `lib/config.ts`) para no duplicarlo en `sun.ts` y `moon.ts`.
- `getMoonTimes(now, LAT, LON, UTC_OFFSET_MIN)` para salida y puesta de la luna.
- Clamp de `fraction` igual que l. 31: `Math.min(1, Math.max(0, fraction))`.
- Formatear horas solo con `formatHHmm` (`lib/time.ts` l. 66-70), nunca `toLocaleString`.

**Tests:** copiar `lib/sky/astro.test.ts` (l. 1-35). Instantes como constantes UTC con comentario de origen, `it.each` para invariantes. Casos concretos en RESEARCH "Mapa requisitos → tests" (`sunDay(2026-10-25T14:00Z)` → 06:20 / 19:42; `nextFullMoon` → 26/10).

---

### `lib/satellite/frame.ts`

**Análogo:** `lib/config.ts` para constantes (`GIBS_BBOX_3857`, URL armada con `URLSearchParams`, l. 33-35 y 38-77) y `lib/time.ts` para el parse estricto. `parseStamp(stamp, nowMs)` sigue el patrón puro "el caller pasa `nowMs`" (`readThrough.ts` l. 1: `// Pure: the caller supplies nowMs.`). Test tipo `lib/config.test.ts` (l. 1-17): `describe` por función y casos de borde cortos.

---

### `lib/config.ts` (MOD)

Extender el objeto `TTL` (l. 9-13) en lugar de crear constantes sueltas:
```ts
export const TTL = {
  openMeteoForecast: 900,
  metNorway: 2100,
  page: 600,
} as const
```
Sumar `openMeteoArchive: 21_600`, `openMeteoRecentRain: 1_800`, `gibsLatest: 600`, `gibsFrame: 86_400`. Las URLs con `URLSearchParams` siguen el estilo de `OPEN_METEO_URL` (l. 38-77). La URL del archivo depende de fechas, así que va como función (`openMeteoArchiveUrl(start, end)`). También van `GIBS_LAYER = 'GOES-East_ABI_Band13_Clean_Infrared'` y `SMN_RADAR_URL = 'https://www.smn.gob.ar/radar'`. `lib/config.ts` no lleva `server-only` (l. 1: "safe to import from tests and client code").

### `lib/weather/types.ts` (MOD)

Línea 4:
```ts
export type SourceId = 'open-meteo' | 'met-norway'
```
→ sumar `| 'open-meteo-archive' | 'nasa-gibs'` (Pitfall 11). Las fuentes nuevas **no** entran en `WeatherSnapshot.sources`. `lib/weather/snapshot.test.ts` l. 30 usa `SourceId`: revisar que siga compilando.

### `lib/sections.ts` + `lib/sections.test.ts` (MOD)

`sections.ts` l. 14: `{ id: 'cielo', label: 'Cielo', href: '/cielo', enabled: false }` → `true`. Actualizar el comentario de cabecera (l. 1-2). En el test, l. 7-12:
```ts
it('enables Pronóstico in phase 2 and keeps Modelos and Cielo disabled', () => {
  ...
  expect(enabled('cielo')).toBe(false)
```
Pasa a `true`, con el título renombrado. `modelos` queda en `false` (D-09).

### `app/dev/estados/page.tsx` + `fixtures.ts` (MOD)

**Análogo:** el mismo archivo. Copiar `MeteogramFrame` (l. 86-96), que es un cuadro de 390 px sobre ground sin cielo:
```tsx
function MeteogramFrame({ name, points, now }: { name: string; points: HourlyPoint[]; now: Date }) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className={CAPTION}>Meteograma · {name}</figcaption>
      <section aria-label={`Meteograma ${name}`} className="w-[390px] shrink-0 bg-ground px-6">
        <MeteogramSection … />
      </section>
    </figure>
  )
}
```
Y la sección con título (l. 217-222):
```tsx
<h2 className="mb-8 mt-16 font-serif text-[24px] text-white">Meteograma</h2>
<div className="flex flex-col gap-12">{…}</div>
```
Sumar las secciones "Luna" (grilla de 8 `MoonDisc`), "Sol", "Lluvia" y "Satélite" (imagen fixture local, nunca GIBS). Las fixtures relativas a `nowMs` van en `fixtures.ts`, igual que `buildForecastFixtures(nowMs)`. La página ya es `force-dynamic` y la oculta `proxy.ts`.

### `scripts/climatology.mjs`

**Análogo:** `scripts/smoke.mjs`. Copiar el estilo, no el contenido:
- Shebang + bloque de uso comentado (l. 1-18).
- Node ESM sin dependencias (l. 20: solo `node:` imports).
- `fetch` con `AbortSignal.timeout` (l. 110-114).
- Salida con `process.exit(1)` en fallo (l. 240-250).

Escribe con `node:fs/promises` `writeFile` a `lib/rain/climatology-1991-2020.json`. Se corre a mano y **no** se engancha a `build` en `package.json`.

### `lib/rain/climatology-1991-2020.json` y fixtures

Import JSON directo, igual que el test del forecast (`import fixture from './__fixtures__/open-meteo-forecast.json'`, l. 4): `resolveJsonModule` ya funciona. Fixtures binarios (`.jpg`) se leen con `readFileSync(new URL('./__fixtures__/gibs-blank.jpg', import.meta.url))`; no hay análogo de esto en el repo.

---

## Patrones compartidos

### Adapter con caché y "último bueno"
**Fuente:** `lib/sources/openMeteoForecast.ts` l. 14-66 + `lib/sources/readThrough.ts` l. 12-35
**Se aplica a:** `openMeteoArchive.ts`, `openMeteoRecentRain.ts`, `gibs.ts`
- `fetch…Raw` lanza `SourceError` (nunca devuelve basura, así no se cachea).
- `unstable_cache` con clave versionada `[id, 'v1']` y `tags`.
- Getter `…Fresh(bucket)` con clave `[id, 'v1', 'fresh']`.
- La página nunca llama a `…Raw` directo (comentario l. 52-58: volvería dinámica la página ISR).

### Errores
**Fuente:** `lib/sources/errors.ts` l. 6-20
**Se aplica a:** adapters, orquestadores, ruta del satélite
```ts
export class SourceError extends Error {
  readonly source: SourceId
  readonly code: string
  ...
}
```
Solo códigos gruesos (`network`, `timeout`, `http_NNN`, `schema`, y el nuevo `blank`). Logs con prefijo: `console.info('[upstream] … fetched')` y `console.error('[snapshot] … unavailable: ${code}')`. Nunca texto upstream.

### Validación en el borde
**Fuente:** `lib/sources/openMeteoForecast.schema.ts` (`sameLengthAsTime`, `nums`, `timezone: z.literal(TZ)`)
**Se aplica a:** los dos schemas nuevos de Open-Meteo. GIBS se valida por `content-type` y tamaño, sin zod.

### Fechas y horas
**Fuente:** `lib/time.ts`
**Se aplica a:** todo `lib/rain`, `lib/sky/sun.ts`, `lib/sky/moon.ts`, `lib/satellite/frame.ts` y los componentes
- `localDateKey`, `addDaysToKey`, `formatHHmm`, `localHour`, `weekdayLong`.
- Nunca `new Date('YYYY-MM-DD')` ni `toLocaleString` sin `hourCycle: 'h23'` (cabecera l. 1-2, l. 30).
- Los nombres de día y mes salen de tablas locales (l. 92-94). Para "miércoles 5 de noviembre" y "12 de agosto" sumar `MONTH_LONG` en `lib/time.ts`, con el mismo estilo.

### Funciones puras con `now` inyectado
**Fuente:** `lib/sky/astro.ts` l. 1 ("Pure: callers pass `now`"), `readThrough.ts` l. 1
**Se aplica a:** todo `lib/rain`, `lib/sky/sun|moon`, `lib/satellite`. Tests con instantes UTC fijos.

### Tipografía y clases
**Fuente:** `components/MeteogramSection.tsx` l. 7 (`LABEL`), `components/Pronostico.tsx` l. 12 (`HEADLINE`), `components/client/DailyList.tsx` l. 9-12 (`LABEL`, `BODY`, `BUTTON`)
**Se aplica a:** todos los componentes de `components/cielo/`
```ts
const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const BODY = 'text-[15px] leading-[1.6]'
```
Cifra 28: `font-serif text-[28px] leading-[1.21]` **sin** `italic`, más `nums`. Colores: `text-ink`, `text-ink/75`, `text-azure`, `text-peach`, `bg-ink/12`. Sin tokens nuevos.

### Página ISR que nunca lanza
**Fuente:** `app/pronostico/page.tsx` l. 1-3 y 15; `lib/weather/snapshot.ts` l. 17-20
**Se aplica a:** `app/cielo/page.tsx` y los orquestadores. `revalidate = 600`, sin `searchParams`, y cada bloque se degrada por separado.

## Sin análogo

| Archivo | Rol | Flujo | Motivo |
|---------|-----|-------|--------|
| `app/api/satelite/[stamp]/route.ts` (parte binaria y segmento dinámico) | route handler | binario | No hay rutas con `[param]` ni respuestas no-JSON. Usar RESEARCH §"Ruta binaria" |
| `components/cielo/MoonDisc.tsx` (geometría del path) | component SVG | transform | No hay SVG geométrico. Usar RESEARCH §Patrón 5 y UI-SPEC "Luna" |
| Fixtures `.jpg` | fixture binario | — | Solo hay fixtures JSON. Leer con `readFileSync(new URL(…, import.meta.url))` |

## Metadatos

**Alcance de la búsqueda:** `app/`, `components/`, `lib/` (sources, sky, forecast, weather, time, config, sections), `scripts/`, `vitest.config.ts`, `proxy.ts`
**Archivos leídos:** 27
**Fecha:** 2026-10-25
