---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-11-02T02:05:49.811Z"
last_activity: 2026-11-02
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 35
  completed_plans: 32
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-23)

**Core value:** Abrirla y entender de un vistazo qué tiempo hace y va a hacer en Winifreda, con una experiencia visual que no se parece a ninguna otra app del clima.
**Current focus:** Phase 04 — pron-stico-con-confianza

## Current Position

Phase: 04 (pron-stico-con-confianza) — EXECUTING
Plan: 8 of 10
Status: Ready to execute
Last activity: 2026-11-02

Progress: [█████████░] 91%

## Performance Metrics

**Velocity:**

- Total plans completed: 18
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 2 | 5 | - | - |
| 3 | 8 | - | - |
| 5 | 5 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 10 min | 3 tasks | 25 files |
| Phase 01 P04 | 12 min | 3 tasks | 8 files |
| Phase 01 P05 | 9 min | 3 tasks | 12 files |
| Phase 01 P06 | 9min | 3 tasks | 18 files |
| Phase 02 P01 | 25 min | 3 tasks | 12 files |
| Phase 02 P02 | 10 min | 3 tasks | 12 files |
| Phase 02 P03 | 25 min | 3 tasks | 7 files |
| Phase 02 P04 | 30 min | 2 tasks | 5 files |
| Phase 03 P01 | 7 min | 3 tasks | 11 files |
| Phase 03 P02 | 6 min | 3 tasks | 11 files |
| Phase 03 P03 | 7 min | 3 tasks | 6 files |
| Phase 03 P05 | 9 min | 2 tasks | 5 files |
| Phase 03 P07 | ~2h | 3 tasks | 4 files |
| Phase 05 P01 | 8 min | 2 tasks | 14 files |
| Phase 05 P02 | 8 min | 3 tasks | 22 files |
| Phase 05 P03 | 12 min | 3 tasks | 11 files |
| Phase 05 P05 | 45 min | 3 tasks | 4 files |
| Phase 04 P01 | 2 min | 1 tasks | 3 files |
| Phase 04 P02 | 6 min | 2 tasks | 15 files |
| Phase 04 P03 | 5 min | 2 tasks | 9 files |
| Phase 04 P04 | 6 min | 2 tasks | 6 files |
| Phase 04 P05 | 6 min | 2 tasks | 12 files |
| Phase 04 P06 | 4 min | 2 tasks | 5 files |
| Phase 04 P07 | 5 min | 2 tasks | 6 files |

## Accumulated Context

### Quick Tasks Completed

