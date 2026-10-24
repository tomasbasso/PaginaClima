---
phase: 3
slug: cielo-vivo
status: approved
reviewed_at: 2026-10-24
shadcn_initialized: false
preset: none
created: 2026-10-24
---

# Fase 3 — Contrato de diseño de UI (Cielo vivo)

> Contrato visual y de interacción de la fase 3. Lo generó gsd-ui-researcher en modo autónomo (sin preguntas al usuario) y lo verifica gsd-ui-checker.
> Fuentes: `01-UI-SPEC.md` (tokens `data-sky`, regla de contraste estructural, "Contrato con la fase 3": **se extiende, no se contradice**), `02-UI-SPEC.md` (refactor de `Hero`, variante `compact`, `--band-h`), `03-CONTEXT.md` (D-01…D-14, aceptadas y bloqueadas), `design/stitch/DESIGN.md` y capturas, y el código actual (`SkyBackdrop.tsx`, `PampaHorizon.tsx`, `Hero.tsx`, `lib/sky/*`, `app/globals.css`, `app/dev/estados`).
> Todo lo que fijaron las fases 1 y 2 (tipografía, tinta, radio 0, sin sombras, sin emojis, acento por token, foco, layout de Ahora, meteograma y diario) **sigue vigente**. Este documento solo declara lo nuevo.
> **Agnóstico de técnica:** la técnica de render (WebGL2 a mano, `ogl` o Canvas 2D) la decide 03-RESEARCH. Este contrato describe qué se ve, cuánto se mueve y qué límites no se pueden cruzar; cualquier técnica que los cumpla es válida.
> Las decisiones que tomó este UI-SPEC por su cuenta están marcadas **[default]**.

---

## Alcance visual de la fase 3

| Entra en la fase 3 | Queda afuera |
|--------------------|--------------|
| Cielo generativo animado dentro de la caja del cielo de `Hero` (`full` y `compact`), guiado por `sunAltitude` continuo y por el clima (SKY-01, SKY-02) | Estaciones, luna llena, eclipses como eventos (SKY-07, v2) |
| Capas: gradiente, resplandor del sol / luna cerca del horizonte, estrellas, nubes, lluvia, niebla, relámpagos, grano | Disco del sol de día, disco y fase lunar dibujados (fase 5, ASTRO-02) |
| Rotor del molino que gira según el viento; contraluz de relámpagos detrás de la silueta (D-13) | Parallax o animación del resto de la silueta |
| Frame estático con "reducir movimiento" y fallback CSS sin WebGL que representa hora **y** clima (SKY-05) | Cielo como fondo fijo de toda la app (descartado, D-10) |
| Presupuesto de rendimiento: 30 fps, pausas, resolución reducida, gobernador de calidad (SKY-06) | PWA / offline (fase 6) |
| `/dev/sky` (solo dev) para forzar todos los estados (criterio 1) | Copy nueva para el usuario final: no hay |

---

## Design System

| Propiedad | Valor |
|-----------|-------|
| Tool | none (igual que las fases 1 y 2). Tokens en `@theme` / `:root` de `app/globals.css` |
| Preset | not applicable |
| Component library | none. Render del cielo: la técnica que elija 03-RESEARCH dentro de `CLAUDE.md` (WebGL2 a mano u `ogl`, o Canvas 2D). **Prohibido** three.js, R3F y Pixi |
| Icon library | none. La fase 3 no agrega íconos. **Nada de objetos tipo clipart en el cielo** (D-04): ni rayo dibujado como zigzag, ni nubes con contorno, ni sol con rayos, ni gotas con forma |
| Font | Playfair Display + Plus Jakarta Sans, sin cambios |

**Diferencia con la captura `home-tormenta.png`:** la captura dibuja un rayo en zigzag que cruza el texto. **No se implementa así.** El relámpago es un aclarado difuso del fondo, sobre todo en la banda del horizonte (D-07, D-13), sin trazo visible y nunca encima del contenido. La lluvia diagonal en trazos finos de esa captura sí es la referencia.

### Contrato del componente (D-01)

```ts
// lib/sky/state.ts — se extiende con campos OPCIONALES, los llamadores actuales no cambian
type SkyState = {
  phase: SolarPhase            // sin cambios: alimenta el token del fallback y el acento
  weather: SkyWeather          // sin cambios
  sunAltitude: number          // grados, sin cambios: guía el color continuo (D-06)
  intensity?: number           // 0–1, nuevo: densidad de lluvia / nubes / frecuencia de relámpagos
  windKmh?: number | null      // nuevo: deriva de nubes, inclinación de la lluvia, molino
  windDirDeg?: number | null   // nuevo: sentido de la deriva (componente este-oeste)
  cloudCover?: number | null   // 0–100, nuevo y opcional (D-08: lo decide el planner)
}
```

