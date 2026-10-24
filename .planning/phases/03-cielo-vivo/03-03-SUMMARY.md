---
phase: 03-cielo-vivo
plan: 03
subsystem: sky
tags: [webgl, glsl, raf, performance, reduced-motion, governor, sun, moon, stars]
requires:
  - components/client/sky/renderer.ts y shader.ts (03-01)
  - lib/sky/astro.ts (SkyAstro), lib/sky/palette.ts (skyPalette, smoothstep), lib/sky/state.ts (SkyWeather)
provides:
  - lib/sky/loop.ts (shouldDrawFrame, clampDt, wrapTime, simTimeStart, easeInOut, progress, createGovernor, governorStep, governorResume, FRAME_MS, SLACK_MS, MAX_DT_MS, TIME_PERIOD_S, GOV_*)
  - lib/sky/glow.ts (glowX, sunGlow, moonGlow, starsAlpha)
  - renderer con loop a 30 fps, pausas, modo estático, interpolación, gobernador
  - API del renderer: onStats (SkyStats), setPaused, bufferScale
  - uniforms del shader: uSun, uMoon, uStars, uTwinkleT, uQuality
affects:
  - home y /pronostico (Hero en vivo)
  - 03-04 (nubes/lluvia/niebla usan simTime, uQuality y el factor de estrellas)
  - 03-05 (/dev/sky consume onStats, setPaused y bufferScale)
  - 03-08 (checkpoint del iPhone calibra los umbrales del gobernador)
tech-stack:
  added: []
  patterns:
    - "Toda decisión con límite duro del loop es una función pura que recibe los tiempos medidos por el llamador"
    - "Tiempo de simulación en double en JS; al shader solo llegan valores envueltos (wrapTime, 420 s)"
    - "Estado preasignado: Float32Array de la paleta, escalares de los resplandores, muestra del gobernador reutilizada; governorStep devuelve el mismo objeto si no cambia nada"
key-files:
  created:
    - lib/sky/loop.ts
    - lib/sky/loop.test.ts
    - lib/sky/glow.ts
    - lib/sky/glow.test.ts
  modified:
    - components/client/sky/renderer.ts
    - components/client/sky/shader.ts
decisions:
  - "Gobernador de dos señales: muestra mala si el promedio móvil (EMA 0,1) del trabajo JS del frame supera 28 ms o si el intervalo entre frames dibujados supera 45 ms; sostenido 2 s tras 2 s de calentamiento baja un nivel; nunca sube. Umbrales a confirmar en el checkpoint del iPhone (03-08)"
  - "Los frames estáticos (reducir movimiento, modo static, nivel 3) mandan uQuality >= 2 para apagar el titileo, pero conservan el grano fijo; el grano solo se apaga con el gobernador en nivel >= 2"
  - "Factor de cielo despejado (1/0) interpolado durante la transición de clima de 2000 ms: estrellas y halo de luna se desvanecen en vez de aparecer de golpe"
  - "El halo de la luna se atenúa con la luz del día: × (1 − smoothstep(−4°, 6°, altura del sol))"
  - "Estrellas: grilla de 28 px CSS, densidad 0,433·(1 − 0,9·y) → ~100 estrellas en 390×844, ~70 % arriba"
  - "Chunk del cielo: 6737 B gzip (límite 20480)"
metrics:
  duration: "7 min"
  completed: 2026-10-24
  tasks: 3
  files: 6
---

# Phase 3 Plan 03: El cielo cobra vida y cuida el iPhone Summary

El renderer WebGL pasó de dibujar bajo demanda a correr un loop rAF limitado a 30 fps con tolerancia, que se pausa cuando el cielo no se ve, queda estático con reducir movimiento y se degrada solo si el teléfono sufre. El shader suma el resplandor del sol en el horizonte, el halo de la luna y estrellas que titilan, todo según la posición real de los astros.

## Qué se hizo

- **Task 1 (TDD).** `lib/sky/loop.ts` es puro, sin reloj ni rAF adentro. `shouldDrawFrame` usa `FRAME_MS − SLACK_MS` (29,3 ms): con timestamps sintéticos con jitter de ±1 ms da 30 fps a 60, 120 y 30 Hz, y nunca cae a 20. `clampDt` devuelve 0 en el primer frame y 100 ms como máximo. Además trae `wrapTime`, `simTimeStart` (depende de la hora, en [0, 420)), `easeInOut` y `progress`, y el gobernador de dos señales con `governorResume`. `lib/sky/glow.ts` implementa `glowX` (0,5 + 0,4·sin az, acotado a [0,1; 0,9]), `sunGlow` (entre −8° y +12°, máximo 1 en 0°, monótono), `moonGlow` (solo con luna sobre el horizonte y cielo despejado, ∝ fracción iluminada, yFrac de 1 a 0,30) y `starsAlpha` (smoothstep inverso entre −6° y −12°). Son 68 tests.
- **Task 2.** `renderer.ts` tiene ahora un loop rAF con `shouldDrawFrame`/`clampDt`, y `simTime` arranca en `simTimeStart(Date.now())`. Las pausas responden a `visibilitychange`, `pagehide`/`pageshow` e `IntersectionObserver` (threshold 0). `resume()` solo arranca si la página está visible, la caja está en pantalla, el modo es animado, no hay pausa manual y el contexto está vivo, y en ese caso llama a `governorResume`. El modo estático se activa con `mode: 'static'`, con `prefers-reduced-motion` (escuchado en vivo) o con el gobernador en nivel 3: dibuja un solo frame, sin fundido, y solo vuelve a dibujar en setState o en un resize. La altura del sol se interpola en 1500 ms y la paleta de clima en 2000 ms, ambas ease-in-out, mezclando las 5 paradas desde un snapshot `Float32Array` de la paleta mostrada. `onStats` sale cada 500 ms con los fps del último segundo (anillo `Float64Array`), cpuMs (EMA) y la calidad. Se agregaron `setPaused` y `bufferScale`, acotado a [0,5; 0,75] (T-03-10). Ante un contexto perdido se detiene el loop, y en restored hay un único intento y luego se reanuda. Hay 6 `addEventListener` y 6 `removeEventListener`, y los dos observers hacen `disconnect()`. No se usan `gl.finish` ni `readPixels`.
- **Task 3.** En `shader.ts`, el resplandor del sol es elíptico, centrado en el horizonte, de color `#f4c06a` mezclado hacia S5, con rx ≤ 60 % del ancho y ry ≤ el alto de la banda, y va antes del clamp. El halo de la luna en ink suma como máximo 0,0207·ink (ΔL ≤ 0,02) y también va antes del clamp. Las estrellas van **después** del clamp (C-4) y salen de una grilla de celdas en px CSS con `hash12`: miden como mínimo 1 px de buffer, el alfa se compensa por cobertura y queda en 0,2–0,6, el titileo es de ±25 % con períodos de 3–7 s y se apaga con `uQuality >= 2`. El renderer sube `sunGlow`, `moonGlow` y `starsAlpha` a uniforms, calculados con la altura interpolada.

