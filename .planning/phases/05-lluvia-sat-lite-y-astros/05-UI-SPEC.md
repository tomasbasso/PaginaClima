---
phase: 5
slug: lluvia-sat-lite-y-astros
status: approved
reviewed_at: 2026-10-25
shadcn_initialized: false
preset: none
created: 2026-10-25
---

# Fase 5 — Contrato de diseño de UI (Lluvia, satélite y astros)

> Contrato visual y de interacción de la fase 5. Lo generó gsd-ui-researcher en modo autónomo (sin preguntas al usuario) y lo verifica gsd-ui-checker.
> Fuentes: `05-CONTEXT.md` (D-01…D-10, bloqueadas; D-06…D-09 a criterio propio y tomadas como bloqueadas), `02-UI-SPEC.md` (Hero `compact`, `/pronostico`, roles de tipografía, lluvia en azure, botón de 44 px, estados de datos), `03-UI-SPEC.md` (cielo y contraste, sin cambios), `CLAUDE.md` y el código actual (`components/Hero.tsx`, `components/Pronostico.tsx`, `NoData`, `Notice`, `app/globals.css`, `lib/sky/astro.ts`, `lib/sections.ts`, `lib/time.ts`).
> Todo lo que fijaron las fases 1 a 3 (tokens, radio 0, sin sombras, sin blur, sin emojis, sin íconos de clima, tinta y contraste, foco, `.nums`, `formatTemp`, copy de los estados, cielo animado) **sigue vigente**. Este documento solo declara lo nuevo.
> **Agnóstico de fuente:** la capa GIBS, el encuadre, la costura ERA5 + `past_days` y la cadencia de caché los decide 05-RESEARCH. Este contrato fija qué se ve, en qué orden, con qué copy y cómo se degrada.
> Las decisiones que tomó este UI-SPEC por su cuenta están marcadas **[default]**.

---

## Alcance visual de la fase 5

| Entra en la fase 5 | Queda afuera |
|--------------------|--------------|
| Página `/cielo` con Hero `compact` y tres bloques sobre ground: Sol y luna, Lluvia acumulada, Satélite (D-06) | Probabilidad real, p10–p90, semáforo (fase 4) |
| Lluvia acumulada de semana, mes y año contra la normal 1991–2020 prorrateada, con barra, texto comparativo y aclaración de reanálisis (RAIN-01..03, D-01..D-05) | Campaña agrícola julio–junio (diferido) |
| Línea "Última lluvia" (D-04) | Animación del satélite (diferido) |
| Imagen satelital IR fija del último pase, con marcador de Winifreda y hora ART; link externo al radar del SMN (SAT-01, SAT-02, D-07) | Mapa interactivo, zoom, pan, capas a elección |
| Salida y puesta del sol, duración del día, diferencia con ayer, regla del día; fase lunar dibujada para el hemisferio sur (ASTRO-01, ASTRO-02, D-08) | Eclipses, superluna, estaciones (SKY-07, v2) |
| Pestaña **Cielo** habilitada (D-09) | Tocar la pestaña Modelos (se elimina en la fase 4) |
| `loading.tsx` de `/cielo` y cuadros nuevos en `/dev/estados` | Offline (fase 6) |

---

## Design System

| Propiedad | Valor |
|-----------|-------|
| Tool | none (igual que las fases 1–3). Tokens en `@theme` / `:root` de `app/globals.css` |
| Preset | not applicable |
| Component library | none (componentes propios, server components salvo las islas indicadas). Sin librería de mapa: la imagen satelital es un `<img>` servido por el servidor |
| Icon library | none. Lo nuevo son dos dibujos SVG propios y no son íconos: el **disco lunar** y el **marcador de Winifreda** (rombo). Nada de sol con rayos, nube, gota ni luna "de emoji". La flecha `↗` del link externo es un carácter de texto |
| Font | Playfair Display (400, normal + itálica) + Plus Jakarta Sans (400, 600), sin cambios |

### Tokens nuevos

No hay colores nuevos en `@theme` ni variables nuevas en `:root`. Se reusan las opacidades de tinta ya existentes (ink/8, ink/12, ink/20, ink/30, ink/55, ink/75) y `--color-azure` como color de dato de lluvia (fase 2).

---

## Layout de `/cielo` (D-06)

Una sola página con scroll, sin bloques plegables, en este orden. Misma estructura que `app/pronostico/page.tsx`: `<Hero sky={sky} compact below={…}>`.

```
┌──────────────────────────────────────────┐  safe-area-top + 24
│           WINIFREDA, LA PAMPA            │  <Header> compartido (sin cambios)
│              ────────────                │
│     sábado 25 de octubre, 17:40  ART     │
│                                          │  32px
│  Mirando para arriba                     │  Headline 28 itálica, ink (h1)
│                                          │  24px
│░░░░░ banda fija de 120 px + silueta ░░░░░│  cielo animado de la fase 3
├──────────── ground ──────────────────────┤
│ 32px                                     │
│ SOL Y LUNA                               │  bloque 1 (h2)
│ …                                        │
│ 48px                                     │
│ ──────── hairline ink/12 ────────        │
│ 32px                                     │
│ LLUVIA ACUMULADA                         │  bloque 2 (h2)
│ …                                        │
│ 48px · hairline · 32px                   │
│ SATÉLITE                                 │  bloque 3 (h2), carga diferida
│ …                                        │
│ 48px                                     │
├──────────────────────────────────────────┤
│  Ahora   Pronóstico   Modelos   Cielo    │  Cielo activa
└──────────────────────────────────────────┘
```

