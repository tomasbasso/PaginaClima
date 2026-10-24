---
phase: 03-cielo-vivo
plan: 04
subsystem: cielo-vivo (WebGL)
tags: [webgl, shader, clouds, fog, rain, weather, performance]
requires:
  - lib/sky/params.ts (skyParams: cover, driftPxPerS, rain, fog, starsFactor, rainTiltDeg) — 03-02
  - components/client/sky/renderer.ts loop, interpolation and governor — 03-03
provides:
  - "Capas de clima en el mismo fragment shader: nubes fbm (2 capas), niebla baja, lluvia procedural"
  - "Uniforms uCover, uCloudOffset, uNight, uFog, uFogOffset, uRain, uRainTilt, uRainOffset"
  - "CLOUD_PERIOD_PX, FOG_PERIOD_PX, RAIN_PERIOD_PX exportados desde shader.ts (única fuente)"
affects:
  - 03-05 (relámpagos: aclarar nubes de la banda, después del clamp)
  - 03-07 (/dev/sky: revisión visual de nubes, niebla y lluvia)
  - 03-08 (checkpoint iPhone: costo real de fbm 4 oct. × 2 + lluvia)
tech-stack:
  added: []
  patterns:
    - "Offsets acumulados (dt × velocidad interpolada) y envueltos en CPU con wrapTime; ruido periódico en x con el mismo período"
    - "Escalares de clima en Float64Array preubicados, interpolados 2000 ms ease-in-out"
key-files:
  created: []
  modified:
    - components/client/sky/shader.ts
    - components/client/sky/renderer.ts
decisions:
  - "Offsets de nubes/niebla/lluvia acumulados por frame (pos += dt·v, envuelto) en vez de simTime·v: un cambio de viento no hace saltar las nubes"
  - "Nubes y niebla en px CSS (pc = p / uScale) con períodos 1536 / 1024 / 1200 px; celdas de ruido divisoras exactas del período"
  - "Capa lejana de nubes con su propio offset (60 % de la velocidad) envuelto por separado, para que el wrap no salte"
  - "uNight = 1 − smoothstep(−12°, −8°, sol): de noche las nubes van a fondo + 0,01 de L"
  - "Densidad de lluvia: columnas de 8/10 px y separación 600/400 px → ≈151 trazos a intensidad 1 en 390×844 (RAIN_DENSITY_MAX = 1)"
metrics:
  duration: 14 min
  completed: 2026-10-24
  tasks: 2
  files: 2
---

# Phase 3 Plan 04: El cielo muestra el tiempo que hace — Summary

El mismo fragment shader (1 draw call) ahora dibuja nubes por ruido fbm que derivan con el viento real, bruma baja de niebla detrás de la silueta y lluvia en trazos finos inclinados por el viento. Todo se alimenta de `skyParams(state)` interpolado en 2000 ms y queda bajo el clamp de luminancia de la zona de contenido.

## Qué se hizo

### Task 1: Nubes que derivan con el viento y bruma de niebla (8f59690)
- **shader.ts:** ruido de valor con `hash12` (sin seno; `43758` sigue en 0), periódico en x, y `fbm` de 4 octavas fijas. Hay dos capas de nubes (celdas de 256 y 192 px CSS, y la lejana a 0,6 de alfa) con densidad por `uCover`: nada con 0 y un manto con 1. De día y en el crepúsculo, las nubes son apenas más claras que el cielo, y la parte baja dentro de la banda toma S4/S5 (luz desde abajo). De noche son el fondo + 0,01 de L. La niebla es tinta al 10–25 %, sube desde el horizonte hasta el borde de la banda con un borde ondulado (`uFogOffset`) y es nula sobre el contenido, donde solo queda un velo de +0,008 de L. Todo va antes del clamp.
- **renderer.ts:** `skyParams(state)` es el objetivo de interpolación (cover, drift, rain, fog, starsFactor, tilt), con arrays preubicados. Se dispara cuando cambia el clima **o** cualquier parámetro (viento, intensidad, cobertura), así que la transición va por densidad y no de golpe. `uStars = starsAlpha × starsFactor` interpolado (el código 2 da la mitad). Los offsets de nubes (cerca y lejos) y de niebla (≤ 3 px/s, con el signo del viento) se acumulan con `dt` y se envuelven con `wrapTime`.

### Task 2: Lluvia procedural y gobernador nivel 2 (2e223ce)
- **shader.ts:** se rota el espacio por `uRainTilt`. Hay columnas de 8 px (cerca) y 10 px (lejos) activas por hash `< uRain`, con fase, largo de 12–24 px, desplazamiento lateral y alfa de 0,10–0,25 propios de cada columna. El trazo mide 1 px CSS, con un mínimo de 1 px de buffer, alfa compensado por cobertura y AA con smoothstep (Pitfall 6). Sobre el contenido el alfa se multiplica por `mix(1, 0.72, wContent)`, así que el tope es 0,18. La capa lejana va a 0,6 de alfa. Se compone antes del clamp.
- **renderer.ts:** `uRain` se multiplica por 0,5 con `gov.level >= 2`. `uRainTilt` sale de `rainTiltDeg` interpolado, en radianes y con signo. `uRainOffset` se mueve a 600/400 px/s y se envuelve en `RAIN_PERIOD_PX = 1200` (múltiplo de las separaciones 600 y 400). En frames estáticos los offsets no avanzan, así que la lluvia queda congelada.

