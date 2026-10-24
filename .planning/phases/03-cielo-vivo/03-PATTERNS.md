# Fase 3: Cielo vivo - Mapa de patrones

**Mapeado:** 2026-10-24
**Archivos analizados:** 25 (14 nuevos, 11 modificados o extendidos)
**Con análogo:** 23 / 25 (los 2 sin análogo son el renderer WebGL y las fuentes GLSL)

> Todas las rutas son relativas a la raíz del repo (`C:\Users\UD\Desktop\PaginaClima`). Los números de línea corresponden al estado de `main` en `8250ae4`.

## Clasificación de archivos

| Archivo nuevo/modificado | Rol | Flujo de datos | Análogo más cercano | Calidad |
|--------------------------|-----|----------------|---------------------|---------|
| `lib/sky/state.ts` (mod) | model / utilidad pura | transform | sí mismo (líneas 1-54) | exacto |
| `lib/sky/state.test.ts` (mod) | test | — | sí mismo (líneas 1-74) | exacto |
| `lib/sky/palette.ts` (nuevo) | utilidad pura | transform | `lib/forecast/meteogram.ts` (constantes exportadas + funciones puras) y `lib/sky/state.ts` | rol |
| `lib/sky/palette.test.ts` (nuevo) | test | — | `lib/weather/wind.test.ts` (`it.each` tabular), `lib/sky/state.test.ts` | exacto |
| `lib/sky/params.ts` (nuevo) | utilidad pura | transform | `lib/weather/wind.ts` (`CALM_KMH`, normalización de grados) + `lib/weather/wmo.ts` (tabla `Record<number, …>`) | exacto |
| `lib/sky/params.test.ts` (nuevo) | test | — | `lib/weather/wind.test.ts` | exacto |
| `lib/sky/lightning.ts` (nuevo) | utilidad pura | batch (plan determinista) | `lib/weather/freshness.ts` (`shouldTriggerAutoRefresh`, decisión pura por tiempos) | rol |
| `lib/sky/lightning.test.ts` (nuevo) | test | — | `lib/weather/freshness.test.ts` | rol |
| `lib/sky/loop.ts` (nuevo) | utilidad pura | event-driven (recibe timestamps) | `lib/weather/freshness.ts` líneas 43-55 | rol |
| `lib/sky/loop.test.ts` (nuevo) | test | — | `lib/weather/freshness.test.ts` líneas 66-76 | rol |
| `lib/sky/windmill.ts` (nuevo) | utilidad pura | transform | `lib/weather/wind.ts` (umbral `CALM_KMH = 2`) | exacto |
| `lib/sky/windmill.test.ts` (nuevo) | test | — | `lib/weather/wind.test.ts` | exacto |
| `lib/sky/devParams.ts` (nuevo) | utilidad pura (validación) | request-response (query → estado) | `lib/weather/wind.ts` + uniones cerradas de `lib/sky/state.ts` | parcial |
| `lib/sky/devParams.test.ts` (nuevo) | test | — | `lib/weather/wind.test.ts` | rol |
| `components/client/SkyBackdrop.tsx` (mod) | componente cliente | event-driven | sí mismo (líneas 1-78) | exacto |
| `components/client/sky/renderer.ts` (nuevo) | servicio cliente no-React | streaming (loop rAF) | ninguno (patrones parciales: `Meteogram.tsx` ResizeObserver, `Freshness.tsx` visibilitychange) | sin análogo |
| `components/client/sky/shader.ts` (nuevo) | config (strings GLSL) | — | ninguno | sin análogo |
| `components/client/WindmillRotor.tsx` (nuevo) | componente cliente (isla) | event-driven | `components/client/LiveClock.tsx` (isla mínima con efecto) | rol |
| `components/PampaHorizon.tsx` (mod) | componente servidor (SVG) | — | sí mismo (líneas 21-51 `Windmill`) | exacto |
| `components/Hero.tsx` (mod) | componente compartido (server/client) | — | sí mismo (líneas 49-53, banda) | exacto |
| `app/globals.css` (mod) | config (tokens/estilos) | — | sí mismo (líneas 117-140 `.sky-layer`, 162-169 reduced-motion) | exacto |
| `app/dev/sky/page.tsx` (nuevo) | página (server, dev) | request-response | `app/dev/estados/page.tsx` | exacto |
| `app/dev/sky/SkyLab.tsx` (nuevo) | componente cliente (controles) | event-driven | `components/client/RetryButton.tsx` (estilo de botón) + `app/dev/estados/page.tsx` `Frame` | rol |
| `app/dev/estados/page.tsx` (mod, mínimo) | página dev | — | sí mismo | exacto |
| `app/dev/estados/fixtures.ts` (posible reuso) | fixtures | — | sí mismo (`nowData`, líneas 18-32) | exacto |