- Columna: márgenes laterales de 24 px y `max-w-[560px]` centrado (igual que `below` en las fases 2 y 3). Ancho útil a 390 px: **342 px**.
- Cada bloque es un `<section aria-labelledby>` con su `h2` en Label 12/600 mayúsculas, 0.14em, ink/75 (mismo estilo que "PRÓXIMAS 48 HORAS").
- Entre bloques: 48 px, hairline 1 px ink/12 a lo ancho de la columna, 32 px. Ninguna hairline arriba del primero ni abajo del último.
- **Sin `<Freshness>` en el hero [default]:** la página mezcla tres fuentes con cadencias distintas. Cada bloque informa su propio tiempo (hora de la imagen, "datos hasta…"). El sol y la luna se calculan al renderizar y no necesitan antigüedad.
- Los bloques se degradan **por separado**: si falla uno, los otros se ven normales. Sol y luna nunca falla (cálculo local con suncalc), así que la página nunca queda vacía.

---

**Ancla visual:** al abrir `/cielo`, el ojo va primero a las cifras grandes del bloque Sol y luna (hora de salida y de puesta en Playfair 28) y después a la cifra de la primera fila de lluvia. El disco lunar es el único elemento gráfico de peso y acompaña a las cifras; no compite con ellas.

## Spacing Scale

Misma escala que las fases 1–3 (múltiplos de 4):

| Token | Valor | Uso nuevo en la fase 5 |
|-------|-------|------------------------|
| xs | 4px | Número ↔ unidad ("12 mm"), etiqueta ↔ valor dentro de una celda, padding horizontal del rótulo del marcador, rótulos de la regla del día ↔ regla |
| sm | 8px | Etiqueta de fila ↔ número, número ↔ barra, barra ↔ texto comparativo, título ↔ imagen y imagen ↔ pie del satélite, rombo ↔ rótulo del marcador |
| md | 16px | `h2` → primer contenido de cada bloque, separación entre columnas Sale/Se pone, disco lunar ↔ texto de la luna, pie del satélite ↔ link |
| lg | 24px | Márgenes laterales (sin cambio), entre filas de lluvia (con hairline), entre sol y luna (con hairline), título h1 → banda |
| xl | 32px | Padding superior de cada bloque, encabezado → h1 |
| 2xl | 48px | Padding inferior de cada bloque |
| 3xl | 64px | Sin uso como espaciado (el disco lunar mide 64 px, ver excepciones) |

Excepciones (justificadas):
- **Barras de lluvia y regla del día:** segmento de 4 px de alto sobre hairline de 1 px (mismo patrón que la barra de rango del diario). Marca de "normal" y de "ahora": línea vertical de 1 px y 12 px de alto.
- **Disco lunar:** 64 × 64 px (radio 31, trazo de 1 px).
- **Marcador de Winifreda:** rombo de 8 × 8 px (cuadrado de 6 px rotado 45°, motivo de las fases 1 y 2) con contorno de 1 px.
- **Link "Ver radar del SMN":** 44 px de alto (mínimo táctil de iOS).
- **Caja del satélite:** cuadrada (`aspect-ratio: 1 / 1`), ancho de la columna (342 px a 390). Las posiciones de los píxeles de la imagen no son espaciado de layout.

---

## Typography

Sin tamaños ni pesos nuevos. Las superficies de la fase 5 usan **3 tamaños (28, 15, 12) y 2 pesos (400, 600)**.

| Rol | Familia | Tamaño | Peso | Line height | Tracking | Uso en la fase 5 |
|-----|---------|--------|------|-------------|----------|------------------|
| Headline | Playfair Display, itálica | 28px | 400 | 1.21 (34px) | −0.01em | Título h1 de `/cielo` ("Mirando para arriba"). Es el rol vigente (fallback 28 aplicado en 02-01) |
| Cifra (variante del Headline) | Playfair Display, **normal** (no itálica) | 28px | 400 | 1.21 (34px) | 0 | Las cifras grandes: horas de salida y puesta ("06:12"), acumulados ("142"). Con `.nums`. Mismo tamaño y peso del Headline: no suma tamaño |
| Body | Plus Jakarta Sans | 15px | 400 | 1.6 (24px) | 0 | Unidad "mm" junto a la cifra, duración del día, texto comparativo, "Lo normal a esta fecha", última lluvia, nombre y porcentaje de la luna, aclaración de reanálisis, pie del satélite, estados vacíos |
| Label | Plus Jakarta Sans | 12px | 600 | 1.33 (16px) | 0.14em mayúsculas; 0 en números | `h2` de los bloques, rótulos de fila ("EN LO QUE VA DE OCTUBRE"), "SALIDA DEL SOL" / "PUESTA DEL SOL", rótulos 00/12/24 de la regla, "NORMAL", hora de la imagen, rótulo "WINIFREDA" del marcador, texto del link, "CARGANDO" |