## Verificación

- `npx vitest run lib/sky`: 212/212. `npm run typecheck`, `npm run lint` y `npm run build`: todos en 0.
- Chunk con `uBandTop`: **9544 bytes gzip** (el límite es 20480).
- **Compilación real del GLSL:** con un arnés en el scratchpad, el shader se compiló en Chrome headless (ANGLE/SwiftShader, WebGL1) con 5 estados. Se leyó la luminancia máxima de la zona de contenido con `readPixels`, sin estrellas (C-4 es una excepción):

| Estado | max L contenido |
|---|---|
| lluvia de día (cover 0,9, rain 1, +20°) | 0,0732 |
| tormenta de noche (rain 1, −16°) | 0,0732 |
| cubierto al atardecer | 0,0532 |
| algo nublado de día (0,4) | 0,0737 (redondeo de 8 bits sobre el tope 0,073) |
| niebla al amanecer | 0,0614 |

  Todos quedan ≤ 0,075. En las capturas la lluvia cae inclinada hacia la derecha con +20° y hacia la izquierda con −16°, con trazos finos y tenues y una densidad del orden de 150 trazos.

## Pendiente para /dev/sky (03-07) y el iPhone (03-08)

- **Revisión humana (human-check de la Task 2):** no se hizo en vivo. Queda para el checkpoint de fin de fase (`human_verify_mode: end-of-phase`), porque /dev/sky todavía no existe. Hay que confirmar la deriva de las nubes, la entrada y salida en unos 2 s al cambiar de clima, y la lluvia en movimiento.
- Las nubes en la zona de contenido se notan poco: el clamp C-1 las aplana en luminancia y solo queda la variación de tono. En la banda son suaves. Si en /dev/sky se ven demasiado tímidas, hay que subir `aMax` o el aclarado de `topCol` (en la banda no hay tope).
- La niebla en la banda, con tinta al 25 % en el horizonte, se ve bastante clara al amanecer. Hay que validarlo contra la silueta real.
- Hay que medir el costo de fbm 4 octavas × 2 capas + lluvia (A8) en el iPhone. El gobernador nivel 2 ya reduce la lluvia a la mitad.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Offsets acumulados en vez de `wrapTime(simTime · drift)`**
- **Found during:** Task 1
- **Issue:** con la fórmula del plan, interpolar la velocidad del viento cambia `simTime · drift` en cientos de px (simTime llega a 420 s), y las nubes saltan en cada cambio de viento.
- **Fix:** `pos = wrapTime(pos + dt · driftInterpolado, PERIOD)`. El valor inicial sigue dependiendo del reloj (`simTime · drift`) para el remontaje.
- **Commit:** 8f59690

**2. [Rule 1 - Bug] Capa lejana con offset propio**
- **Found during:** Task 1
- **Issue:** usar "el 60 % del offset" envuelto produce un salto de 0,6 × 1536 px cada vez que el offset principal se envuelve.
- **Fix:** `uCloudOffset` es un `vec2` (cerca, lejos) y cada componente se acumula y se envuelve por separado.
- **Commit:** 8f59690

**3. [Rule 2 - Correctness] Niebla sin capa sobre el contenido**
- **Found during:** Task 1
- **Issue:** el borde ondulado de la bruma podía meter alfa de tinta en la zona de contenido y, sumado al velo, superar +0,01 de L.
- **Fix:** el alfa de la bruma se multiplica por `(1 − wContent)`, así que sobre el contenido solo queda el velo de 0,008.
- **Commit:** 8f59690

**4. Detalle de unidades:** el ruido y los offsets van en px CSS (`p / uScale`) y no en px de buffer, para que el tamaño de las nubes no dependa de la escala del buffer (0,5 o 0,75). El comportamiento es equivalente.

## Threat Flags

Ninguno. Las densidades están acotadas: `uRain` ≤ 1 y ≈151 trazos como máximo, el fbm tiene 4 octavas fijas sin bucles que dependan de datos, y en el nivel 2 la lluvia baja a ×0,5 (T-03-11). Todas las capas de clima van antes del clamp LMAX, con alfa de lluvia ≤ 0,18 y velo ≤ +0,01 sobre el contenido (T-03-12).

## Known Stubs

Ninguno.

## Self-Check: PASSED

- components/client/sky/shader.ts: FOUND (uCover, uCloudOffset, uFog, uFogOffset, fbm, uRain, uRainTilt, uRainOffset)
- components/client/sky/renderer.ts: FOUND (skyParams(, wrapTime( de los offsets, rama de quality para la lluvia)
- Commits 8f59690 y 2e223ce: FOUND
