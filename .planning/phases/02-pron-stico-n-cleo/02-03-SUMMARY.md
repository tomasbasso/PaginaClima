---
phase: 02-pron-stico-n-cleo
plan: 03
subsystem: forecast-meteogram
tags: [FCST-01, meteograma, d3, svg, home]
requires:
  - "02-01: hourOf, dayKeyOf, selectFutureHours, relativeDayLabel, localDateKey, makeHourly"
  - "02-02: slot `below` de Hero"
provides:
  - "layoutMeteogram, meteogramSummary y constantes de bandas (lib/forecast/meteogram.ts)"
  - "Renderer SVG cliente con ResizeObserver (components/client/Meteogram.tsx)"
  - "Sección de servidor con título y estado vacío (components/MeteogramSection.tsx)"
affects: [02-04, 02-05]
tech-stack:
  added: ["d3-scale@4.0.2", "d3-shape@3.2.0", "@types/d3-scale@4.0.9 (dev)", "@types/d3-shape@3.2.0 (dev)"]
  patterns:
    - "x = scaleLinear sobre el índice de hora; hora/día local leídos del string -03:00"
    - "Colocación de etiquetas por prioridad con cajas estimadas (días > horas > pico de lluvia > máx > mín)"
    - "Etiquetas: x centro (horas, pico, máx/mín) o borde izquierdo (días); y = borde superior de la caja de 16 px"
key-files:
  created:
    - lib/forecast/meteogram.ts
    - lib/forecast/meteogram.test.ts
    - components/client/Meteogram.tsx
    - components/MeteogramSection.tsx
  modified:
    - package.json
    - package-lock.json
    - app/page.tsx
decisions:
  - "Ancho estimado de los rótulos de día: 11 px por carácter (DAY_CHAR_W), porque MAÑANA mide unos 63 px en mayúsculas con tracking 0.14em. Para las etiquetas numéricas se mantiene CHAR_W = 7"
  - "El rótulo de día se pasa a mayúsculas en JS (toUpperCase) y no con CSS text-transform dentro del SVG"
  - "Lluvia total en el aria-label: con 0,1–0,5 mm dice 'lluvia total de menos de 1 milímetro', y con 1 mm usa el singular"
metrics:
  duration: "~25 min"
  completed: 2026-10-23
  tasks: 3
  files: 7
---

# Phase 2 Plan 03: Meteograma 48 h (FCST-01, parte 1) Summary

En la home, debajo del horizonte y sobre el suelo, ahora aparece «PRÓXIMAS 48 HORAS» con un meteograma en SVG hecho a mano. Muestra la curva de temperatura (`curveMonotoneX`, que se corta donde hay nulls), el área debajo, barras de lluvia azure con piso de 4 mm, un pico «n mm» cuando llueve 1 mm o más, franjas de noche, separadores de día con los rótulos HOY / MAÑANA / DOM 25, marcas de hora en 00/06/12/18, máx/mín por día y la línea de 0 °C cuando corresponde. Toda la geometría es pura y testeada (d3-scale + d3-shape). La primera pantalla no cambió.

## Tareas

| # | Tarea | Commits |
|---|-------|---------|
| 1 | Legitimidad de d3-scale, d3-shape y sus @types (checkpoint) | — (lo resolvió el orquestador) |
| 2 | Instalación de d3 + geometría pura del meteograma | 24e9e02 (test), c93bd17 (feat) |
| 3 | Renderer SVG, sección y cableado en la home | 11ed527 |

### Checkpoint de la tarea 1 (aprobado)

El orquestador verificó los paquetes con `npm view`:
- `d3-scale@4.0.2` y `d3-shape@3.2.0`: repos github.com/d3/d3-scale y github.com/d3/d3-shape, maintainers mbostock y Fil, sin postinstall.
- `@types/d3-scale@4.0.9` y `@types/d3-shape@3.2.0`: DefinitelyTyped, maintainer types (Microsoft).

Los paquetes ya estaban fijados en la decisión D-06 y el usuario pidió seguir sin parar, así que el checkpoint se dio por aprobado y la instalación se hizo en la tarea 2. No hizo falta `transpilePackages`: `next build` funciona con el d3 ESM.

## Verificación