Reglas:
- Todos los números llevan `.nums`. Coma decimal (`es-AR`). Espacio fino no separable (U+202F) o no separable (U+00A0) antes de `%` y de `mm`: `20 %`, `12 mm`. Horas en `HH:mm` de 24 h con `formatHHmm` (hora argentina).
- La unidad "mm" junto a la cifra va en Body 15 ink/75, alineada a la línea base de la cifra, 4 px a la derecha.
- Mayúsculas por CSS (`uppercase`), nunca en el string.

---

## Color

El 60/30/10 se mantiene. Toda la fase 5 vive **sobre ground** (`#0e131c`), salvo el hero compacto (cielo de la fase 3, sin cambios).

| Rol | Valor | Uso |
|-----|-------|-----|
| Dominante (60 %) | Cielo S1–S5 (hero compacto) · `#0e131c` ground | Hero de `/cielo`; fondo de los tres bloques |
| Secundario (30 %) | `#0e131c` ground · `#0f141d` silhouette · `#090e17` bar | Silueta, barra, **fondo de la caja del satélite** (`#090e17`) y del rótulo del marcador (`#090e17` al 80 %) |
| Acento (10 %) | `--accent` por token del cielo (azure / sun / storm) | Solo la lista de abajo |
| Dato: lluvia | `#8ecae6` (`--color-azure`, fijo) | Segmento observado de las barras de lluvia y la cifra de "Última lluvia" en mm. Es codificación de dato, igual que en la fase 2: no cambia con el cielo |
| Aviso | `#fcd5ce` (peach) | Hora de la imagen satelital cuando está vieja; `<Notice>` de datos de lluvia atrasados |
| Destructivo | no aplica | La fase 5 no tiene acciones destructivas |

**El acento se reserva para** (lista cerrada; se suma solo el ítem 5):
1. Ícono, etiqueta y subrayado de la pestaña **activa** (ahora puede ser Cielo).
2. El rombo del estado actual en Ahora.
3. El anillo de foco (`outline: 2px solid var(--accent); outline-offset: 2px`).
4. Los bordes en hover/focus de "Reintentar" y "VER 14 DÍAS".
5. **El borde del link "VER RADAR DEL SMN" en hover/focus** (en reposo `border-ink/30`).

Ni el disco lunar, ni la regla del día, ni las barras de lluvia, ni la marca de normal, ni el marcador del satélite usan acento.

### Colores por elemento

| Elemento | Color |
|----------|-------|
| Cifras (horas, acumulados) | ink |
| Rótulos Label | ink/75 |
| Texto comparativo, "Lo normal…", aclaraciones, pie del satélite | ink/75 |
| Última lluvia | "Última lluvia:" en ink/75, el resto en ink; los mm en azure |
| Hairline de escala (barras y regla) | 1 px ink/12 |
| Segmento observado de lluvia | azure al 100 %, 4 px |
| Marca de normal | vertical 1 px × 12 px en ink |
| Segmento de luz del día (regla) | ink, 4 px |
| Marca de "ahora" en la regla | vertical 1 px × 12 px ink/55 (decorativa) |
| Luna: parte iluminada | ink (`#fbfbf2`) al 100 % |
| Luna: parte en sombra | ink/8 de relleno + contorno de 1 px ink/20 en todo el disco |
| Caja del satélite | fondo `#090e17`, borde 1 px ink/12. La imagen va **sin filtros CSS** (ni opacidad, ni grayscale, ni mix-blend) |
| Marcador de Winifreda | rombo ink con contorno de 1 px `#090e17`; rótulo "WINIFREDA" en ink sobre `#090e17` al 80 % |

Contraste (WCAG AA sobre `#0e131c`): ink/75 ≈ 13:1, azure ≈ 10:1, peach ≈ 14:1. El rótulo del marcador, ink sobre `#090e17` al 80 % encima del blanco más claro de la imagen, queda ≥ 9:1. **ink/55 nunca para texto.**

---

## Bloque 1 · Sol y luna (ASTRO-01, ASTRO-02, D-08)

Server component. Todo sale de funciones puras con tests en `lib/` sobre `lib/sky/astro.ts` (suncalc, `LAT`/`LON`, offset −180).

```
32px
SOL Y LUNA                                        h2 Label ink/75
16px
SALIDA DEL SOL          PUESTA DEL SOL            Label ink/75 · grid 1fr 1fr, gap 16
06:12                   19:48                     Cifra 28 ink .nums
8px
13 h 36 min de luz · 2 min más que ayer           Body 15: duración en ink, comparación en ink/75
16px
00            12            24                    Label 12/600 ink/75 tracking 0 (izq / centro / der)
4px
──────━━━━━━━━━━━━━━━━│━━━━━━──────────           regla del día (ver abajo)
24px
──────── hairline ink/12 ────────
24px
( ◐ )  16px  Luna creciente                       disco 64×64 · Body 15 ink
             Iluminada al 42 %                    Body 15 ink/75
             Llena el miércoles 5 de noviembre    Body 15 ink/75 (opcional, D-08)
             SALE 14:20 · SE PONE 03:10           Label ink/75 (opcional, D-08)
48px
```

### Sol

