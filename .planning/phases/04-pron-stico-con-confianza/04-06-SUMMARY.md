---
phase: 04-pron-stico-con-confianza
plan: 06
subsystem: ui
tags: [semaforo, svg, tailwind, accesibilidad, vitest]

# Dependency graph
requires:
  - phase: 04-05
    provides: DayConfidence.verdict y DayConfidence.voters en el snapshot
provides:
  - verdict, word y modelsUp en cada DailyRow, con join por fecha
  - La última oración del srText con la coincidencia de modelos
  - Componente Rombo, server-safe, para la fila y la leyenda de 04-08
  - Token --color-ember
affects: [04-07, 04-08, 04-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Colores por tabla de clases literales indexada por tipo, tanto en el glifo como en la palabra"

key-files:
  created:
    - components/Rombo.tsx
  modified:
    - lib/forecast/daily.ts
    - lib/forecast/daily.test.ts
    - components/client/DailyList.tsx
    - app/globals.css

key-decisions:
  - "04-06: modelsUp mira solo los días visibles, igual que ensembleUp: un veredicto de un día pasado no cuenta"
  - "04-06: el sujeto 'Los 2 modelos con dato' depende de voters, no del veredicto; 'desacuerdo' y 'solo' tienen su oración fija"
  - "04-06: MODL-02 queda completo: el semáforo se ve por día y /api/weather no expone nombres de modelo"

patterns-established:
  - "data-rombo={kind} en el SVG identifica el glifo para smokes e inspección"

requirements-completed: [MODL-02]

# Metrics
duration: 4 min
completed: 2026-11-02
---

# Phase 4 Plan 06: Rombo y palabra de duda en /pronostico Summary

**Cada día de `/pronostico` muestra un rombo lleno, medio lleno o vacío (o una raya con un solo modelo), con la palabra corta solo si hay duda y la frase completa para el lector de pantalla.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-02T01:55:03Z
- **Completed:** 2026-11-02T01:58:33Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `buildDailyRows` suma `verdict`, `word` y `modelsUp`. El veredicto se une por fecha, así que el de un día pasado nunca cae en otra fila.
- El `srText` termina con la coincidencia. Con dos votantes dice `Los 2 modelos con dato coinciden.` o `dudan.`, y con `sinDato` no menciona a los modelos.
- `Rombo` dibuja los cuatro glifos en SVG con la geometría exacta del UI-SPEC, sin Unicode y con clases literales.
- La línea 2 de la fila lleva rombo, palabra, estado y mm. Con las dos fuentes caídas vuelve al comportamiento de la fase 2.

## Comprobación en el navegador

Chrome headless contra el build de producción, con datos reales y los 14 días abiertos. Sirve como revisión técnica: el juicio visual del dueño sigue pendiente para 04-10.

| Medida | 390 px | 320 px |
|--------|--------|--------|
| Scroll horizontal | 0 | 0 |
| Desborde de la línea 2 | 0 | 0 |
| Alto de la línea 2 | 16 px | 16 px |
| Alto de fila | 76 y 77 px | 76 y 77 px |
| Caja del glifo | 12×12, centrado en la línea | 12×12, centrado en la línea |
| Estados recortados | 0 | 1 |

Los colores computados de glifos y palabras coinciden con azure, sun y ember. El recorte de 320 px es `SIN ACUERDO` + `CHAPARRONES` + `2 mm`, de 6 px (ver "Issues Encountered").

Con la corrida de hoy se vieron 2 días `coinciden`, 8 `dudan` y 4 `desacuerdo` de 14. No apareció ningún `solo`, así que la raya solo se revisó por código y no en pantalla.

## Task Commits

1. **Tarea 1: Veredicto, palabra de duda y texto para lector de pantalla en la fila**
   - `973387e` (test, RED)
   - `11fffb4` (feat, GREEN)
2. **Tarea 2: Rombo y palabra de duda en /pronostico**
   - `f11604e` (feat)

## Files Created/Modified

- `components/Rombo.tsx` - Glifos SVG del semáforo
- `lib/forecast/daily.ts` - `DoubtWord`, `verdict`, `word`, `modelsUp` y la oración de coincidencia
- `lib/forecast/daily.test.ts` - Palabras, oraciones, las 4 combinaciones de fuentes y el join por fecha
- `components/client/DailyList.tsx` - Línea 2 con glifo y palabra
- `app/globals.css` - Token `--color-ember`

## Decisions Made

- `modelsUp` usa el mismo criterio que `ensembleUp`: mira solo los días visibles.
- `DoubtWord` se exporta desde `daily.ts` porque `DailyList` indexa con ese tipo su tabla de colores.
- MODL-02 se marca completo: el semáforo se ve por día, se calcula solo con modelos independientes y no hay pestaña aparte. La leyenda y el despacho llegan en 04-08, pero el requisito no los pide.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Recorte de 6 px a 320 px:** el acortado del estado es de 04-07, como prevé el plan. Hasta entonces `overflow-hidden` evita el solape con los mm, pero la última letra de `CHAPARRONES` queda cortada en esa combinación.
- **Rombos sin leyenda:** hasta 04-08 no hay nada en pantalla que explique el rombo lleno ni el vacío de un día sin palabra.
- **Frecuencia de la duda:** 12 de 14 días no coinciden con la corrida de hoy. Es la pregunta abierta 2 del research, que se revisa con el dueño en 04-10.
- **Sin prueba de falla en el navegador:** los faults de las fuentes nuevas llegan en 04-08. Las 4 combinaciones están cubiertas en `buildDailyRows`, pero su dibujo en `DailyList` no se vio en pantalla.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test`: 47 archivos y 857 tests en verde
- `npm run typecheck`, `npm run lint` y `npm run build`: sin errores
- Smoke local con datos reales: `data-rombo` y la oración de coincidencia presentes en `/pronostico`, y ningún nombre de modelo en `/api/weather`
- Criterios por búsqueda del plan: 0 clases interpoladas, 1 `--color-ember: #e8603a`, 0 glifos Unicode en `Rombo.tsx`

## Next Phase Readiness

- 04-07 puede acortar el estado con `row.word` y el texto de mm ya disponibles.
- 04-08 puede reutilizar `Rombo` en la leyenda y `modelsUp` para decidir despacho, crédito y aviso.

## Self-Check: PASSED

- `components/Rombo.tsx` existe y los commits `973387e`, `11fffb4` y `f11604e` están en `main`.

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
