---
phase: 04-pron-stico-con-confianza
plan: 09
subsystem: ui
tags: [despacho, leyenda, credito, seo, vitest]

# Dependency graph
requires:
  - phase: 04-07
    provides: Estados de la fila, con la línea 2 que no cambia
  - phase: 04-08
    provides: Aviso por fuente en DailySection, con 24 px hasta el bloque siguiente
provides:
  - buildDespacho, que da la frase de la semana y su tono
  - Componente Despacho, con la frase y la leyenda de los rombos
  - buildCredit, con el conteo real de escenarios y de modelos
  - Descripción SEO de /pronostico según el UI-SPEC
affects: [04-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Una regla que nombra un tramo de días no se dispara si hay un día solo o sinDato en la lista"

key-files:
  created:
    - lib/forecast/despacho.ts
    - lib/forecast/despacho.test.ts
    - components/Despacho.tsx
  modified:
    - components/DailySection.tsx
    - components/client/DailyList.tsx
    - lib/forecast/daily.ts
    - lib/forecast/daily.test.ts
    - app/pronostico/page.tsx

key-decisions:
  - "04-09: buildDespacho devuelve { text, tone } | null, porque el color de la regla no se deduce de la frase"
  - "04-09: las reglas 8, 9 y 10 no se disparan si hay un día solo o sinDato en la lista: la frase pasa a la regla 11 o 12"
  - "04-09: la regla 2 exige que todos los demás días coincidan; con un día solo o sinDato se usa la regla 3"
  - "04-09: sin días comparables, la frase es la de 'pocos modelos'; con duda y ningún acuerdo por debajo de 5 días, usa una frase nueva, fuera del contrato"
  - "04-09: N del crédito es el máximo de votantes de la lista, y M el máximo de escenarios"

patterns-established:
  - "El barrido del despacho afirma que una frase no nombra coincidencia, duda ni desacuerdo si la semana no los tiene"

requirements-completed: [MODL-02, FCST-03]

# Metrics
duration: 7 min
completed: 2026-11-02
---

# Phase 4 Plan 09: Despacho, leyenda y crédito Summary

**`/pronostico` abre la lista con una frase por reglas que resume la confianza de la semana, explica los tres rombos en una leyenda y cierra con el crédito de escenarios y modelos.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-11-02T13:54:35Z
- **Completed:** 2026-11-02T14:01:35Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- `buildDespacho` cubre las reglas 0 a 12 y 7b, con los casos de hoy y mañana. Un barrido recorre las 78.125 semanas posibles que arrancan un miércoles, y las 2.187 de veredictos comparables para cada día de arranque.
- `Despacho` dibuja la frase en Playfair itálica con regla de 2 px en azure, sun, ember o ink/30, y la leyenda en dos líneas fijas.
- `buildCredit` usa el máximo real de escenarios y de votantes, y omite la línea de la fuente caída.
- La frase sale de las primeras 7 filas y no cambia al expandir.

## Comprobación en el navegador

Chrome headless contra el build de producción, con datos reales. Sirve como revisión técnica: el juicio visual del dueño sigue pendiente para 04-10, igual que Safari en un iPhone.

| Estado | Despacho | Leyenda | Rombos | Crédito | Aviso |
|--------|----------|---------|--------|---------|-------|
| Sin fault | Sí, regla 12 en sun | Sí | 17 (14 filas + 3) | Las dos líneas | No |
| `ensemble-down` | Sí | Sí | 17 | Solo `Coincidencia: 4 modelos` | Ensemble, a 24 px del despacho |
| `models-down` | No | No | 0 | Solo `Probabilidad: 51 escenarios de ECMWF` | Multimodelo |

Sin fault, a 390 y 320 px:

- **Espacios medidos:** 32 px desde la silueta, 16 hasta la leyenda, 4 entre sus líneas, 24 hasta la primera fila, 24 entre botón y crédito y 4 entre las líneas del crédito.
- **Scroll horizontal:** 0 con 7 y con 14 días, en los tres estados.
- **Largo de la frase:** 17 frases, incluidas las más largas, escritas en el `<p>` real con la fuente real. El máximo es 3 líneas a 390 px y 4 a 320, los dos topes del UI-SPEC.
- **Primera pantalla a 390×844:** se ven dos filas completas y buena parte de la tercera, con una frase de 2 líneas y sin insets. Con 3 líneas e insets 47/34 queda para el cuadro 16 de 04-10.
- **Crédito a 320 px:** `PROBABILIDAD` pasa a dos líneas, lo que el UI-SPEC acepta.

## Task Commits

1. **Tarea 1: Despacho por reglas, con una prueba por regla**
   - `af518b7` (test, RED)
   - `056ec8a` (feat, GREEN)
   - `36fa896` (test, baja el tiempo del barrido)
2. **Tarea 2: Despacho, leyenda, crédito y descripción en /pronostico**
   - `a11003e` (test, RED)
   - `3c05e58` (feat, GREEN)

## Files Created/Modified

- `lib/forecast/despacho.ts` - Reglas, tablas de frases y tono
- `lib/forecast/despacho.test.ts` - Una fila por regla, casos sin acuerdo falso y barrido
- `components/Despacho.tsx` - Frase y leyenda, server-safe
- `components/DailySection.tsx` - Compone aviso, despacho y lista, y calcula el crédito
- `components/client/DailyList.tsx` - Prop `credit`, al pie de la lista
- `lib/forecast/daily.ts` - `members` y `voters` por fila, y `buildCredit`
- `lib/forecast/daily.test.ts` - Tests de `buildCredit`
- `app/pronostico/page.tsx` - Descripción SEO

## Decisions Made

- **Cambio de firma, decidido en el plan:** el UI-SPEC declara `buildDespacho(...): string | null`, y la función devuelve `{ text, tone } | null`. Las reglas 1 y 7b dan ink/30, y eso no se deduce de la frase. El concepto no cambia y el UI-SPEC queda como está.
- **Crédito:** N es el máximo de votantes de las filas visibles, lo que resuelve la pregunta abierta 1 del research. Cuenta las 14 filas, también con la lista contraída.
- **Días `solo` y `sinDato` en los tramos:** el UI-SPEC no dice qué hacer con uno de estos días en medio de un tramo. "Hasta el jueves los modelos coinciden" contaría como acuerdo un día que no se comparó, así que las reglas 8, 9 y 10 exigen una lista sin huecos. Con huecos cae en la regla 11 o 12, que siguen siendo ciertas.

## Para revisión del dueño

Esta frase no está en el contrato de copy aprobado. Es para una semana con duda, sin ningún día de acuerdo y con menos de 5 días `dudan`, por ejemplo con días sin dato. Copia la forma de la regla 7b:

> Los días que se pueden comparar, los modelos dudan.

Sin ella, la regla 12 diría "coinciden algunos días" en una semana donde no coincidió ninguno.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Mitigación T-04-19] Dos semanas donde la tabla afirmaba un acuerdo que no existe**
- **Found during:** Tarea 1
- **Issue:** con 3 días `solo` y 4 `sinDato`, la regla 7b diría que los modelos coinciden. Con duda y ningún acuerdo por debajo de 5 días, la regla 12 diría que coinciden algunos días.
- **Fix:** el primer caso usa la frase de la regla 1, y el segundo, la frase nueva de arriba. El barrido lo verifica.
- **Files modified:** `lib/forecast/despacho.ts`, `lib/forecast/despacho.test.ts`
- **Commit:** `056ec8a`

