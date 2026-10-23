---
phase: 2
slug: pron-stico-n-cleo
status: approved
reviewed_at: 2026-10-23
shadcn_initialized: false
preset: none
created: 2026-10-23
---

# Fase 2 — Contrato de diseño de UI (Pronóstico núcleo)

> Contrato visual y de interacción de la fase 2. Lo generó gsd-ui-researcher (en modo `--auto`, sin preguntas al usuario) y lo verifica gsd-ui-checker.
> Fuentes: `01-UI-SPEC.md` (contrato aprobado de la fase 1: **se extiende, no se contradice**), `02-CONTEXT.md` (decisiones D-01…D-16, bloqueadas), `02-RESEARCH.md` (presupuesto de layout a 390 px, patrón del scrubber, refactor de `Hero`), `design/stitch/DESIGN.md` y el código actual (`components/Hero.tsx`, `components/Ahora.tsx`, `app/globals.css`, `lib/sections.ts`).
> Todo lo que la fase 1 fijó (tokens, radio 0, sin sombras, sin emojis, tinta y contraste, foco, `formatTemp` con `−`, `.nums`, copy de los estados) **sigue vigente**. Este documento solo declara lo nuevo y los ajustes que D-03 autoriza en el layout de Ahora.
> Las decisiones que tomó este UI-SPEC por su cuenta están marcadas **[default]**.

---

## Alcance visual de la fase 2

| Entra en la fase 2 | Queda para después |
|--------------------|--------------------|
| **Titular editorial** (NOW-03) en el slot `headline` de Ahora, con el rol Headline nuevo | Probabilidad de lluvia real y rango p10–p90: fase 4 |
| **Meteograma de 48 h** (FCST-01) en la home, debajo de la banda del horizonte, sobre `ground` | Comparación de modelos: fase 4 |
| **Pronóstico diario** de 7 días, expandible a 14 (FCST-02), en `/pronostico` | Detalle por día al tocar una fila: diferido (D-11) |
| Refactor de `Hero`: caja del cielo del tamaño de la primera pantalla + slot `below` + variante `compact` | Cielo WebGL: fase 3 (el contrato `<SkyBackdrop>` no cambia) |
| Pestaña **Pronóstico** habilitada (`enabled: true`) | Modelos y Cielo siguen deshabilitadas |
| Estados vacío, degradado y cargando del meteograma y del diario, y sus cuadros en `/dev/estados` | Offline: fase 6 |

---

## Design System

| Propiedad | Valor |
|-----------|-------|
| Tool | none: sin shadcn (igual que la fase 1). Tokens en `@theme` de `app/globals.css` |
| Preset | not applicable |
| Component library | none (componentes propios). Gráfico: SVG a mano con `d3-scale@^4.0.2` + `d3-shape@^3.2.0` (D-06). **No** Recharts |
| Icon library | none. Lo único nuevo es la **flecha de viento** del meteograma (glifo SVG propio, ver "Meteograma"). **No se usan íconos de clima** en el diario: el estado va como texto (regla de la fase 1: "no se usan íconos de clima genéricos en ningún lado") |
| Font | Playfair Display (400, normal + itálica) + Plus Jakarta Sans (400, 600), sin cambios |

**Sobre "ícono/estado" de D-09:** se resuelve con el **texto del estado** (etiqueta de `describeWeather`, en Label 12 mayúsculas). Un ícono por grupo WMO rompería la regla bloqueada de la fase 1 y no entra en los 342 px sin achicar la barra de rango. **[default]**

### Tokens nuevos o extendidos

No hay colores nuevos en `@theme`. Se suman dos opacidades de tinta, solo decorativas:

| Token | Valor | Cuándo |
|-------|-------|--------|
| ink/8 | `rgba(251,251,242,0.08)` | Relleno del área bajo la curva de temperatura (ya existía como hover del botón) |
| ink/5 | `rgba(251,251,242,0.05)` | Franjas de noche del meteograma (decorativas) |

Variables CSS nuevas en `:root`:

```css
--bar-h: calc(56px + env(safe-area-inset-bottom));   /* se sube de .sky-layer a :root */
--band-h: clamp(120px, calc(100svh - 644px - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 240px);
/* 644px = 24 padding sup. + ~548 contenido de Ahora con titular de 2 líneas + 16 espaciador mínimo + 56 barra */
```

---

## Spacing Scale

Misma escala que la fase 1 (todos múltiplos de 4):

| Token | Valor | Uso nuevo en la fase 2 |
|-------|-------|------------------------|
| xs | 4px | Separación flecha ↔ km/h en la fila de viento, etiqueta de día ↔ separador, padding interno de etiquetas del gráfico |
| sm | 8px | Separación entre columnas de la fila del diario, línea de lectura ↔ gráfico, día ↔ estado dentro de la fila |
| md | 16px | Titular → temperatura, espaciador mínimo antes de la banda (ver "Ajustes de Ahora"), padding vertical de cada fila del diario, nota de días 8–14 |
| lg | 24px | Márgenes laterales (sin cambio), encabezado → titular, bloque temperatura → fila de datos, botón "ver 14 días" → última fila |
| xl | 32px | Padding superior de la sección del meteograma y de la lista del diario, encabezado → título en `/pronostico` |
| 2xl | 48px | Encabezado → temperatura cuando **no** hay titular (igual que la fase 1); padding inferior de las secciones sobre `ground` |
| 3xl | 64px | Sin uso nuevo |

