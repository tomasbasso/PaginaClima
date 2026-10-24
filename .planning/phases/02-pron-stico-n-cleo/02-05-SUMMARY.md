---
phase: 02-pron-stico-n-cleo
plan: 05
subsystem: forecast-closing
tags: [FCST-01, FCST-02, NOW-03, dev-estados, gate, produccion]
requires:
  - "02-01: buildHeadline, selectFutureHours, makeHourly/makeDaily"
  - "02-02: Hero compact, Pronostico, DailyList, buildDailyRows"
  - "02-03/02-04: MeteogramSection con viento y scrubber"
provides:
  - "buildForecastFixtures(nowMs) en app/dev/estados/fixtures.ts (6 horarios, 3 diarios, 2 titulares)"
  - "Secciones Meteograma y Pronóstico diario en /dev/estados"
  - "DailyList: prop initialExpanded e id por instancia del bloque días 8–14"
  - "02-VALIDATION.md completo (nyquist_compliant: true)"
  - "Fase 2 en producción (commit 0994691, gru1)"
affects: [03]
tech-stack:
  added: []
  patterns:
    - "Fixtures de la galería relativos a nowMs; titulares evaluados en instantes fijos (nunca new Date() dentro de fixtures)"
    - "El primer request tras un deploy puede servir un snapshot viejo y disparar la revalidación ISR: el smoke de producción se reintenta una vez"
key-files:
  created:
    - .planning/phases/02-pron-stico-n-cleo/02-05-SUMMARY.md
  modified:
    - app/dev/estados/fixtures.ts
    - app/dev/estados/page.tsx
    - components/client/DailyList.tsx
    - .planning/phases/02-pron-stico-n-cleo/02-VALIDATION.md
decisions:
  - "DailyList usa useId para el id del bloque días 8–14: la galería renderiza varias listas en una página y aria-controls tiene que apuntar a la propia"
  - "El frame 'Normal' de la galería pasa a 'Normal · titular largo' con el titular de 34 caracteres; se agrega 'Titular Mañana'"
metrics:
  duration: "~10 min"
  completed: 2026-10-24
  tasks: 3
  files: 4
---

# Phase 2 Plan 05: Cierre de fase (galería, gate, 390×844 y producción) Summary

La galería /dev/estados ahora muestra todos los estados de la fase 2: los titulares, los 6 meteogramas y los 6 frames del pronóstico diario. El gate completo dio verde (250 tests, typecheck, lint, build y smoke), y las mediciones a 390×844 confirman que el titular de 34 caracteres y el horizonte entran en la primera pantalla. La fase 2 está desplegada en producción con el commit 0994691 en gru1, y el smoke de producción pasó.

## Tareas

| # | Tarea | Commit | Archivos |
|---|-------|--------|----------|
| 1 | Frames de fase 2 en /dev/estados | a2405b1 | app/dev/estados/fixtures.ts, app/dev/estados/page.tsx, components/client/DailyList.tsx |
| 2 | Gate de fase + mapa de validación | 0994691 | .planning/phases/02-pron-stico-n-cleo/02-VALIDATION.md |
| 3 | Push a main + smoke de producción | (push de 0994691; sin cambios de código) | — |

## Tarea 1: galería

- `buildForecastFixtures(nowMs)` arma los siguientes fixtures:
  - **Horarios:** `lluviaTormenta` (1–6 mm con códigos 61/63 a la tarde y 95 a la noche, 14–27 °C), `helada` (de −3 a 9), `rafagas` (ráfagas de 55 a 68 mañana a la tarde), `nulos` (6 h sin temperatura, viento null en i=9 e i=12, dirección null en i=30), `degradado` (empieza 5 h antes de ahora) y `vacio` (8 puntos).
  - **Diarios:** `semana` (14 días, con un día de 4 mm, uno de 12 mm y una mínima de −2), `nulos` y `pasados` (empieza hace 2 días).
  - **Titulares:** `largo` = "Calor fuerte, tormentas a la noche" (34 caracteres, evaluado a las 10:00 ART del 2026-10-23) y `manana` = "Mañana: tormentas a la tarde" (evaluado a las 21:30 ART).
- `curl` local a /dev/estados devuelve todas las cadenas de aceptación: `PRÓXIMAS 48 HORAS`, `No tenemos el pronóstico por hora en este momento`, `Ráfagas fuertes de hasta 68 km/h mañana a la tarde`, `DEL DÍA 8 EN ADELANTE, ORIENTATIVO`, `Mañana: `, `−3°`, el aviso de degradado y NoData. Hay 5 `role="slider"`: los 6 frames menos el vacío.
- Los meteogramas de la galería se midieron con CDP. En los 5 con gráfico el ancho es de 342 px y no hay rótulos superpuestos ni recortados. El de Helada tiene la línea de 0 °C punteada y el de Ráfagas muestra la línea en durazno. El Vacío muestra el texto de "sin datos".
- Se mantienen `notFound()` cuando `VERCEL_ENV === 'production'`, además de `force-dynamic`, `robots noindex` y `autoRefresh={false}`. El conteo de `new Date()` en fixtures.ts da 0.