- **Salida / puesta:** `getTimes()` del día local (ART), en `HH:mm`. Se usan `sunrise` y `sunset` de suncalc (borde superior del disco, con refracción), no los de Open-Meteo, para que todo el bloque salga de una sola fuente.
- **Duración del día:** `sunset − sunrise`, en `{h} h {mm} min` (minutos con dos dígitos: `13 h 06 min`).
- **Diferencia con ayer [default]:** duración de hoy − duración de ayer, redondeada al minuto:
  - `> 0` → `{n} min más que ayer`
  - `< 0` → `{n} min menos que ayer`
  - `0` → `igual que ayer` (pasa cerca de los solsticios)
- **Regla del día [default]:** una línea de 24 h (hairline ink/12, ancho completo = 00:00 a 24:00). Encima de ella, un segmento de 4 px en ink desde la salida hasta la puesta, centrado vertical en la hairline. Una marca vertical de 1 × 12 px ink/55 en la hora actual del render. Rótulos `00`, `12`, `24` arriba (izquierda, centro, derecha). Es decorativa (`aria-hidden`): el dato ya está en texto. Sirve para leer de un vistazo cuánto del día tiene luz.

### Luna

- **Disco SVG propio** de 64 × 64 (`viewBox="0 0 64 64"`, centro 32,32, radio 31). Dibujo con `getMoonIllumination(now)` → `fraction` (0–1) y `phase` (0–1):
  - Disco completo en sombra (ink/8) con contorno 1 px ink/20.
  - Parte iluminada en ink: medio disco del **lado iluminado** + media elipse del terminador con radio horizontal `rx = 31 · |1 − 2 · fraction|` y radio vertical 31. Si `fraction < 0,5` la elipse recorta hacia el lado iluminado (creciente fino); si `fraction > 0,5`, la elipse suma hacia el lado en sombra (gibosa).
  - **Hemisferio sur (bloqueado):** con `phase < 0,5` (creciente) el lado iluminado es el **izquierdo**; con `phase > 0,5` (menguante) es el **derecho**. Al revés que en el hemisferio norte.
  - Orientación fija, terminador vertical. **No** se rota por el ángulo paraláctico ni por `angle` de suncalc **[default]**: a la latitud de Winifreda la diferencia no ayuda a leer la fase y complica el test.
  - Luna nueva (`fraction < 0,02`): solo el disco en sombra con su contorno. Luna llena (`fraction > 0,98`): disco entero en ink.
  - El SVG va `aria-hidden="true"`: el nombre y el porcentaje están en texto.
  - El path sale de una función pura (`moonPath(fraction, phase)`) con tests: creciente con iluminación a la izquierda, menguante a la derecha, y los extremos nueva/llena.
- **Nombre de la fase [default]** (función pura sobre `phase`, ventanas de ±1 día ≈ ±0,0339 alrededor de las fases principales):

| `phase` | Nombre |
|---------|--------|
| ≥ 0,9661 o < 0,0339 | Luna nueva |
| 0,0339 – 0,2161 | Luna creciente |
| 0,2161 – 0,2839 | Cuarto creciente |
| 0,2839 – 0,4661 | Gibosa creciente |
| 0,4661 – 0,5339 | Luna llena |
| 0,5339 – 0,7161 | Gibosa menguante |
| 0,7161 – 0,7839 | Cuarto menguante |
| 0,7839 – 0,9661 | Luna menguante |

- **Porcentaje:** `Iluminada al {round(fraction · 100)} %`.
- **Opcionales (D-08, solo si salen gratis de suncalc):** próxima luna llena (`Llena el {miércoles 5 de noviembre}`; si es hoy, se omite porque el nombre ya dice "Luna llena") y salida/puesta de la luna (`getMoonTimes`: `SALE {HH:mm} · SE PONE {HH:mm}`; si en el día local no sale o no se pone, se omite esa parte; si `alwaysUp`/`alwaysDown`, se omite la línea). Si el planner los deja afuera, la columna termina en el porcentaje y no queda hueco.
- Layout: flex fila, disco a la izquierda alineado arriba, 16 px, columna de texto. A 390 px el texto tiene 262 px: entran todas las líneas sin cortar.

---

## Bloque 2 · Lluvia acumulada (RAIN-01..03, D-01..D-05)

Server component. Los números (acumulados, normales prorrateados, última lluvia) llegan ya calculados desde el servidor; el texto comparativo sale de una función pura con tests (`lib/rain/compare.ts` o el nombre que fije el planner).

```
32px
LLUVIA ACUMULADA                                  h2 Label ink/75
16px
Última lluvia: hace 6 días, 12 mm                 Body 15 (ver colores)
24px
EN LO QUE VA DE LA SEMANA                         Label ink/75
8px
3,2 mm                                            Cifra 28 ink + "mm" Body 15 ink/75
8px
━━━━━━━━━━━━━━━│────────────────────── NORMAL   barra (ver abajo)
8px
20 % menos de lo normal                           Body 15 ink
Lo normal a esta fecha: 4 mm                      Body 15 ink/75
24px · hairline ink/12 · 24px
EN LO QUE VA DE OCTUBRE                           (misma fila)
…
24px · hairline ink/12 · 24px
EN LO QUE VA DE 2026                              (misma fila)
…
24px
Estimado por reanálisis, no pluviómetro. Lo       Body 15 ink/75 (RAIN-03, D-05)
normal es el promedio 1991–2020 a la misma fecha.
48px
```