Excepciones (justificadas):
- **Geometría del gráfico:** el paso horario (≈ 7,3 px a 342 px), el ancho de las barras de lluvia (paso − 2 px) y las posiciones x salen de `scaleLinear`, no de la escala. Las **alturas** de las bandas del gráfico sí son múltiplos de 4 (tabla en "Meteograma").
- **Barra de rango del diario:** 4 px de alto, sobre una hairline de 1 px. Ancho mínimo del segmento: 4 px.
- **Flecha de viento:** glifo de 12×12 px, trazo de 1,5 px.
- **Rombo de selección del meteograma:** 6×6 px rotado 45° (mismo motivo que la fase 1).
- **Botón "ver 14 días":** 44 px de alto (mínimo táctil de iOS).
- **Área táctil del scrubber:** todo el alto del gráfico (temperatura + lluvia = 160 px) por todo el ancho.
- **Silueta en `/pronostico`:** banda fija de 120 px (= alto de la silueta).

---

## Typography

El sistema completo queda con **5 tamaños y 2 pesos** (400 y 600): los 4 de la fase 1 más el **Headline** que la fase 1 dejó anunciado para esta fase. Las superficies **nuevas** de la fase 2 (titular, meteograma, diario y `/pronostico`) usan solo **3 tamaños: 32, 15 y 12**. Display 112 y Heading 24 siguen en Ahora y en NoData sin cambios.

| Rol | Familia | Tamaño | Peso | Line height | Tracking | Uso en la fase 2 |
|-----|---------|--------|------|-------------|----------|------------------|
| Headline (nuevo) | Playfair Display, **itálica** | 32px | 400 | 1.19 (38px) | −0.01em | Titular editorial de Ahora y título de `/pronostico` ("Los próximos días") |
| Body | Plus Jakarta Sans | 15px | 400 | 1.6 (24px) | 0 | Valores de la línea de lectura del meteograma, día / mín / máx / lluvia de cada fila del diario, línea de ráfagas fuertes, estado vacío del meteograma, avisos |
| Label | Plus Jakarta Sans | 12px | 600 | 1.33 (16px) | 0.14em en mayúsculas; 0 en números | "PRÓXIMAS 48 HORAS", hora de la lectura ("AHORA", "MAÑANA 15:00"), rótulos de día del gráfico ("HOY", "MAÑANA", "SÁB 25"), horas del eje ("06", "12"), máx/mín del gráfico, estado en el diario, nota de días 8–14, botón |
| Label numérico (variante de peso) | Plus Jakarta Sans | 12px | 400 | 1.33 (16px) | 0 | Solo los km/h de la fila de viento y el pico de lluvia ("6 mm") del gráfico: 16 números en columnas de 21 px se leen mejor sin negrita. Mismo tamaño, peso 400 del sistema |
| Display / Heading | — | 112 / 24 | 400 | — | — | Sin cambios (fase 1) |

Reglas:
- Todos los números (gráfico, lectura, diario) llevan `.nums` (`lining-nums tabular-nums`) y temperaturas con `formatTemp` (signo `−` U+2212).
- El texto dentro del SVG usa `font-family: var(--font-sans)` por clase CSS, nunca una fuente del sistema.
- **Titular:** máximo 2 líneas a 32 px en 342 px. La función garantiza ≤ 7 palabras y ≤ 34 caracteres (tests). **Fallback [default]:** si la verificación del navegador (ver "Ajustes de Ahora") falla con el titular más largo de los fixtures, el rol pasa a **28px / 1.21 (34px)** y no se toca nada más. No se usa ningún otro tamaño.
- Mayúsculas por CSS (`uppercase`), nunca en el string: las etiquetas salen de tablas locales en sentence case, como en la fase 1.

---

## Color

El 60/30/10 de la fase 1 se mantiene. Lo nuevo es que el meteograma y la lista del diario viven **sobre `ground`** (`#0e131c`), no sobre el cielo.

| Rol | Valor | Uso |
|-----|-------|-----|
| Dominante (60 %) | Gradiente del cielo (S1–S5) en la primera pantalla; `#0e131c` ground debajo del horizonte | Fondo de Ahora y del encabezado de `/pronostico`; fondo de las secciones del meteograma y del diario |
| Secundario (30 %) | `#0e131c` ground · `#0f141d` silhouette · `#090e17` bar | Superficies bajo el horizonte, silueta, barra |
| Acento (10 %) | `--accent` según el estado del cielo (azure / sun / storm) | Solo la lista de abajo |
| Dato: lluvia | `#8ecae6` (`--color-azure`, **fijo**, no varía con el cielo) | Barras de lluvia del meteograma (al 75 %), pico "{n} mm" del gráfico y "{n} mm" del diario (al 100 %). Es codificación de dato, no acento: no cambia a sun/storm |
| Aviso | `#fcd5ce` (peach) | Avisos de la fase 1 + **ráfagas fuertes** del meteograma (km/h de la columna, "ráfagas {n} km/h" en la lectura y la línea de ráfagas fuertes) |
| Destructivo | no aplica | No hay acciones destructivas en la fase 2 |

