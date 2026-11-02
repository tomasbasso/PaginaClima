---
phase: 04-pron-stico-con-confianza
plan: 04
subsystem: ui
tags: [ensemble, abanico, css-animation, a11y, vitest]

# Dependency graph
requires:
  - phase: 04-02
    provides: EnsembleDay con rainP10Mm, rainP90Mm, tMinP10C y tMaxP90C
  - phase: 04-03
    provides: buildDailyRows con confianza, grilla nueva y pluviómetro
provides:
  - DailyBar con bandLo y bandHi, en una escala cuyo dominio las incluye
  - rainRange y rainRangeText en lib/forecast/ensemble.ts
  - rainText y srText según el plazo, con rango desde el día 4
  - Abanico dibujado y apertura escalonada solo con CSS
affects: [04-05, 04-08, 04-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Animación de entrada sin to: el estado final es el estilo natural, ya presente en el HTML del servidor"
    - "Escalonado con la propiedad --i por fila, heredada por las piezas animadas"

key-files:
  created: []
  modified:
    - lib/forecast/ensemble.ts
    - lib/forecast/ensemble.test.ts
    - lib/forecast/daily.ts
    - lib/forecast/daily.test.ts
    - components/client/DailyList.tsx
    - app/globals.css

key-decisions:
  - "04-04: el dominio de la escala solo incluye bandas que se dibujan: un día sin barra no reserva lugar"
  - "04-04: la oración del rango de temperatura se omite si falta uno de los dos límites"

patterns-established:
  - "rainRange devuelve los límites redondeados, compartidos por el texto visible y el del lector de pantalla"

requirements-completed: [FCST-04]

# Metrics
duration: 6 min
completed: 2026-11-02
---

# Phase 4 Plan 04: Abanico de incertidumbre y rango de lluvia Summary

**Las barras de `/pronostico` se abren en un abanico p10–p90 que se ensancha hacia los días lejanos, y desde el día 4 la lluvia pasa a ser un rango como "0–17 mm".**

## Performance

- **Duration:** 6 min
- **Started:** 2026-11-02T01:40:20Z
- **Completed:** 2026-11-02T01:46:27Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Cada barra trae su banda en la misma escala, y `bar7` y `bar14` incluyen sus extremos: ninguna fracción sale de [0, 1].
- El segmento siempre queda dentro de la banda, incluso con el p90 por debajo de la máxima del pronóstico principal.
- Los días 1 a 3 muestran mm del pronóstico principal. Desde el día 4 se muestra el rango, y nada si el p90 es menor que 1 mm.
- El lector de pantalla recibe el rango de lluvia y "La temperatura podría ir de 6 a 27 grados" desde el día 4.
- Bandas y pluviómetros se abren escalonados en 660 ms solo con CSS, al montar y al expandir.

## Task Commits

1. **Tarea 1: Bandas, escalas y rango de lluvia en la fila**
   - `7a52b03` (test, RED)
   - `14b0e90` (feat, GREEN)
2. **Tarea 2: Abanico dibujado y animación de entrada** - `6302a97` (feat)

## Files Created/Modified

- `lib/forecast/ensemble.ts` - `rainRange` y `rainRangeText`
- `lib/forecast/daily.ts` - `bandFor`, dominio con bandas, `rainText` y `srText` según el plazo
- `lib/forecast/ensemble.test.ts`, `lib/forecast/daily.test.ts` - Casos de `<behavior>` y forma nueva de `DailyBar`
- `components/client/DailyList.tsx` - `RangeBar` con bandas y `--i` por fila
- `app/globals.css` - Keyframes, gradientes de banda y `.bar-pieza`

## Decisions Made

- El dominio solo incluye bandas que se dibujan. Un día con una temperatura nula no tiene barra, así que sus percentiles no achican las barras de los demás. El UI-SPEC pide no reservar puntas para bandas que no se dibujan, y esto extiende esa regla al día suelto.
- Si falta uno de los dos percentiles, se dibuja solo el lado que tiene dato y la oración del rango de temperatura se omite.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Escape de U+00A0 convertido en el carácter literal**
- **Found during:** Tarea 1
- **Issue:** al escribir `ensemble.ts` y `ensemble.test.ts`, el escape quedó como un espacio duro literal.
- **Fix:** un script reemplazó el carácter por el escape antes de cada commit. Ningún archivo de la tarea tiene literales.
- **Files modified:** `lib/forecast/ensemble.ts`, `lib/forecast/ensemble.test.ts`
- **Commit:** `7a52b03`, `14b0e90`

### Additions

**2. `rainRange` exportada además de `rainRangeText`**
- **Found during:** Tarea 1
- **Issue:** `srText` necesita los límites redondeados, y repetir el redondeo y el umbral en `daily.ts` podía separar lo que se ve de lo que se lee.
- **Fix:** `rainRangeText` y `srText` usan la misma función.
- **Files modified:** `lib/forecast/ensemble.ts`, `lib/forecast/daily.ts`
- **Commit:** `14b0e90`

### Test replaced

- El test de 04-03 "keeps the main forecast mm on days 1 to 14" afirmaba justo lo que este plan cambia. Lo reemplazan los casos de lluvia por plazo.

---

**Total deviations:** 1 auto-fixed (blocking), 1 adición menor.
**Impact on plan:** ninguno en el alcance.

## Issues Encountered

- Con datos reales, las bandas de los días cercanos son casi siempre el mínimo de 4 px y se leen tenues. Es lo que anticipa el Pitfall 10, y las opacidades no se tocaron: el juicio queda para 04-10.
- La comprobación se hizo en Chrome headless. Safari sigue sin probarse, incluida la transición de `width: max()` (Pitfall 9).
- `/dev/estados` todavía no muestra el abanico, porque sus cuadros llaman a `buildDailyRows` con dos argumentos. Los cuadros nuevos llegan en 04-08.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test`: 45 archivos y 790 tests en verde
- `npm run typecheck`, `npm run lint` y `npm run build`: salen con 0
- Smoke local con datos reales: `/pronostico` sirve `abanico-l`, `data-pluvio`/`pluvio-relleno` y "La temperatura podría ir de"
- Criterios por búsqueda del plan: cumplidos (`prefers-reduced-motion` sigue en 2, sin `motion` ni `useEffect`)
- Chrome headless contra el build de producción, con datos reales:
  - 390 px, 7 y 14 días: bandas pegadas al segmento y dentro de la celda de 130 px, con 4 px como mínimo por lado; sin scroll horizontal
  - Días 8+ con `abanico-lejano` (0,36 / 0,14 / 0,05); días 1 a 7 con 0,45 / 0,18 / 0,06
  - Al expandir: 14 bandas y 5 rellenos con animación en la cola, y transiciones sin reapertura en las filas 1 a 7
  - 320 px: sin scroll horizontal, y las grillas con container query del plan 04-03 se ven bien
  - Reducir movimiento: `animation-name: none`, transición de 0 s y ninguna animación activa

## Next Phase Readiness

- FCST-04 queda cumplido. 04-05 puede seguir con la coincidencia de modelos sobre esta fila.
- Falta juzgar la lectura de las bandas en 04-10.

## Self-Check: PASSED

- Commits `7a52b03`, `14b0e90` y `6302a97` y los 6 archivos modificados verificados.

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