## Tarea 2: gate y mediciones a 390×844

**Gate:** `npm test` (250/250 en 20 archivos), `typecheck`, `lint` y `build` pasaron, el smoke local también, y `/pronostico` local devolvió 200. La home local contiene `PRÓXIMAS 48 HORAS` y `role="slider"`.

**Mediciones:** se hicieron con Chrome headless por CDP, en modo mobile con DPR 3, sobre la home real.

| Chequeo | Insets 0 | Insets 47/34 |
|---------|----------|--------------|
| Titular real ("Mañana: día nublado") | 1 línea, 33,9 px | 1 línea |
| Titular inyectado de 34 caracteres | **2 líneas** (67,75 px, Playfair 28 px) | **2 líneas** |
| Banda del horizonte | 200 px | 120 px (exactamente la silueta) |
| Silueta (top–bottom) / tope de la tab bar | 668–788 / 788 | 634–754 / 754 |
| Silueta completa sin scroll | sí | sí |

- Con el titular de 34 caracteres la banda no cambió de altura: el sobrante lo absorbe el espaciador flexible. Como el (b) pasó, no hubo que aplicar el fallback. Ya estaba aplicado desde 02-01, con el rol en 28 px y `leading-[1.21]`.
- **scrollWidth:** 390 en `/` y 390 en `/pronostico`, colapsado y expandido.
- **Meteograma en la home:** 342×220 px, 30 rótulos, 0 superpuestos y 0 fuera del SVG. Al arrastrar, la selección pasa a la hora 30 ("dom 25 03:00"). Un swipe vertical táctil sobre el gráfico scrollea la página (de 380 a 174, igual que el control) y `touch-action` es `pan-y`. El teclado responde con →, PgDn, End, PgUp, Home y Esc. No hubo errores en consola.
- **/pronostico:** se ven 7 filas, VER 14 DÍAS lleva a 14 filas con la nota ORIENTATIVO y VER 7 DÍAS vuelve a 7. El título es Headline 28 px y la banda mide 120 px.
- Quedan para `/gsd-verify-work` en un iPhone real: las safe areas reales, el render de la fuente en Safari y el scrub con el dedo mientras la página scrollea.

## Tarea 3: producción

- `git push origin main` (2bb7bb8..0994691) fue un fast-forward, sin --force. `git merge-base --is-ancestor HEAD origin/main` da OK.
- PROD_URL es https://clima-winifreda.vercel.app (sale de 01-02-SUMMARY).
- Primer smoke: el commit pasó a 0994691 después de 3 sondeos, la región es gru1 y /dev/estados da 404. Falló un solo chequeo: `fetchedAt` cambió entre los dos requests (de 2026-10-23T22:52:03.485Z a 2026-10-24T00:54:14.523Z). El primer request después del deploy sirvió el snapshot viejo de la caché y disparó la revalidación en segundo plano (stale-while-revalidate). No es un bug.
- El segundo smoke pasó completo: commit 0994691, `fetchedAt` estable (2026-10-24T00:54:14.523Z), `now.tempC` 13.3, región gru1 y /dev/estados 404.
- Valores de fetchedAt en /api/weather: sources[0] = 2026-10-24T00:54:14.523Z y sources[1] = 2026-10-24T00:54:14.455Z.
- Assertions sobre el HTML de producción:
  - `/` contiene `PRÓXIMAS 48 HORAS`, `role="slider"`, `leading-[1.21]` (el titular "Mañana: día nublado") y `WINIFREDA, LA PAMPA`. No contiene `p. m.` ni `leading-[1.19]`.
  - `/pronostico` devuelve 200 y contiene `Los próximos días` y `Pronóstico por día`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Id duplicado del bloque días 8–14**
- **Found during:** Tarea 1
- **Issue:** `DailyList` usaba el id fijo `dias-8-14`. La galería renderiza 5 listas en la misma página, así que se repetían ids y `aria-controls` quedaba ambiguo.
- **Fix:** el id ahora se genera por instancia con `useId()` (`dias-8-14-<id>`). En la página real no cambia nada visible.
- **Files modified:** components/client/DailyList.tsx
- **Commit:** a2405b1

### Notas

- En la galería, `MeteogramSection` repite `id="meteograma-titulo"` en cada frame. Pasa solo en /dev/estados, que no está en producción, y no se tocó porque el componente queda fuera del alcance del plan.
- El smoke de producción se corrió dos veces por la revalidación ISR del primer request (ver Tarea 3).

## Known Stubs

Ninguno.

## Self-Check: PASSED

- FOUND: app/dev/estados/fixtures.ts, app/dev/estados/page.tsx, components/client/DailyList.tsx, 02-VALIDATION.md
- FOUND: a2405b1, 0994691 (en origin/main)
