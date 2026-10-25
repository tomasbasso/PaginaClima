---
phase: 03-cielo-vivo
verified: 2026-10-24T00:00:00Z
status: human_needed
score: 3/4 criterios de exito verificados en codigo; 1 pendiente en dispositivo (aceptado por el dueño)
human_verification:
  - test: "Fluidez, pausa en segundo plano y temperatura en un iPhone real (/dev/sky en preview + home de produccion 5-10 min)"
    expected: "~30 FPS, CALIDAD 1, sin pantalla negra al volver de segundo plano, sin aviso de temperatura"
    why_human: "Plan 03-08 omitido por el dueño (no pudo abrir el preview desde el iPhone). BUFFER_SCALE 0.5 y umbrales GOV_* quedaron por defecto, sin medir."
---

# Fase 3: Cielo vivo - Verificacion

**Goal:** fondo generativo que sigue al sol y al tiempo, con horizonte pampeano, legible y liviano en un iPhone real.

| # | Criterio | Estado | Evidencia |
|---|----------|--------|-----------|
| 1 | Fondo segun sol real y tiempo; /dev/sky fuerza estados | VERIFICADO | lib/sky/{astro,palette,state,params,devParams}.ts con tests, renderer.ts + shader.ts, app/dev/sky/{page,SkyLab}.tsx; /dev/sky devuelve 404 en produccion (smoke ok) |
| 2 | Silueta pampeana y contraste en cualquier estado | VERIFICADO | PampaHorizon.tsx usado en Hero; palette.test.ts con tests de contraste; revision de escritorio de 03-07 midio contraste por pixel tras el fix 292db10 |
| 3 | Reducir movimiento estatico; fallback sin WebGL | VERIFICADO | renderer.ts: matchMedia prefers-reduced-motion, modo estatico, getContext webgl2->webgl con null a fallback CSS, webglcontextlost/restored |
| 4 | iPhone real: fluido 30 fps, pausa en 2do plano, sin calentar | NO VERIFICADO EN DISPOSITIVO | Codigo: tope 30 fps (loop.ts), listener visibilitychange, gobernador con niveles. Medicion en iPhone omitida por el dueño (03-HUMAN-UAT.md: todo skipped) |

**Score:** 3/4 verificados; el 4 es human_needed (aceptado por el dueño, no es un gap de codigo).

## Compuerta local
- npm test: 28 archivos, 532 tests OK
- tsc --noEmit: OK; eslint: OK; next build: OK
- Debt markers (TBD/FIXME/XXX) en lib/sky, components/client/sky, app/dev/sky: ninguno

## Requisitos
SKY-01, 02, 03, 04, 05: satisfechos por codigo y tests. SKY-06: codigo presente (30 fps, pausa, fallback); la parte "iPhone real sin calentar" sin medir.

## Observacion (WARNING, no de esta fase)
`scripts/smoke.mjs` contra produccion: GET / 200, now.tempC ok, /dev/sky 404 ok, pero fallo el chequeo "sources[0].fetchedAt changed between requests" (00:29Z -> 01:24Z). Parece caducidad natural de la cache ISR entre corridas (afecta la garantia de cache de Fase 1/DATA, no al cielo). Conviene reintentar el smoke; si persiste, revisar la revalidacion.

## Items humanos
1. Medir en iPhone real (fluidez, segundo plano, temperatura) y confirmar BUFFER_SCALE 0.5 / GOV_*. Aceptado como omitido por el dueño.
