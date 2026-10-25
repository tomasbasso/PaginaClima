---
phase: 03-cielo-vivo
plan: 07
subsystem: sky
tags: [gate, validation, contrast, deploy, vercel, preview]
requires:
  - phase: 03-01
    provides: paleta, astros, smoke con --expect-html/--reject-html
  - phase: 03-06
    provides: relámpagos seguros y FORZAR RELÁMPAGO en /dev/sky
provides:
  - 03-VALIDATION.md completo (nyquist_compliant true, wave_0_complete true)
  - Revisión de escritorio de los 11 presets con luminancia medida por píxel
  - Borde de la banda medido con getBoundingClientRect y rampa del clamp dentro de la banda (fix 292db10)
  - Cielo vivo en producción (2409946, gru1) y build de preview en la rama preview/cielo-vivo
affects: [03-08]
tech-stack:
  added: []
  patterns:
    - "Luminancia de la zona de contenido medida por píxel con readPixels, pasada a lineal con la fórmula sRGB exacta"
    - "Rama de preview con un commit vacío propio cuando el SHA ya se desplegó en producción (Vercel no rearma el mismo SHA)"
key-files:
  created: []
  modified:
    - components/client/sky/renderer.ts
    - components/client/sky/shader.ts
    - .planning/phases/03-cielo-vivo/03-VALIDATION.md
    - .planning/phases/03-cielo-vivo/03-07-SUMMARY.md
key-decisions:
  - "El borde de la banda se mide con getBoundingClientRect().top y no como alto de caja − alto de banda; la rampa de 24 px del clamp va dentro de la banda"
  - "La rama preview/cielo-vivo lleva un commit vacío (aa99c5e, mismo árbol que 2409946), porque Vercel no arma un preview para un SHA que ya desplegó en producción"
requirements-completed: []
duration: ~2 h (incluye la revisión de escritorio del orquestador)
completed: 2026-10-24
---

# Phase 3 Plan 07: Gate, revisión de escritorio y deploy Summary

