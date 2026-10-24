---
phase: 03-cielo-vivo
plan: 05
subsystem: cielo-vivo (herramienta de revisión)
tags: [dev-tool, query-validation, webgl, performance, presets]
requires:
  - components/client/sky/renderer.ts (onStats, onFail, onFirstFrame, bufferScale, setPaused) — 03-03
  - lib/sky/params.ts (intensityFromCode, coverFromCode) — 03-02
  - app/dev/estados (Frame, fixtures, notFound en producción) — fases 1 y 2
provides:
  - "lib/sky/devParams.ts: parseSkyLabParams, toSkyLabQuery, toSkyState, toSkyAstro, SKY_LAB_PRESETS (11), SKY_LAB_WMO_CODES, weatherOfCode"
  - "/dev/sky: controles con la URL como estado, cuadros CANVAS / ESTÁTICO / FALLBACK CSS de 390×844, presets y lectura FPS · MS POR FRAME · CALIDAD"
  - "SkyBackdrop: props opcionales astro, paused, bufferScale, onStats, onStatus (los llamadores de antes no cambian)"
affects:
  - 03-06 (agrega FORZAR RELÁMPAGO en SkyLab)
  - 03-07 (smoke de producción con --expect-404 /dev/sky)
  - 03-08 (checkpoint iPhone: lectura de rendimiento y escala 0,5× / 0,75×)
tech-stack:
  added: []
  patterns:
    - "La query se valida con Number + Number.isFinite + clamp + paso y con listas as const; nunca se devuelve texto de la query"
    - "Ahora (server) se renderiza en page.tsx en dos variantes (día/noche) y se pasa como ReactNode a la isla cliente"
    - "Callbacks y astro de dev guardados en refs: no recrean el renderer; solo bufferScale lo recrea"
    - "router.replace con debounce de 250 ms, para no disparar un render de servidor por cada paso del slider"
key-files:
  created:
    - lib/sky/devParams.ts
    - lib/sky/devParams.test.ts
    - app/dev/sky/page.tsx
    - app/dev/sky/SkyLab.tsx
  modified:
    - components/client/SkyBackdrop.tsx
decisions:
  - "Rango de altura del sol en /dev/sky: −30…+70 (no −20…+70) para que el preset Noche estrellada y el atajo NOCHE (−30°) vayan y vuelvan por la URL sin cambiar"
  - "Para el select de WMO se usa la tabla de la fase 1 recorrida con describeWeather (0–99), sin tocar wmo.ts"
  - "Al elegir un código WMO, el clima pasa al grupo de ese código; al elegir un clima que no coincide con el código, el código se borra"
  - "SEGÚN CÓDIGO también en INTENSIDAD (no solo en NUBES), para volver a i = null sin tener que cargar un preset"
metrics:
  duration: 9 min
  completed: 2026-10-24
  tasks: 2
  files: 5
---

# Phase 3 Plan 05: Herramienta de revisión /dev/sky — Summary

/dev/sky fuerza la altura del sol, el lado del día, el clima, el código WMO, la intensidad, el viento con su dirección y la cobertura desde una query validada. Muestra lado a lado el canvas animado, el frame estático y el fallback CSS, trae 11 presets y lee FPS, ms por frame y calidad del gobernador. En producción devuelve 404.

## Qué se construyó