**El acento se reserva para** (lista cerrada; se suman los ítems 5 a 7):
1. Ícono, etiqueta y subrayado de 16×1 px de la pestaña **activa** (ahora puede ser Ahora o Pronóstico).
2. El rombo de 6 px antes del estado actual en Ahora.
3. El anillo de foco (`outline: 2px solid var(--accent); outline-offset: 2px`).
4. El borde de "Reintentar" en hover/focus.
5. **El rombo de 6×6 px que marca la hora seleccionada sobre la curva de temperatura** del meteograma.
6. **El borde del botón "VER 14 DÍAS" / "VER 7 DÍAS"** en hover/focus (en reposo `border-ink/30`).
7. Nada más: ni la curva, ni las barras, ni las etiquetas, ni la barra de rango del diario usan acento.

### Colores del meteograma (sobre ground)

| Elemento | Color |
|----------|-------|
| Curva de temperatura | trazo 2 px `ink` (`#fbfbf2`), `stroke-linejoin: round` (excepción: la curva es la única línea redondeada) |
| Área bajo la curva | `ink/8`, del trazo hasta la base del panel de temperatura |
| Barras de lluvia | `#8ecae6` al 75 % de opacidad, sin borde |
| Franjas de noche (`isDay === 0`) | `ink/5`, alto completo de temperatura + lluvia |
| Separador de día (00:00 local) | línea vertical 1 px `ink/20`, alto completo de temperatura + lluvia |
| Línea de 0 °C (solo si el dominio incluye 0) | 1 px `ink/30`, `stroke-dasharray: 2 4` |
| Base de la banda de lluvia (eje) | hairline 1 px `ink/20`, ancho completo |
| Línea de la hora seleccionada | vertical 1 px `ink/55` (decorativa), alto completo de temperatura + lluvia |
| Etiquetas de hora, días, km/h | `ink/75` |
| Máx del día en el gráfico | `ink`; mín del día: `ink/75` |
| Flechas de viento | `ink/75` (trazo) |

Contraste (WCAG AA sobre `#0e131c`): ink/75 ≈ 13:1, azure ≈ 10:1, peach ≈ 14:1. **ink/55 nunca para texto chico** (regla de la fase 1). Las ráfagas fuertes no dependen solo del color: además del peach hay texto ("ráfagas {n} km/h" y la línea de ráfagas fuertes).

---

## Refactor de `Hero` (contrato para el planner)

Problema (RESEARCH Pitfall 2): el gradiente del cielo se calcula en % del alto de `<main>`. Si el meteograma o 14 filas van adentro, el horizonte se va al final del scroll.

Contrato **[default]**:

```tsx
<Hero sky={sky} below={<…/>} compact={false}>{children}</Hero>

<main data-sky=… class="relative isolate bg-ground pb-(--bar-h)">
  <div class="relative isolate flex flex-col {full: min-h-[calc(100svh-var(--bar-h))]}">  ← caja del cielo
    <SkyBackdrop state={sky} live />          ← gradiente relativo a ESTA caja, con --bar-h: 0px adentro
    columna de contenido (children) · espaciador flex-1 (min 16px en full / 24px fijo en compact) · banda del horizonte
  </div>
  {below}                                      ← sobre ground, mismos márgenes laterales y max-w 560
</main>
```

- **`full` (home, loading, error):** la caja del cielo mide al menos la primera pantalla (`100svh − barra`). La banda usa `--band-h`. El horizonte queda pegado a la barra en la primera pantalla, como en la fase 1.
- **`compact` (`/pronostico`):** la caja del cielo mide lo que mida su contenido; la banda es **fija de 120 px** (exactamente la silueta, con el gradiente S3→S5 detrás). Debajo, la lista sobre ground.
- `.sky-layer` deja de restar la barra: dentro de la caja del cielo `--bar-h` vale `0px` (el horizonte es el borde inferior de la caja).
- `below` es opcional: `app/loading.tsx`, `app/error.tsx` y `/dev/estados` siguen funcionando sin él.
- Después del refactor se repite el UAT-01 de la fase 1 (Ahora + horizonte en 390×844).

---

## Ajustes de Ahora para el titular (D-03)

El titular entra al slot existente (`headline?: string`) con el rol Headline, no a 24 px como hoy.

```
safe-area-top + 24
WINIFREDA, LA PAMPA / hairline / fecha ART       (sin cambios)
24px                                             ← era 48 (solo cuando hay titular)
Mañana fresca, lluvia                            ← Headline 32 itálica, ink, alineado a la izquierda,
a la tarde                                          máx. 2 líneas (76 px)
16px                                             ← era mb-6 (24)
24°                          ◆ DESPEJADO         (sin cambios)
                           sensación 23°
24px                                             ← era 32
── fila de datos ──                              (sin cambios)
Ráfagas… / hairline / ACTUALIZADO…               (sin cambios)
espaciador flex-1, mínimo 16px                   ← era 64
banda del horizonte (--band-h, 120–240 px)
barra 56 + safe-area
```

- **Sin titular** (`null`): encabezado → temperatura vuelve a 48 px (fase 1 intacta). El resto de los ajustes (24 px antes de la fila de datos, espaciador de 16 px) aplica siempre.
- El titular es un `<p>` en Playfair itálica 32/1.19, `text-ink`, `text-wrap: balance`, sin comillas ni punto final. No lleva `aria-live` (cambia solo con un render nuevo).
- La constante del `--band-h` pasa de 632 a **644 px** (ver tokens). Hay que medirla en el navegador y ajustarla con el contenido real.
- **Verificación obligatoria (criterio de aceptación):** en devtools a 390×844, con el titular más largo de los fixtures (34 caracteres), línea de ráfagas visible y sin aviso: (a) con insets 0 y (b) simulando insets 47/34 (`--sat`/`--sab` o dispositivo iPhone 14 en standalone), la silueta de 120 px se ve completa por encima de la barra sin scrollear. Si (b) falla, se aplica el fallback de 28 px; si sigue fallando, se documenta como regresión y no se achica nada más sin volver al UI-SPEC.
- Con aviso de degradado o desactualizado, Ahora puede crecer y empujar la banda (comportamiento aceptado en la fase 1).

