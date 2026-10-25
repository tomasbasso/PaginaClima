---
phase: 05-lluvia-sat-lite-y-astros
plan: 03
subsystem: lluvia
tags: [rain, climatology, era5, normal, cielo]
requires:
  - phase: 05-02
    provides: stitchDailyRain (StitchedRain con dataUntil/todayFraction), periodos de calendario, bloque Lluvia acumulada
provides:
  - lib/rain/climatology-1991-2020.json (365 valores, circular-31d, annualMm 702)
  - scripts/climatology.mjs (one-shot, ya corrido)
  - normalFor / loadClimatology / parseClimatology
  - compareRain + constantes EARLY_NORMAL_MM, NOTHING_MM, NEAR_BAND
  - lastRainText + RAIN_DAY_MM = 1
  - RainView con normal, comparación, barra, última lluvia, aclaración y estado Sin climatología
affects: [05-05 (/dev/estados y cierre de fase)]
tech-stack:
  added: []
  patterns:
    - "Dato inmutable como JSON commiteado generado por script one-shot, validado con zod al importarlo"
    - "buildRainView con climatología inyectable (default loadClimatology()) para tests y /dev/estados"
key-files:
  created:
    - scripts/climatology.mjs
    - lib/rain/climatology-1991-2020.json
    - lib/rain/normal.ts
    - lib/rain/normal.test.ts
    - lib/rain/compare.ts
    - lib/rain/compare.test.ts
    - lib/rain/lastRain.ts
    - lib/rain/lastRain.test.ts
  modified:
    - lib/rain/view.ts
    - lib/rain/view.test.ts
    - components/cielo/LluviaAcumulada.tsx
decisions:
  - "05-03: normal prorrateada hasta dataUntil (no hasta hoy); hoy ponderado por todayFraction"
  - "05-03: día de lluvia = ≥ 1 mm diario (RAIN_DAY_MM = 1, R1mm)"
  - "05-03: en el texto sr la comparación va en minúscula después de los dos puntos"
  - "05-03: rótulo NORMAL en caja fija de 64 px, clampeado con CSS clamp() a los bordes"
metrics:
  duration: 12 min
  completed: 2026-10-25
  tasks: 3
  files: 11
---

# Phase 5 Plan 03: Lluvia contra lo normal y última lluvia Summary

Cada acumulado de /cielo (semana, mes y año) se compara ahora contra la normal ERA5 1991–2020 prorrateada a la misma fecha. La normal sale de un JSON commiteado de 365 valores con suavizado circular de 31 días (702,0 mm/año). Cada fila muestra una barra con la marca NORMAL, un texto comparativo ("20 % menos de lo normal", "Casi lo normal", "Más del doble…") y la línea "Lo normal a esta fecha". Arriba de las filas va "Última lluvia" (umbral de 1 mm) y al pie, la aclaración completa de reanálisis.

## Tareas

| # | Tarea | Commits |
|---|-------|---------|
| 1 | Script de climatología, JSON y normal prorrateada | e808df1 (RED), 1440284 (GREEN) |
| 2 | compareRain y lastRainText | 78c19ca (RED), b0b3682 (GREEN) |
| 3 | Vista y componente con barra, comparación, última lluvia y estado Sin climatología | a7728ff (RED), 383669b (GREEN) |

## Resultado de la climatología

Corrí `node scripts/climatology.mjs` una sola vez: una request a archive-api, 30 años sin nulls. Resultado: annualMm = 702.0. Totales mensuales suavizados: ene 80,5 · feb 80,2 · mar 91,5 · abr 61,7 · may 35,6 · jun 16,3 · jul 18,2 · ago 27,1 · sep 49,0 · oct 81,9 · nov 77,8 · dic 82,1. El script no aparece en package.json (`grep -c climatology package.json` = 0) y solo importa `node:fs/promises` y `node:url`.

## Verificación

- `npx vitest run lib/rain`: 59 tests en verde. La suite completa da 644/644.
- typecheck, lint y build pasan. `/cielo` sigue siendo `○` (estática, ISR de 10 min).
- El smoke local en :3107 pasa entero: 'Lo normal a esta fecha', la línea de última lluvia, la aclaración completa y el texto comparativo.
- En el render real del build, los sr dicen: semana 21 mm contra 18 (20 % más), mes 62 contra 64 (casi lo normal), año 454 contra 525 (15 % menos).

## Desvíos respecto del plan

### Auto-corregidos

**1. [Rule 1 - Bug] Mayúscula de la comparación dentro del texto sr**
- **Encontrado en:** Tarea 3, al revisar el HTML prerenderizado
- **Problema:** el srText quedaba "…64 milímetros: Casi lo normal.", con mayúscula después de los dos puntos.
- **Fix:** `lowerFirst(compareText)` solo en el srText (el texto visible conserva la mayúscula) y un test nuevo.
- **Archivos:** lib/rain/view.ts, lib/rain/view.test.ts
- **Commit:** 383669b

### Notas

- Dos expectativas de mi propio test RED de la vista estaban mal calculados a mano (semana: r = 0,8255 → 17,45 → 15 %, no 20 %; y la última lluvia del fixture es hoy con 1,24 mm, no ayer). Las corregí antes del commit RED.
- `/dev/estados` todavía no monta `LluviaAcumulada`. `buildRainView(data, now, climatology)` acepta la climatología como parámetro para cuando 05-05 sume esos cuadros (incluido `null` para "Sin climatología").

## Known Stubs

Ninguno.

## TDD Gate Compliance

Cada tarea tiene un `test(05-03)` seguido de un `feat(05-03)`.

## Self-Check: PASSED

- Existen: scripts/climatology.mjs, lib/rain/climatology-1991-2020.json, lib/rain/normal.ts, compare.ts, lastRain.ts y sus tests.
- Commits: e808df1, 1440284, 78c19ca, b0b3682, a7728ff, 383669b.