**Gate completo en verde (532 tests, chunk del cielo de 10 985 B gzip). Los 11 presets de /dev/sky quedan en L ≤ 0,0737 en la zona de contenido y 0,0835 en el pico del relámpago, después de corregir el borde de la banda. El cielo vivo está en producción (2409946, gru1, /dev/* en 404) y hay un build de preview en `preview/cielo-vivo` para el iPhone.**

## Gate automatizado

Hubo dos pasadas: la del Task 1 (7c2c354) y la que se volvió a correr antes del push, porque 292db10 tocó el renderer y el shader. Las dos salieron con exit 0.

| Chequeo | Task 1 (7c2c354) | Antes del push (2409946) |
|---------|------------------|--------------------------|
| `npm test` | 532/532 | 532/532 (28 archivos) |
| `npm run typecheck` | OK | OK |
| `npm run lint` | OK | OK |
| `npm run build` | OK | OK |
| Chunk con `uBandTop` (≤ 20 480 B gzip) | 10 965 B | `.next/static/chunks/18ix884q76-uo.js`: **10 985 B** |
| grep de three/pixi/ogl/@react-three | vacío | vacío |
| Smoke local `--start` (puerto 3107) | exit 0 | exit 0: `/` trae `data-sky-weather`, `data-sky-band` y `data-sky-root` sin `<canvas`; `/pronostico`, `/dev/sky` y `/dev/estados` traen su contenido |

## Revisión de escritorio

Navegador integrado (Chromium del panel Browser), `npx next start -p 3107` con el build de producción, viewport 1400×1000 para los 3 cuadros y 375×812 para la home. Escala 0,5× (buffer 195×422 sobre un cuadro de 390×844).

**Método de luminancia:** el canvas usa `preserveDrawingBuffer: false`, y en el panel el rAF no corre si la ventana no está a la vista. Por eso se envolvió `getContext` para forzar `preserveDrawingBuffer: true` antes de remontar el renderer (cambio de ESCALA). El shader es el mismo; solo cambia que el buffer queda legible después del frame. Se leyó el buffer completo con `readPixels`, se pasó de sRGB a lineal con la fórmula exacta y se calcularon tres valores sobre la zona de contenido (de arriba hasta el borde de `[data-sky-band]` medido):
- **grilla:** máximo en la grilla de 12×12 del plan.
- **máx.:** máximo sobre todos los píxeles.
- **p99,9:** percentil 99,9, para separar las estrellas, que son la excepción C-4.

**Coherente** significa: el cuadro CANVAS tiene `<canvas>` con opacity 1, los 3 cuadros comparten token y clima, y la lectura marca entre 25 y 31 FPS con CALIDAD 1. En todos los presets la lectura fue `31 FPS · 0,1 MS POR FRAME · CALIDAD 1`.

**Hallazgo corregido (FALLA → OK, commit 292db10).** La primera pasada midió L 0,111 en Siesta y 0,118 en el pico del relámpago de Tormenta de noche, en una franja de unos 23 px CSS justo arriba de la banda. Tenía dos causas:
1. El renderer calculaba el borde de la banda como `alto de la caja − alto de la banda`, pero en los cuadros de `/dev/sky` la banda sobresale 23 px por abajo de la caja.
2. La rampa de 24 px del clamp estaba dentro de la zona de contenido.

Ahora el borde se mide directo con `getBoundingClientRect().top` y la rampa queda dentro de la banda. Las mediciones de la tabla son posteriores al fix. En la home la banda no sobresale (overhang 0), así que ahí el error no se notaba, pero la rampa sí afectaba.

| Preset | URL | Cuadros coherentes | L máx. contenido | Notas |
|--------|-----|--------------------|------------------|-------|
| Noche estrellada | /dev/sky?alt=-30&lado=tarde&clima=despejado&viento=6&wmo=0&escala=0.5 | OK (noche/despejado ×3) | grilla 0,0116 (p99 de la grilla 0,0117) | El máx. por píxel (0,43) y el p99,9 (0,16) son estrellas, la excepción C-4 que va después del clamp. El fondo queda en ≈0,012 |
| Amanecer | /dev/sky?alt=-2&lado=mañana&clima=despejado&viento=8&escala=0.5 | OK (amanecer/despejado ×3) | 0,0524 | — |
| Siesta | /dev/sky?alt=60&lado=tarde&clima=despejado&viento=14&escala=0.5 | OK (dia/despejado ×3) | 0,0733 | Antes del fix daba 0,111 en el borde de la banda |
| Día nublado | /dev/sky?alt=35&lado=tarde&clima=cubierto&viento=20&wmo=3&escala=0.5 | OK (cubierto/cubierto ×3) | 0,0527 | — |
| Atardecer | /dev/sky?alt=2&lado=tarde&clima=despejado&viento=10&wmo=1&escala=0.5 | OK (atardecer/despejado ×3) | 0,0392 | — |
| Lluvia de día | /dev/sky?alt=30&lado=tarde&clima=lluvia&viento=25&wmo=63&escala=0.5 | OK (cubierto/lluvia ×3) | 0,0732 | Lluvia inclinada visible |
| Llovizna al atardecer | /dev/sky?alt=-1&lado=tarde&clima=lluvia&viento=12&wmo=51&escala=0.5 | OK (cubierto/lluvia ×3) | 0,0736 | — |
| Tormenta de noche | /dev/sky?alt=-25&lado=tarde&clima=tormenta&viento=50&wmo=95&escala=0.5 | OK (tormenta/tormenta ×3) | 0,0732 sin relámpago; **0,0835** en el pico (4 relámpagos forzados, 16 muestras cada 25 ms) | ≤ 0,101 (C-5). Antes del fix daba 0,118 |
| Tormenta de día | /dev/sky?alt=40&lado=tarde&clima=tormenta&viento=60&wmo=99&escala=0.5 | OK (tormenta/tormenta ×3) | 0,0737 | — |
| Niebla al amanecer | /dev/sky?alt=1&lado=mañana&clima=niebla&viento=0&wmo=45&escala=0.5 | OK (cubierto/niebla ×3) | 0,0632 | — |
| Noche nublada | /dev/sky?alt=-25&lado=tarde&clima=cubierto&viento=15&escala=0.5 | OK (noche/cubierto ×3) | 0,0213 | — |
| Reducir movimiento | Lluvia de día con `matchMedia('(prefers-reduced-motion: reduce)')` forzado + remontaje | OK | — | Canvas con opacity 1 a los 150 ms (sin fundido). Hash del buffer igual a 2 s de distancia en CANVAS y en ESTÁTICO. FORZAR RELÁMPAGO no cambia el buffer. La lectura queda en 0 FPS. El molino con la preferencia real del sistema se revisa en el iPhone (03-08) |
| Sin WebGL | Lluvia de día con `getContext('webgl'/'webgl2')` → null + remontaje | OK | — | Aparece `ESTE NAVEGADOR NO TIENE WEBGL. SE VE EL FALLBACK.`, no hay canvas y `.sky-layer` queda con opacity 1 y `data-sky-weather="lluvia"` |
| Home | / y /pronostico a 375×812 | OK | — | Exactamente 1 `<canvas>` en cada página. En la home la banda mide 168 px, arranca en 588 y no sobresale de la caja (756) |

**Límites de este entorno (no son FALLA):** con el panel del navegador oculto, el rAF baja a ~1/s y el gobernador cae a CALIDAD 3, porque `document.visibilityState` sigue en `visible`. Con el panel a la vista la lectura es 31 FPS / CALIDAD 1. En el iPhone una pestaña en segundo plano dispara `visibilitychange`, así que esto no aplica, pero conviene confirmarlo en 03-08. Los FPS de escritorio no dicen nada del iPhone.

## Producción

PROD_URL: https://clima-winifreda.vercel.app

- Push: `git push origin main` (sin --force), `2ae5eaa..2409946`. `git merge-base --is-ancestor HEAD origin/main` sale con 0.
- Commit desplegado: **2409946**. Región: **gru1**.
- `node scripts/smoke.mjs https://clima-winifreda.vercel.app --expect-region gru1 --expect-commit 2409946 --expect-404 /dev/sky --expect-404 /dev/estados` sale con exit 0. Hubo que esperar el deploy: el primer intento todavía veía 2ae5eaa. Resultados: `/` 200 con "Winifreda", commit = 2409946, `fetchedAt` estable, `now.tempC = 13.7`, region = gru1, `/dev/sky` 404, `/dev/estados` 404.
- La home de producción trae `data-sky-weather="cubierto"` y `data-sky-band`. También aparece `data-sky-weather="despejado"`, que corresponde a otro nodo del SSR. `/pronostico` responde 200.

## Preview para el iPhone

- Rama: `preview/cielo-vivo`. Primero se publicó 2409946, pero Vercel no armó un preview para ese SHA porque ya estaba desplegado en producción: el commit tiene un solo status de Vercel. Por eso se publicó en la rama, y solo en la rama, un commit vacío: **aa99c5e** (mismo árbol que 2409946, main no se movió). Vercel lo desplegó con status `success` ("Deployment has completed").
- Deploy en el dashboard: https://vercel.com/tomibasso99-4456s-projects/clima-winifreda/BwPzY1Y51TJ4fTzJe5yaj7LNxynd
- PREVIEW_URL: PENDIENTE. En esta sesión no se pudo leer el dominio `*.vercel.app` del deploy: no está `gh`, el Vercel CLI no está logueado (arranca el device login) y la integración de Git de Vercel no crea GitHub Deployments (`/deployments?ref=preview/cielo-vivo` vuelve vacío). El alias de rama `clima-winifreda-git-preview-cielo-vivo-tomibasso99-4456s-projects.vercel.app` pasa los 63 caracteres y no resuelve. Hay que sacarlo con Vercel MCP (deploy `BwPzY1Y51TJ4fTzJe5yaj7LNxynd`) o del dashboard.
- Código HTTP de `$PREVIEW_URL/dev/sky`: PENDIENTE, se mide cuando se tenga la URL. Lo esperado es 200, o 401 si el preview tiene Vercel Authentication.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Borde de la banda y rampa del clamp (C-1/C-5)**
- **Found during:** Task 2
- **Issue:** el borde se calculaba como alto de caja − alto de banda, y en /dev/sky la banda sobresale 23 px. Además, la rampa de 24 px quedaba dentro de la zona de contenido. Se midió L 0,111 en Siesta y 0,118 en el pico del relámpago.
- **Fix:** el borde se mide con `getBoundingClientRect().top` y la rampa queda dentro de la banda.
- **Files modified:** components/client/sky/renderer.ts, components/client/sky/shader.ts
- **Commit:** 292db10

**2. [Rule 3 - Blocking] Vercel no arma un preview para un SHA ya desplegado**
- **Found during:** Task 3
- **Issue:** el push de 2409946 a `preview/cielo-vivo` no disparó ningún build de preview.
- **Fix:** se publicó en la rama de preview, y solo ahí, un commit vacío aa99c5e (mismo árbol). Main no cambió.
- **Commit:** aa99c5e (solo en origin/preview/cielo-vivo)

### Bloqueo parcial

- PREVIEW_URL y su código HTTP quedan pendientes porque no hay credenciales de Vercel ni `gh` en esta sesión (ver arriba). El build del preview está listo; lo único que falta es leer su dominio.

## Next Phase Readiness

- 03-08 (iPhone real): cuando se tenga el dominio del preview, se abre `/dev/sky` en el iPhone. Ahí se revisan fluidez, pausa en segundo plano, temperatura, el molino con reducir movimiento real y la confirmación de `visibilitychange`.

## Self-Check: PASSED

Commits 7c2c354, 292db10, 2409946 y aa99c5e existen. 03-VALIDATION.md y este SUMMARY existen. Quedan pendientes PREVIEW_URL y su código HTTP (bloqueo parcial, ver arriba).
