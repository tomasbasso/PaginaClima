---
phase: 03-cielo-vivo
plan: 01
subsystem: sky
tags: [webgl, glsl, palette, suncalc, contrast, fallback, smoke]
requires:
  - lib/sky/state.ts (SkyState, SkyWeather, SkyToken)
  - lib/sky/phase.ts (getSolarPhase)
  - app/globals.css (six data-sky token rows)
provides:
  - lib/sky/palette.ts (skyPalette, toLinear, toSrgb8, hexToLinear, luminance, mixLinear, smoothstep, TOKEN_STOPS, LMAX_CONTENT, anchors)
  - lib/sky/astro.ts (astroAt, SkyAstro)
  - lib/sky/state.ts refreshSolar
  - components/client/sky/shader.ts (VERTEX_SRC, FRAGMENT_SRC)
  - components/client/sky/renderer.ts (createSkyRenderer, BUFFER_SCALE, handle/options types)
  - SkyBackdrop renderer prop + data-sky-root; Hero data-sky-band
  - scripts/smoke.mjs --expect-html / --reject-html
affects:
  - home, /pronostico, loading, error (every Hero)
tech-stack:
  added: []
  patterns:
    - "Colors computed once in CPU (linear RGB), shader only interpolates + clamps"
    - "Imperative non-React renderer with its own canvas per mount, loaded via import()"
    - "Never throw into React: try/catch + onFail + null, chunk import with .catch"
key-files:
  created:
    - lib/sky/palette.ts
    - lib/sky/palette.test.ts
    - lib/sky/astro.ts
    - lib/sky/astro.test.ts
    - components/client/sky/shader.ts
    - components/client/sky/renderer.ts
  modified:
    - lib/sky/state.ts
    - lib/sky/state.test.ts
    - components/client/SkyBackdrop.tsx
    - components/Hero.tsx
    - scripts/smoke.mjs
decisions:
  - "Overcast/rain weight ramps 0 → base between −12° and −6° and base → 1 between 0° and +15°: no jump at −12° and exact cubierto row by day (0.85 alone misses the ±12 tolerance on S5)"
  - "Night storm darkening (weight 0.5 towards noche S1) ramps in between −12° and −18°, so tormenta stays within ±12 at every altitude ≥ −12° and the change is continuous"
  - "Sky chunk is 3.8 KB gzip (budget 20 KB)"
metrics:
  duration: "7 min"
  completed: 2026-10-24
  tasks: 3
  files: 11
---

# Phase 3 Plan 01: Cielo WebGL continuo sobre el fallback CSS Summary

El fondo del Hero pasó a ser un canvas WebGL de un solo draw call, sin dependencias. Pinta el gradiente S1→S5 con una paleta continua: se calcula en la CPU en RGB lineal según la altura real del sol y el clima, y en la zona de contenido se aplica un clamp de luminancia de 0,073. Va montado encima de las dos capas CSS de siempre, que quedan como fallback.

## Qué se hizo

- **Task 1 (TDD).** `lib/sky/palette.ts` es la paleta continua. Las anclas están en −12°/0°/+15°, y a 0° el crepúsculo es amanecer o atardecer según el mediodía solar. Las reglas de clima siguen el UI-SPEC y S1..S3 tienen un escalado de seguridad para C-1. `TOKEN_STOPS` es una copia de globals.css, y un test lee el CSS para comprobar que no se desincronicen. `lib/sky/astro.ts` arma `astroAt(now)` con suncalc 2.x en grados, sin pasar por radianes. Los tests cubren: convergencia con los tokens en ±12 por canal, el barrido C-1 (181 × 5 × 2), C-2 en todos los pares de colores, la continuidad por pasos de 0,1° y los rangos de los astros.
- **Task 2.** `shader.ts` está en GLSL ES 1.00 y usa highp con `#ifdef`. Tiene gradiente en lineal, grano fijo con `hash12` sin seno aplicado antes del clamp, clamp C-1 con una rampa de 24 px CSS y codificación sRGB exacta. `renderer.ts` es un módulo no-React que crea su propio canvas e intenta webgl2 y, si falla, webgl, con atributos low-power y `failIfMajorPerformanceCaveat`. Mide la caja y `[data-sky-band]` con ResizeObserver, usa un buffer de 0,5× y uniforms preasignados. Aparece con un fundido de 600 ms, y ante una pérdida de contexto hace fade de 300 ms y un único intento de restore. `dispose()` es idempotente y llama a `loseContext`.
- **Task 3.** `SkyBackdrop` recibe la prop `renderer` (por defecto `live ? 'auto' : 'off'`) y un host vacío encima de las capas. El `import('./sky/renderer')` usa el flag `disposed` y `.catch`. El tick de 60 s ahora usa `refreshSolar` y además alimenta al canvas. En `Hero` se agregó `data-sky-band`. `refreshSolar` en state.ts conserva los campos del server (Pitfall 9). `smoke.mjs` tiene dos flags nuevos y repetibles: `--expect-html` y `--reject-html` con `'<ruta>::<regex>'`.