---

## Asignación de patrones

### `lib/sky/state.ts` (model, transform) — MODIFICAR

**Análogo:** el propio archivo.

**Cabecera y convención "puro, siempre recibe `now`"** (líneas 1-4):
```ts
// Sky state for Winifreda (UI-SPEC "Estados del cielo" steps 1–2 + phase-3 contract). Pure:
// callers always pass `now`, so server render and client recompute share one code path.
import { describeWeather, type WeatherGroup } from '@/lib/weather/wmo'
import { getSolarPhase, type SolarPhase } from './phase'
```

**Tipo a extender con opcionales (D-01)** (línea 10):
```ts
export type SkyState = { phase: SolarPhase; weather: SkyWeather; sunAltitude: number }
```
Agregar `intensity?`, `windKmh?`, `windDirDeg?`, `cloudCover?` (forma exacta en 03-UI-SPEC "Contrato del componente"). No cambiar `SkyWeather`, `SkyToken` ni `skyToken()`.

**Función a extender** (líneas 47-54): hoy solo lee `weatherCode`. El tipo del parámetro es estructural y mínimo, así que se amplía igual (los llamadores `{ now: null }` de `error.tsx`, `global-error.tsx`, `loading.tsx` siguen tipando):
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
Ampliar a `{ weatherCode; precipMm?; windKmh?; windDirDeg? }` y derivar `intensity`/`cloudCover` **del código antes de descartarlo** (Pitfall 9), delegando en `lib/sky/params.ts`.

**Recálculo cliente que pierde campos (Pitfall 9):** `resolveSkyState` (líneas 31-33) devuelve un objeto nuevo sin opcionales. Agregar un helper (por ejemplo `refreshSolar(state, now) => ({ ...state, ...getSolarPhase(now) })`) y usarlo en `SkyBackdrop`.

---

### `lib/sky/state.test.ts` (test) — EXTENDER

**Análogo:** el propio archivo. Reusar los instantes ya probados (líneas 5-9):
```ts
// Instants proven in phase.test.ts for Winifreda (2026-10-23).
const DIA = new Date('2026-10-23T15:00:00Z')
const NOCHE = new Date('2026-10-23T03:00:00Z')
const AMANECER = new Date('2026-10-23T09:15:00Z')
const ATARDECER = new Date('2026-10-23T22:45:00Z')
```
Estilo de bloque (líneas 63-73):
```ts
describe('skyFromSnapshot', () => {
  it('uses the current weather code with the night flag from the solar phase', () => {
    expect(skyToken(skyFromSnapshot({ now: { weatherCode: 95 } }, DIA))).toBe('tormenta')
  ...
```
Nuevos casos: campos opcionales poblados desde un `NowData` parcial, y conservación tras el recálculo.

---

### `lib/sky/palette.ts` (utilidad pura, transform) — NUEVO

**Análogo principal:** `lib/forecast/meteogram.ts` — constantes con nombre exportadas y comentadas con la regla del UI-SPEC que implementan (líneas 1-20):
```ts
// 48 h meteogram geometry (UI-SPEC 'Geometría', D-04/D-06/D-07). Pure; d3 only for scales and paths.
...
/** Temperature panel height; the curve lives between TEMP_PAD and TEMP_H − TEMP_PAD. */
export const TEMP_H = 120
...
/** Rain scale floor (Pitfall 7): 0.2 mm must not look like a downpour. */
export const RAIN_FLOOR_MM = 4
```
Aplicar igual: `export const LMAX_CONTENT = 0.075`, anclas `ANCHOR_NIGHT = -12`, `ANCHOR_DAY = 15`, etc., cada una con su referencia (C-1, D-06).

