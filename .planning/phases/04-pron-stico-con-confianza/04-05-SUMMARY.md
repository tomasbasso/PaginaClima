---
phase: 04-pron-stico-con-confianza
plan: 05
subsystem: api
tags: [open-meteo, multimodelo, semaforo, zod, unstable_cache, vitest]

# Dependency graph
requires:
  - phase: 04-02
    provides: localDayRain, forma del adapter del ensemble, infoFrom y WeatherSnapshot.confidence
provides:
  - Adapter multimodelo con TTL de 1 h que cachea votos por día, sin id de modelo
  - AGREEMENT_C y verdictFor, con tests de borde en los cinco umbrales
  - DayConfidence.verdict y DayConfidence.voters en el snapshot
  - La fuente open-meteo-models en sources[3]
affects: [04-06, 04-08, 04-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "El cálculo derivado vive al armar el snapshot, no en la caché: cambiar un umbral no exige invalidar nada"
    - "Votante por dato completo del día: ningún horizonte de modelo queda escrito en el código"

key-files:
  created:
    - lib/forecast/agreement.ts
    - lib/forecast/agreement.test.ts
    - lib/sources/openMeteoModels.schema.ts
    - lib/sources/openMeteoModels.ts
    - lib/sources/openMeteoModels.test.ts
    - lib/sources/__fixtures__/open-meteo-models.json
  modified:
    - lib/config.ts
    - lib/forecast/__fixtures__/build.ts
    - lib/weather/types.ts
    - lib/weather/snapshot.ts
    - lib/weather/snapshot.test.ts
    - test/skeleton.e2e.test.ts

key-decisions:
  - "04-05: confidence pasa a ser la unión de fechas de ensemble y modelos: con el ensemble caído, los días siguen con veredicto y ensemble en null"
  - "04-05: aggregateModels omite los días sin votantes: el día 15 sin terminar no llega al snapshot"
  - "04-05: el schema exige un modelo con sus tres columnas, no una sola: lluvia sin temperaturas no le sirve a nadie"
  - "04-05: MODL-02 sigue abierto hasta que 04-06 dibuje el rombo en /pronostico"

patterns-established:
  - "modelColumns(model) concentra los nombres de columna, compartidos por el schema y la agregación"

requirements-completed: []

# Metrics
duration: 6 min
completed: 2026-11-02
---

# Phase 4 Plan 05: Coincidencia de modelos en el snapshot Summary

**`getWeatherSnapshot` trae por día si ECMWF, GFS, ICON y GEM coinciden, dudan o no se ponen de acuerdo, con umbrales según cuántos votan y sin exponer ningún valor por modelo.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-11-02T01:47:55Z
- **Completed:** 2026-11-02T01:53:40Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Un modelo vota un día solo con máxima, mínima y las 24 horas de lluvia. En la captura real votan 4 en los días 1 a 7, 3 en los días 8 a 10 y 2 en los días 11 a 14.
- `verdictFor` usa `AGREEMENT_C` por cantidad de votantes y redondea el rango a un decimal antes de comparar: 16,1 y 12,1 dan 4,0 y coinciden.
- Nunca hay un acuerdo falso: un votante da `solo`, ninguno da `sinDato` y dos nunca dan `desacuerdo`.
- Si falla el multimodelo, el snapshot no lanza, el ensemble sigue con dato y todos los días quedan en `sinDato`. Si falla solo el refresco, queda `stale` con los últimos votos.
- Los votos se quedan en la caché del adapter. Los tests rechazan los nombres de modelo y las columnas de miembro en el snapshot, en el adapter y en el camino completo.

## Veredictos con la captura real

Lluvia en mm, en el orden ECMWF/GFS/ICON/GEM de los modelos que votan ese día.

| Día | N | Lluvia | Veredicto |
|-----|---|--------|-----------|
| 11-01 | 4 | 3,3 / 2,8 / 0,6 / 1,8 | dudan |
| 11-02 | 4 | 2 / 0 / 0 / 2,5 | desacuerdo |
| 11-03 | 4 | 52,3 / 15,6 / 34,8 / 36 | coinciden |
| 11-04 | 4 | 3,6 / 0,2 / 0 / 2,7 | desacuerdo |
| 11-05 | 4 | 4,8 / 1,6 / 1,2 / 0 | dudan |
| 11-06 | 4 | 0 / 0 / 3,3 / 0 | dudan |
| 11-07 | 4 | 0 / 0 / 7,5 / 0 | desacuerdo |
| 11-08 | 3 | 0 / 0 / 0 | coinciden |
| 11-09 | 3 | 0 / 0 / 1,2 | dudan |
| 11-10 | 3 | 0 / 0 / 21,6 | desacuerdo |
| 11-11 | 2 | 0 / 0 | dudan |
| 11-12 | 2 | 0 / 0 | dudan |
| 11-13 | 2 | 4,2 / 0 | dudan |
| 11-14 | 2 | 3,6 / 74,4 | dudan |

## Task Commits

1. **Tarea 1: Fixture real, test end-to-end en rojo y adapter multimodelo**
   - `715915c` (test, RED)
   - `ff46420` (feat, GREEN del adapter; el e2e queda en rojo hasta la Tarea 2)
2. **Tarea 2: Veredicto con umbrales por votantes en el snapshot**
   - `b5b3a59` (test, RED)
   - `df9bfc8` (feat, GREEN)

## Files Created/Modified

- `lib/forecast/agreement.ts` - `Verdict`, `AGREEMENT_C`, `verdictFor`, `aggregateModels` y `modelColumns`
- `lib/sources/openMeteoModels.schema.ts` - Validación de las columnas dinámicas por modelo
- `lib/sources/openMeteoModels.ts` - Adapter con `unstable_cache`, que devuelve `ModelsDay[]`
- `lib/sources/__fixtures__/open-meteo-models.json` - Captura real de la URL final
- `lib/config.ts` - `VOTING_MODELS`, `OPEN_METEO_MODELS_URL` y `TTL.openMeteoModels`
- `lib/weather/types.ts` - `SourceId` nuevo, `verdict` y `voters` en `DayConfidence`
- `lib/weather/snapshot.ts` - `readThrough` del multimodelo y `buildConfidence`
- `lib/forecast/__fixtures__/build.ts` - `makeConfidence` con `sinDato` y 0 votantes por defecto
- `lib/weather/snapshot.test.ts`, `test/skeleton.e2e.test.ts` - Mocks, stub por `models` y casos nuevos

## Decisions Made

- `confidence` es la unión de fechas de las dos fuentes. Con el ensemble caído y los modelos arriba, los días llegan con `ensemble: null`. `buildDailyRows` ya lo trata como ensemble caído, porque `ensembleUp` mira si algún día visible tiene dato.
- Los días sin votantes no salen de `aggregateModels`. El día 15 solo existe para cerrar el 14 con su sello de las 00:00, y publicarlo alargaría `confidence` a 15 días.
- MODL-02 no se marca completo en `REQUIREMENTS.md`: pide que el usuario vea el semáforo, y eso llega en 04-06.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `SourceId` adelantado a la Tarea 1**
- **Found during:** Tarea 1
- **Issue:** `SourceError('open-meteo-models', ...)` no compila sin el id nuevo, y el plan lo sumaba recién en la Tarea 2.
- **Fix:** el id se agregó con el adapter. `verdict` y `voters` siguieron en la Tarea 2.
- **Files modified:** `lib/weather/types.ts`
- **Commit:** `ff46420`

**2. [Rule 1 - Bug] Regex de columnas de miembro sin la barra invertida**
- **Found during:** Tarea 1
- **Issue:** `snapshot.test.ts` y `skeleton.e2e.test.ts` tenían `/_memberd|.../`, sin el `\d`, así que esa parte del patrón no detectaba una columna de miembro filtrada.
- **Fix:** las dos quedaron con `\d`. El plan ya pedía esta forma en el criterio de D-18.
- **Files modified:** `test/skeleton.e2e.test.ts`, `lib/weather/snapshot.test.ts`
- **Commit:** `715915c`, `b5b3a59`

**3. [Rule 2 - Missing Critical] Schema más estricto que "una columna"**
- **Found during:** Tarea 1
- **Issue:** exigir una sola columna deja pasar una respuesta con lluvia y sin temperaturas, donde nadie vota y el error sería silencioso. Una columna con texto tampoco se detectaba (T-04-10).
- **Fix:** hace falta al menos un modelo con sus tres columnas, y cada columna presente tiene que ser numérica. Un modelo ausente sigue sin romper nada.
- **Files modified:** `lib/sources/openMeteoModels.schema.ts`, `lib/sources/openMeteoModels.test.ts`
- **Commit:** `715915c`, `ff46420`

### Additions

**4. `modelColumns` exportada además de lo que lista el plan**
- **Found during:** Tarea 1
- **Issue:** el schema y la agregación necesitan los mismos nombres de columna.
- **Fix:** una sola función en `agreement.ts`, sin id de modelo en lo que devuelve la agregación.
- **Files modified:** `lib/forecast/agreement.ts`, `lib/sources/openMeteoModels.schema.ts`
- **Commit:** `ff46420`

### Test replaced

- El caso de `snapshot.test.ts` "ensemble rejected" afirmaba `confidence: []`. Ahora afirma que el veredicto se mantiene con `ensemble: null`, porque el plan pide que una fuente caída deje la otra. El caso con las dos caídas es uno nuevo.

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical) y 1 adición menor.
**Impact on plan:** ninguno en el alcance.