---

## Home: sección del meteograma (FCST-01)

Va en el slot `below` del `Hero`, sobre ground, con los márgenes laterales de 24 px y `max-w-[560px]` centrado. Es un `<section aria-labelledby>` con este orden:

```
32px padding superior (la banda del horizonte termina justo arriba)
PRÓXIMAS 48 HORAS                                Label 12/600 ink/75, 0.14em   (h2)
16px
AHORA                                            Label 12/600 ink/75 (hora seleccionada)
18° · sin lluvia · 12 km/h NE                    Body 15: valores en ink, separadores y unidades ink/75
8px
┌ gráfico SVG, ancho medido (342 px en 390) ──┐
│ panel temperatura            120 px         │
│ banda lluvia                  40 px         │  ← zona táctil del scrubber (160 px)
│ ─────── base (hairline ink/20) ───────      │
│ 4px + horas del eje           16 px         │
│ 8px                                         │
│ flechas de viento             16 px         │
│ km/h                          16 px         │
└─────────────────────────────────────────────┘   total del SVG: 220 px
[16px + línea de ráfagas fuertes, si hay]        Body 15 peach
48px padding inferior (después viene el padding de la barra)
```

### Geometría (todo en `lib/forecast/meteogram.ts`, puro y testeado)

- **Datos:** `hourly48` filtrado a `time >= hora actual truncada` (Pitfall 3). x = `scaleLinear` sobre el **índice** 0…n−1 → `[0, ancho]` (padding lateral interno 0: el gráfico ocupa los 342 px; las etiquetas se clampean adentro). **Nunca `scaleTime`.**
- **Ancho:** SSR con 342 px; `ResizeObserver` en el cliente re-lee el ancho (en desktop hasta 560 px). Sin `viewBox` escalado: el texto mantiene 12 px.
- **Panel de temperatura (120 px):** reserva 20 px arriba y 20 px abajo para las etiquetas de máx/mín, así que la curva vive en los 80 px del medio. Dominio y: `[min − 1, max + 1]` con **amplitud mínima de 8 °C** (si el rango es menor, se centra y se estira a 8) para que un día plano no parezca dramático. Curva con `curveMonotoneX` y `.defined()` (cortes en los null). Área con el mismo `y0` = base del panel.
- **Banda de lluvia (40 px):** las barras crecen desde la base hacia arriba, con alto máximo de 24 px (los 16 px de arriba quedan para la etiqueta del pico). Dominio `[0, max(4, máximo de los datos)]` mm (piso de 4 mm, Pitfall 7). Se dibujan solo las horas con `precipMm ≥ 0,1`. Ancho de barra = paso − 2 px, centrada en la hora.
- **Pico de lluvia:** si el máximo de las 48 h es ≥ 1 mm, encima de esa barra va "{n} mm" (Label numérico 12/400, azure), centrado y clampeado a los bordes. Solo un pico, el primero si hay empate.
- **Franjas de noche:** rectángulos `ink/5` para cada tramo contiguo de `isDay === 0`, desde la mitad del paso anterior hasta la mitad del siguiente. **[default: sí]**, ayudan a leer "noche" sin texto.
- **Separadores de día:** en cada hora local 00, línea vertical 1 px ink/20 sobre temperatura + lluvia. Rótulo del día (Label 12/600, mayúsculas, 0.14em, ink/75) arriba a la izquierda del tramo, 4 px a la derecha del separador y 4 px debajo del borde superior: `HOY`, `MAÑANA`, y desde el tercer día la forma corta `SÁB 25`. **No se usa "pasado"** **[default]**: el nombre del día es inequívoco y es el mismo formato que `/pronostico`. El rótulo del primer tramo va en x = 0. Un rótulo se omite si el ancho de su tramo es menor que el ancho del rótulo + 8 px (por ejemplo, "HOY" a las 22:00).
- **Horas del eje (16 px, 4 px debajo de la base):** solo las horas locales 00, 06, 12 y 18, en formato de dos dígitos sin ":00" (`06`), Label 12/600 ink/75 tracking 0, centradas en su x y clampeadas a [0, ancho]. Los "00" coinciden con los separadores.
- **Máx/mín por día:** para cada tramo de día local con ≥ 6 puntos, una etiqueta con el máximo (`24°`, Label 12/600 ink, 4 px arriba del punto) y otra con el mínimo (`9°`, ink/75, 4 px debajo). Se clampean adentro del panel. Si dos etiquetas se pisan (cajas estimadas como caracteres × 7 px × 16 px de alto), se descarta primero la del mínimo. Máximo 6 etiquetas.
- **Línea de 0 °C:** solo si el dominio y incluye 0, línea punteada ink/30. Sin rótulo (la lectura y las etiquetas de mín ya dicen "−2°"). **[default]**
- **Marca de "ahora":** no hay marca aparte: la selección por defecto es el índice 0 (la hora actual), así que la línea vertical ink/55 + el rombo en acento ya marcan "ahora". **[default]**
- **Sensación térmica:** **no** se dibuja (una segunda curva no entra legible en 80 px y la sensación ya está en Ahora). **[default]**
- **Íconos de estado:** **no** (regla de la fase 1). **[default]**