**2. [Rule 1 - Bug] El barrido quedaba cerca del límite de tiempo del test**
- **Found during:** Tarea 1
- **Issue:** con un `expect` por semana tardaba 4,1 s, contra un límite de 5 s, y podía fallar al azar en una máquina lenta.
- **Fix:** comprobaciones simples y un solo `expect` al final. Ahora tarda 2,0 s.
- **Files modified:** `lib/forecast/despacho.test.ts`
- **Commit:** `36fa896`

**3. [Rule 1 - Bug] `/dev/estados` puede pasar una lista sin filas**
- **Found during:** Tarea 2
- **Issue:** `rows[0].key` fallaría con una lista vacía, y `DailySection` también recibe las filas de los fixtures de `/dev/estados`.
- **Fix:** sin filas, no se calcula el despacho.
- **Files modified:** `components/DailySection.tsx`
- **Commit:** `3c05e58`

### Verificación agregada

**4. Revisión en el navegador y builds con faults**
- **Motivo:** el plan deja el tope de líneas para 04-10 y solo pide smoke de HTML. La tabla "Fallas por fuente" no se había podido comprobar en 04-08 porque estas piezas no existían.
- **Efecto:** se hicieron builds con `models-down` y `ensemble-down`, y el último build se hizo sin fault. No hubo parches temporales.

### Agregados menores

- `data-despacho` en el `<p>`, igual que `data-rombo`, para que las comprobaciones y 04-10 lo encuentren.

## Issues Encountered

- **Las dos fuentes caídas sin ver con estas piezas:** ningún fault produce ese estado. `buildCredit` y `buildDespacho` lo cubren con tests, y el cuadro 7 de `/dev/estados` (04-10) lo va a mostrar.
- **Solo una frase real en pantalla:** los datos de hoy dan la regla 12. Los otros colores de regla no se vieron, y el cuadro 16 de 04-10 los cubre. Las clases literales sí están en el código.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test`: 50 archivos y 959 tests en verde
- `npm run typecheck`, `npm run lint` y `npm run build`: sin errores
- Smoke local del plan: las 5 comprobaciones de `/pronostico` pasan con datos reales
- Búsquedas del plan: `MAX_DESPACHO_CHARS = 82` 1, `border-${` 0, `peach` 0, `buildDespacho(rows.slice(0, 7)` 1, tooltips y modales 0

## Next Phase Readiness

- 04-10 puede armar los cuadros de `/dev/estados` con `DailySection`, que ya compone aviso, despacho, leyenda y crédito.
- El cuadro 16 tiene que mostrar los cuatro colores de regla. La frase fuera de contrato conviene sumarla ahí, para que el dueño la vea.

## Self-Check: PASSED

- Los 8 archivos del plan existen y los commits `af518b7`, `056ec8a`, `36fa896`, `a11003e` y `3c05e58` están en `main`.

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