**Fuente de verdad de los colores (no inventar):** las 6 filas S1…S5 de `app/globals.css` líneas 46-98. Ejemplo (fila `dia`, líneas 64-71):
```css
[data-sky="dia"] {
  --sky-1: #1b3456;
  --sky-2: #22466d;
  --sky-3: #284f75;
  --sky-4: #6fa3c9;
  --sky-5: #a9d6ea;
```
Copiar los hex a un `Record<SkyToken, readonly [string, string, string, string, string]>` en `palette.ts` y agregar un test que compare contra el CSS (o al menos un comentario "mantener en sync con globals.css 46-98").

**Mañana vs. tarde:** reusar la misma lógica que `lib/sky/phase.ts` líneas 15-18 (`getTimes(...).solarNoon`), o recibir `morning: boolean` como parámetro para seguir siendo puro sin suncalc.

**Matemática exacta:** RESEARCH §"sRGB ↔ lineal y luminancia" (`toLinear`, `luminance`).

---

### `lib/sky/palette.test.ts`, `params.test.ts`, `windmill.test.ts`, `devParams.test.ts` (test) — NUEVOS

**Análogo:** `lib/weather/wind.test.ts` (líneas 1-18), patrón tabular con `it.each`:
```ts
import { describe, expect, it } from 'vitest'
import { describeWind, windSector } from './wind'

describe('windSector (8 sectors, SMN spelling)', () => {
  it.each([
    [0, 'N', 'norte'],
    [22.4, 'N', 'norte'],
    ...
  ])('%s° → %s', (deg, short, long) => {
    expect(windSector(deg)).toEqual({ short, long })
  })
```
Usar esta forma para: tabla WMO → intensidad, períodos del rotor (5 → 7,2; 20 → 1,8; ≥ 24 → 1,5), `glowX` (90 → 0,9; 270 → 0,1), clamps de `devParams`. Los barridos de C-1 (−20°…+70° × 5 climas × mañana/tarde) van con bucles `for` dentro de un `it`, como en `state.test.ts` líneas 55-60.

**Config:** `vitest.config.ts` ya incluye `**/*.test.ts`, entorno `node`, `TZ=UTC`, alias `@`. No hay que tocarlo. Los tests van al lado del archivo (`lib/sky/*.test.ts`).

---

### `lib/sky/params.ts` (utilidad pura, transform) — NUEVO

**Análogo 1:** `lib/weather/wmo.ts` líneas 17-46 — tabla `Record<number, …>` cerrada por código WMO. Copiar la forma para la tabla de intensidad del UI-SPEC ("Intensidad"):
```ts
const WMO: Record<number, Entry> = {
  0: e('Despejado', 'despejado'),
  ...
  95: e('Tormenta', 'tormenta'),
  96: e('Tormenta con granizo', 'tormenta'),
  99: e('Tormenta con granizo', 'tormenta'),
}
```
→ `const INTENSITY_BY_WMO: Record<number, number> = { 51: 0.25, 53: 0.25, 55: 0.4, … }` con fallback por `SkyWeather` cuando no hay entrada.

**Análogo 2:** `lib/weather/wind.ts` líneas 8-15 — normalización de grados y umbral de calma ya existente (reusar, no duplicar):
```ts
export function windSector(deg: number): { short: WindSectorShort; long: string } {
  const norm = ((deg % 360) + 360) % 360
  ...
export const CALM_KMH = 2
```
**Manejo de nulos:** igual que `describeWind` (líneas 18-25): `null` → valor por defecto del UI-SPEC (deriva 6 px/s, intensidad lluvia 0,6 / tormenta 0,8).

**Ya existente para reusar:** `lib/sky/phase.ts` línea 3 importa `getPosition` de suncalc y `LAT, LON` de `@/lib/config`. El azimut para `glowX` sale de `getPosition(now, LAT, LON).azimuth` (grados, horario desde el norte) y la luna de `getMoonPosition`/`getMoonIllumination` con las mismas constantes.

---

### `lib/sky/loop.ts` y `lib/sky/lightning.ts` (utilidades puras, decisiones por tiempo) — NUEVOS