### Fila de viento

- **16 columnas**, una cada 3 h empezando en el índice 0 (≈ 21 px cada una en 342 px), centradas en la x de su hora.
- **Flecha (fila de 16 px):** glifo de 12×12 dibujado apuntando al norte (`M6 11V1` + `M2 5L6 1L10 5`, trazo 1,5, `stroke-linecap: square`, `stroke-linejoin: miter`, `ink/75`) y rotado `windDirDeg + 180`: **la flecha apunta hacia donde va el aire** (convención SMN). **[default]**
- **km/h (fila de 16 px, 0 px de separación con la flecha):** velocidad redondeada, Label numérico 12/400 ink/75, centrada. Con calma (< 2 km/h): sin flecha y "0". Con `windKmh` null: sin flecha y "—".
- **Ráfaga fuerte [default]: umbral 50 km/h.** Si alguna hora de la ventana de 3 h de la columna tiene `gustKmh ≥ 50`, el número de esa columna pasa a **peach**. Debajo del SVG (16 px) aparece una sola línea Body 15 peach: `Ráfagas fuertes de hasta {máx} km/h {día} {franja}` (ej. "Ráfagas fuertes de hasta 68 km/h mañana a la tarde"). Sin ráfagas ≥ 50 no aparece nada. No se agrega una tercera fila al gráfico.
- El umbral es una constante con nombre en `lib/forecast/meteogram.ts` (`STRONG_GUST_KMH = 50`). Es distinto del umbral del titular (60) a propósito: el gráfico informa, el titular solo habla cuando el viento es lo más importante del día.

### Scrubber (lectura por hora)

| Aspecto | Contrato |
|---------|----------|
| Superficie | Un `<div>` absoluto encima del panel de temperatura + lluvia (160 px × ancho), no el `<rect>` del SVG (más seguro con VoiceOver) |
| Gestos | `pointerdown` (con `setPointerCapture`) y `pointermove` seleccionan `round(x.invert(clientX − left))`, clampeado a [0, n−1]. `touch-action: pan-y` (un swipe vertical sigue scrolleando la página). `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none` |
| Al soltar | **La selección queda fija.** En `pointercancel` también queda la última. Vuelve a "ahora" (índice 0) al tocar fuera del gráfico, con `Escape` o cuando llegan datos nuevos |
| Marca | Línea vertical 1 px ink/55 en la x seleccionada (temperatura + lluvia) + rombo 6×6 en `--accent` sobre la curva. Si la temperatura es null, solo la línea |
| Lectura | Siempre en la línea fija de arriba del gráfico (dos renglones). **Nunca un tooltip flotante.** El texto no se mueve de lugar, solo cambia |
| Teclado | `role="slider"`, `tabIndex=0`, `aria-label="Hora del pronóstico"`, `aria-valuemin=0`, `aria-valuemax=n−1`, `aria-valuenow`, `aria-valuetext` (copy abajo). ←/→ ±1 h, PageUp/PageDown ±6 h, Home/End. Foco: anillo de acento de la fase 1 alrededor de la zona táctil |
| Lector de pantalla | La lectura visible lleva `aria-hidden="true"` (el slider ya la anuncia). El `<svg>` es `role="img"` con un resumen en `aria-label` (copy abajo) |
| Movimiento | El cambio de selección es instantáneo, sin transición. Nada se anima |
| Hidratación | El índice inicial sale de los props (0), nunca de `new Date()` en el render |

---

## `/pronostico`: pronóstico diario (FCST-02)

Layout **[default]**: `Hero` en variante `compact` (el cielo arriba con el encabezado, la silueta como divisoria y la lista "apoyada en la tierra"). Así la página conserva la identidad de la home sin que 14 filas estiren el gradiente.

```
┌──────────────────────────────────────────┐  safe-area-top + 24
│           WINIFREDA, LA PAMPA            │  encabezado idéntico al de Ahora (extraer <Header>)
│              ────────────                │
│     jueves 23 de octubre, 17:40  ART     │
│                                          │  32px
│  Los próximos días                       │  Headline 32 itálica, ink (h1 visible)
│  ACTUALIZADO HACE 6 MIN  ESTIMADO POR MODELO │  <Freshness> (con su py-4) + avisos si corresponde
│                                          │  24px
│░░░░░ banda fija de 120 px + silueta ░░░░░│
├──────────── ground ──────────────────────┤  32px
│ Hoy        9°  ━━━━━━━━━━━━      24°  4 mm│  fila 1 (Body 15)
│ CHAPARRONES                               │  fila 2 (Label 12 ink/75)
│──────────────────────────────────────────│  hairline ink/12
│ Mañana     7°    ━━━━━━━━━       19°      │
│ ALGO NUBLADO                              │
│ …  (7 filas)                              │
│                                          │  24px
│ [          VER 14 DÍAS           ]       │  botón 44 px, ancho completo
│                                          │  48px
├──────────────────────────────────────────┤
│  Ahora   Pronóstico   Modelos   Cielo    │  Pronóstico activa
└──────────────────────────────────────────┘
```