## Issues Encountered

- `applyFault('empty')` sigue sin limpiar `confidence`. El plan deja `lib/weather/faults.ts` para 04-08.
- Con la captura real, los días 11 a 14 dan siempre `dudan`, incluso con dos modelos secos, porque su rango de temperatura supera los 2,5 °C. Coincide con lo que anticipa la calibración del research, y el juicio sobre cómo se ve queda para 04-10.
- Los umbrales son de confianza media según el research: un año, un punto y sin corridas guardadas para los días 8 a 14.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test`: 47 archivos y 835 tests en verde
- `npm run typecheck` y `npm run lint`: salen con 0
- Criterios por búsqueda del plan: cumplidos (`gem_seamless` en una línea, sin `met` en `VOTING_MODELS`, sin `weatherCode` en `agreement.ts`, sin votos en `types.ts`, sin 7.5 ni 2.5 en `snapshot.ts`)
- Sin build en este plan: el smoke con datos reales corre en 04-06

## Next Phase Readiness

- 04-06 puede dibujar el rombo con `snapshot.confidence[i].verdict` y `voters`.
- Nada de esto se ve todavía en pantalla, y `/api/weather` no se probó contra la API en producción.

## Self-Check: PASSED

- Archivos creados y commits `715915c`, `ff46420`, `b5b3a59` y `df9bfc8` verificados.

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
