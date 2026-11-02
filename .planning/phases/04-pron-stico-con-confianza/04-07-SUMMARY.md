---
phase: 04-pron-stico-con-confianza
plan: 07
subsystem: ui
tags: [container-query, tailwind, accesibilidad, vitest, wmo]

# Dependency graph
requires:
  - phase: 04-06
    provides: verdict, word y rainText en cada DailyRow, y la línea 2 con rombo y palabra
provides:
  - rowStatus, con el acortado puro del estado para columnas de 327 y 272 px
  - WMO_CODES, derivada de la tabla de lib/weather/wmo.ts
  - statusNormal y statusCompact en cada DailyRow, elegidos por container query
affects: [04-08, 04-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dos textos en el HTML y una container query que elige uno, sin JS ni hidratación"

key-files:
  created:
    - lib/forecast/rowStatus.ts
    - lib/forecast/rowStatus.test.ts
  modified:
    - lib/weather/wmo.ts
    - lib/forecast/daily.ts
    - lib/forecast/daily.test.ts
    - components/client/DailyList.tsx

key-decisions:
  - "04-07: las 7 etiquetas sin medida en el contrato se midieron en Chrome con la fuente real; una etiqueta desconocida usa 10,4 px por carácter"
  - "04-07: rowStatus exporta también statusTextWidth, para que el test compare el texto elegido contra un presupuesto calculado aparte"

patterns-established:
  - "El test del producto cartesiano recorre WMO_CODES y escribe su propio presupuesto, sin reutilizar el de la implementación"

requirements-completed: [MODL-02]

# Metrics
duration: 5 min
completed: 2026-11-02
---

# Phase 4 Plan 07: Acortado del estado en la línea 2 Summary

**El estado de cada día se acorta o desaparece según una tabla de anchos medidos, con dos textos en el HTML que elige una container query, y el rombo, la palabra y los mm nunca ceden.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-02T02:00:45Z
- **Completed:** 2026-11-02T02:05:06Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `rowStatus` elige el estado completo, el corto o ninguno, por separado para 327 y 272 px. Las dos tablas de casos del UI-SPEC dan lo esperado.
- El recorte de 6 px a 320 px quedó resuelto: `SIN ACUERDO` + `CHAPARRONES` + `2 mm` ahora muestra `CHAPARRÓN`.
- Con el ensemble caído, los mm no descuentan ancho de la línea 2. Un día `sinDato` tampoco descuenta rombo ni palabra.
- El `srText` conserva la etiqueta completa aunque la pantalla la acorte o la omita.
- `WMO_CODES` sale de las claves de la tabla, así que un código nuevo entra solo al producto cartesiano.

## Anchos medidos

Medidos una vez en Chrome headless, con `600 12px "Plus Jakarta Sans"` y el tracking de la fila. `canvas.measureText` y el DOM dieron lo mismo.

| Etiqueta | px |
|----------|----|
| Lluvia helada | 112,6 |
| Chaparrones | 110,3 |
| Lluvia débil | 97,4 |
| Tormenta | 78,5 |
| Cubierto | 74,3 |
| Nevada | 58,9 |
| Niebla | 52,5 |

Los anchos del contrato quedaron iguales o hasta 1,1 px por encima de lo medido, salvo `Granizo`, donde el DOM dio 67,3 contra 67,2; esa diferencia de 0,1 px la cubre el margen de 4 px. La fórmula de mm también queda por encima de lo medido, hasta 8,3 px.

## Comprobación en el navegador

Chrome headless contra el build de producción, con datos reales y los 14 días abiertos. Además, las 532 combinaciones de etiqueta WMO, palabra y mm se pintaron dentro de una fila real, siempre con glifo, que es el peor caso. Sirve como revisión técnica: el juicio visual del dueño sigue pendiente para 04-10.

| Viewport | Columna | Variante | Scroll horizontal | Combinaciones con desborde | Margen mínimo del estado |
|----------|---------|----------|-------------------|----------------------------|--------------------------|
| 390 px | 342 px | Normal | 0 | 0 | 23,5 px |
| 375 px | 327 px | Normal | 0 | 0 | 8,5 px |
| 360 px | 312 px | Compacta | 0 | 0 | 45,1 px |
| 320 px | 272 px | Compacta | 0 | 0 | 5,1 px |

En las filas reales, los cuatro anchos dieron una sola variante visible, ningún recorte y 16 px de alto en la línea 2.

## Task Commits

1. **Tarea 1: Función de acortado con el test del producto cartesiano**
   - `50e75e0` (test, RED)
   - `5f33313` (feat, GREEN)
2. **Tarea 2: Las dos variantes en la fila, elegidas por container query**
   - `25a7f7a` (test, RED)
   - `16523bc` (feat, GREEN)

## Files Created/Modified

- `lib/forecast/rowStatus.ts` - Tablas de anchos y cortos, y la función `rowStatus`
- `lib/forecast/rowStatus.test.ts` - Tablas del UI-SPEC y producto cartesiano
- `lib/weather/wmo.ts` - Exporta `WMO_CODES`
- `lib/forecast/daily.ts` - `statusNormal` y `statusCompact` por fila
- `lib/forecast/daily.test.ts` - Variantes, mm según el ensemble, `sinDato` y `srText`
- `components/client/DailyList.tsx` - Los dos textos con sus clases de container query

## Decisions Made

- `statusTextWidth` se exporta además de lo previsto en la interfaz: el test necesita medir el texto elegido, y calcula su presupuesto por separado para no validar la implementación contra sí misma.
- `rowStatus` define su propio tipo de palabra en vez de importar `DoubtWord`, para no crear un ciclo de importación con `daily.ts`.

## Deviations from Plan

### Ajustes de ejecución

**1. Medición en Chrome headless en vez de la consola con `next dev`**
- **Motivo:** se obtiene la misma medida con un script repetible, sobre el build existente y con la fuente real.
- **Efecto:** las tablas de casos del UI-SPEC dan lo mismo con esos valores.

**2. Se corrió `npm run build`, que el plan descartaba**
- **Motivo:** el plan lo evitaba porque compartía ola con 04-08, que usa `.next`. Esta ejecución fue secuencial, sin nada en paralelo, y hacía falta para confirmar el arreglo de 320 px.
- **Efecto:** ningún archivo versionado cambió por el build.

Fuera de eso, el plan se ejecutó como estaba escrito.

## Issues Encountered

- **Margen justo en `Tormenta`:** mide 78,5 px y el disponible con `SOLO UN MODELO` + `15–120 mm` es 77,8, así que queda fuera por 0,7 px, como pide el UI-SPEC. Si 04-10 ve una fuente distinta, se ajusta la tabla y no el orden de acortado.
- **Sin iPhone real:** los anchos se midieron en Chrome. El render de Safari se revisa en 04-10.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test`: 48 archivos y 888 tests en verde
- `npm run typecheck`, `npm run lint` y `npm run build`: sin errores
- Criterios por búsqueda del plan: 1 `WMO_CODES` exportada, 0 listas propias de códigos en el test, 0 usos de medición en runtime en `rowStatus.ts`, 0 clases interpoladas y 0 hooks de medición en `DailyList.tsx`

## Next Phase Readiness

- 04-08 puede sumar la leyenda y el despacho sin tocar la línea 2.
- 04-10 tiene que confirmar los anchos en Safari, y puede ajustar la tabla de `rowStatus.ts` si el navegador la contradice.

## Self-Check: PASSED

- `lib/forecast/rowStatus.ts` y `lib/forecast/rowStatus.test.ts` existen, y los commits `50e75e0`, `5f33313`, `25a7f7a` y `16523bc` están en `main`.

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