### Anatomía de la fila (ancho 342 px)

Grid de 5 columnas con 8 px de separación: `64px | 36px | 1fr | 36px | 48px` → la barra mide ≈ 126 px.

| Columna | Contenido | Estilo |
|---------|-----------|--------|
| Día | `Hoy` · `Mañana` · `sáb 25` (minúscula, tabla local de días) | Body 15 ink, izquierda |
| Mín | `9°` / `−2°` | Body 15 ink/75 `.nums`, derecha |
| Barra | Hairline de 1 px ink/12 a lo ancho (la escala) + segmento de 4 px de alto en `ink` desde la fracción mín hasta la fracción máx, centrado vertical. Mínimo 4 px de ancho | — |
| Máx | `24°` | Body 15 ink `.nums`, izquierda |
| Lluvia | `4 mm` solo si `precipSumMm ≥ 1` (redondeado, sin decimales); si no, la celda queda vacía pero **conserva el ancho** | Body 15 azure `.nums`, derecha |

- **Segunda línea:** el estado (`describeWeather(code, { night: false }).label`) en Label 12/600 mayúsculas 0.14em ink/75, 4 px debajo, alineado con la columna del día y libre de ocupar todo el ancho ("TORMENTA CON GRANIZO" entra). Código desconocido: la línea no aparece.
- **Alto de la fila:** 16 px arriba + 24 + 4 + 16 + 16 px abajo = **76 px**. Hairline ink/12 entre filas; ninguna arriba de la primera ni abajo de la última.
- **Escala común (D-09):** `scaleLinear` sobre `[mín de los mín visibles, máx de los máx visibles]` → `[0, 1]`, con `clamp`. Se calculan **dos** escalas en el servidor (7 y 14 filas) y la isla cliente usa la que corresponde. Al expandir, las barras de los primeros 7 días se re-escalan al instante (sin animación).
- **Nulls:** mín o máx null → "—" en **ink/75** (es texto chico: ink/55 no se permite) y sin segmento (solo la hairline).
- **Días pasados:** `daily.filter(d => d.date >= hoyLocal)`; "Hoy" y "Mañana" son los índices 0 y 1 **después** de filtrar.
- **Días 8 a 14 (expandido):** entre la fila 7 y la 8 va la nota `DEL DÍA 8 EN ADELANTE, ORIENTATIVO` (Label 12/600 ink/75, 16 px arriba y abajo, con hairline ink/20 arriba). En esas filas el máx pasa a ink/75 y el segmento de la barra a ink/55 (decorativo), para que se lean como menos seguros.
- **Tocar una fila no hace nada (D-11):** las filas no son botones ni links, sin hover ni estado activo.
- **Semántica:** `<ol aria-label="Pronóstico por día">`; cada `<li>` lleva un texto sr-only completo: "Mañana: algo nublado, mínima 7 grados, máxima 19 grados, sin lluvia significativa" / "…, 4 milímetros de lluvia". Las celdas visuales van `aria-hidden`.

### Botón "ver 14 días"

- `<button aria-expanded aria-controls="dias-8-14">`, ancho completo de la columna, 44 px de alto, borde 1 px ink/30, fondo transparente, Label 12/600 mayúsculas 0.14em ink. Hover/focus: fondo ink/8 y borde `--accent`; active: fondo ink/12 (igual que "Reintentar").
- Copy: `VER 14 DÍAS` (contraído) / `VER 7 DÍAS` (expandido). El botón queda siempre **debajo** de la última fila visible; el foco se mantiene en él al alternar.
- Si quedan 7 días o menos (snapshot viejo), el botón no aparece.
- Es la única isla cliente de la página (`components/client/DailyList.tsx`); el resto es server component. No se usa `?dias=14` (rompería el ISR).

---

## Pestaña Pronóstico

- `lib/sections.ts`: `pronostico.enabled = true`. En `/pronostico` la pestaña Pronóstico es la activa (`aria-current="page"`, acento + subrayado) y Ahora pasa a ser un link normal en ink/75. Modelos y Cielo siguen como `<span aria-disabled>` con "(próximamente)".
- Sin transición de página: la navegación es la de `next/link`.

---

## Estados de interacción y de datos

