---
phase: 03-cielo-vivo
plan: 02
subsystem: sky
tags: [sky-state, wind, windmill, waapi, fallback, css]
requires:
  - lib/sky/state.ts (SkyState, skyFromSnapshot, refreshSolar de 03-01)
  - lib/weather/wmo.ts (describeWeather)
  - lib/weather/wind.ts (CALM_KMH)
  - components/client/SkyBackdrop.tsx (capas .sky-layer + host del canvas de 03-01)
  - scripts/smoke.mjs --expect-html (03-01)
provides:
  - SkyState con intensity, windKmh, windDirDeg y cloudCover (opcionales)
  - lib/sky/params.ts (skyParams, intensityFromCode, coverFromCode, cloudDriftPxPerS, rainTiltDeg, tablas y constantes)
  - lib/sky/windmill.ts (rotorPeriodS, ROTOR_K/MIN/MAX)
  - components/client/WindmillRotor.tsx
  - PampaHorizon prop windKmh
  - capa de clima estática del fallback (data-sky-weather / data-sky-night)
affects:
  - home, /pronostico, loading, error (todo Hero)
  - 03-04 (el shader consume skyParams)
tech-stack:
  added: []
  patterns:
    - "Intensidad y cobertura se derivan del código WMO en el servidor, antes de descartarlo (Pitfall 9)"
    - "Una sola Web Animation por rotor; cambio de velocidad con updatePlaybackRate, sin salto de ángulo"
    - "reduced-motion leído en JS para WAAPI (Pitfall 10)"
key-files:
  created:
    - lib/sky/params.ts
    - lib/sky/params.test.ts
    - lib/sky/windmill.ts
    - lib/sky/windmill.test.ts
    - components/client/WindmillRotor.tsx
  modified:
    - lib/sky/state.ts
    - lib/sky/state.test.ts
    - components/PampaHorizon.tsx
    - components/Hero.tsx
    - components/client/SkyBackdrop.tsx
    - app/globals.css
decisions:
  - "Cobertura derivada del código WMO; no se agrega cloud_cover a Open-Meteo (cloudCover 0–100 en el SkyState)"
  - "Inclinación de la lluvia: 8° + 0,2°/km/h (tope 20° a 60 km/h); con calma (< CALM_KMH) solo los 8° base"
  - "starsFactor por tramos lineales: 1 hasta cover 0,15, 0,5 en 0,4 y 0 en 0,85; 0 si no es despejado"
  - "Sentido este-oeste: -sin(dir); sin dirección o viento N/S puro → hacia la derecha"
  - "Estrellas del fallback: 24 radial-gradient con posiciones fijas generadas con semilla, en la mitad superior"
metrics:
  duration: "6 min"
  completed: 2026-10-24
  tasks: 3
  files: 11
---

# Phase 3 Plan 02: El clima real llega al cielo Summary

El `SkyState` que arma el servidor ahora lleva intensidad, viento y cobertura derivados del dato de Ahora. El molino de la silueta gira con el viento real, y el fallback CSS muestra también el clima (lluvia, niebla y estrellas) en el HTML SSR, sin depender de WebGL ni de JS.

## Qué se hizo