- `<SkyBackdrop state={sky} live />` sigue siendo el único punto de entrada. Adentro: la capa CSS existente (fallback, siempre montada) y, encima, el canvas (cargado con import dinámico, solo cliente).
- `skyToken()`, `data-sky`, `--accent` y la sincronización con `<html>` / `<main>` **no cambian**. El acento sigue siendo discreto (por token), aunque el cielo sea continuo.
- Si faltan los campos opcionales, se usan los valores medios de la tabla "Intensidad" (D-08).

---

## Spacing Scale

Misma escala que las fases 1 y 2 (múltiplos de 4). La fase 3 **no cambia ningún layout de producción**: la caja del cielo, `--band-h`, la banda compacta de 120 px y la silueta de 120 px quedan como están.

| Token | Valor | Uso nuevo en la fase 3 (solo `/dev/sky`) |
|-------|-------|-------------------------------------------|
| xs | 4px | Etiqueta del control ↔ valor numérico en la misma línea |
| sm | 8px | Etiqueta ↔ control, entre botones de un grupo |
| md | 16px | Entre filas de controles, pie de cada cuadro (leyenda ↔ cuadro) |
| lg | 24px | Padding de la página |
| xl | 32px | Entre los tres cuadros, panel de controles ↔ cuadros |
| 2xl | 48px | Entre la sección de cuadros y la de presets |
| 3xl | 64px | Sin uso |

Excepciones (justificadas):
- **Cuadros de `/dev/sky`:** 390 × 844 px fijos (mismo tamaño que `/dev/estados`), para revisar al tamaño real del iPhone.
- **Botones de `/dev/sky`:** 44 px de alto (mínimo táctil, igual que "Reintentar").
- **Geometría del cielo** (tamaño de estrellas, largo de los trazos de lluvia, radios de resplandor): son parámetros visuales, no espaciado de layout. Sus valores están en "Capas del cielo".

---

## Typography

Sin tamaños ni pesos nuevos. El cielo no lleva texto.

| Rol | Tamaño | Peso | Line height | Uso en la fase 3 |
|-----|--------|------|-------------|------------------|
| Body | 15px | 400 | 1.6 | Valores de los controles y lectura de rendimiento en `/dev/sky` |
| Label | 12px | 600 | 1.33 | Títulos de los controles, leyendas de los cuadros, texto de los botones (mayúsculas, 0.14em) |
| Headline / Heading / Display | 32 / 24 / 112 | 400 | — | Sin uso nuevo. Se ven en los cuadros de `/dev/sky` porque se monta `Ahora` encima del cielo para revisar contraste |

`/dev/sky` usa **solo 2 tamaños (15 y 12) y 2 pesos (400 y 600)**.

---

## Color

El 60/30/10 de la fase 1 se mantiene. Lo que cambia es que el **dominante (el cielo) pasa de 6 gradientes fijos a una función continua** de `sunAltitude` y del clima, que tiene que converger con esos 6 gradientes.

| Rol | Valor | Uso |
|-----|-------|-----|
| Dominante (60 %) | `skyPalette(sunAltitude, weather, …)` → S1…S5 continuos (tabla de anclas abajo) | Caja del cielo de `Hero` (home, `/pronostico`, loading, error) |
| Secundario (30 %) | `#0e131c` ground · `#0f141d` silhouette · `#090e17` bar | Sin cambios |
| Acento (10 %) | `--accent` por token (azure / sun / storm) | Sin cambios: la lista cerrada de las fases 1 y 2. **El cielo no usa el acento** |
| Tinta del cielo | `#fbfbf2` (ink) con alfa bajo | Estrellas, trazos de lluvia, brillo de nubes. Es luz del cielo, no texto |
| Destructivo | no aplica | La fase 3 no tiene acciones |

**El acento se reserva para** (lista cerrada, sin cambios): pestaña activa, rombo del estado, anillo de foco, borde de botones en hover/focus, rombo del meteograma. **Ni el cielo, ni el molino, ni los controles de `/dev/sky` usan acento** (los controles usan ink).

### Regla de contraste estructural (D-03, SKY-04): límites duros

La caja del cielo se divide igual que en la fase 1: **zona de contenido** (desde arriba hasta el borde superior de la banda) y **banda del horizonte** (`--band-h`, o 120 px en `compact`). El renderer lee esas dos medidas del layout real (alto de la caja − alto de la banda) y las recalcula en cada resize. **Nunca supone 844 px.**