| # | Description | Date | Directory |
|---|-------------|------|-----------|
| 1 | Fase 4 sin pestaña Modelos: pasa a "Pronóstico con confianza" (FCST-03, FCST-04, MODL-02) | 2026-10-25 | [20261025-fase4-sin-pestana-modelos](./quick/20261025-fase4-sin-pestana-modelos/) |
| 261026-g5s | SEO técnico para Search Console: metadata, robots, sitemap, manifest, OG dinámica, JSON-LD y h1 duplicado | 2026-10-26 | [261026-g5s-seo-tecnico-para-search-console-metadata](./quick/261026-g5s-seo-tecnico-para-search-console-metadata/) |

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Modo MVP vertical — cada fase entrega algo visible y desplegado en Vercel (región gru1) desde la fase 1
- [Roadmap]: Antes de construir pantallas hay una etapa de diseño/identidad (mockups en Stitch + /gsd-ui-phase); todas las fases tienen UI hint
- [Roadmap]: Fases con investigación propia: 3 (cielo/WebGL en Safari), 4 (ensemble/GEM/semáforo), 5 (GIBS/ERA5), 7 (Web Push iOS/cron)
- [Phase 1]: 01-01: Source adapters use unstable_cache(fetchRaw, ['<source>','v1']) returning { data, fetchedAt }; page and route call getWeatherSnapshot() directly and never throw
- [Phase 1]: 01-01: RootLayout typed explicitly (not generated LayoutProps) so tsc --noEmit works before next typegen
- [Phase 1]: 01-01: smoke.mjs --expect-404 needs MSYS_NO_PATHCONV=1 under Git Bash
- [Phase 01]: Sky: llovizna->lluvia, nieve->cubierto in SkyWeather; skyFromSnapshot shared by layout and page
- [Phase 01]: 01-05: Freshness refreshes once per fetchedAt (useRef); fixture pages pass autoRefresh=false
- [Phase 01]: 01-05: snapshot sources built from Promise.allSettled; MET Norway cached as 3-field summary, never displayed
- [Phase 01]: 01-06: source status is outcome-based ('stale' only from readThrough refreshError); idle periods trigger a foreground bucketed refresh
- [Phase 01]: 01-06: WEATHER_FAULT allowlist ignored when VERCEL_ENV=production; Hero shell shared in components/Hero.tsx
- [Phase 02]: Rol Headline: fallback UI-SPEC 28px/1.21 aplicado (32/1.19 desbordaba 0,8 px a 390x844 con insets); /pronostico usa el mismo rol
- [Phase 02]: Titular: MAX_WORDS=7, MAX_CHARS=34, prefijo Mañana: desde las 21:00
- [Phase 02]: 02-02: Hero = caja del cielo (full: 100svh-barra; compact: banda 120 px) + slot below sobre ground; --bar-h en :root y 0px dentro de la caja
- [Phase 02]: 02-02: titulo de /pronostico en Headline 28/1.21; escalas 7/14 calculadas en el servidor, la isla solo elige bar7/bar14
- [Phase 02]: 02-03: rótulos de día del meteograma estimados en 11 px/carácter (DAY_CHAR_W); numéricos 7 px
- [Phase 02]: 02-03: mayúsculas de los rótulos SVG en JS, no con text-transform CSS
- [Phase 02]: 02-04: columnas de viento con clamp en [7, ancho−7] y separación mínima de 18 px entre centros (adaptativa en anchos chicos)
- [Phase 02]: 02-04: la selección del scrubber vuelve a Ahora con datos nuevos mediante un key de remount en MeteogramSection, sin efecto
- [Phase 03]: 03-01: overcast/rain weight ramps in between -12 and -6 deg and reaches full cubierto by +15 deg (no jump, exact convergence by day)
- [Phase 03]: 03-01: night storm darkening (0.5 towards noche S1) ramps in between -12 and -18 deg
- [Phase 03-02]: cobertura de nubes derivada del código WMO (sin cloud_cover upstream); intensity/cloudCover se calculan en skyFromSnapshot antes de descartar el código
- [Phase 03-02]: molino con una Web Animation y updatePlaybackRate(1/clamp(36/km/h,1.5,12)); quieto con calma, sin dato o reduced-motion leído en JS
- [Phase 03]: 03-03: gobernador de dos señales (CPU EMA > 28 ms o intervalo > 45 ms, 2 s tras 2 s de calentamiento, nunca sube); umbrales a calibrar en 03-08
- [Phase 03]: 03-03: estrellas y halo de luna se desvanecen con el factor de despejado interpolado en 2000 ms; halo de luna atenuado de día
- [Phase 03]: 03-05: /dev/sky alt range −30…70 (presets −30/−25 round-trip); query validated by parseSkyLabParams, never echoed
- [Phase 03]: 03-05: SkyBackdrop dev props (astro, paused, bufferScale, onStats, onStatus) in refs; only bufferScale recreates the renderer
- [Phase 03]: 03-07: borde de la banda medido con getBoundingClientRect().top; rampa del clamp dentro de la banda
- [Phase 03]: 03-07: preview/cielo-vivo usa un commit vacío propio (aa99c5e) porque Vercel no rearma un SHA ya desplegado en producción
- [Phase 03]: 03-08: iPhone measurement skipped by owner; BUFFER_SCALE 0.5 and GOV_* thresholds kept (28/45 ms)
- [Phase 05]: 05-01: lado iluminado de la luna por waxing de suncalc (hemisferio sur: creciente a la izquierda), terminador vertical
- [Phase 05]: 05-01: 'Llena el …' se omite mientras el nombre sea 'Luna llena'
- [Phase 05]: 05-03: normal prorrateada hasta dataUntil (no hasta hoy), hoy ponderado por todayFraction; dia de lluvia >= 1 mm (RAIN_DAY_MM)
- [Phase 05]: 05-03: rotulo NORMAL en caja fija de 64 px clampeado con CSS clamp(); comparacion en minuscula dentro del texto sr
- [Phase 05]: 05-05: revisión visual en navegador integrado a 390x844, sin iPhone real (decisión del dueño)
- [Phase 04]: 04-01: MODL-02 sigue abierto: solo se sacó la pestaña; el semáforo por día llega en planes posteriores
- [Phase 04]: 04-02: 'Hoy' cuenta el día local completo, incluidas las horas ya pasadas (FCST-03, D-10)
- [Phase 04]: 04-02: localDayRain redondea la suma a 2 decimales para no perder el umbral de 1 mm por punto flotante
- [Phase 04]: 04-02: FCST-03 sigue abierto hasta que 04-03 lo muestre en /pronostico
- [Phase 04]: 04-03: ensembleUp mira solo los días visibles: un DayConfidence de un día pasado no cuenta como ensemble disponible
- [Phase 04]: 04-03: con el ensemble caído, probText es null y la última columna muestra los mm
- [Phase 04]: 04-04: el dominio de la escala solo incluye bandas que se dibujan: un día sin barra no reserva lugar
- [Phase 04]: 04-04: la oración del rango de temperatura se omite si falta uno de los dos límites
- [Phase 04]: 04-05: confidence es la unión de fechas de ensemble y modelos: con el ensemble caído, los días siguen con veredicto y ensemble en null
- [Phase 04]: 04-05: aggregateModels omite los días sin votantes: el día 15 sin terminar no llega al snapshot
- [Phase 04]: 04-05: el schema multimodelo exige un modelo con sus tres columnas, y MODL-02 sigue abierto hasta que 04-06 dibuje el rombo
- [Phase 04]: 04-06: modelsUp mira solo los días visibles, igual que ensembleUp: un veredicto de un día pasado no cuenta
- [Phase 04]: 04-06: MODL-02 queda completo: el semáforo se ve por día y /api/weather no expone nombres de modelo; leyenda y despacho llegan en 04-08
- [Phase 04]: 04-07: las 7 etiquetas sin medida en el contrato se midieron en Chrome con la fuente real; una etiqueta desconocida usa 10,4 px por carácter

### Pending Todos

None yet.

### Blockers/Concerns

- Disponibilidad de GEM en Sudamérica sin confirmar (si no está, votan 3 modelos) — fase 4
- Capa exacta de NASA GIBS para GOES-East IR sin confirmar — fase 5
- Decidir repo público o privado antes de la fase 7 (Actions apaga `schedule` a los 60 días en repos públicos)
- Rate limit de Open-Meteo por IP compartida de Vercel — mitigar con TTLs largos desde la fase 1
- 03-07: PREVIEW_URL del deploy BwPzY1Y51TJ4fTzJe5yaj7LNxynd sin resolver (sin gh ni login de Vercel CLI); resolver con Vercel MCP antes de 03-08

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-11-02T02:05:49.792Z
Stopped at: Completed 04-07-PLAN.md
Resume file: None