**Análogo:** `lib/weather/freshness.ts` líneas 43-55 — decisión pura que recibe tiempos ya medidos por el llamador (el componente pone `Date.now()`, la función no):
```ts
export function shouldTriggerAutoRefresh({
  ageMs,
  attempts,
  sinceLastMs,
}: {
  ageMs: number
  attempts: number
  sinceLastMs: number
}): boolean {
  if (!shouldAutoRefresh(ageMs)) return false
  if (attempts <= 0) return true
  return sinceLastMs >= autoRefreshBackoffMs(attempts)
}
```
Aplicar: `shouldDrawFrame({ ts, lastDrawn })`, `clampDt(ts, prevTs)`, `governorStep(state, { ts, cpuMs, intervalMs })` → nuevo estado; `lightningPlan(seed, intensity, durationS)` y `lightningEnvelope(plan, t)`. Nada de `performance.now()`, `Math.random()` ni `requestAnimationFrame` adentro (PRNG con semilla, mulberry32).

**Test análogo:** `lib/weather/freshness.test.ts` líneas 66-76 — una aserción por escenario de tiempos con constantes (`const MIN = 60_000`). Para el limitador, generar arrays de timestamps sintéticos (60 Hz ± 1 ms, 120 Hz, 30 Hz) en el test.

---

### `lib/sky/windmill.ts` (utilidad pura) — NUEVO

**Análogo:** `lib/weather/wind.ts` (umbral y nulos). Importar `CALM_KMH` de `@/lib/weather/wind` en vez de repetir el 2:
```ts
// clamp(36 / km/h, 1,5 s, 12 s); null = quieto (sin dato o < CALM_KMH)
```

---

### `lib/sky/devParams.ts` (validación de query) — NUEVO

**Análogo parcial:** las uniones cerradas de `lib/sky/state.ts` (líneas 7 y 13) y el comentario de seguridad de `SkyBackdrop.tsx` línea 35:
```ts
// The token only ever comes from skyToken() (closed union), never from upstream text.
```
Patrón: parsear `searchParams` con `Number(...)`, `Number.isFinite` y clamp a los rangos del UI-SPEC (`alt` −20…70 paso 0,5; `i` 0…1; `viento` 0…90; nubes 0…100); `clima`, `lado` y `dir` contra listas `as const` (como `SHORT` en `wind.ts` línea 3). Valor inválido → default. Nunca devolver texto de la query.

---

### `components/client/SkyBackdrop.tsx` (componente cliente, event-driven) — MODIFICAR

**Análogo:** el propio archivo. Lo que se conserva sin tocar:

**Imports y constantes** (líneas 1-8):
```ts
'use client'
...
import { useLayoutEffect, useRef, useState } from 'react'
import { resolveSkyState, type SkyState, type SkyToken, skyToken } from '@/lib/sky/state'

const RECOMPUTE_MS = 60_000
```

**Sync de acento cada 60 s** (líneas 33-62) — se mantiene; solo cambia la línea 36 para conservar opcionales (Pitfall 9):
```ts
    const current = () => skyToken(resolveSkyState(new Date(), weather))
```

**Contenedor y capas fallback** (líneas 64-76) — el host del canvas va como tercer hijo, encima de las dos `.sky-layer`; las capas suman `data-sky-weather` y `data-sky-night`:
```tsx
    <div ref={rootRef} aria-hidden="true" className={`absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div
        data-sky={layers.a}
        className="sky-layer absolute inset-0"
        style={{ opacity: layers.active === 'a' ? 1 : 0 }}
      />
      ...
```

**Prop nueva:** `renderer?: 'auto' | 'static' | 'off'` con default `live ? 'auto' : 'off'` (RESEARCH Pattern 5) — así los cuadros de `/dev/estados` (sin `live`) no crean contextos.

**Efecto del renderer:** copiar el esqueleto de RESEARCH Pattern 1 (`import('./sky/renderer')` con flag `disposed`, `.catch` silencioso, `dispose()` en cleanup). Patrón de cleanup de efectos del repo: `Meteogram.tsx` líneas 39-48 (guarda `typeof ResizeObserver === 'undefined'`, `return () => ro.disconnect()`).

---

### `components/client/sky/renderer.ts` (servicio no-React, loop) — NUEVO, sin análogo

No existe código WebGL ni rAF en el repo. Usar RESEARCH Pattern 2 (atributos del contexto, triángulo, loop 30 fps) y §"Pausas". Fragmentos del repo que sí aplican:

**ResizeObserver** — `components/client/Meteogram.tsx` líneas 40-47:
```ts
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0)
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
```
Observar la caja y el elemento `[data-sky-band]` (Pitfall 7), nunca leer `--band-h`.

**visibilitychange con alta/baja simétrica** — `components/client/Freshness.tsx` líneas 59-61 y 67-71:
```ts
    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeRefresh()
    }
    ...
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      ...
      document.removeEventListener('visibilitychange', onVisibility)
    }