| Regla | Límite | Cómo se verifica |
|-------|--------|------------------|
| C-1 Luminancia de la zona de contenido | Luminancia relativa WCAG **≤ 0,075** en todo píxel de la zona de contenido (lo mismo que S3 de `dia`, `#284f75` ≈ 0,073), con todas las capas compuestas. **El clamp tiene precedencia sobre las capas aditivas** (halo de luna, velo de niebla): sus incrementos solo se ven donde la base queda por debajo del tope. Excepciones: estrellas (C-4) y relámpago (C-5) | Test de Vitest sobre la función pura `skyPalette` (barrido de `sunAltitude` de −20° a +70° cada 0,5° × los 5 climas) + **clamp final de luminancia** en el renderer para la zona de contenido, más una transición de 24 px en el borde de la banda para que el clamp no deje una línea |
| C-2 Interpolación | Los colores se mezclan en **RGB lineal** (no en sRGB ni HSL). Así la luminancia de una mezcla nunca supera la del extremo más claro, y C-1 se cumple por construcción | Test |
| C-3 Banda del horizonte | Sin límite de claridad (ahí viven S4/S5, el resplandor del sol, la niebla). No lleva texto | — |
| C-4 Estrellas | Puntos de ≤ 1,5 px CSS, alfa máx. 0,6 en ink. Densidad baja (ver "Capas"). No se exige dejar libre el área del texto: el límite son el alfa y el tamaño | Revisión visual en `/dev/sky` |
| C-5 Relámpago | En el pico: zona de contenido **≤ 0,10** de luminancia absoluta; en cualquier píxel, el aumento de luminancia es **< 0,08** (por debajo del umbral de "destello general" de WCAG 2.3.1, que es una variación ≥ 10 %). Ver "Relámpagos" | Test sobre la envolvente + `/dev/sky` con "Forzar relámpago" |
| C-6 Texto | ink/75 sobre el peor caso de C-1 da ≈ 5,4:1 (fase 1). En el pico de C-5 sigue ≥ 4,5:1 sobre los fondos de `tormenta` (S1–S3 con L ≤ 0,03 de base) | Medición con el cuentagotas en `/dev/sky` (cuadro "Canvas", relámpago forzado y congelado en el pico) |

### Anclas de color (convergencia con el fallback, D-02 / D-06)

`skyPalette` es una función pura (`lib/sky/palette.ts`, con tests) que devuelve S1…S5. Para cielo **despejado**, entre anclas se interpola en RGB lineal con `smoothstep` sobre la altura:

| `sunAltitude` | Paleta exacta (S1…S5 = filas de la tabla de la fase 1) |
|---------------|--------------------------------------------------------|
| ≤ −12° | `noche` |
| −12° → 0° | mezcla `noche` → crepúsculo |
| 0° | crepúsculo: `amanecer` antes del mediodía solar, `atardecer` después |
| 0° → +15° | mezcla crepúsculo → `dia` |
| ≥ +15° | `dia` |

- **[default]** Las anclas en −12° / 0° / +15° (y no en los ±6° del fallback) hacen que el cielo cambie en todo el crepúsculo civil y náutico, no de golpe. En ±6° el fallback cambia de token mientras el canvas está en una mezcla del 50 %: es aceptable, porque el canvas tapa al fallback.
- **Tolerancia de convergencia:** en las anclas, el promedio de una fila horizontal del canvas en la posición de cada parada (0 %, 40 % y 100 % de la zona de contenido; 60 % y 100 % de la banda), sin nubes ni grano, queda a **±12 por canal sRGB** del valor de la tabla. Así el fundido de entrada del canvas sobre el fallback no se ve como un salto.

**Clima (se aplica sobre la paleta despejada):**

| Clima | Contrato de color |
|-------|-------------------|
| despejado | Paleta despejada tal cual |
| cubierto / lluvia | De día y en el crepúsculo: mezcla hacia la fila `cubierto` con peso 0,85 (cubierto) o 0,9 (lluvia), así queda un rastro cálido en la banda al atardecer. De noche (≤ −12°): `noche` sin estrellas y con nubes apenas más claras que el fondo (+0,01 de L como máximo). Con `sunAltitude ≥ +15°` converge a la fila `cubierto` dentro de la tolerancia |
| tormenta | Fila `tormenta` a cualquier hora (igual que el fallback). De noche (≤ −12°) se oscurece hacia S1 de `noche` con peso 0,5 **[default]** |
| niebla | Paleta del momento desaturada un 60 % hacia gris (`#7d8894` en la banda) **[default]**. La niebla en sí es una capa (ver abajo) |