- **Task 1 (TDD).** `lib/sky/params.ts` tiene las tablas cerradas `INTENSITY_BY_WMO`/`COVER_BY_WMO` con sus defaults por clima, la deriva de nubes (4 + 0,15·km/h, tope 12, 6 sin dato) y la inclinación de la lluvia (8° + hasta 12°), las dos con el signo de la componente este-oeste. También expone `skyParams(state)`, que aplica los valores medios del UI-SPEC cuando faltan campos. `lib/sky/windmill.ts` define `rotorPeriodS` = clamp(36/km/h, 1,5 s, 12 s), que da null con calma o sin dato. `skyFromSnapshot` acepta precipMm/windKmh/windDirDeg de forma estructural (los llamadores con `{ now: null }` compilan sin cambios) y deriva `intensity` y `cloudCover` antes de descartar el código. `refreshSolar` conserva los campos nuevos.
- **Task 2.** `WindmillRotor` es una isla cliente con las 12 aspas y el cubo en un `<g>` con `transform-box: fill-box` y origen en el centro. Usa una Web Animation de 1 s por vuelta con `updatePlaybackRate(1/período)`. Se pausa con calma o sin dato. Con reducir movimiento, que se lee por `matchMedia` y se escucha en vivo, se pausa en el ángulo 0. En el cleanup llama a `anim.cancel()`. `PampaHorizon` sigue siendo componente de servidor, recibe `windKmh` y deja la cola fuera del rotor. `Hero` le pasa `sky.windKmh`. `/dev/estados`, que no pasa props, deja el molino quieto.
- **Task 3.** Las capas `.sky-layer` llevan `data-sky-weather={state.weather}` y `data-sky-night`. `globals.css` agrega un `::after` estático según el clima: un `repeating-linear-gradient` a 100deg con trazos de 1 px de ink al 6 % cada 12 px para lluvia y tormenta, bruma en la banda de `--band-top` a `--horizon` (ink al 18 %) para niebla, y 24 estrellas fijas de 1 px de ink al 50 % para noche despejada. El efecto de redibujo del canvas ahora también depende de intensity, windKmh, windDirDeg y cloudCover.

## Verificación

- `npx vitest run` pasa 372/372 (los tests nuevos son 90 en params/windmill/state).
- typecheck, lint y build dan 0 errores.
- El smoke `--start --expect-html '/::data-sky-weather="(despejado|cubierto|lluvia|tormenta|niebla)"'` dice "all checks passed".
- `grep cloud_cover lib/sources` no encuentra nada, así que no se tocó la llamada a Open-Meteo.

## Deviations from Plan

**1. [Rule 2 - Robustez] Entradas no finitas acotadas.** `cloudDriftPxPerS`, `rainTiltDeg`, `rotorPeriodS` y `skyParams` tratan NaN o Infinity y los valores negativos como sin dato o los acotan (T-03-05). Esto quedó cubierto por tests. Commit 44e9007.

Fuera de eso, el plan se ejecutó tal cual estaba escrito.

## TDD Gate Compliance

RED `c8543f3` (test) → GREEN `44e9007` (feat). No hizo falta refactor.

## Commits

| Task | Commit | Mensaje |
|------|--------|---------|
| 1 (RED) | c8543f3 | test(03-02): add failing tests for sky weather params, rotor period and SkyState fields |
| 1 (GREEN) | 44e9007 | feat(03-02): sky weather params, rotor period and SkyState wind/intensity/cover |
| 2 | 26aea4c | feat(03-02): windmill rotor turns with the real wind |
| 3 | bf7ed9d | feat(03-02): CSS fallback weather layer (rain, fog, night stars) in the SSR HTML |

## Known Stubs

- El shader todavía no consume `skyParams` (deriva, lluvia, niebla, estrellas, cobertura). Eso llega en 03-04, como dice el plan.
- `data-sky-night` sale del `state.phase` del servidor: si cae la noche sin un `router.refresh()`, las estrellas del fallback aparecen recién con el render siguiente. No afecta al canvas, que sigue al sol cada 60 s.

## Pending human check

Queda diferido al cierre de la fase. Con `npx next start -p 3107`:
1. El rotor tiene que girar alrededor del cubo con la cola quieta. Con reduce emulado tiene que quedar quieto en el ángulo 0, y con calma no tiene que girar. Si en Safari el pivote no queda en el cubo, la alternativa es un `<svg overflow="visible">` anidado con `transform-origin: 0 0` (A6).
2. Con JS deshabilitado, el fallback tiene que mostrar los trazos diagonales con lluvia, la bruma en la banda con niebla y las estrellas fijas en una noche despejada.

## Self-Check: PASSED

- FOUND: lib/sky/params.ts, lib/sky/params.test.ts, lib/sky/windmill.ts, lib/sky/windmill.test.ts, components/client/WindmillRotor.tsx
- FOUND commits: c8543f3, 44e9007, 26aea4c, bf7ed9d