| Superficie | Estado | Cuándo | Qué ve el usuario |
|------------|--------|--------|-------------------|
| Titular | Normal | `buildHeadline()` devuelve string | Titular en su slot |
| Titular | Sin titular | Devuelve `null` (sin datos, ventana con < 3 horas) | El slot no ocupa espacio; encabezado → temperatura vuelve a 48 px. **Sin placeholder** (igual que la fase 1) |
| Titular | Cargando / sin datos de Ahora | `loading.tsx` o Ahora vacío | No se muestra |
| Meteograma | Normal | ≥ 12 horas futuras con temperatura | Sección completa |
| Meteograma | Degradado (último dato bueno) | Snapshot viejo pero con ≥ 12 horas futuras | Se dibujan solo las horas futuras que quedan (el dominio x se acorta, las columnas de viento siguen cada 3 h). **Sin aviso propio:** el aviso de Ahora ya lo dice |
| Meteograma | Sin datos por hora | Ahora tiene datos pero quedan < 12 horas futuras válidas | Se mantiene el título "PRÓXIMAS 48 HORAS" y, 16 px abajo, Body 15 ink/75 con la copy de vacío. Sin gráfico y sin botón (el reintento está en Ahora) |
| Meteograma | Sin datos de nada | Ahora en estado vacío | **La sección no se renderiza** (un solo mensaje de error por pantalla) |
| Meteograma | Cargando | `app/loading.tsx` | La sección no se renderiza (solo la primera pantalla de carga de la fase 1) |
| Meteograma | Nulls parciales | Algún campo null | Curva cortada, sin barra de lluvia, "—" en el viento; la lectura de esa hora dice "—" en el valor faltante |
| Diario | Normal | ≥ 1 día desde hoy | 7 filas + botón |
| Diario | Expandido | Tocó "VER 14 DÍAS" | 14 filas con la nota orientativa |
| Diario | Degradado | Falló la actualización y hay último dato bueno | Debajo del título, el mismo `<Notice role="status">` de la fase 1 con la copy de fuente caída; la lista se ve normal, sin días pasados |
| Diario | Desactualizado | Fuente ok pero > 30 min | `<Freshness>` lo resuelve como en la fase 1 (etiqueta peach + aviso) |
| Diario | Sin datos | Ningún día utilizable | En lugar de la lista, el `<NoData>` de la fase 1 (título itálica 24, texto y "Reintentar"), sobre ground, 32 px abajo de la silueta |
| Diario | Cargando | `app/pronostico/loading.tsx` | Encabezado, título, banda y, en lugar de la lista, `CARGANDO` (Label 12/600 ink/75). Sin skeletons ni shimmer |
| Global | Foco | Cualquier enfocable | Anillo de acento de la fase 1 |
| Global | `prefers-reduced-motion` | — | Sin cambios: la fase 2 no agrega animaciones |

`/dev/estados` suma cuadros con: titular largo (34 caracteres), titular "Mañana: …", meteograma con lluvia y tormenta, con helada (línea de 0 °C), con ráfagas ≥ 50, con nulls, degradado (horas pasadas filtradas), vacío por hora; diario 7 y 14, con nulls, degradado y vacío.

---

## Copywriting Contract

Castellano rioplatense, voseo, sin emojis ni signos de exclamación. Todo sale de tablas locales.

| Elemento | Copy |
|----------|------|
| CTA principal de la fase | **Ver 14 días** (botón: `VER 14 DÍAS`; expandido: `VER 7 DÍAS`) |
| Título de `/pronostico` | *Los próximos días* |
| `<title>` / descripción de `/pronostico` | `Pronóstico en Winifreda` / `Pronóstico de 7 a 14 días para Winifreda, La Pampa, en hora argentina.` |
| Título de la sección del meteograma | `PRÓXIMAS 48 HORAS` |
| Nota de días 8–14 | `DEL DÍA 8 EN ADELANTE, ORIENTATIVO` |
| Rótulos de día (gráfico) | `HOY` · `MAÑANA` · `SÁB 25` |
| Rótulos de día (diario) | `Hoy` · `Mañana` · `sáb 25` (tabla `dom lun mar mié jue vie sáb`) |
| Lectura: hora | `AHORA` (índice 0 cuando es la hora en curso) · `{HOY\|MAÑANA\|SÁB 25} {HH}:00` |
| Lectura: valores | `{t}° · {lluvia} · {viento}` con lluvia = `sin lluvia` (< 0,1 mm), `{x,x} mm` (0,1–9,9, coma decimal), `{n} mm` (≥ 10); viento = `{n} km/h {NE}` o `calma`; si la ráfaga ≥ 50: ` · ráfagas {n} km/h` (en peach) |
| `aria-valuetext` del slider | `{sábado} {15}:00, {18} grados, {sin lluvia \| 0,4 milímetros}, viento {12} kilómetros por hora del {noreste}{, ráfagas de 55}` |
| `aria-label` del gráfico | `Meteograma de las próximas 48 horas: temperatura entre {9} y {24} grados, lluvia total {6} milímetros, viento de hasta {35} kilómetros por hora.` (sin lluvia: `sin lluvia`) |
| Línea de ráfagas fuertes | `Ráfagas fuertes de hasta {n} km/h {hoy\|mañana\|el sábado} {a la madrugada\|a la mañana\|al mediodía\|a la tarde\|a la noche}` |
| Lluvia del diario | `{n} mm` (solo ≥ 1 mm); vacío si no |
| Vacío del meteograma | No tenemos el pronóstico por hora en este momento. Cuando vuelva el servicio, acá vas a ver las próximas 48 horas. |
| Vacío del diario | El `<NoData>` de la fase 1, sin cambios: *Ahora no tenemos el tiempo de Winifreda.* / El servicio del pronóstico no está respondiendo. Probá de nuevo en unos minutos. / `REINTENTAR` |
| Error (fuente caída, con último dato) | La copy de la fase 1, sin cambios: No pudimos actualizar el pronóstico. Te mostramos el último dato bueno, de las {HH:mm}. |
| Cargando del diario | `CARGANDO` |
| Pestaña habilitada | `Pronóstico` (sin "(próximamente)") |
| Confirmación destructiva | no aplica: la fase 2 no tiene acciones destructivas |

### Titular editorial (NOW-03)

Función pura `buildHeadline(snapshot, now): string | null` en `lib/forecast/headline.ts`. Sentence case, ≤ 7 palabras y ≤ 34 caracteres (contando el prefijo), sin "!" ni punto final.

