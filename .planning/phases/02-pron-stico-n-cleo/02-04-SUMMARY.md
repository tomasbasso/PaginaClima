---
phase: 02-pron-stico-n-cleo
plan: 04
subsystem: forecast-meteogram
tags: [FCST-01, meteograma, viento, scrubber, a11y]
requires:
  - "02-03: layoutMeteogram, PLOT_H, xs/tempY, Meteogram.tsx, MeteogramSection.tsx"
  - "lib/weather/wind.ts: windSector, CALM_KMH"
provides:
  - "windColumns, strongGustLine, readoutFor, valueTextFor, indexAtX, STRONG_GUST_KMH (lib/forecast/meteogram.ts)"
  - "CALM_KMH exportado (fuente única para Ahora y el meteograma)"
  - "Fila de viento, línea de lectura fija y scrubber role=slider en el meteograma"
affects: [02-05]
tech-stack:
  added: []
  patterns:
    - "Scrubber: un div role=slider sobre los 160 px del plot, con setPointerCapture + touch-action pan-y y sin preventDefault en eventos táctiles"
    - "Vuelta a 'Ahora' con datos nuevos: key de remount en el padre (time del primer punto + largo), sin efecto"
    - "Columnas de viento: clamp a los bordes + separación mínima entre centros, adaptativa en gráficos angostos"
key-files:
  created: []
  modified:
    - lib/weather/wind.ts
    - lib/forecast/meteogram.ts
    - lib/forecast/meteogram.test.ts
    - components/client/Meteogram.tsx
    - components/MeteogramSection.tsx
decisions:
  - "Clamp de las columnas de viento en [7, ancho − 7] y separación mínima de 18 px entre centros (WIND_MIN_GAP). Si el ancho no alcanza, se reparte (ancho − 14) / 15"
  - "aria-valuetext con un valor null dice 'temperatura sin dato', 'lluvia sin dato' o 'viento sin dato'. Un 1 mm redondeado usa el singular 'milímetro'"
  - "La lluvia de la lectura redondea primero a 1 decimal: 9,96 mm pasa a '10 mm', nunca a '10,0 mm'"
metrics:
  duration: "~30 min"
  completed: 2026-10-23
  tasks: 2
  files: 5
---

# Phase 2 Plan 04: Viento y scrubber del meteograma (FCST-01, parte 2) Summary

Debajo del eje de horas, el meteograma de 48 h ahora tiene 16 flechas de viento, una cada 3 h. Apuntan hacia donde va el aire (convención SMN) y llevan los km/h abajo. Con calma no hay flecha y se lee «0»; sin dato se lee «—». Si hay ráfagas de 50 km/h o más, los km/h de esa columna pasan a peach y debajo del gráfico aparece una sola línea peach: «Ráfagas fuertes de hasta {n} km/h {día} {franja}».

Arrastrando el dedo en horizontal (o con el teclado) se elige una hora exacta. La lectura está en una línea fija arriba del gráfico, por ejemplo «MAÑANA 15:00» y «18° · 0,4 mm · 12 km/h NE», y la acompañan una línea vertical y un rombo de acento sobre la curva. Un swipe vertical sigue scrolleando la página. Con esto FCST-01 queda completo: temperatura, lluvia y viento en 390 px.

## Tareas

| # | Tarea | Commits |
|---|-------|---------|
| 1 | Columnas de viento, línea de ráfagas, lectura, aria-valuetext y mapeo x→índice (TDD) | 86437d4 (test), f5c1cb7 (feat) |
| 2 | Fila de viento, lectura fija y scrubber en el meteograma | cc0abd4 (fix de separación), 747b3d5 (feat) |

## Verificación

- `npm test`: 20 archivos y 250 tests en verde. Los 10 nuevos cubren columnas, rotación, calma y null, ráfagas ≥ 50 contra 49,9, la línea de ráfagas (hoy, mañana, el domingo y null), la lectura, `aria-valuetext`, `indexAtX` y el alto de 220. El test de no superposición de 02-03 sigue en verde. `wind.test.ts` también.
- `npm run typecheck`, `npm run lint`, `npm run build` y `node scripts/smoke.mjs http://localhost:3107 --start`, todo en verde. `/` sigue estática con revalidate de 10 min.
- `curl /` contiene `role="slider"`, `aria-valuemin="0"` y `aria-valuemax="47"`, con un `aria-valuetext` real, por ejemplo «viernes 21:00, 14 grados, sin lluvia, viento 11 kilómetros por hora del sur».
- Greps de aceptación: hay un solo `preventDefault()`, el del handler de teclado, y ningún `onTouch`.