### Filas

- **Orden fijo:** semana, mes, año (de lo más reciente a lo más largo). Períodos de calendario en hora argentina (D-01, D-02): semana desde el lunes, mes desde el día 1, año desde el 1 de enero.
- **Rótulos:** `EN LO QUE VA DE LA SEMANA` · `EN LO QUE VA DE {OCTUBRE}` (nombre del mes en curso) · `EN LO QUE VA DE {2026}`.
- **Cifra:** formato de la fase 2: `0` cuando no llovió, `{x,x}` entre 0,1 y 9,9, `{n}` entero desde 10. Siempre seguida de `mm`.

### Barra contra lo normal (D-03)

- Hairline 1 px ink/12 a lo ancho de la columna = escala de 0 a `máx`.
- **Escala [default]:** `máx = max(observado, normal) / 0,8`. El mayor de los dos queda siempre al 80 % del ancho, así el otro se compara a ojo y queda aire a la derecha. Si los dos son 0, `máx = 1` (sin segmento, marca al 0).
- **Segmento observado:** de 0 a `observado / máx`, 4 px de alto en azure, centrado en la hairline. Mínimo 4 px de ancho si observado > 0; sin segmento si es 0.
- **Marca de normal:** línea vertical 1 × 12 px en ink en `normal / máx`, centrada vertical en la hairline. Rótulo `NORMAL` (Label 12/600 ink/75) **arriba** de la marca, centrado en ella y clampeado a los bordes de la columna. La barra completa mide 16 (rótulo) + 4 + 12 = **32 px** de alto.
- La barra es `aria-hidden`; cada fila lleva un texto sr-only completo (ver Copywriting).
- Se escala cada fila por separado (semana, mes y año tienen órdenes de magnitud distintos).

### Texto comparativo [default]

Función pura `compareRain(observadoMm, normalMm)`. `r = observado / normal`. Porcentajes redondeados **al múltiplo de 5** más cercano.

| Condición | Texto |
|-----------|-------|
| `normal < 2` y `observado < normal + 2` | `Todavía es pronto para comparar` |
| `normal < 2` y `observado ≥ normal + 2` | `Más de lo normal para esta altura` |
| `observado < 0,5` (con `normal ≥ 2`) | `Nada de lluvia todavía` |
| `0,9 ≤ r ≤ 1,1` | `Casi lo normal` |
| `r < 0,9` | `{p} % menos de lo normal` con `p = round5((1 − r) · 100)` |
| `1,1 < r < 2` | `{p} % más de lo normal` con `p = round5((r − 1) · 100)` |
| `2 ≤ r < 3` | `Más del doble de lo normal` |
| `r ≥ 3` | `Más del triple de lo normal` |

- Debajo, siempre que haya climatología: `Lo normal a esta fecha: {n} mm` (mismo formato de cifra).
- La línea comparativa va en ink (es lo que se lee); la de lo normal en ink/75.
- Los umbrales (2 mm, 0,5 mm, ±10 %) son constantes con nombre en el módulo.

### Última lluvia (D-04)

- Va primero, debajo del `h2`: responde la pregunta del pueblo antes que los números.
- Día con lluvia: el planner fija el umbral (CONTEXT: ≥ 1 mm diario) y lo documenta. Usa la misma serie que los acumulados.

| Caso | Copy |
|------|------|
| Hoy | `Última lluvia: hoy, {n} mm` |
| Ayer | `Última lluvia: ayer, {n} mm` |
| 2 a 14 días | `Última lluvia: hace {n} días, {n} mm` |
| Más de 14 días | `Última lluvia: el {12 de agosto}, {n} mm` |
| Ninguna en la serie disponible | `Sin lluvias de 1 mm o más desde el {1 de enero}` (fecha de inicio de la serie) |

- Los mm de un día con lluvia se muestran con el formato de cifra (`{x,x}` o `{n}`), en azure.

### Aclaración (RAIN-03, D-05)

Siempre visible cuando el bloque muestra números, al pie del bloque, Body 15 ink/75: `Estimado por reanálisis, no pluviómetro. Lo normal es el promedio 1991–2020 a la misma fecha.`

---

## Bloque 3 · Satélite (SAT-01, SAT-02, D-07)

```
32px
SATÉLITE                                          h2 Label ink/75
16px
IMAGEN INFRARROJA DE LAS 21:40                    Label ink/75 (peach si está vieja)
8px
┌──────────────────────────────────────┐
│                                      │  caja cuadrada 342×342 a 390 px
│                                      │  fondo #090e17, borde 1px ink/12
│              ◆ WINIFREDA             │  marcador en la posición de Winifreda
│                                      │
│                                      │
└──────────────────────────────────────┘
8px
Cuanto más claro, más alto y frío es el tope       Body 15 ink/75 (pie)
de la nube: así se ven las tormentas. El cuadro
abarca unos {N} km de lado. GOES-East, NASA GIBS.
16px
[        VER RADAR DEL SMN  ↗        ]            link con forma de botón, 44 px
48px
```

### Imagen