```
Todas las decisiones de tiempo se delegan a `lib/sky/loop.ts` y `lib/sky/lightning.ts`; los colores a `lib/sky/palette.ts`.

---

### `components/client/sky/shader.ts` (strings GLSL) — NUEVO, sin análogo

Usar el bloque GLSL ES 1.00 de RESEARCH Pattern 3 (precisión con `#ifdef GL_FRAGMENT_PRECISION_HIGH`, `hash12` sin seno, `toSrgb`, clamp con `wContent`). Exportar como `export const VERTEX_SRC = \`...\`` / `FRAGMENT_SRC`. Incluir un nombre de uniform único (por ejemplo `uBandTop`) para el chequeo de tamaño del chunk.

---

### `components/client/WindmillRotor.tsx` (isla cliente) — NUEVO

**Análogo:** `components/client/LiveClock.tsx` (isla mínima: `'use client'`, un `useEffect` con cleanup, sin estado global):
```tsx
'use client'

import { useEffect, useState } from 'react'
...
  useEffect(() => {
    const tick = () => setDate(new Date())
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [])
```
Cuerpo del efecto: RESEARCH Pattern 6 (WAAPI + `updatePlaybackRate` + `matchMedia` en vivo, Pitfall 10). Renderiza un `<g ref>` con las 12 aspas y el cubo (geometría copiada de `PampaHorizon.tsx` líneas 41-44). En SSR el rotor queda quieto (ángulo 0), así que el HTML del servidor es idéntico.

---

### `components/PampaHorizon.tsx` (SVG servidor) — MODIFICAR

**Análogo:** el propio archivo. Bloque del rotor a separar (líneas 39-48):
```tsx
      {/* rotor */}
      <g transform="translate(0 -98)">
        {blades.map((a) => (
          <path key={a} d="M-1 -4 L-2.5 -17 L2.5 -17 L1 -4 Z" transform={`rotate(${a})`} />
        ))}
        <circle r={3.5} />
        {/* tail vane */}
        <path d="M2 -1 L26 -1 L26 1 L2 1 Z" />
        <path d="M22 -8 L32 -6 L32 6 L22 8 Z" />
      </g>
```
Dejar el `<g transform="translate(0 -98)">` exterior con la cola; adentro un `<WindmillRotor windKmh>` que dibuja solo aspas + cubo (la transform CSS de la animación va en el `<g>` interno porque reemplazaría el atributo `transform`). `PampaHorizon({ windKmh }: { windKmh?: number | null })`, y `Windmill` la recibe. El archivo sigue sin `'use client'` (el import de una isla cliente desde un server component está permitido), y la firma sin props sigue funcionando para `/dev/estados`.

---

### `components/Hero.tsx` (shell compartido) — MODIFICAR (mínimo)

**Restricción a respetar** (líneas 7-8): "No hooks and no server-only imports, so the client error boundary can render it too." No agregar hooks acá.

**Banda a marcar** (líneas 49-53) — sumar `data-sky-band` para el ResizeObserver del renderer y pasar el viento a la silueta:
```tsx
        <div className="relative h-(--band-h) w-full shrink-0" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0">
            <PampaHorizon />
          </div>
        </div>
```
→ `<div data-sky-band ...>` y `<PampaHorizon windKmh={sky.windKmh} />`. `SkyBackdrop state={sky} live` (línea 39) no cambia.

---

### `app/globals.css` (estilos) — MODIFICAR

