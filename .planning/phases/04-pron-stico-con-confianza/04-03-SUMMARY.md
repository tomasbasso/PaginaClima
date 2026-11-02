---
phase: 04-pron-stico-con-confianza
plan: 03
subsystem: ui
tags: [ensemble, pluviometro, tailwind, container-queries, a11y, vitest]

# Dependency graph
requires:
  - phase: 04-02
    provides: WeatherSnapshot.confidence, EnsembleDay y toDisplayPct
provides:
  - buildDailyRows con confianza, y DailyRow con probText, probPct y ensembleUp
  - srText con el día largo, el conteo real de miembros y punto final
  - longDayLabel en lib/time.ts
  - makeConfidence, constructor sintético de DayConfidence
  - Fila con la grilla nueva y pluviómetro en el margen derecho
  - DailySection, composición server-safe bajo el horizonte
affects: [04-04, 04-05, 04-08, 04-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grilla por container query, con clases literales por variante"
    - "Composición de la sección en un componente de servidor, con la isla solo para las filas"

key-files:
  created:
    - components/DailySection.tsx
  modified:
    - lib/time.ts
    - lib/time.test.ts
    - lib/forecast/__fixtures__/build.ts
    - lib/forecast/daily.ts
    - lib/forecast/daily.test.ts
    - components/client/DailyList.tsx
    - app/pronostico/page.tsx
    - app/dev/estados/page.tsx

key-decisions:
  - "04-03: ensembleUp mira solo los días visibles: un DayConfidence de un día pasado no cuenta como ensemble disponible"
  - "04-03: con el ensemble caído, probText es null y no un guion: la última columna muestra los mm"

patterns-established:
  - "makeConfidence(start, n, over): over devuelve overrides o null para un día sin dato"

requirements-completed: [FCST-03]

# Metrics
duration: 5 min
completed: 2026-11-02
---

# Phase 4 Plan 03: Probabilidad de lluvia y pluviómetro en /pronostico Summary

**Cada día de `/pronostico` muestra "70 %" en azure y un pluviómetro vertical en el margen derecho, y el lector de pantalla recibe el conteo real: "36 de 51 escenarios traen lluvia".**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-02T01:33:35Z
- **Completed:** 2026-11-02T01:38:39Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- La fila trae su probabilidad precalculada: número en pasos de 5 %, vacío bajo 10 % crudo y 95 como tope.
- El join con el ensemble es por `date`, así que un dato de ayer nunca cae en la fila de hoy.
- Con 60 % de ensemble y menos de 1 mm en el principal se ven número y pluviómetro, sin mm ni aviso (D-10).
- Si el ensemble falla, la fila vuelve al aspecto de la fase 2, con los mm en la última columna y sin riel.
- Los pluviómetros forman una tira: topes en la primera y la última fila visible, riel vacío junto a la nota de los días 8+ y rayado desde el día 8.

## Task Commits

1. **Tarea 1: Probabilidad, día largo y texto para lector de pantalla**
   - `6d9b463` (test, RED)
   - `cfcf8e3` (feat, GREEN)
2. **Tarea 2: Pluviómetro y composición en /pronostico** - `0e4e748` (feat)

## Files Created/Modified

- `lib/time.ts` - `longDayLabel`: `Hoy`, `Mañana` o `Sábado 24`
- `lib/forecast/daily.ts` - Confianza por fecha, `probText`, `probPct`, `ensembleUp` y `srText` nuevo
- `lib/forecast/__fixtures__/build.ts` - `makeConfidence`
- `lib/time.test.ts`, `lib/forecast/daily.test.ts` - Casos de `<behavior>` y esperados actualizados
- `components/client/DailyList.tsx` - Grillas nuevas, línea 2 con mm, `Pluviometro` y riel de la nota
- `components/DailySection.tsx` - Los 32 px bajo el horizonte, compartidos por la página y `/dev/estados`
- `app/pronostico/page.tsx` - Pasa `snapshot.confidence` y usa `DailySection`
- `app/dev/estados/page.tsx` - Los cinco usos de `DailyList` pasan a `DailySection`

## Decisions Made

- `ensembleUp` se calcula sobre los días visibles. Con un snapshot viejo cuyo ensemble solo tiene días pasados, la fila queda como en la fase 2 en lugar de mostrar una tira vacía.
- Con el ensemble caído, `probText` es `null`. El guion queda solo para un día sin dato cuando otros días sí tienen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Singular en el texto para lector de pantalla**
- **Found during:** Tarea 1
- **Issue:** un total redondeado a 1 mm se leía "1 milímetros de lluvia".
- **Fix:** `srTextFor` usa "1 milímetro de lluvia", con su test.
- **Files modified:** `lib/forecast/daily.ts`, `lib/forecast/daily.test.ts`
- **Commit:** `cfcf8e3`

**2. [Rule 3 - Blocking] Escape de U+00A0 convertido en el carácter literal**
- **Found during:** Tarea 1
- **Issue:** al escribir los archivos, el escape quedó como un espacio duro literal. Los tests pasaban, pero el criterio de la trampa 6 daba 0 y el carácter no se distinguía en el diff.
- **Fix:** un script reemplazó el carácter por el escape en `daily.ts` y `daily.test.ts`. Quedaron 10 escapes en 8 líneas del test y ningún literal. El commit RED `6d9b463` todavía tiene los literales; `cfcf8e3` los corrige.
- **Files modified:** `lib/forecast/daily.ts`, `lib/forecast/daily.test.ts`
- **Commit:** `cfcf8e3`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking).
**Impact on plan:** ninguno en el alcance.

## Issues Encountered

- La tira, las grillas con container query y el rayado no se revisaron en un navegador: el proyecto no tiene Playwright y este ejecutor no tiene vista previa. Tampoco se pudo leer el CSS generado en `.next`, porque el permiso fue denegado. Los `@max-[327px]` son el primer uso de container queries en el repo, así que conviene mirarlos primero en 320 px. El plan no incluye esa revisión y el proyecto la deja para el final de la fase.
- `/dev/estados` todavía no muestra el pluviómetro, porque sus cuadros llaman a `buildDailyRows` con dos argumentos. Los cuadros nuevos llegan en 04-08.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test`: 45 archivos y 762 tests en verde, incluido `test/skeleton.e2e.test.ts`
- `npm run typecheck`, `npm run lint` y `npm run build`: salen con 0
- `/pronostico` sigue estática en la salida del build, con revalidación de 10 min
- Smoke local con datos reales: `/pronostico` sirve "escenarios traen lluvia" y `data-pluvio`, y `/api/weather` no tiene columnas de miembro
- Criterios por búsqueda de las trampas 10 y 11 y de D-02: cumplidos

## Next Phase Readiness

- 04-04 puede sumar el abanico y el rango de lluvia desde el día 4 sobre la fila nueva, con `makeConfidence` ya disponible.
- Falta la revisión en navegador a 390 y 320 px.

## Self-Check: PASSED

- Archivos creados y commits `6d9b463`, `cfcf8e3` y `0e4e748` verificados.

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
