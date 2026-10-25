---
phase: 05-lluvia-sat-lite-y-astros
verified: 2026-10-25T18:10:00Z
status: passed
score: 3/3 success criteria verified (7/7 requirements)
overrides_applied: 0
---

# Phase 5: Lluvia, satélite y astros - Verification

**Goal:** El usuario completa el panorama: cuánto llovió contra lo normal, qué nubosidad se acerca y cuándo sale y se pone el sol, con la fase de la luna.
**Status:** passed. **Re-verification:** No.

## Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Lluvia semana/mes/año vs promedio 1991-2020 prorrateado, con aclaración "estimado por reanálisis, no pluviómetro" | VERIFIED | lib/rain/{periods,stitch,normal,compare,view,series}.ts + climatology-1991-2020.json; `DISCLAIMER = 'Estimado por reanálisis, no pluviómetro.'` en view.ts; render en components/cielo/LluviaAcumulada.tsx con estado de error; wired en app/cielo/page.tsx (getRainData -> buildRainView) |
| 2 | Imagen IR GOES-East reciente centrada en Winifreda, carga diferida, link externo al radar SMN | VERIFIED | app/api/satelite/[stamp]/route.ts (allowlist parseStamp, 404 si stamp inválido, immutable); lib/sources/gibs.ts, lib/satellite/*; Satelite.tsx lazy, caja 1:1, link SMN_RADAR_URL siempre presente. Smoke de producción: imagen 200 image/jpeg 40 KB, stamp 1999 -> 404 |
| 3 | Salida/puesta del sol, duración del día, fase lunar dibujada para hemisferio sur | VERIFIED | lib/sky/sun.ts (sunrise, sunset, durationText, deltaText); SolLuna.tsx los renderiza; lib/sky/moon.ts (iluminada a la izquierda si crece, derecha si mengua) + MoonDisc.tsx |

## Wiring
- lib/sections.ts: pestaña `cielo` con `enabled: true`, href `/cielo`.
- app/cielo/page.tsx: ISR `revalidate = 600`, Promise.all de snapshot/lluvia/satélite, nunca lanza (getSatelliteSafe devuelve null).

## Spot-checks / gates
- `npm test`: 41 archivos, 680 tests OK. `tsc --noEmit` limpio. `npm run lint` limpio.
- Smoke producción (https://clima-winifreda.vercel.app): todos los checks OK (/ 200, /cielo contiene "Mirando para arriba", /dev/estados 404, satélite image/jpeg immutable nosniff).
- Marcadores TBD/FIXME/XXX en archivos de la fase: ninguno.
- Revisión visual: 05-05-VISUAL-REVIEW.md. Verificación en iPhone real fuera de alcance por decisión del dueño (no es gap).

## Requirements
RAIN-01, RAIN-02, RAIN-03, SAT-01, SAT-02, ASTRO-01, ASTRO-02: SATISFIED.

## Observaciones menores (no bloqueantes)
- En .planning/REQUIREMENTS.md los 7 requisitos de la fase siguen como `[ ]` / "Pending" en checklist y tabla de trazabilidad. Corresponde marcarlos como completos (bookkeeping).

## Human verification
Ninguna pendiente.