- **Fija**, último pase disponible, sin animación ni interacción (no se toca, no se amplía, no hay pan ni zoom propio). El pinch-zoom del navegador sigue funcionando sobre la página.
- La sirve el servidor con caché (D-07). El cliente pide **una sola URL propia** (ej. `/api/satelite` o la que fije el planner), nunca a NASA.
- **Encuadre:** lo decide 05-RESEARCH (La Pampa y alrededores, suficiente para ver tormentas que se acercan). Contrato visual: cuadrada, con Winifreda en el centro o lo más cerca posible; el marcador se ubica por coordenadas a partir del bbox real, no se supone el centro.
- **Resolución [default]:** al menos 2× el ancho CSS a 390 px (≥ 684 px de lado; 720 × 720 recomendado) y **≤ 200 KB** por imagen. Si la capa no da esa resolución en el encuadre elegido, se usa la nativa y se escala con CSS (`image-rendering` por defecto, sin pixelado forzado).
- **Contornos opcionales [default]:** si el research los resuelve sin costo (compuestos en el servidor), límites de La Pampa en 1 px ink/30. No es requisito.
- `<img width height loading="lazy" decoding="async">` (o `next/image` con tamaño explícito) dentro de una caja con `aspect-ratio: 1 / 1`: **cero salto de layout** al cargar. Aparece sin fundido.
- **Carga diferida (criterio 2):** el bloque está al final y la imagen es lazy; no bloquea el render del resto de `/cielo` ni de la home. Ninguna otra pantalla la pide.
- `alt`: `Imagen satelital infrarroja de La Pampa de las {21:40}, centrada en Winifreda`.

### Marcador de Winifreda

- Rombo de 8 × 8 (6 px rotado 45°) en ink con contorno de 1 px `#090e17`, centrado en la posición de Winifreda.
- Rótulo `WINIFREDA` (Label 12/600, mayúsculas, 0.14em, ink) 8 px a la derecha del rombo, centrado vertical, sobre una placa `#090e17` al 80 % con padding horizontal de 4 px. Si el rótulo no entra a la derecha (marcador cerca del borde), va a la izquierda.
- Es una capa HTML/SVG encima de la imagen (`aria-hidden`; el `alt` ya dice dónde está), no se dibuja en el JPEG: así queda nítido a cualquier DPR.

### Hora de la imagen

- Hora del pase en ART, de los metadatos de la imagen (no la hora del fetch).
- `IMAGEN INFRARROJA DE LAS {HH:mm}`; si el pase es de un día anterior al del render: `IMAGEN INFRARROJA DE AYER A LAS {HH:mm}`.
- **Vieja [default]:** si al renderizar el pase tiene más de 90 min, el rótulo pasa a **peach** y suma ` · HACE {n} H` o ` · HACE {n} MIN`. Sin `<Notice>` aparte: el bloque no tapa la imagen vieja, que igual sirve para ver nubosidad.

### Pie

- Texto fijo de lectura + extensión + atribución (la atribución a NASA GIBS / GOES-East es obligatoria y va siempre que haya imagen).
- La frase de lectura depende de la paleta real de la capa, que verifica el research:
  - Capa en grises: `Cuanto más claro, más alto y frío es el tope de la nube: así se ven las tormentas.`
  - Capa con escala de color: `Los colores fuertes marcan topes de nube muy fríos, típicos de las tormentas.`
- `{N}`: lado aproximado del encuadre en km, redondeado a la centena (ej. `unos 800 km`). Si el research no lo fija, se omite esa oración.

### Link al radar del SMN (SAT-02)

- `<a href="{URL del radar del SMN}" target="_blank" rel="noopener noreferrer">`. URL por defecto `https://www.smn.gob.ar/radar`; el research confirma la vigente. No se scrapea ni se embebe nada del SMN.
- Estilo del botón de la fase 2: ancho completo, 44 px, borde 1 px ink/30, fondo transparente, Label 12/600 mayúsculas 0.14em ink, centrado. Hover/focus: fondo ink/8 y borde `--accent`; active: fondo ink/12.
- Copy visible `VER RADAR DEL SMN ↗` (la flecha va con `aria-hidden`) + sr-only ` (se abre en otra pestaña)`.
- **Siempre visible**, también cuando la imagen satelital falla (es la alternativa).

---

## Pestaña Cielo (D-09)

- `lib/sections.ts`: `cielo.enabled = true`. En `/cielo` la pestaña Cielo es la activa (`aria-current="page"`, acento + subrayado); Ahora y Pronóstico son links normales en ink/75.
- **Modelos no se toca** en esta fase (se elimina en la fase 4). Si cuando se ejecute la fase 5 Modelos ya no existe, la barra queda con 3 pestañas y no hay nada que ajustar desde este contrato.
- Navegación de `next/link`, sin transición.

---

## Estados de interacción y de datos

