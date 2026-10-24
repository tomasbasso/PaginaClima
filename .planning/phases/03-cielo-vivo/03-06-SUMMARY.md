---
phase: 03-cielo-vivo
plan: 06
subsystem: sky
tags: [webgl, lightning, photosensitivity, wcag-2.3.1, dev-tools]
requires:
  - phase: 03-04
    provides: capas de clima en el shader (nubes, niebla, lluvia) y clamp C-1
  - phase: 03-05
    provides: /dev/sky con PAUSAR CIELO, props de dev de SkyBackdrop
provides:
  - lib/sky/lightning.ts (mulberry32, lightningPlan, lightningEnvelope, forcedLightningPlan, peakAmplitude, constantes C-5)
  - uFlash/uFlashColor/uFlashContent en el shader, después del clamp
  - SkyRendererHandle.forceLightning()
  - prop lightningKey en SkyBackdrop y botón FORZAR RELÁMPAGO en /dev/sky
affects: [03-07, 03-08]
tech-stack:
  added: []
  patterns:
    - "Plan de eventos con PRNG con semilla, armado de antemano y muestreado por frame con un objeto out reutilizado"
    - "Reloj propio del relámpago (dt, envuelto por ventana de 600 s) separado de simTime"
key-files:
  created:
    - lib/sky/lightning.ts
    - lib/sky/lightning.test.ts
  modified:
    - components/client/sky/shader.ts
    - components/client/sky/renderer.ts
    - components/client/SkyBackdrop.tsx
    - app/dev/sky/SkyLab.tsx
key-decisions:
  - "Relámpago: caída exponencial con tau = decayMs/3 (≈5 % al final de la caída) y corte a 0 tras 2 × decayMs; subida lineal de 40 ms"
  - "Relámpago: FLASH_MAX_DELTA_L 0,075 y CONTENT_FLASH_FACTOR 0,33 (contenido ≈ 0,0998 en el pico); amplitud del shader = ΔL / L(color), así cada factor del shader ≤ 1 garantiza el tope"
  - "Relámpago: el primer evento de cada ventana también espera un intervalo completo, así encadenar planes nunca acerca dos eventos por debajo del mínimo"
  - "forceLightning no hace nada en modo estático (reducir movimiento, estático forzado, gobernador 3), por D-09; con el cielo pausado dibuja un frame en el pico"
patterns-established:
  - "Funciones puras del cielo que corren por frame aceptan un objeto out para no alocar"
requirements-completed: []
duration: 8 min
completed: 2026-10-24
---

# Phase 3 Plan 06: Relámpagos seguros Summary

**Relámpagos difusos dentro de la banda con un plan de pulsos determinista (mulberry32) cuyos límites de fotosensibilidad (≤ 2 pulsos/s, ΔL 0,075, contenido ≤ 0,10) están probados por test, sumados en el shader después del clamp y revisables congelados en /dev/sky.**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-10-24
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `lib/sky/lightning.ts`: plan con intervalos de 8–16 s a intensidad 1 y 12–24 s a 0,5 (interpolación lineal con piso en 0,5), 1 o 2 pulsos (el segundo a 150–250 ms y al 60 %), x en [0,15; 0,85], envolvente con subida de 40 ms y caída exponencial, suma acotada al pico. Sin `Math.random`.
- 18 tests: barrido de ventanas de 1 s (paso 50 ms) sobre 3600 s × 20 semillas, envolvente, amplitud C-5 y determinismo.
- Shader: aclarado difuso centrado en la banda que se derrama hacia arriba (elipse más alta arriba del centro), color storm+ink, factor de zona `uFlashContent` sobre el contenido, nubes un poco más iluminadas (0,7 → 1,0 según su alfa, sin superar el tope). La silueta SVG queda en contraluz porque el canvas está detrás.
- Renderer: plan por ventana de 600 s solo con `tormenta` y lluvia > 0, regenerado con la semilla siguiente; uFlash = 0 en frames estáticos; `forceLightning()` con pico congelado si está pausado; sin allocations por frame.
- `/dev/sky`: botón FORZAR RELÁMPAGO (sin acento) junto a PAUSAR CIELO / MOSTRAR CONTENIDO, que dispara el pulso en el cuadro CANVAS con cualquier clima.
- Chunk del renderer: 10 965 B gzip (≤ 20 480).

## Task Commits

1. **Task 1 (RED): tests del plan de pulsos** - `83c0028` (test)
2. **Task 1 (GREEN): plan de pulsos determinista** - `dc1d3c4` (feat)
3. **Task 2: relámpago en shader/renderer, lightningKey y FORZAR RELÁMPAGO** - `39de367` (feat)

## Files Created/Modified

- `lib/sky/lightning.ts` - plan y envolvente de pulsos, constantes C-5
- `lib/sky/lightning.test.ts` - frecuencia, envolvente, amplitud, determinismo
- `components/client/sky/shader.ts` - uFlash/uFlashColor/uFlashContent después del clamp, `cloudA`
- `components/client/sky/renderer.ts` - reloj y plan del relámpago, forceLightning
- `components/client/SkyBackdrop.tsx` - prop `lightningKey`
- `app/dev/sky/SkyLab.tsx` - botón FORZAR RELÁMPAGO

## Decisions Made

Ver `key-decisions` del frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Timeout de los tests de barrido**
- **Found during:** Task 1 (GREEN)
- **Issue:** un `expect` por cada paso del barrido (72 000 × 20 semillas) superaba los 5 s de Vitest.
- **Fix:** se calcula el peor caso por semilla y se aserta una vez; misma cobertura.
- **Files modified:** lib/sky/lightning.test.ts
- **Commit:** dc1d3c4

**2. [Rule 2 - Missing] Helpers extra exportados**
- `forcedLightningPlan()` (pulso único para el botón de /dev/sky), `RISE_MS`, `peakAmplitude()` y un parámetro `out` opcional en `lightningEnvelope` para cumplir "sin allocations por frame".

## Pending human check

En `npx next start -p 3107` → /dev/sky, preset Tormenta de noche: destellos suaves y espaciados, silueta en contraluz, sin rayo ni flash de pantalla completa; PAUSAR CIELO + FORZAR RELÁMPAGO y medir con cuentagotas detrás del titular (≤ 0,10, texto ≥ 4,5:1); con reduce motion no hay relámpagos. Queda para el checkpoint de 03-08.

## Known Stubs

Ninguno.

## Next Phase Readiness

- Relámpago listo para la revisión en dispositivo del plan 03-08.

## Self-Check: PASSED

- FOUND: lib/sky/lightning.ts, lib/sky/lightning.test.ts
- FOUND: 83c0028, dc1d3c4, 39de367