- `npm test`: 20 archivos y 240 tests en verde, bajo TZ=UTC. Son 19 tests nuevos del meteograma: eje, rótulos de día (incluidos el arranque a las 22:00 y a las 00:00), dominio mínimo de 8 °C, cortes por null, piso de lluvia, pico, franjas de noche, línea de 0 °C, máx/mín con U+2212, el test de no superposición sobre 8 fixtures a 342 y 560 px más el fixture real de Open-Meteo, y el copy del `aria-label`.
- `npm run typecheck`, `npm run lint` y `npm run build` en verde. `/` sigue estática con revalidate de 10 min.
- `node scripts/smoke.mjs http://localhost:3107 --start`: todas las verificaciones pasaron.
- `curl /` con `next start`: la respuesta contiene `PRÓXIMAS 48 HORAS`, `Meteograma de las próximas 48 horas: …` y `<svg width="342"`.
- Greps de aceptación: `scaleTime|scaleUtc|getHours|toLocale` = 0 en meteogram.ts; `new Date(` = 0 en Meteogram.tsx; page.tsx contiene `selectFutureHours(snapshot.hourly48, now)` y `below=`.

### Medición con CDP (Chrome headless, next start)

| Viewport | Caja del cielo / silueta / barra | Sección | SVG | Textos superpuestos (bbox reales) | scrollWidth | Consola |
|----------|----------------------------------|---------|-----|-----------------------------------|-------------|---------|
| 390×844 | 788 / 788 / 788 | arranca en 788 (debajo del pliegue) | 342×180 | ninguno | 390 | sin errores ni warnings de hidratación |
| 1024×844 | 788 / 788 / 788 | 788 | 560×180 (ResizeObserver) | ninguno | 1009 (= 1024 menos la barra de scroll) | sin errores |
| 390×844 con insets 47/34 | banda 120, silueta 754 = barra 754 con titular real y con titular de 34 caracteres | — | — | — | — | — |

Los valores de la primera pantalla son idénticos a los de 02-01 y 02-02. Con datos reales a las 21:24 ART, el rótulo «HOY» se omite porque el tramo de hoy mide menos que el rótulo + 8 px, como pide la especificación. Se ven MAÑANA y DOM 25, 8 marcas de hora y 4 etiquetas de máx/mín (16°, 17°, 10°, 10°). La captura está en `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\43f7effc-2a61-4c9e-8aea-b093a474d9ef\scratchpad\meteo390.png` y el script en `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\43f7effc-2a61-4c9e-8aea-b093a474d9ef\scratchpad\measure-meteo.mjs`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Medición] Ancho estimado de los rótulos de día**
- **Found during:** Tarea 3 (medición CDP)
- **Issue:** con 7 px por carácter, como decía el plan, la caja de «MAÑANA» quedaba en 42 px, pero el rótulo real en mayúsculas con tracking 0.14em mide unos 63 px. La regla «omitir si el tramo es menor que el rótulo + 8» podía dejar pasar un rótulo que pisara el separador siguiente.
- **Fix:** se agregó la constante `DAY_CHAR_W = 11`, que usan tanto el layout como el test de superposición. `CHAR_W = 7` queda para las etiquetas numéricas, que se midieron y coinciden con la estimación.
- **Files modified:** lib/forecast/meteogram.ts, lib/forecast/meteogram.test.ts
- **Commits:** 24e9e02, c93bd17, 11ed527

### Interpretaciones menores

- Las mayúsculas de los rótulos de día se hacen en JS y no con `uppercase` de CSS, porque `text-transform` en `<text>` de SVG no es confiable en todos los motores.
- Se agregaron las constantes `RAIN_PEAK_MIN_MM`, `MIN_DAY_POINTS_FOR_LABELS` y `MAX_TEMP_LABELS` para no dejar números mágicos.
- Cuando el máximo y el mínimo de un día plano coinciden, se muestran las dos etiquetas (arriba y abajo de la curva).

## Known Stubs

Ninguno. Los puntos salen de `snapshot.hourly48`, filtrado a partir de la hora actual.

## Threat Flags

Ninguno. No hay endpoints nuevos ni fetch del lado del cliente. El texto del SVG sale de números y de tablas locales, sin `dangerouslySetInnerHTML`.

## Notas para 02-04

- `PLOT_H` (160) es la zona táctil del scrubber. `CHART_H` vale hoy 180 y hay que sumarle las filas de viento (8 + 16 + 16) para llegar a los 220 del UI-SPEC.
- `layout.xs` y `layout.tempY` ya traen lo necesario para la marca de selección (la línea y el rombo).

## Self-Check: PASSED

- Archivos creados: meteogram.ts, meteogram.test.ts, Meteogram.tsx y MeteogramSection.tsx, todos presentes.
- Commits 24e9e02, c93bd17 y 11ed527, todos presentes en `git log`.