**Análogo:** el propio archivo. Las reglas nuevas `[data-sky-weather]` / `[data-sky-night]` se agregan después de `.sky-layer` (líneas 121-134), con el mismo estilo de selectores de atributo planos (comentario de líneas 44-45: "Plain attribute selectors (never scoped to the root element)"). Reusar las variables ya definidas en `.sky-layer` para ubicar la banda:
```css
.sky-layer {
  --band-top: calc(100% - var(--bar-h) - var(--band-h));
  --horizon: calc(100% - var(--bar-h));
```
Para lluvia/niebla/estrellas usar `.sky-layer[data-sky-weather="lluvia"]::after` etc., con `--band-top`/`--horizon` para la niebla. Colores en ink `#fbfbf2` con alfa (6 %, 18 %, 50 %), sin acento.

**Reducir movimiento:** ya cubierto por el bloque global de líneas 162-169 para animaciones CSS (la capa del fallback es estática igual). Si se agrega la transición de opacidad del canvas (600 ms / 300 ms), sumarla al bloque de líneas 136-140:
```css
@media (prefers-reduced-motion: reduce) {
  .sky-layer {
    transition: none;
  }
}
```

---

### `app/dev/sky/page.tsx` (página dev, server) — NUEVO

**Análogo exacto:** `app/dev/estados/page.tsx`.

**Imports y metadata** (líneas 5-6, 24-29):
```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
...
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estados — Clima en Winifreda',
  robots: { index: false },
}
```
→ título `Cielo — Clima en Winifreda`.

**Guarda de producción** (línea 136):
```tsx
  if (process.env.VERCEL_ENV === 'production') notFound()
```

**Estilo de leyenda** (línea 31):
```tsx
const CAPTION = 'text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75'
```

**Cuadro 390×844** (líneas 54-80, componente `Frame`): copiar la `<section>` con `h-[844px] w-[390px] ... [--band-h:240px] [--bar-h:0px]`, `SkyBackdrop`, `Ahora` con `autoRefresh={false}` y la banda con `PampaHorizon`. Para la banda compacta: `DailyFrame` líneas 117-128 (`[--band-h:120px]`). Marcar las bandas con `data-sky-band`.

**searchParams:** en Next 16 son una `Promise` en la página (`{ searchParams }: { searchParams: Promise<...> }` + `await`); parsear con `lib/sky/devParams.ts` y pasar el estado inicial a `SkyLab`. Fixture de `Ahora`: `buildFixtures(nowMs).states.normal` de `app/dev/estados/fixtures.ts` (o `nowData` líneas 18-32 si se exporta).

**Smoke de producción:** `scripts/smoke.mjs` ya soporta `--expect-404 /path` (líneas 14, 60-64); no hay que modificarlo, solo invocarlo con `/dev/sky`.

---

### `app/dev/sky/SkyLab.tsx` (componente cliente, controles) — NUEVO

**Análogo de botón:** `components/client/RetryButton.tsx` línea 58 (estilo "Reintentar" que pide el UI-SPEC para los botones de 44 px):
```tsx
      className="h-11 border border-ink/30 bg-transparent px-6 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink transition-colors hover:border-accent hover:bg-ink/8 focus-visible:border-accent focus-visible:bg-ink/8 active:bg-ink/12 disabled:cursor-default"
```
Ajuste del UI-SPEC: los controles **no usan acento** → cambiar `hover:border-accent`/`focus-visible:border-accent` por `border-ink`; estado elegido con `aria-pressed="true"` + `bg-ink/12 border-ink`. Lectura de rendimiento con la clase `.nums` (globals.css 153-155) y `text-[15px] text-ink/75`.

**URL ↔ estado:** no hay precedente en el repo; usar `useRouter().replace('?…', { scroll: false })` de `next/navigation` (mismo import que `RetryButton.tsx` línea 12).

**Cuadros:** reusar el markup de `Frame` de la página (extraerlo a un componente compartido o duplicarlo en el cliente), con `SkyBackdrop renderer="auto" | "static" | "off"` para los tres cuadros (máx. 2 contextos WebGL).

---

### `app/dev/estados/page.tsx` — MODIFICAR (mínimo, opcional)