**Resplandores (sol y luna):**
- **Posición horizontal** (mirando al norte, porque en Winifreda el sol pasa por el norte): x = 0,5 + 0,4 · sin(azimut desde el norte, sentido horario), entre 10 % y 90 % del ancho. El sol sale a la derecha (≈ 90 %) y se pone a la izquierda (≈ 10 %). La convención de azimut de suncalc 2.1.1 se verifica en la investigación y se convierte en `lib/sky/`.
- **Sol:** visible solo entre −8° y +12°, intensidad máxima en 0°. Es un resplandor radial centrado en la línea del horizonte, en `sun` (`#f4c06a`) hacia S5, de radio horizontal ≤ 60 % del ancho y radio vertical ≤ alto de la banda. **Sin disco** (D-05). Lo que se derrame hacia la zona de contenido queda bajo C-1.
- **Luna:** solo si su altura es > 0° y el cielo es despejado o algo nublado (código 2). Halo radial muy suave en ink, intensidad proporcional a la fracción iluminada de `getMoonIllumination()`, con un aumento de L ≤ 0,02 en la zona de contenido. Altura en pantalla: proporcional a la altura de la luna (0° = horizonte, 45°+ = 30 % desde arriba). Sin disco ni fase dibujada (fase 5).

---

## Capas del cielo (de atrás hacia adelante)

Valores para un cuadro de 390 × 844 CSS px; se escalan con el área.

| # | Capa | Cuándo | Contrato visual |
|---|------|--------|-----------------|
| 1 | Gradiente | Siempre | S1 (0 %) → S2 (40 %) → S3 (borde superior de la banda) → S4 (60 % de la banda) → S5 (horizonte), igual que `.sky-layer`. Debajo del horizonte, `#0e131c` |
| 2 | Resplandor de sol / luna | Ver "Resplandores" | Radial, sin bordes, sin disco |
| 3 | Estrellas | Despejado (códigos 0–1) con `sunAltitude < −6°`; aparecen en fundido entre −6° y −12°. Con código 2, la mitad | 80–120 estrellas, ≤ 1,5 px, alfa 0,2–0,6, más densas arriba (70 % en la mitad superior). **Titileo:** variación de brillo de ±25 % con períodos aleatorios de 3–7 s, desfasados. Nada de estrellas fugaces |
| 4 | Nubes | Según cobertura (tabla "Intensidad") | Campos de ruido suaves, sin contorno. En la zona de contenido son iguales o más oscuras que S3 (bajo C-1). En el crepúsculo, la parte baja de las nubes de la banda toma los tonos de S4/S5 (luz desde abajo). **Deriva:** horizontal, velocidad = 4 + 0,15 · `windKmh` px/s, con tope de 12 px/s (sin dato: 6 px/s). Sentido según la componente este-oeste del viento (viento del oeste → hacia la derecha); sin dato, hacia la derecha |
| 5 | Niebla | `weather = niebla` | Bruma baja: banda de ink al 10–25 % que sube desde el horizonte hasta el borde superior de la banda y se desvanece; detrás de la silueta (la silueta queda nítida y adelante). Sobre la zona de contenido solo un velo ≤ +0,01 de L. Ondula muy lento (deriva ≤ 3 px/s). **Nunca** una capa delante del texto (D-13) |
| 6 | Lluvia | `lluvia` y `tormenta` | Trazos rectos finos: 1 px CSS de ancho, 12–24 px de largo, alfa 0,10–0,25 en ink (≤ 0,18 en la zona de contenido). Caen a 400–600 px/s. **Inclinación:** 8° desde la vertical + hasta 12° más según `windKmh` (tope 20°), hacia el lado al que va el viento. **Densidad:** hasta 160 trazos visibles a intensidad 1, proporcional a `intensity` |
| 7 | Relámpago | Solo `tormenta` | Ver "Relámpagos" |
| 8 | Grano | Siempre | Ruido fino de ±1,5 % de luminancia, **fijo** (no cambia por frame), solo para evitar el banding del gradiente en pantallas de 8 bits |

### Intensidad (D-08)

| Dato | Cómo modula |
|------|-------------|
| Código WMO → `intensity` base | 51, 53: 0,25 · 55, 56, 57: 0,4 · 61, 80: 0,5 · 63, 66, 81: 0,7 · 65, 67, 82: 1,0 · 95: 0,8 · 96, 99: 1,0 |
| `precipMm` | `intensity = max(base, min(1, precipMm / 6))` |
| Sin dato | lluvia 0,6 · tormenta 0,8 |
| Cobertura de nubes | Con `cloudCover`: `cloudCover / 100`. Sin él: código 0 → 0; 1 → 0,15; 2 → 0,4; cubierto 0,85; lluvia 0,9; tormenta 0,95; niebla 0,3 (nubes altas tenues detrás de la bruma) |

La función que arma estos números es pura (`lib/sky/`), con tests.

### Relámpagos (D-07, WCAG 2.3.1)

