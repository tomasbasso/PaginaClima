---
phase: 04-pron-stico-con-confianza
plan: 02
subsystem: api
tags: [open-meteo, ensemble, ecmwf, zod, unstable_cache, vitest]

# Dependency graph
requires:
  - phase: 01
    provides: adapters con unstable_cache, readThrough y SourceError
provides:
  - Ventana de lluvia de día local (00:00, 24:00] en localDayRain, lista para el multimodelo
  - aggregateEnsemble, quantile y toDisplayPct, con EnsembleDay ya completo para el abanico
  - Adapter del ensemble con TTL de 3 h que cachea solo el agregado
  - WeatherSnapshot.confidence y la fuente open-meteo-ensemble
affects: [04-03, 04-04, 04-05, 04-08, 04-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adapter que agrega antes del return: el DTO crudo nunca llega a la Data Cache"
    - "Bloques Zod con z.looseObject y un superRefine que valida las columnas dinámicas"

key-files:
  created:
    - lib/forecast/localDayRain.ts
    - lib/forecast/localDayRain.test.ts
    - lib/forecast/ensemble.ts
    - lib/forecast/ensemble.test.ts
    - lib/sources/openMeteoEnsemble.schema.ts
    - lib/sources/openMeteoEnsemble.ts
    - lib/sources/openMeteoEnsemble.test.ts
    - lib/sources/__fixtures__/open-meteo-ensemble.json
  modified:
    - lib/config.ts
    - lib/weather/types.ts
    - lib/weather/snapshot.ts
    - lib/weather/snapshot.test.ts
    - lib/weather/status.test.ts
    - app/dev/estados/fixtures.ts
    - test/skeleton.e2e.test.ts

key-decisions:
  - "04-02: 'Hoy' cuenta el día local completo, incluidas las horas ya pasadas (FCST-03, D-10)"
  - "04-02: localDayRain redondea la suma a 2 decimales: diez horas de 0,1 mm dan 0,999... y perderían el umbral de 1 mm"
  - "04-02: una temperatura con menos de la mitad de los miembros queda en null, igual que el día de lluvia"
  - "04-02: FCST-03 sigue abierto: el snapshot trae el dato, pero el usuario lo ve recién en 04-03"

patterns-established:
  - "infoFrom(id, settled) arma el SourceInfo de cualquier fuente con readThrough"

requirements-completed: []

# Metrics
duration: 6 min
completed: 2026-11-02
---

# Phase 4 Plan 02: Probabilidad de lluvia del ensemble en el snapshot Summary

**`getWeatherSnapshot` trae por día el conteo real de miembros de ECMWF ENS con al menos 1 mm, más los percentiles, y sobrevive a la caída del ensemble.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-11-02T01:26:50Z
- **Completed:** 2026-11-02T01:32:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- La lluvia se suma por miembro en la ventana (00:00, 24:00] y recién después se cuenta, así que un bloque en los sellos 22-23-00 cae en el día anterior.
- El fixture real da 51 miembros y 14 días publicados. Un test compara cada conteo contra una suma a mano de las filas del fixture.
- `toDisplayPct` da `null` bajo 10 % crudo y 95 de 92,5 % en adelante, nunca 100.
- Solo el agregado por día llega a la caché y al snapshot. Los tests rechazan `/_member\d|precipitation_member/` en el adapter, en el snapshot y en el camino completo.
- Si el ensemble falla, la fuente queda en `error` y `confidence` en `[]`, sin tocar el resto. Si falla solo el refresco, queda `stale` con el último dato bueno.

## Task Commits

1. **Tarea 1: Fixture real y test end-to-end en rojo** - `44b0d1d` (test)
2. **Tarea 2: Ventana de día local, agregación, adapter y snapshot**
   - `da1aad4` (test, RED)
   - `cf38060` (feat, GREEN)

## Files Created/Modified

- `lib/forecast/localDayRain.ts` - Ventana de día local compartida con el multimodelo
- `lib/forecast/ensemble.ts` - Conteo por miembro, percentiles y valor mostrado
- `lib/sources/openMeteoEnsemble.schema.ts` - Validación de las columnas dinámicas, con mínimo de 40 miembros
- `lib/sources/openMeteoEnsemble.ts` - Adapter con `unstable_cache`, que devuelve `EnsembleDay[]`
- `lib/sources/__fixtures__/open-meteo-ensemble.json` - Captura real de la URL final
- `lib/config.ts` - `OPEN_METEO_ENSEMBLE_URL` y `TTL.openMeteoEnsemble`
- `lib/weather/types.ts` - `DayConfidence`, `WeatherSnapshot.confidence` y el `SourceId` nuevo
- `lib/weather/snapshot.ts` - `readThrough` del ensemble, helper `infoFrom` y `confidence`
- `lib/weather/snapshot.test.ts`, `test/skeleton.e2e.test.ts` - Mocks y casos del ensemble
- `lib/weather/status.test.ts`, `app/dev/estados/fixtures.ts` - `confidence: []` en los snapshots literales

## Decisions Made

- "Hoy" cuenta el día local completo, incluidas las horas ya pasadas, como dicen FCST-03 y D-10 (pregunta abierta 3 del research).
- FCST-03 no se marca completo en `REQUIREMENTS.md`: pide que el usuario vea la probabilidad, y eso llega en 04-03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Deriva de punto flotante en el umbral de 1 mm**
- **Found during:** Tarea 2
- **Issue:** el código del Patrón 1 suma sin redondear, y diez horas de 0,1 mm dan 0,9999999999999999, por lo que ese miembro no contaría como lluvia.
- **Fix:** `localDayRain` redondea cada total a 2 decimales. Los 0,99 mm siguen sin contar y hay un test del caso.
- **Files modified:** `lib/forecast/localDayRain.ts`, `lib/forecast/localDayRain.test.ts`
- **Commit:** `cf38060`

**2. [Rule 2 - Missing Critical] Validación de las columnas diarias de temperatura**
- **Found during:** Tarea 2
- **Issue:** el `superRefine` del plan solo cubre las columnas de miembro horarias. Una columna de temperatura con texto pasaría el schema sin aviso (T-04-02).
- **Fix:** el mismo chequeo de números o `null` se aplica a `temperature_2m_max` y `_min` con sus miembros.
- **Files modified:** `lib/sources/openMeteoEnsemble.schema.ts`, `lib/sources/openMeteoEnsemble.test.ts`
- **Commit:** `cf38060`

**3. [Rule 2 - Missing Critical] Mínimo de miembros también para la temperatura**
- **Found during:** Tarea 2
- **Issue:** el plan solo pide el mínimo de la mitad para la lluvia, y un p10 de dos miembros sería un rango falso.
- **Fix:** con menos de la mitad de los miembros, `tMinP10C` y `tMaxP90C` quedan en `null`.
- **Files modified:** `lib/forecast/ensemble.ts`, `lib/forecast/ensemble.test.ts`
- **Commit:** `cf38060`

### Criterio del plan que no se puede cumplir

`grep -v '^\s*//' lib/config.ts | grep -c "precipitation_sum"` imprime 2, no 0. Esas dos líneas ya existían: son `OPEN_METEO_URL` y `openMeteoArchiveUrl`, y las dos tienen que seguir pidiéndolo. La intención del criterio se cumple, porque `OPEN_METEO_ENSEMBLE_URL` no lo pide, y `test/skeleton.e2e.test.ts` lo verifica sobre la URL real.

---

**Total deviations:** 3 auto-fixed (1 bug, 2 missing critical) y 1 criterio del plan mal formulado.
**Impact on plan:** ninguno en el alcance. Los tres arreglos son de corrección del dato.

## Issues Encountered

- `applyFault('empty')` no limpia `confidence` todavía. El plan deja `lib/weather/faults.ts` para 04-08, y hasta 04-03 nadie dibuja ese campo.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test`: 45 archivos y 748 tests en verde
- `npm run typecheck` y `npm run lint`: salen con 0
- Sin build en este plan: el smoke con datos reales corre en 04-03

## Next Phase Readiness

- 04-03 puede dibujar `snapshot.confidence` en `/pronostico` con `toDisplayPct`.
- 04-04 ya tiene los percentiles en el agregado, sin subir la versión de la key de caché.
- El dato todavía no se ve en ninguna pantalla, y no se probó contra la API en producción ni el peso real en la caché de Vercel.

## Self-Check: PASSED

- Archivos creados y commits `44b0d1d`, `da1aad4` y `cf38060` verificados.

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