Solo si se decide marcar `data-sky-band` en sus bandas (líneas 76 y 123) para consistencia. Los `SkyBackdrop` sin `live` (líneas 62 y 118) quedan con `renderer` por defecto `'off'`: **no** deben crear canvas (tope de contextos de WebKit).

---

## Patrones compartidos

### Lógica pura en `lib/`, test al lado
**Fuente:** `lib/sky/phase.ts` + `lib/sky/phase.test.ts`, `lib/weather/wind.ts` + `wind.test.ts`
**Aplica a:** todos los `lib/sky/*.ts` nuevos.
- Cabecera de una línea con la regla del UI-SPEC que implementa y la palabra "Pure." (`phase.ts` línea 1, `wmo.ts` línea 1, `wind.ts` línea 1).
- Alias `@/lib/...` para imports entre carpetas, relativo `./` dentro de `lib/sky/`.
- `now`/timestamps siempre como parámetro.
- Constantes exportadas con nombre y comentario de la regla (meteogram.ts).

### Uniones cerradas, nunca texto upstream
**Fuente:** `lib/sky/state.ts` líneas 6-13 y `SkyBackdrop.tsx` línea 35
**Aplica a:** `data-sky-weather`, `data-sky-night`, `devParams.ts`, uniforms.
```ts
/** The six `data-sky` token sets of the UI-SPEC (closed union, never upstream text). */
export type SkyToken = 'noche' | 'amanecer' | 'dia' | 'atardecer' | 'cubierto' | 'tormenta'
```

### Islas cliente con efecto + cleanup simétrico
**Fuente:** `LiveClock.tsx` (11-16), `Meteogram.tsx` (39-58), `Freshness.tsx` (59-72)
**Aplica a:** `SkyBackdrop` (efecto del renderer), `WindmillRotor`, `renderer.ts` (listeners de `visibilitychange`, `pagehide`, `pageshow`, IntersectionObserver, ResizeObserver, `matchMedia change`).
Cada `addEventListener` / `observe` tiene su `remove` / `disconnect` en el mismo cleanup. Guarda `typeof X === 'undefined'` para APIs del navegador.

### Hidratación sin diferencias
**Fuente:** `SkyBackdrop.tsx` líneas 21-23 y `LiveClock.tsx` líneas 7-11
```ts
  // Identical on server and client: layer A visible with the server token.
  const [layers, setLayers] = useState<Layers>({ a: initial, b: initial, active: 'a' })
```
**Aplica a:** canvas (se crea en el efecto, nunca en el JSX del primer render), rotor (quieto en SSR), atributos `data-sky-weather`/`data-sky-night` (derivados de `state`, iguales en server y cliente).

### Accesibilidad decorativa
**Fuente:** `SkyBackdrop.tsx` línea 65, `PampaHorizon.tsx` líneas 60-61, `Hero.tsx` línea 49
```tsx
aria-hidden="true" focusable="false"
```
**Aplica a:** host del canvas, canvas, rotor. Sumar `pointer-events: none` al host.

### Páginas dev ocultas en producción
**Fuente:** `app/dev/estados/page.tsx` líneas 24-29 y 136
**Aplica a:** `app/dev/sky/page.tsx`.

## Sin análogo

| Archivo | Rol | Flujo | Motivo |
|---------|-----|-------|--------|
| `components/client/sky/renderer.ts` | servicio cliente no-React | streaming (rAF) | No hay WebGL, canvas ni rAF en el repo. Usar RESEARCH Patterns 1, 2, 4, 5 y §"Pausas"; tomar del repo solo ResizeObserver (`Meteogram.tsx`) y visibilitychange (`Freshness.tsx`) |
| `components/client/sky/shader.ts` | strings GLSL | — | No hay shaders. Usar RESEARCH Pattern 3 |

Precedentes también ausentes (no son archivos, pero el planner tiene que saberlo): `matchMedia`, `IntersectionObserver`, `import()` dinámico y Web Animations no se usan todavía en ningún lado; sincronizar estado con la query de la URL tampoco.

## Metadatos

**Alcance de búsqueda:** `app/`, `components/`, `components/client/`, `lib/sky/`, `lib/weather/`, `lib/forecast/`, `scripts/`, `vitest.config.ts`, `package.json`
**Archivos leídos/escaneados:** 22
**Fecha de extracción:** 2026-10-24