- **lib/sky/devParams.ts** (pura): `parseSkyLabParams` acota cada número (alt −30…70 con paso 0,5; i 0…1 con paso 0,05; viento 0…90 con paso 1; nubes 0…100 con paso 5). Si viene un array, se queda con el primer valor, y un string vacío cuenta como "falta". `clima`, `lado`, `dir` (8 rumbos) y `escala` se validan contra listas `as const`; `wmo` tiene que estar en la tabla de la fase 1. `toSkyState` usa los mismos umbrales que `getSolarPhase` y deriva intensidad y cobertura del código cuando no se fuerzan. `toSkyAstro` ubica el sol al este (90°) de mañana y al oeste (270°) de tarde, sin luna. Hay 74 tests: `1e309`, `<script>`, arrays repetidos, ida y vuelta de los 11 presets y la tabla exacta de presets.
- **SkyBackdrop**: suma las props opcionales `astro`, `paused`, `bufferScale` (si cambia, se recrea el renderer), `onStats` y `onStatus` (`'ok'` en el primer frame, o el motivo de la falla). Un fallo al cargar el chunk también llega como `'error'`.
- **app/dev/sky/page.tsx**: su primera sentencia es `notFound()` cuando `VERCEL_ENV === 'production'`. Además: `force-dynamic`, `robots: { index: false }` y el fixture `normal` con el titular largo de /dev/estados.
- **app/dev/sky/SkyLab.tsx**: los controles son fieldsets con legend, ranges nativos con `accent-color` ink y botones de 44 px con `aria-pressed`, sin acento. Incluye los atajos (con AHORA REAL), la escala 0,5× / 0,75×, PAUSAR/REANUDAR CIELO y MOSTRAR CONTENIDO. Hay tres cuadros 390×844 con `data-sky-band` y el molino con el viento forzado: CANVAS (`renderer="auto"`, con los mensajes de sin WebGL o de falla), ESTÁTICO (`renderer="static"`) y FALLBACK CSS (`renderer="off"`), así que la página usa como máximo 2 contextos WebGL. Debajo va la grilla de PRESETS.

## Verificación

- `npx vitest run`: 27 archivos, 514 tests en verde (74 nuevos en devParams).
- `npm run typecheck`, `npm run lint` y `npm run build` salen con 0; /dev/sky figura como ruta dinámica.
- Smoke local (`--start`, puerto 3107): `/dev/sky?alt=1e309&clima=%3Cscript%3E` da 200 con `CIELO · /dev/sky` y `DATA-SKY dia`; el preset de noche da `DATA-SKY noche`; `/dev/estados` da 200 y no tiene `<canvas`.
- El HTML de la query maliciosa no contiene `<script>alert`. El único eco es el estado del router de Next, codificado en URL dentro del payload de flight, y no lo produce el código de la app.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] El rango de altura −20…70 no dejaba pasar los presets de −30° y −25°**
- **Found during:** Task 1
- **Issue:** el UI-SPEC define los presets Noche estrellada (−30°), Tormenta de noche (−25°) y Noche nublada (−25°), y el atajo NOCHE (−30°), pero también fija el slider en −20…70. Con ese clamp, esos presets no podían ir y volver por la URL (pasaban a −20 tras la primera recarga).
- **Fix:** el mínimo pasa a −30. El caso de test `'-50' → −20` queda como `'-50' → −30`, y se suma `'-25' → −25`. A la vista no cambia nada: por debajo de −18° la paleta ya es noche plena.
- **Files modified:** lib/sky/devParams.ts, lib/sky/devParams.test.ts
- **Commit:** 2232c05

**2. [Ajuste de interfaz] Props de SkyLab**
- El plan decía `fixture={…}`. Como `Ahora` es un componente de servidor, page.tsx lo renderiza y le pasa a SkyLab `contentDay` / `contentNight` (ReactNode), y la isla elige uno según la fase forzada. Así se ve la etiqueta "NOCHE DESPEJADA" en los presets nocturnos.

**3. [Rule 2] router.replace con debounce de 250 ms**
- Cada `router.replace` vuelve a renderizar la página en el servidor (force-dynamic). Arrastrar un slider dispararía decenas de requests, así que la URL se actualiza 250 ms después del último cambio.

## Known Stubs

- La lectura muestra `— FPS · — MS POR FRAME · CALIDAD —` hasta que llega la primera estadística del renderer (o si no hay WebGL). Es intencional.
- El botón FORZAR RELÁMPAGO no está. Lo agrega 03-06 junto con los relámpagos, como indica el plan.

## Threat Flags

Ninguna: el plan ya contempla toda la superficie nueva (T-03-13/14/15).

## TDD Gate Compliance

RED `35a8eb6` (test) → GREEN `2232c05` (feat). No hizo falta refactor.

## Self-Check: PASSED

- FOUND: lib/sky/devParams.ts, lib/sky/devParams.test.ts, app/dev/sky/page.tsx, app/dev/sky/SkyLab.tsx
- FOUND: 35a8eb6, 2232c05, 168bc08