| Parámetro | Valor |
|-----------|-------|
| Intervalo entre eventos | Aleatorio, **8–16 s** a `intensity` 1 y 12–24 s a 0,5 **[default]** |
| Pulsos por evento | 1 o 2 (el segundo, 150–250 ms después del primero, al 60 % de intensidad) |
| Envolvente de cada pulso | Subida de 40 ms, bajada exponencial de 300–500 ms. Nunca un corte cuadrado de blanco |
| Frecuencia máxima | **≤ 2 pulsos en cualquier ventana de 1 s** (WCAG pide ≤ 3) |
| Amplitud | Aumento de luminancia < 0,08 en cualquier píxel; zona de contenido ≤ 0,10 en el pico (C-5) |
| Dónde | Aclarado difuso centrado en un punto aleatorio de la **banda** (x entre 15 % y 85 %), que se derrama hacia arriba con caída suave. Las nubes de esa zona se aclaran (luz desde adentro). La silueta queda en contraluz (D-13) |
| Color | Hacia `#b9b7f0` (storm) mezclado con ink, no blanco puro |
| Lo que no hay | Rayo dibujado, flash de pantalla completa, trueno, vibración |
| Reducir movimiento | Sin relámpagos |

### Movimiento: presupuesto (D-07)

| Elemento | Se mueve | Velocidad máxima |
|----------|----------|------------------|
| Gradiente y resplandores | Solo con el cambio real de `sunAltitude` (≈ 0,25°/min) | Imperceptible |
| Nubes | Deriva | 12 px/s |
| Niebla | Ondulación | 3 px/s |
| Estrellas | Titileo | ±25 %, períodos de 3–7 s |
| Lluvia | Caída | 600 px/s, alfa ≤ 0,18 sobre el contenido |
| Relámpago | Pulsos | ver tabla |
| Grano | No | — |
| Molino | Rotación | ver "Molino" |

Nada se mueve en respuesta al scroll, al toque ni al giroscopio. No hay parallax.

### Transiciones

| Evento | Comportamiento |
|--------|----------------|
| Primer frame del canvas | El fallback CSS se ve desde el SSR. Cuando el canvas dibuja su primer frame, aparece con un **fundido de opacidad de 600 ms ease-out**. Sin flash, sin salto de layout. Con reducir movimiento: aparece sin fundido |
| `sunAltitude` nuevo (cada 60 s, como hoy) | Los parámetros se interpolan en 1500 ms. Sin crossfade de capas |
| Cambio de clima (por `router.refresh()`) | Los parámetros del clima (paleta, cobertura, densidad de lluvia, niebla) se interpolan en **2000 ms ease-in-out**. La lluvia aparece o se va por densidad, no de golpe |
| Remontaje (navegar entre `/` y `/pronostico`, `loading.tsx` → página, `error.tsx`) | El canvas nuevo arranca con el fundido de entrada sobre el fallback. El tiempo de la animación arranca en un valor que depende de la hora (no en 0), así las nubes no "saltan al inicio" en cada navegación |
| Contexto WebGL perdido (`webglcontextlost`) o error del renderer | El canvas se oculta (fundido de 300 ms) y queda el fallback. Un solo intento de restaurar; si falla, fallback hasta recargar. **Nunca** rompe la página ni el render de `error.tsx` / `global-error` |

---

## Rendimiento (D-09, SKY-06)

| Regla | Contrato |
|-------|----------|
| Tope de fps | **30 fps** (se descartan los frames de `requestAnimationFrame` que llegan antes de 33,3 ms) |
| Pausa | Se detiene el loop con `visibilitychange` (oculta), `pagehide`, y cuando la caja del cielo sale de pantalla (`IntersectionObserver`, umbral 0, por ejemplo al scrollear al meteograma). Al volver, sigue desde donde estaba, **sin ráfaga de frames de recuperación** |
| Resolución | El buffer del canvas mide el tamaño CSS × **0,5** **[default]**, sin importar el DPR, y se escala con CSS. Se permite subir a 0,75 si en el iPhone la lluvia se ve empastada; **nunca por encima de 1×** |
| Costo por frame | Objetivo: ≤ 8 ms de trabajo por frame en un iPhone de gama media (medido con la lectura de `/dev/sky` y con Safari Web Inspector) |
| Gobernador de calidad **[default]** | Si el promedio móvil del tiempo de frame supera 28 ms durante 2 s seguidos: nivel 2 (sin grano, la mitad de los trazos de lluvia, estrellas sin titileo). Si sigue: nivel 3 (frame estático, como reducir movimiento). No vuelve a subir hasta la próxima carga |
| Peso | El código del cielo va en un chunk aparte, cargado con import dinámico después de la hidratación. Objetivo **≤ 20 KB gzip** **[default]**. No bloquea el primer paint (el fallback CSS ya está) |
| Contextos | Un solo canvas por pantalla en producción |
| Verificación | Checkpoint humano en un iPhone real: varios minutos con la home abierta en cada estado (despejado, lluvia, tormenta), pasar a segundo plano y volver, y comprobar que el teléfono no se calienta. Más la lectura de frame time de `/dev/sky` |