## Verificación

- `npx vitest run`: 282/282 en verde (54 en lib/sky).
- typecheck, lint y build: 0 errores.
- El chunk del cielo es `.next/static/chunks/41lznb9oug4ne.js`, el único que contiene `uBandTop`: 3810 B gzip (límite 20480).
- Smoke con `--start`: `/` contiene `data-sky-band` y `data-sky-root` y no contiene `<canvas`; `/pronostico` contiene `data-sky-band`; exit 0.
- `node scripts/smoke.mjs` sin argumentos sigue saliendo con 2.
- No se importa three/pixi/ogl/R3F. El renderer no lee `--band-h` ni usa `getComputedStyle`. `astro.ts` no usa `Math.PI`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Peso de cubierto/lluvia incompatible con la convergencia diurna**
- **Found during:** Task 1
- **Issue:** el UI-SPEC pide peso 0,85 hacia `cubierto` "de día y en el crepúsculo" y además convergencia con la fila `cubierto` a ±12 con sunAltitude ≥ +15°. Con 0,85 fijo, S5 queda a 15–16 por canal de `#7d8894`. Encima, aplicar el peso solo con sunAltitude > −12 provoca un salto a −12°, y eso contradice D-06.
- **Fix:** `w = smoothstep(−12, −6, alt) · (base + (1 − base) · smoothstep(0, 15, alt))`. Así, de noche queda `noche`, en el crepúsculo se mantiene el rastro cálido con 0,85/0,9, de día da exactamente `cubierto`, y no hay saltos.
- **Files modified:** lib/sky/palette.ts
- **Commit:** 46d264b

**2. [Rule 1 - Bug] Oscurecimiento nocturno de la tormenta con salto en −12°**
- **Found during:** Task 1
- **Issue:** aplicar el peso 0,5 hacia S1 de `noche` justo desde ≤ −12 genera una discontinuidad de unas 27 unidades por canal.
- **Fix:** el peso sube de 0 en −12° a 0,5 en −18° (smoothstep). En ≥ −12° la tormenta sigue siendo exactamente la fila `tormenta`.
- **Files modified:** lib/sky/palette.ts
- **Commit:** 46d264b

**3. [Ajuste de test] Tolerancia del test de continuidad**
- Cerca del negro la curva sRGB es muy empinada: un paso de 0,1° llega a mover un canal hasta 4 unidades. El umbral quedó en ≤ 6 por paso, contra unas 100 en un cambio de token, con el motivo comentado en el test. Commit 46d264b.

## TDD Gate Compliance

RED `76ceb33` (test) → GREEN `46d264b` (feat). No hizo falta refactor.

## Commits

| Task | Commit | Mensaje |
|------|--------|---------|
| 1 (RED) | 76ceb33 | test(03-01): add failing tests for sky palette and astro |
| 1 (GREEN) | 46d264b | feat(03-01): continuous sky palette and astro helpers |
| 2 | b9742bf | feat(03-01): WebGL sky renderer and gradient shader |
| 3 | 1b2c97c | feat(03-01): mount the WebGL sky in SkyBackdrop over the CSS fallback |

## Known Stubs

- `SkyRendererOptions.mode` ('animated' | 'static') ya se acepta, pero en este plan todavía no cambia nada: el dibujo es siempre bajo demanda. El loop a 30 fps y la parte de reduced-motion llegan en 03-03.
- `astro.sunAzimuth` y los datos de la luna se calculan y se pasan, pero el shader todavía no los usa. Los resplandores llegan en planes siguientes.

## Pending human check

Falta la revisión visual en la GPU: con `npx next start -p 3107`, abrir `/` y `/pronostico` en Chrome/Edge y confirmar el fundido sin flash, que el color coincida con la hora y que el texto se lea. Repetir con reduced-motion emulado (el canvas tiene que aparecer sin fundido) y verificar que `/dev/estados` no tenga canvas. Está diferida al cierre de la fase (`human_verify_mode: end-of-phase`).

## Self-Check: PASSED

- FOUND: lib/sky/palette.ts, lib/sky/palette.test.ts, lib/sky/astro.ts, lib/sky/astro.test.ts, components/client/sky/shader.ts, components/client/sky/renderer.ts
- FOUND commits: 76ceb33, 46d264b, b9742bf, 1b2c97c
