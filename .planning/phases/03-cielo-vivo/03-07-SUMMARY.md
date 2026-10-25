# 03-07 — Gate, revisión de escritorio y deploy (borrador: falta Task 3)

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