**Ventana (D-14):** 05:00–20:59 → lo que queda de hoy, sin prefijo. 21:00–23:59 → el día siguiente, con prefijo `Mañana: `. 00:00–04:59 → el día calendario en curso, sin prefijo. Con prefijo, **nunca** se usa la franja "a la mañana" para temperatura: se dice `arranque fresco` / `fresco temprano`.

**Umbrales [default, constantes con nombre en el módulo]:**

| Constante | Valor | Regla |
|-----------|-------|-------|
| `RAIN_SUM_MM` / `RAIN_HOUR_MM` | 1 mm / 0,5 mm | Hay lluvia si la suma de la ventana ≥ 1 mm o alguna hora ≥ 0,5 mm |
| `FROST_C` / `STRONG_FROST_C` | 0 °C / −3 °C | Mínima de la ventana |
| `HEAT_C` / `STRONG_HEAT_C` | 32 °C / 35 °C | Máxima de la ventana |
| `COLD_MAX_C` | 12 °C | Máxima ≤ 12 → día frío |
| `COOL_MORNING_C` | 5 °C | Mínima de 06–11 h ≤ 5 (y > 0) → mañana fresca |
| `STRONG_WIND_KMH` / `STRONG_GUST_KMH` | 40 / 60 km/h | Viento medio o ráfaga máxima |

**Prioridad (D-15):** tormenta (grupo `tormenta`) > lluvia > temperatura (helada > calor > frío/fresco) > viento fuerte > estado general. Se combinan como máximo **un evento** (tormenta o lluvia, con su franja) **y un contexto** (temperatura o viento): `{contexto}, {evento}`.

**Franjas (hora local de la primera hora que cumple):** 0–5 `a la madrugada` · 6–11 `a la mañana` · 12–13 `al mediodía` · 14–19 `a la tarde` · 20–23 `a la noche`. Si empieza en la hora actual: `ahora` (`Llueve ahora`, `Tormenta ahora`). Si ocupa ≥ 3 franjas: `todo el día`.

**Tabla de fragmentos:**

| Caso | Fragmento |
|------|-----------|
| Tormenta | `tormentas {franja}` / `Tormenta ahora` |
| Lluvia (grupo lluvia) | `lluvia {franja}` / `Llueve ahora` / `Lluvia todo el día` |
| Lluvia solo de llovizna | `llovizna {franja}` |
| Lluvia con códigos 80–82 | `chaparrones {franja}` |
| Helada / helada fuerte | `Helada` / `Helada fuerte` |
| Calor / calor fuerte | `Día de calor` / `Calor fuerte` |
| Día frío | `Día frío` |
| Mañana fresca | `Mañana fresca` (con prefijo: `arranque fresco`) |
| Viento fuerte | `Viento fuerte del {sector largo}` (sin sector si cambia en la ventana: `Viento fuerte`) |
| General (grupo dominante) | despejado → `{Día\|Tarde\|Noche} despejad{o\|a}`; código 2 dominante → `{…} con algo de nubes`; cubierto → `{Día nublado\|Tarde nublada\|Noche nublada}`; niebla → `Niebla {franja}` |
| Sustantivo del general | según la hora de inicio de la ventana: 5–11 `Día`, 12–19 `Tarde`, 20 `Noche`; con prefijo o de 00 a 04: `Día` |

**Ejemplos válidos (van como casos de test):** `Mañana fresca, lluvia a la tarde` · `Día de calor, tormentas a la noche` · `Helada y día despejado` · `Mañana: tormentas a la tarde` · `Mañana: arranque fresco` · `Tarde nublada` · `Viento fuerte del norte` · `Llueve ahora` · `Calor fuerte, tormentas a la noche` (34).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| ninguno (shadcn no se inicializa) | — | no aplica: sin registries de terceros. Las únicas dependencias nuevas son `d3-scale`, `d3-shape` y sus `@types` (npm, org oficial `d3` y DefinitelyTyped; sin `postinstall`, verificado en 02-RESEARCH) |

---

## Resumen de decisiones [default] de este UI-SPEC

| # | Decisión |
|---|----------|
| 1 | `Hero` con caja del cielo de primera pantalla + slot `below` + variante `compact` |
| 2 | `/pronostico` = `Hero compact` (encabezado + título + silueta de 120 px) y la lista sobre ground |
| 3 | Titular a 32/1.19; fallback 28/1.21 solo si falla la verificación a 390×844 con insets |
| 4 | Gaps de Ahora: encabezado → titular 24, titular → temperatura 16, temperatura → datos 24, espaciador mínimo 16; constante 644 |
| 5 | Meteograma: franjas de noche sí, línea de 0 °C sí, sensación no, íconos no, "ahora" = selección por defecto |
| 6 | Ráfaga fuerte en el meteograma ≥ 50 km/h (peach + línea de texto); en el titular, 60 km/h |
| 7 | Flechas apuntan hacia donde va el viento (`deg + 180`) |
| 8 | Tercer día del gráfico con nombre (`SÁB 25`), no "pasado" |
| 9 | Diario sin íconos: estado en texto en una segunda línea; lluvia en azure; días 8–14 atenuados |
| 10 | Lluvia como color de dato fijo (azure), separado del acento |
| 11 | Selección del scrubber queda fija al soltar; vuelve a "ahora" al tocar fuera, con Escape o con datos nuevos |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: FLAG (5 tamaños heredados, aceptado)
- [x] Dimension 5 Spacing: FLAG (excepciones justificadas, aceptado)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-23
