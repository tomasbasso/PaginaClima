---
phase: 05-lluvia-sat-lite-y-astros
plan: 02
subsystem: cielo / lluvia
tags: [open-meteo, era5, unstable_cache, readThrough, zod, isr]
requires: [lib/sources/readThrough.ts, lib/sources/errors.ts, lib/time.ts, components/Notice.tsx, app/cielo/page.tsx (05-01)]
provides: [getOpenMeteoArchive, getOpenMeteoArchiveFresh, getOpenMeteoRecentRain, getOpenMeteoRecentRainFresh, stitchDailyRain, periodStarts, seriesStart, periodTotal, formatMm, getRainData, buildRainView, RainData, RainView, LluviaAcumulada]
affects: [lib/weather/types.ts (SourceId + 'open-meteo-archive'), lib/sources/openMeteoForecast.schema.ts (exporta localDT, nums, sameLengthAsTime)]
tech-stack:
  added: []
  patterns: [costura ERA5 > reciente completo > corte con un solo valor por fecha, adapter con argumentos string como clave de unstable_cache, tipo de datos del orquestador server-only alojado en el módulo puro de vista]
key-files:
  created:
    - lib/sources/openMeteoArchive.ts
    - lib/sources/openMeteoArchive.schema.ts
    - lib/sources/openMeteoArchive.test.ts
    - lib/sources/openMeteoRecentRain.ts
    - lib/sources/openMeteoRecentRain.schema.ts
    - lib/sources/openMeteoRecentRain.test.ts
    - lib/sources/__fixtures__/open-meteo-archive-era5.json
    - lib/sources/__fixtures__/open-meteo-recent-rain.json
    - lib/rain/periods.ts
    - lib/rain/periods.test.ts
    - lib/rain/stitch.ts
    - lib/rain/stitch.test.ts
    - lib/rain/series.ts
    - lib/rain/view.ts
    - lib/rain/view.test.ts
    - components/cielo/LluviaAcumulada.tsx
  modified:
    - lib/config.ts
    - lib/weather/types.ts
    - lib/weather/format.ts
    - lib/weather/format.test.ts
    - lib/sources/openMeteoForecast.schema.ts
    - app/cielo/page.tsx
decisions:
  - "todayFraction = (hourNow + 1) / 24 (el valor HH:00 cubre la hora anterior y hoy suma HH 00..hourNow); 0 cuando hoy no está incluido"
  - "Hoy entra en la serie solo si todas las horas 00..hourNow del reciente son no nulas; un día pasado necesita 24 valores no nulos"
  - "formatMm sigue el UI-SPEC: 5 → '5,0' ({x,x} entre 0,1 y 9,9), 0 → '0', entero desde 10"
  - "RainData vive en lib/rain/view.ts (puro) y series.ts lo reexporta, para que tests y componente no importen un módulo server-only"
  - "El fixture reciente se recortó a los últimos 7 días (168 horas) de la respuesta real; el de ERA5 son 30 días reales terminando hoy con los null del final"
metrics:
  duration: ~8 min
  completed: 2026-10-25
  tasks: 3
  files: 22
---

# Phase 5 Plan 02: Lluvia acumulada Summary

Bloque "Lluvia acumulada" en /cielo con los totales de semana (desde el lunes ART), mes y año calendario. Los datos salen de ERA5 (`models=era5`) cosido con `past_days=14` del forecast para los días que ERA5 todavía no cubre, cacheados en el servidor con unstable_cache + readThrough (TTL de 6 h y 30 min). Siempre se muestra la aclaración "Estimado por reanálisis, no pluviómetro.".

## Tareas

| # | Tarea | Commits |
|---|-------|---------|
| 1 | Adapters ERA5 y reciente con schemas zod, fixtures reales y tests | d4c06b7 (RED), 85f6b29 (GREEN) |
| 2 | Períodos de calendario, costura ERA5 + reciente y formatMm | 09126d5 (RED), aaddde0 (GREEN) |
| 3 | getRainData, buildRainView y LluviaAcumulada en /cielo | c7452a4 |

## Verificación

- `npx vitest run`: 35 archivos, 615 tests en verde. `typecheck` y `lint` sin errores.
- `npm run build`: `/cielo` sigue como `○` (estático, revalidate 10m), no `ƒ`.
- Smoke local (`scripts/smoke.mjs --start`): /cielo contiene "Lluvia acumulada", la aclaración, "En lo que va de la semana" y "Salida del sol". En el HTML, Sol y luna aparece antes que Lluvia.
- Datos reales del build (25/10/2026): 21 mm en la semana, 62 mm en octubre y 454 mm en 2026, sin aviso de atraso. Los 21 mm coinciden con la suma horaria del fixture reciente del 19 al 25/10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] formatMm con enteros menores que 10**
- **Found during:** Tarea 2
- **Issue:** La primera versión devolvía '5' para 5 mm. El UI-SPEC ("Cifra") pide `{x,x}` entre 0,1 y 9,9, igual que `rainAmount` del meteograma.
- **Fix:** Siempre `toFixed(1)` con coma decimal por debajo de 10. El test cubre 5 → '5,0'.
- **Commit:** aaddde0

**2. [Rule 1 - Bug] Día de la semana equivocado en el test de la vista**
- **Found during:** Tarea 3
- **Issue:** El test esperaba "sábado 18", tomado del ejemplo del research, pero el 18/10/2026 fue domingo.
- **Fix:** El test ahora espera "domingo 18". La implementación no cambió.
- **Commit:** c7452a4

### Notas

- `localDT`, `nums` y `sameLengthAsTime` de `openMeteoForecast.schema.ts` ahora se exportan, sin cambios de comportamiento. Los dos schemas nuevos los reutilizan, como permitía el plan.
- En la Tarea 3 `view.ts` y `view.test.ts` entraron juntos en el mismo commit `feat`: no hubo un commit RED separado para la vista.

## TDD Gate Compliance

Las tareas 1 y 2 tienen un commit `test(...)` seguido de su `feat(...)`. La tarea 3 tiene solo el `feat` (ver Notas).

## Known Stubs

Ninguno. El tipo `RainRow`/`RainView` no tiene campos vacíos. La normal, la comparación, la "Última lluvia" y la segunda oración de la aclaración llegan en 05-03, como dice el plan.

## Threat Flags

Ninguno fuera del threat model. Mitigaciones aplicadas:
- T-05-04: zod con timezone literal, fechas ISO y arrays del mismo largo.
- T-05-05: unstable_cache + readThrough.
- T-05-06: solo códigos gruesos en los logs `[rain]`.
- T-05-07: getRainData no lanza y el bloque cae al estado Sin datos.

## Self-Check: PASSED