## Verificación

- `npx vitest run`: 440/440 (lib/sky: 212, de los cuales 68 son de loop/glow).
- `npm run typecheck`, `npm run lint` y `npm run build`: 0 errores.
- El único chunk con `uBandTop` es `.next/static/chunks/3u3y3baaycxjo.js`, con 6737 B gzip (límite 20480).
- `grep -cE "performance\.now|Math\.random|requestAnimationFrame"` sobre loop.ts y glow.ts da 0 en los dos. `gl.finish|readPixels` en renderer.ts también da 0.
- Compilé el shader en Chrome headless (SwiftShader) con webgl2 y con webgl, sin errores. En un cuadro nocturno de 195×422 de buffer salen 90 píxeles de estrella, el 71 % en la mitad superior. En el atardecer con el sol a la izquierda, el horizonte izquierdo da (177,140,82) y el derecho queda sin resplandor. El script es temporal y está en el scratchpad, no en el repo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctitud] Halo de luna atenuado de día**
- **Found during:** Task 3
- **Issue:** `moonGlow` (según el contrato del plan) solo mira la altura de la luna y el clima, así que con luna diurna sobre un cielo de día despejado agregaría un halo de ink que no corresponde.
- **Fix:** el renderer multiplica la intensidad por `1 − smoothstep(−4°, 6°, altura del sol)`. La función pura no cambió.
- **Files modified:** components/client/sky/renderer.ts
- **Commit:** d97c5ee

**2. [Rule 2 - Correctitud] Estrellas y luna sin salto en el cambio de clima**
- **Found during:** Task 3
- **Issue:** el factor de clima de las estrellas (1 despejado, 0 si no) pasaba de golpe y rompía D-06, que pide interpolar 2000 ms y sin crossfade.
- **Fix:** el factor `curClear` se interpola junto con la paleta de clima, y durante la mezcla el halo se calcula como si estuviera despejado y se multiplica por ese factor.
- **Files modified:** components/client/sky/renderer.ts
- **Commit:** d97c5ee

Fuera de esto, el plan se ejecutó tal cual estaba escrito.

## TDD Gate Compliance

RED `8b86529` (test) → GREEN `13d9feb` (feat). No hizo falta refactor.

## Commits

| Task | Commit | Mensaje |
|------|--------|---------|
| 1 (RED) | 8b86529 | test(03-03): add failing tests for sky loop limiter, governor and glows |
| 1 (GREEN) | 13d9feb | feat(03-03): pure sky loop limiter, quality governor and sun/moon/star glows |
| 2 | f0232d8 | feat(03-03): 30 fps sky loop with pauses, reduced motion, interpolation and governor |
| 3 | d97c5ee | feat(03-03): sun glow, moon halo and twinkling stars in the sky shader |

## Known Stubs

- El factor de clima de las estrellas es binario (1 despejado / 0 si no). 03-04 lo refina con la cobertura (`starsFactor` de `skyParams`), como pide el plan.
- `uQuality >= 2` por ahora solo apaga el titileo y el grano. "La mitad de la lluvia" llega en 03-04, con la capa de lluvia.
- SkyBackdrop todavía no pasa `onStats`, `setPaused` ni `bufferScale`: los consume `/dev/sky` en 03-05.

## Pending human check

Queda diferido al cierre de la fase (`human_verify_mode: end-of-phase`). Con `npx next start -p 3107`:
1. De noche despejada se tienen que ver estrellas tenues que titilan, y al amanecer o atardecer un resplandor cálido sobre el horizonte del lado correcto (derecha al salir, izquierda al ponerse).
2. Con DevTools → Rendering → `prefers-reduced-motion: reduce`, el cielo tiene que quedar quieto y sin fundido.
3. Al cambiar de pestaña y volver no tiene que haber saltos.
4. Calibrar los umbrales del gobernador (28 ms / 45 ms) en el iPhone, en 03-08.

## Self-Check: PASSED

- FOUND: lib/sky/loop.ts, lib/sky/loop.test.ts, lib/sky/glow.ts, lib/sky/glow.test.ts, components/client/sky/renderer.ts, components/client/sky/shader.ts
- FOUND commits: 8b86529, 13d9feb, f0232d8, d97c5ee