| Superficie | Estado | Cuándo | Qué ve el usuario |
|------------|--------|--------|-------------------|
| Página | Cargando | `app/cielo/loading.tsx` | Encabezado, h1, banda de 120 px y, sobre ground con 32 px arriba, `CARGANDO` (Label 12/600 ink/75). Sin skeletons ni shimmer (igual que `/pronostico`) |
| Hero | Sin datos de Ahora | Snapshot vacío | Cielo despejado según la fase solar (fase 3). El h1 y los bloques se ven igual |
| Sol y luna | Normal | Siempre | Bloque completo. No tiene estado de error (cálculo local) |
| Sol y luna | Opcionales sin dato | suncalc no da salida/puesta de la luna en el día | Se omite la línea correspondiente, sin hueco |
| Lluvia | Normal | Hay serie observada y climatología | Última lluvia + 3 filas + aclaración |
| Lluvia | Sin climatología | Hay serie observada pero falló la normal | Cifras sin barra ni texto comparativo; en lugar de la comparación, una sola línea al final de las filas: `No pudimos cargar el promedio histórico para comparar.` (Body 15 ink/75). La aclaración queda solo con su primera oración |
| Lluvia | Datos atrasados | La serie termina antes de ayer (el archivo y `past_days` no cubren los últimos días) | Arriba de "Última lluvia", el `<Notice>` de la fase 1 (filete peach) con la copy de datos atrasados. Las cifras se muestran igual |
| Lluvia | Sin datos | Falló la serie observada | En lugar de "Última lluvia" y las filas: título Body 15 ink `No pudimos calcular la lluvia acumulada.` + Body 15 ink/75 `El archivo histórico no está respondiendo. Probá de nuevo en un rato.` Sin barra, sin aclaración. Sin botón (la página es ISR; el resto de la pantalla sigue útil) |
| Satélite | Cargando la imagen | Antes de que el `<img>` lazy termine | La caja cuadrada con fondo `#090e17` y, centrado detrás de la imagen, `CARGANDO IMAGEN` (Label 12/600 ink/75). La imagen opaca lo tapa al cargar. Sin JS |
| Satélite | Normal | Imagen ≤ 90 min | Hora en ink/75, imagen, marcador, pie, link |
| Satélite | Vieja | Imagen > 90 min | Hora en peach con "HACE {n} H"; todo lo demás igual |
| Satélite | Sin imagen (servidor) | El adapter no tiene ninguna imagen buena | Sin rótulo de hora. La caja se mantiene (mismo tamaño, sin salto) con el texto centrado, padding 24: Body 15 ink `No hay imagen satelital en este momento.` + Body 15 ink/75 `Mientras tanto, podés ver el radar del SMN.` Sin pie. El link queda debajo |
| Satélite | Falla al cargar en el cliente | `onError` del `<img>` | Mismo contenido que "Sin imagen". Es la única isla cliente del bloque (componente chico con `onError`); si el planner prefiere evitarla, el servidor solo emite la URL cuando la imagen existe en caché |
| Link SMN | Hover / focus / active | — | Fondo ink/8 + borde acento / anillo de foco / fondo ink/12 |
| Global | `prefers-reduced-motion` | — | Sin cambios: la fase 5 no agrega animaciones (el cielo del hero sigue sus reglas de la fase 3) |
| Global | Foco | Cualquier enfocable | Anillo de acento de la fase 1. Los únicos enfocables nuevos son el link del SMN y la pestaña Cielo |

### `/dev/estados`

Suma cuadros (sobre ground, 390 px de ancho) para revisar sin depender de los datos reales:
- **Luna:** las 8 fases en grilla (fraction 0, 0,25, 0,5, 0,75, 1, 0,75, 0,5, 0,25 con su `phase`), con el nombre debajo. Es la verificación visual del criterio 3: el cuarto creciente tiene que verse **iluminado a la izquierda**.
- **Sol:** día largo (diciembre), día corto (junio), diferencia `igual que ayer`.
- **Lluvia:** menos de lo normal, casi lo normal, más del doble, `Todavía es pronto para comparar` (lunes a la mañana), sin climatología, datos atrasados, sin datos; última lluvia hoy, hace 6 días, hace más de 14 días, ninguna.
- **Satélite:** normal (imagen fixture local, no GIBS), vieja, sin imagen, cargando (sin `src`).

---

## Accesibilidad

- Jerarquía: h1 `Mirando para arriba`; un h2 por bloque (`Sol y luna`, `Lluvia acumulada`, `Satélite`, en mayúsculas por CSS).
- Disco lunar, regla del día, barras de lluvia y marcador: `aria-hidden="true"`. Todo su dato está en texto visible o sr-only.
- Cada fila de lluvia lleva un sr-only completo (copy abajo); las celdas visuales de la fila van `aria-hidden` donde duplican.
- El link externo avisa que abre otra pestaña. Área táctil de 44 px.
- Contraste: ink/75 o más para todo texto; ink/55 solo decorativo.
- Nada se mueve en la fase 5.

---

## Copywriting Contract

Castellano rioplatense, voseo, sin emojis ni signos de exclamación. Todo sale de tablas locales. Mayúsculas por CSS.