### CDP (Chrome headless, next start, 390×844 con touch emulation)

| Chequeo | Resultado |
|---------|-----------|
| Primera pantalla | caja del cielo, silueta y barra en 788, igual que en 02-03 |
| SVG | 342×220 a 390 px, 560×220 a 1024 px |
| Textos del SVG superpuestos (bbox reales) | ninguno, a 390 y a 1024 px (después del fix, ver abajo) |
| scrollWidth | 390, sin scroll horizontal |
| Flechas | 16 |
| Drag horizontal con touch | selección en 30, lectura «dom 25 03:00 / 10° · sin lluvia · 11 km/h S» |
| Swipe vertical sobre el gráfico | la página scrollea (380 → 171), igual que el swipe de control sobre el cielo. `touch-action` computado: `pan-y` |
| Tap afuera | vuelve a 0 («Ahora») |
| Teclado | →→ da 2 (foco en el slider), PageDown 8, End 47, PageUp 41, Home 0, Escape 0 |
| Consola | sin errores ni warnings de hidratación |

En la captura se ve el anillo de foco de acento alrededor de la zona táctil. Está en `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\43f7effc-2a61-4c9e-8aea-b093a474d9ef\scratchpad\meteo390-04.png` y el script en `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\43f7effc-2a61-4c9e-8aea-b093a474d9ef\scratchpad\measure-meteo2.mjs`. `Input.synthesizeScrollGesture` no scrollea en headless ni siquiera fuera del gráfico, así que el swipe vertical se probó con `Input.dispatchTouchEvent`.

Con los datos reales de hoy no hay ráfagas ≥ 50 km/h, por eso la línea peach no aparece. Su render está cubierto por los tests de `strongGustLine` y por el JSX trivial de la sección.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Los km/h de las dos primeras columnas se tocaban**
- **Found during:** Tarea 2 (medición CDP)
- **Issue:** el plan fijaba el clamp en [8, ancho − 8]. La primera columna quedaba en x 8 y la segunda en 21,8: «11» y «14», que miden unos 14,4 px cada uno, se pisaban (CDP reportó la superposición «11 / 14»).
- **Fix:** se pasó a `WIND_EDGE = 7` y se agregó `WIND_MIN_GAP = 18` entre centros. Solo se corre la columna que el clamp apretó; la segunda queda en 25. En gráficos angostos (272 px) la separación se reduce a (ancho − 14) / 15, así las columnas no se salen del borde. Hay tests a 342, 560, 327 y 272 px.
- **Files modified:** lib/forecast/meteogram.ts, lib/forecast/meteogram.test.ts
- **Commit:** cc0abd4

### Interpretaciones menores

- El primer `pointerdown` de un swipe vertical también selecciona la hora que tocó, porque el contrato dice que `pointerdown` selecciona. Si el navegador toma el pan, llega `pointercancel` y la selección queda donde estaba.
- El listener de «tap afuera» toma como «adentro» el bloque entero del meteograma (lectura + gráfico).
- Además de los valores que pedía el plan, la lectura muestra «12 km/h» sin sector cuando falta la dirección.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno. La interacción es solo estado local (T-02-10: el índice se clampea en `indexAtX` y en el handler de teclado). Los textos salen de tablas locales y números, sin innerHTML (T-02-09).

## TDD Gate Compliance

RED 86437d4 (`test(02-04)`), con 10 tests fallando. GREEN f5c1cb7 (`feat(02-04)`).

## Self-Check: PASSED

- lib/forecast/meteogram.ts, lib/forecast/meteogram.test.ts, lib/weather/wind.ts, components/client/Meteogram.tsx y components/MeteogramSection.tsx: todos presentes.
- Commits 86437d4, f5c1cb7, cc0abd4 y 747b3d5: todos presentes en `git log`.