---

## Reducir movimiento y fallback (SKY-05)

| Situación | Qué se ve |
|-----------|-----------|
| WebGL ok, movimiento normal | Canvas animado |
| WebGL ok, `prefers-reduced-motion: reduce` | **Un solo frame estático** del mismo cielo (paleta, resplandores, estrellas sin titileo, nubes quietas, trazos de lluvia congelados, niebla quieta), sin relámpagos. Se vuelve a dibujar solo cuando cambia el estado (cada 60 s o con datos nuevos), sin transición. El cambio de la preferencia se escucha en vivo (`matchMedia(...).addEventListener('change')`) |
| Sin WebGL (o falla al crear el contexto) | El gradiente CSS de los 6 tokens + la **capa de clima estática del fallback** (abajo) |
| JS deshabilitado / antes de hidratar | Igual que sin WebGL |

### Capa de clima del fallback **[default]**

Para que el fallback represente el clima y no solo la hora (criterio 3), `SkyBackdrop` pone `data-sky-weather="<clima>"` (y `data-sky-night` cuando la fase es `noche`) en la capa CSS, y `globals.css` agrega una capa estática, sin animación:

| Condición | Capa CSS |
|-----------|----------|
| `lluvia` / `tormenta` | `repeating-linear-gradient` diagonal (≈ 10° desde la vertical) de trazos de 1 px en ink al 6 %, separados ≈ 12 px, sobre toda la caja |
| `niebla` | Gradiente vertical en la banda: de transparente (borde superior de la banda) a ink al 18 % (horizonte) |
| `despejado` + noche | 20–30 estrellas fijas como `radial-gradient` de 1 px en ink al 50 %, en la mitad superior |
| `cubierto` | Nada extra (ya lo da el token) |

---

## Horizonte pampeano (D-12, D-13)

- `PampaHorizon` sigue siendo SVG plano, `#0f141d`, nítido a cualquier DPR, **por encima** del canvas. El canvas no dibuja la silueta.
- **Molino:** el rotor (las 12 aspas + el cubo, sin la cola) pasa a ser un `<g>` propio que gira alrededor del cubo (`transform-box: fill-box; transform-origin: center`). La cola no gira.

| Viento (`windKmh`) | Rotor |
|--------------------|-------|
| `null`, < 2 km/h (calma) | Quieto |
| ≥ 2 km/h | Gira en sentido horario con un período por vuelta T = clamp(36 / `windKmh`, 1,5 s, 12 s) **[default]**: 5 km/h → 7,2 s; 20 km/h → 1,8 s; ≥ 24 km/h → 1,5 s |
| Reducir movimiento | Quieto, en el ángulo 0 |

  - Implementación con CSS o Web Animations; los cambios de velocidad se aplican con `playbackRate` (o equivalente) para que el rotor **no salte de ángulo**.
  - El valor sale de `SkyState.windKmh` (el mismo dato de Ahora). Si el dato es viejo, igual se usa.
  - En el SSR el rotor está quieto; empieza a girar al hidratar.
- **Relámpagos:** la silueta no cambia de color; el aclarado de la banda que está detrás es lo que la pone en contraluz.
- **Niebla:** la bruma está detrás de la silueta (capa 5 del canvas).

---

## Accesibilidad

- El contenedor del cielo y el canvas son `aria-hidden="true"`, sin foco, sin `role`, con `pointer-events: none`. El cielo no se anuncia.
- El estado del tiempo ya se comunica con texto en Ahora: el cielo es decorativo y nunca es la única vía de información.
- Fotosensibilidad: límites de la tabla "Relámpagos" (≤ 2 pulsos por segundo, ΔL < 0,08, sin rojos saturados).
- Con reducir movimiento: frame estático, sin relámpagos, molino quieto, sin fundidos.
- Contraste: reglas C-1 a C-6.

---

## `/dev/sky` (D-14, solo dev)

Página `app/dev/sky/page.tsx`: `notFound()` cuando `VERCEL_ENV === 'production'`, `robots: { index: false }`, título `Cielo — Clima en Winifreda`. Fondo `ground`, padding 24 px, contenido alineado a la izquierda.