| Elemento | Copy |
|----------|------|
| CTA principal de la fase | **Ver radar del SMN** (link: `VER RADAR DEL SMN ↗` + sr-only `(se abre en otra pestaña)`) |
| Título h1 de `/cielo` | *Mirando para arriba* |
| `<title>` / descripción | `El cielo en Winifreda` / `Lluvia acumulada contra lo normal, imagen satelital, sol y luna en Winifreda, La Pampa.` |
| Pestaña | `Cielo` (sin "(próximamente)") |
| h2 de los bloques | `Sol y luna` · `Lluvia acumulada` · `Satélite` |
| Sol: rótulos | `Salida del sol` · `Puesta del sol` |
| Sol: duración | `{13} h {36} min de luz · {2} min más que ayer` / `· {2} min menos que ayer` / `· igual que ayer` |
| Sol: sr-only | `El sol sale a las {06:12} y se pone a las {19:48}. {13} horas y {36} minutos de luz, {2} minutos más que ayer.` |
| Luna | `{Luna creciente}` / `Iluminada al {42} %` / opcionales `Llena el {miércoles 5 de noviembre}` y `Sale {14:20} · se pone {03:10}` |
| Lluvia: última | `Última lluvia: hoy, {n} mm` · `ayer, {n} mm` · `hace {n} días, {n} mm` · `el {12 de agosto}, {n} mm` · `Sin lluvias de 1 mm o más desde el {1 de enero}` |
| Lluvia: rótulos | `En lo que va de la semana` · `En lo que va de {octubre}` · `En lo que va de {2026}` |
| Lluvia: marca | `Normal` |
| Lluvia: comparación | Tabla "Texto comparativo" |
| Lluvia: normal | `Lo normal a esta fecha: {n} mm` |
| Lluvia: sr-only por fila | `En lo que va {del mes} llovieron {32} milímetros. Lo normal a esta fecha son {40} milímetros: {20 % menos de lo normal}.` |
| Lluvia: aclaración (RAIN-03) | `Estimado por reanálisis, no pluviómetro. Lo normal es el promedio 1991–2020 a la misma fecha.` |
| Satélite: hora | `Imagen infrarroja de las {21:40}` · `Imagen infrarroja de ayer a las {23:50}` · vieja: `… · hace {3} h` / `… · hace {95} min` |
| Satélite: marcador | `Winifreda` |
| Satélite: pie | Grises: `Cuanto más claro, más alto y frío es el tope de la nube: así se ven las tormentas.` Color: `Los colores fuertes marcan topes de nube muy fríos, típicos de las tormentas.` + `El cuadro abarca unos {800} km de lado.` + `GOES-East, NASA GIBS.` |
| Satélite: `alt` | `Imagen satelital infrarroja de La Pampa de las {21:40}, centrada en Winifreda` |
| Satélite: cargando | `Cargando imagen` |
| Vacío del satélite | `No hay imagen satelital en este momento.` / `Mientras tanto, podés ver el radar del SMN.` |
| Vacío de la lluvia | `No pudimos calcular la lluvia acumulada.` / `El archivo histórico no está respondiendo. Probá de nuevo en un rato.` |
| Sin climatología | `No pudimos cargar el promedio histórico para comparar.` |
| Datos de lluvia atrasados (Notice) | `Los datos de lluvia llegan hasta el {jueves 23}. Sumamos los días que faltan cuando estén disponibles.` |
| Cargando la página | `Cargando` |
| Confirmación destructiva | no aplica: la fase 5 no tiene acciones destructivas |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| ninguno (shadcn no se inicializa) | — | no aplica: sin registries de terceros. La fase no suma dependencias de UI (suncalc ya está; la imagen satelital la compone o sirve el servidor). Si 05-RESEARCH propone una librería para componer teselas (ej. `sharp`), su vetting (versión, `postinstall`, peso, compatibilidad con Vercel) va en la investigación |

---

## Resumen de decisiones [default] de este UI-SPEC

| # | Decisión |
|---|----------|
| 1 | `/cielo` = Hero `compact` con h1 *Mirando para arriba*, sin `<Freshness>` en el hero; cada bloque informa su propio tiempo |
| 2 | Bloques separados por 48 + hairline ink/12 + 32; se degradan por separado |
| 3 | Cifras grandes en Playfair 28 normal (variante del Headline): sin tamaños nuevos, 3 tamaños y 2 pesos |
| 4 | Sol con suncalc (no Open-Meteo), diferencia con ayer redondeada al minuto, regla del día de 24 h decorativa |
| 5 | Luna: disco de 64 px, terminador vertical sin rotación, iluminada a la izquierda al crecer (hemisferio sur), 8 nombres con ventanas de ±1 día |
| 6 | Barra de lluvia: el mayor (observado o normal) al 80 % del ancho, observado en azure, normal como marca ink con rótulo |
| 7 | Texto comparativo con porcentajes redondeados a 5, "casi lo normal" en ±10 %, "pronto para comparar" con normal < 2 mm, doble/triple desde ×2 |
| 8 | Última lluvia arriba de las filas; fecha absoluta desde los 15 días |
| 9 | Satélite cuadrado, ≥ 684 px y ≤ 200 KB, marcador como capa HTML/SVG, imagen vieja desde 90 min (peach), pie según la paleta real de la capa |
| 10 | Link al SMN con forma de botón de 44 px, siempre visible, acento solo en hover/focus |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS (FLAG: ancla visual agregada)
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-25 (gsd-ui-checker). Notas para el planner: confirmar un solo valor vigente del h1 (28 px, fallback de 02-01) y documentar el estado "Sin datos" de lluvia sin RetryButton como desvío deliberado de DATA-03.