```
CIELO · /dev/sky                                         Label 12/600 ink/75
32px
┌ Controles (ancho máx. 560 px) ─────────────────────────┐
│ ALTURA DEL SOL   [────●────────]  −3,5°   [MAÑANA|TARDE] │
│ ATAJOS  [NOCHE] [AMANECER] [DÍA] [ATARDECER] [AHORA REAL]│
│ CLIMA   [DESPEJADO] [CUBIERTO] [LLUVIA] [TORMENTA] [NIEBLA]│
│ CÓDIGO WMO  [select con la tabla de la fase 1]            │
│ INTENSIDAD  [────●───]  0,6                               │
│ VIENTO      [──●─────]  18 km/h   DIRECCIÓN [select 8 rumbos]│
│ NUBES       [──────●─]  85 %  (o "SEGÚN CÓDIGO")          │
│ [FORZAR RELÁMPAGO] [PAUSAR CIELO] [MOSTRAR CONTENIDO ✓]         │
│ 30 FPS · 6,2 MS POR FRAME · CALIDAD 1                     │  Body 15 ink/75 .nums
└─────────────────────────────────────────────────────────┘
32px
[ CANVAS ]   32   [ ESTÁTICO ]   32   [ FALLBACK CSS ]       3 cuadros 390×844, en fila
leyenda 16px debajo de cada uno                              (con scroll horizontal si no entran)
48px
PRESETS                                                      grilla de botones
```

- **Cuadros:** cada uno es una caja del cielo de `Hero` en variante `full` con `[--band-h:240px] [--bar-h:0px]` (como `/dev/estados`), con la silueta y, si "MOSTRAR CONTENIDO" está activo, `Ahora` con un fixture (titular largo de 34 caracteres + línea de ráfagas) para revisar contraste. El primer cuadro está animado, el segundo es el frame estático (reducir movimiento forzado) y el tercero es el fallback CSS con su capa de clima. Un cuarto cuadro opcional muestra la **banda compacta** (`compact`, 120 px).
- **Máximo 2 contextos WebGL** en la página (canvas + estático). Si el estático necesita otro contexto y la técnica no lo permite, se dibuja una vez y se copia a una imagen.
- **Controles:** `<input type="range">` nativos con `accent-color: #fbfbf2` (ink, no el acento), botones de 44 px con el estilo de "Reintentar" (borde ink/30, Label 12/600 mayúsculas); el botón elegido de un grupo lleva `aria-pressed="true"`, fondo ink/12 y borde ink. Cada grupo es un `<fieldset>` con `<legend>`. Foco con el anillo de la fase 1.
- **Rangos:** altura del sol −20° … +70°, paso 0,5. Intensidad 0 … 1, paso 0,05. Viento 0 … 90 km/h, paso 1. Nubes 0 … 100 %, paso 5.
- **URL:** el estado se refleja en la query (`?alt=-3.5&lado=tarde&clima=tormenta&i=0.8&viento=40&dir=225&wmo=95`), así cada estado se puede compartir y abrir directo. "AHORA REAL" usa `getSolarPhase(new Date())`.
- **Presets** (cubren el criterio 1 del roadmap y los estados nombrados en PROJECT.md):

| Preset | Altura | Clima | Otros |
|--------|--------|-------|-------|
| Noche estrellada | −30° | despejado (WMO 0) | viento 6 |
| Amanecer | −2°, mañana | despejado | viento 8 |
| Siesta | +60° | despejado | viento 14 |
| Día nublado | +35° | cubierto (WMO 3) | viento 20 |
| Atardecer | +2°, tarde | despejado (WMO 1) | viento 10 |
| Lluvia de día | +30° | lluvia (WMO 63) | viento 25 |
| Llovizna al atardecer | −1°, tarde | lluvia (WMO 51) | viento 12 |
| Tormenta de noche | −25° | tormenta (WMO 95) | viento 50 |
| Tormenta de día | +40° | tormenta (WMO 99) | viento 60 |
| Niebla al amanecer | +1°, mañana | niebla (WMO 45) | viento 0 (molino quieto) |
| Noche nublada | −25° | cubierto | viento 15 |

---

## Estados de interacción y de datos

| Superficie | Estado | Qué ve el usuario |
|------------|--------|-------------------|
| Cielo | Normal | Canvas animado según hora y clima |
| Cielo | Antes de hidratar / cargando el chunk | Fallback CSS con capa de clima; después, fundido al canvas |
| Cielo | Sin datos de Ahora (`skyFromSnapshot` con grupo null) | Cielo despejado según la fase solar, intensidad y viento por defecto, molino quieto (igual que la fase 1) |
| Cielo | Dato desactualizado / fuente caída | Se dibuja el último clima conocido. Sin aviso propio (el de Ahora alcanza) |
| Cielo | `loading.tsx`, `error.tsx`, `global-error` | Mismo componente; si el canvas falla, fallback. La página de error nunca depende del canvas |
| Cielo | Pestaña oculta / fuera de pantalla | Loop detenido |
| Cielo | Reducir movimiento | Frame estático |
| Cielo | Sin WebGL / contexto perdido | Fallback CSS con capa de clima |
| Cielo | Rendimiento bajo | Gobernador: nivel 2 y después nivel 3 (estático) |
| Molino | Calma / sin dato / reducir movimiento | Quieto |

---

## Copywriting Contract

La fase 3 **no agrega copy para el usuario final**: el cielo no tiene texto y los estados de datos reusan los de las fases 1 y 2. La única copy nueva es la de `/dev/sky` (solo dev), en castellano rioplatense, sin emojis.

| Elemento | Copy |
|----------|------|
| CTA principal de la fase | no aplica para el usuario final. En `/dev/sky`: **Forzar relámpago** (botón: `FORZAR RELÁMPAGO`) |
| Título / `<title>` de `/dev/sky` | `CIELO · /dev/sky` / `Cielo — Clima en Winifreda` |
| Etiquetas de controles | `ALTURA DEL SOL` · `MAÑANA` / `TARDE` · `ATAJOS` · `CLIMA` · `CÓDIGO WMO` · `INTENSIDAD` · `VIENTO` · `DIRECCIÓN` · `NUBES` (`SEGÚN CÓDIGO` cuando no se fuerza) · `PRESETS` |
| Botones | `NOCHE` · `AMANECER` · `DÍA` · `ATARDECER` · `AHORA REAL` · `DESPEJADO` · `CUBIERTO` · `LLUVIA` · `TORMENTA` · `NIEBLA` · `FORZAR RELÁMPAGO` · `PAUSAR CIELO` / `REANUDAR CIELO` · `MOSTRAR CONTENIDO` |
| Leyendas de los cuadros | `CANVAS` · `ESTÁTICO (REDUCIR MOVIMIENTO)` · `FALLBACK CSS · DATA-SKY {token}` · `BANDA COMPACTA` |
| Lectura de rendimiento | `{n} FPS · {x,x} MS POR FRAME · CALIDAD {1\|2\|3}` |
| Vacío / sin WebGL en `/dev/sky` | En el cuadro `CANVAS`: `ESTE NAVEGADOR NO TIENE WEBGL. SE VE EL FALLBACK.` (Label 12/600 ink/75, centrado, 16 px desde arriba) |
| Error del renderer en `/dev/sky` | `EL CIELO FALLÓ: {mensaje}. SE VE EL FALLBACK.` (mismo estilo; solo dev, para depurar) |
| Estados de datos de producción | Sin cambios (fases 1 y 2) |
| Confirmación destructiva | no aplica: la fase 3 no tiene acciones destructivas |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| ninguno (shadcn no se inicializa) | — | no aplica: sin registries de terceros. Si 03-RESEARCH elige `ogl`, es un paquete npm (no un registry de componentes) y su vetting (versión, sin `postinstall`, peso) va en la investigación |

---

## Resumen de decisiones [default] de este UI-SPEC

| # | Decisión |
|---|----------|
| 1 | `SkyState` suma `intensity`, `windKmh`, `windDirDeg`, `cloudCover` como opcionales |
| 2 | Paleta continua con anclas en −12° / 0° / +15°, mezcla en RGB lineal, tolerancia ±12 por canal en las anclas |
| 3 | Límites de contraste duros: L ≤ 0,075 en la zona de contenido (clamp final + test), relámpago ≤ 0,10 en el pico y ΔL < 0,08 |
| 4 | Sol y luna ubicados mirando al norte: el sol sale a la derecha y se pone a la izquierda |
| 5 | Relámpago difuso en la banda cada 8–24 s, ≤ 2 pulsos por segundo, sin rayo dibujado (se aparta de `home-tormenta.png`) |
| 6 | Render a 0,5× del tamaño CSS (máx. 0,75×), gobernador de calidad de 3 niveles, chunk ≤ 20 KB gzip |
| 7 | Fallback CSS con capa de clima estática (lluvia, niebla, estrellas) para cumplir el criterio 3 sin WebGL |
| 8 | Molino: período por vuelta clamp(36 / km/h, 1,5 s, 12 s), quieto con calma, sin dato o reducir movimiento |
| 9 | Fundido de entrada del canvas de 600 ms; cambio de clima interpolado en 2000 ms |
| 10 | `/dev/sky`: 3 cuadros (canvas, estático, fallback) + banda compacta opcional, 11 presets, estado en la URL, máx. 2 contextos |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS (FLAG: botones dev sin sustantivo, corregido)
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS (FLAG: precedencia del clamp en C-1, corregido)
- [x] Dimension 4 Typography: PASS (FLAG: 5 tamaños app-wide heredados de la fase 2; la fase 3 no suma)
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-24
