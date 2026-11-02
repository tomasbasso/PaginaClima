---
phase: 4
slug: pron-stico-con-confianza
status: approved
reviewed_at: 2026-11-01
shadcn_initialized: false
preset: none
created: 2026-11-01
---

# Fase 4 — Contrato de diseño de UI (Pronóstico con confianza)

> Contrato visual y de interacción de la fase 4. Lo generó gsd-ui-researcher, sin preguntas al dueño, y lo verifica gsd-ui-checker.
> Fuentes: `04-CONTEXT.md` (D-01 a D-19), `02-UI-SPEC.md` (anatomía de la fila: **se extiende**), `design/stitch/DESIGN.md`, `app/globals.css`, `components/client/DailyList.tsx`, `lib/forecast/daily.ts`, `lib/weather/wmo.ts`, `components/TabBar.tsx`, `lib/sections.ts` y `app/dev/estados/`.
> **Todas las decisiones de este documento son criterio de Claude.** El dueño las delegó con estas palabras: "Sorpréndeme con todo necesito que atraiga visualmente". Por eso no se marca cada una por separado.
> Lo que fijaron las fases 1 y 2 sigue vigente: radio 0, sin sombras, sin emojis, foco, `formatTemp`, `.nums`, copy de estados. Acá solo se declara lo nuevo.
> **Medición:** los anchos salen de las métricas reales de Plus Jakarta Sans 600/400 y Playfair Display Italic 400 (fuentes variables de `google/fonts`, sin kerning). Los contrastes se calcularon con la fórmula WCAG sobre `#0e131c`. La prueba final es la del navegador (ver "Verificación").

---

## Ajustes respecto de 04-CONTEXT.md

El concepto no cambia: abanico, pluviómetro, rombos y despacho. Hay cinco ajustes de medida, y **solo el primero contradice el texto de una decisión**.

| # | Decisión | Qué no funciona | Cambio mínimo |
|---|----------|-----------------|---------------|
| 1 | D-16: leyenda "de una línea" | Los tres ítems con la frase completa miden **428 px** y la columna, 342. D-12 exige la frase completa en la leyenda, así que las dos decisiones no pueden cumplirse juntas | Leyenda en **dos líneas**: `◆ COINCIDEN  ◈ DUDAN` / `◇ NO SE PONEN DE ACUERDO`, sin puntos medios |
| 2 | D-04, D-08: pluviómetro en el "borde derecho de la fila" | Dentro de la columna le quita 16 px a una barra que necesita lugar para el abanico | El pluviómetro **cuelga en el margen derecho**, fuera de la columna de 342 px. Sigue en el borde de la fila y la barra gana 16 px |
| 3 | Fase 2: mm en Body 15 | "15–120 mm" a 15 px no entra junto al estado | En la línea 2, los mm van en Label numérico 12/600, tracking 0, en azure |
| 4 | Fase 2: grilla `64 36 1fr 36 48` | "−12°" (38,3 px) no entra en 36 px | Grilla `60 40 1fr 36 44`. "Mañana" (55,5) y "95 %" (39,1) siguen entrando |
| 5 | DESIGN.md: regla del callout en peach | Peach está reservado para avisos (D-11) y el despacho se confundiría con un aviso | La regla de 2 px toma el color del veredicto de la semana (ver "Despacho") |

Hay un límite aceptado que el dueño conviene que sepa: a 390×844, con despacho y leyenda, entran **unas 2 filas** en la primera pantalla (la lista arranca cerca de y = 610 con insets). La animación de montaje solo se ve en esas filas. Las demás ya están completas cuando se scrollea. El escalonado completo se ve al expandir a 14 días. No se agrega un observer de scroll porque D-03 pide solo CSS.

---

## Alcance visual de la fase 4

| Entra | Queda afuera |
|-------|--------------|
| Abanico p10–p90 en la barra de cada día | Abanico o probabilidad en el meteograma |
| Pluviómetro y "70 %" por día | Detalle al tocar una fila |
| Rombos, palabra de duda y "SOLO UN MODELO" | Comparación de modelos lado a lado |
| Rango de lluvia desde el día 4 | Coincidencia en el titular de la home |
| Despacho, leyenda, crédito y avisos por fuente | PWA y offline (fase 6) |
| Animación de entrada ≤ 700 ms | Umbral de lluvia importante (≥ 10 mm) |
| Barra de tres pestañas | |
| Estados nuevos en `/dev/estados` | |

### El contrato se sostiene sea cual sea el research

Todavía no hay RESEARCH.md. El contrato no depende de estos datos abiertos:

| Dato abierto | Cómo lo absorbe la UI |
|--------------|-----------------------|
| Si GEM cubre la zona | `N` votantes puede ser 2, 3 o 4. Solo cambia `COINCIDENCIA: {N} MODELOS` en el crédito |
| Horizontes por modelo | Cada día recibe su veredicto: `coinciden`, `dudan`, `desacuerdo`, `solo` o `sinDato`. La fila no cambia de forma por motivos de horizonte |
| Miembros reales del ensemble | El crédito y el `srText` usan el conteo real `M`. "51" es el valor esperado, no una constante visual |
| Días del ensemble | Un día sin dato se dibuja como "Día sin dato de ensemble" (ver "Estados por fila") |
| Umbrales de D-13 | Viven en la función del semáforo. La UI solo recibe el veredicto |

---

## Design System

| Propiedad | Valor |
|-----------|-------|
| Tool | none: sin shadcn, igual que las fases anteriores. No hay `components.json` y no se abre esa pregunta |
| Preset | not applicable |
| Component library | none. Sin `motion` ni dependencias nuevas de UI |
| Icon library | none. Lo único nuevo es el componente `Rombo`, en SVG inline |
| Font | Playfair Display 400 (itálica para el despacho) y Plus Jakarta Sans 400 y 600, sin cambios |

### Token nuevo

```css
/* @theme de app/globals.css */
--color-ember: #e8603a; /* brasa: "no se ponen de acuerdo". Solo rombo vacío y palabra SIN ACUERDO */
```

---

## Spacing Scale

Misma escala de las fases anteriores: todos múltiplos de 4.

| Token | Valor | Uso en la fase 4 |
|-------|-------|------------------|
| xs | 4px | Línea 1 → línea 2, leyenda línea 1 → línea 2, crédito línea 1 → línea 2, separación de columnas a menos de 327 px de columna |
| sm | 8px | Rombo → palabra, palabra → estado, estado → mm (mínimo), columnas de la fila, ancho del pluviómetro, columna → pluviómetro, pluviómetro → borde de pantalla |
| md | 16px | Padding vertical de la fila, despacho → leyenda, separación horizontal entre ítems de la leyenda, regla del despacho → texto |
| lg | 24px | Leyenda → primera fila, aviso → despacho, botón → crédito, última fila → botón (sin cambio), margen lateral |
| xl | 32px | Silueta → primer bloque sobre ground (sin cambio) |
| 2xl | 48px | Crédito → fin de la sección (`pb-12`) |
| 3xl | 64px | Sin uso |

Excepciones justificadas:
- **Glifo `Rombo`:** caja de 12×12 px; trazos de 1,5 y 2 px.
- **Abanico:** banda de 8 px de alto, segmento de 4 px (fase 2) y ancho mínimo de 4 px por lado.
- **Pluviómetro:** los rellenos salen del porcentaje (de 7,7 a 73,2 px), no de la escala. Rayado de 2 px lleno y 2 px vacío, muesca y topes de 1 px.
- **Tiempos de animación:** 420 ms y 40 ms, no son espacio.

---

## Typography

Esta fase no agrega tamaños. Las superficies nuevas usan **3 tamaños (12, 15, 24) y 2 pesos (400, 600)**.

| Rol | Familia | Tamaño | Peso | Line height | Tracking | Uso en la fase 4 |
|-----|---------|--------|------|-------------|----------|------------------|
| Despacho | Playfair Display, **itálica** | 24px | 400 | 1.33 (32px) | 0 | El despacho, máximo 3 líneas a 390 px. Con `text-wrap: pretty`, sin comillas |
| Body | Plus Jakarta Sans | 15px | 400 | 1.6 (24px) | 0 | Línea 1 de la fila, incluido "70 %", y avisos |
| Label | Plus Jakarta Sans | 12px | 600 | 1.33 (16px) | 0.14em en mayúsculas | Palabra de duda, estado, leyenda, crédito, nota de días 8–14, botón |
| Label numérico | Plus Jakarta Sans | 12px | 600 | 1.33 (16px) | 0 | mm y rango de lluvia de la línea 2 |

Reglas:
- Todos los números llevan `.nums`.
- Las temperaturas usan `formatTemp`, con `−`.
- Entre número y unidad va un espacio duro U+00A0 ("70 %", "5–15 mm").
- Las mayúsculas se aplican con CSS: los textos salen en sentence case de tablas locales, como en la fase 1.

---

## Color

| Rol | Valor | Uso |
|-----|-------|-----|
| Dominante (60 %) | `#0e131c` ground | Fondo de toda la sección de la lista |
| Secundario (30 %) | Tinta `#fbfbf2` en opacidades: ink/75, ink/55 e ink/12 | Texto secundario, abanico, hairlines y riel del pluviómetro |
| Acento (10 %) | `--accent` según el cielo | Solo lo heredado |
| Dato: lluvia y coincidencia | `#8ecae6` azure, fijo | "70 %", mm, relleno del pluviómetro y rombo lleno |
| Dato: duda | `#f4c06a` sun, fijo | Rombo medio lleno y palabra DUDAN |
| Dato: sin acuerdo | `#e8603a` ember, fijo | Rombo vacío y palabra SIN ACUERDO |
| Aviso | `#fcd5ce` peach | Solo la regla de `<Notice>` |
| Destructivo | no aplica | La fase no tiene acciones destructivas |

**El acento se reserva para** lo mismo que en la fase 2: pestaña activa, rombo de Ahora, anillo de foco, borde de botones en hover o foco y rombo del scrubber. **Ninguna pieza nueva de esta fase usa `--accent`**: azure, sun y ember codifican datos y no cambian con el cielo.

### Contraste calculado sobre `#0e131c`

| Elemento | Color | Contraste | Requisito | Resultado |
|----------|-------|-----------|-----------|-----------|
| "SIN ACUERDO", 12/600 | ember `#e8603a` | **5,46:1** | 4,5 | Pasa |
| Rombo vacío | ember `#e8603a` | 5,46:1 | 3 | Pasa |
| "DUDAN", 12/600 y rombo | sun `#f4c06a` | **11,16:1** | 4,5 | Pasa |
| "70 %", mm y rombo lleno | azure `#8ecae6` | **10,40:1** | 4,5 | Pasa |
| Relleno sólido del pluviómetro, sobre el riel | azure | 7,54:1 | 3 | Pasa |
| Relleno rayado, días 8+ (promedio del 50 %) | azure | 3,45:1 | 3 | Pasa |
| Estado, leyenda, crédito y "SOLO UN MODELO" | ink/75 | 10,27:1 | 4,5 | Pasa |
| Raya de "SOLO UN MODELO" | ink/55 | 5,98:1 | 3 | Pasa |
| Borde interno de la banda, días 1–7 | ink/45 | 4,39:1 | 3 | Pasa |
| Borde interno de la banda, días 8+ | ink/36 | ≈ 3,2:1 | 3 | Pasa |

Ember contra otros colores: 2,04:1 con sun, 1,90:1 con azure y unos 2,5:1 con peach. **Sun y azure casi no difieren en luminancia (1,07:1)**, así que para una persona con daltonismo la forma del rombo no es opcional: lleno, medio lleno y vacío son la codificación principal, y el color la refuerza.

Azure significa lluvia en la tira y coincidencia en el rombo. Se acepta porque la forma y la posición los separan (D-11).

---

## Composición de `/pronostico` bajo el horizonte

```
banda de 120 px + silueta (sin cambios)
32px
[Aviso, si alguna fuente falló]       <Notice role="status">
[24px]
┃ Hasta el jueves los modelos         Despacho: regla de 2 px + 16 px + Playfair itálica 24/1.33
┃ coinciden. El fin de semana,        máximo 3 líneas a 390 px, 4 a 320 px
┃ dudan.
16px
◆ COINCIDEN     ◈ DUDAN               Leyenda, línea 1
4px
◇ NO SE PONEN DE ACUERDO              Leyenda, línea 2
24px
Filas (7, expandible a 14)            ┐ el pluviómetro cuelga
24px                                  ┘ en el margen derecho
[ VER 14 DÍAS ]                       Sin cambios
24px
PROBABILIDAD: 51 ESCENARIOS DE ECMWF  Crédito, Label ink/75
4px
COINCIDENCIA: 4 MODELOS
48px
```

**Punto focal:** el despacho es lo primero que se lee bajo el horizonte, por su Playfair itálica de 24 px y su regla de 2 px. Después, la vista baja al abanico y a la tira del pluviómetro.

**Sin filas:** se muestra el `<NoData>` de la fase 2, sin despacho, leyenda, crédito ni aviso propio.

---

## Anatomía de la fila

```
                                                       margen 24 px
│◄──────────────── columna 342 px ────────────────►│ 8 │ 8 │ 8 │
 sáb 25   9°   ░▒▓██████████▓▒░    24°        70 %      ▒▒▒
 ◈ DUDAN  CHAPARRONES                      5–15 mm      ███  ← pluviómetro
```

### Línea 1

Grid de 5 columnas con `items-center`:

| Ancho de columna | `grid-template-columns` | Separación | Barra |
|------------------|-------------------------|------------|-------|
| ≥ 327 px | `60px 40px 1fr 36px 44px` | 8 px | 130 px a 390; 115 px a 375 |
| < 327 px | `56px 40px 1fr 32px 44px` | 4 px | 84 px a 320; 124 px a 360 |
| ≥ 327 px, ensemble caído | `60px 40px 1fr 36px 64px` | 8 px | 110 px a 390 |
| < 327 px, ensemble caído | `56px 40px 1fr 32px 64px` | 4 px | 64 px a 320 |

| Columna | Contenido | Estilo |
|---------|-----------|--------|
| Día | `Hoy` · `Mañana` · `sáb 25` | Body 15 ink, izquierda |
| Mín | `9°` · `−12°` · `—` | Body 15 ink/75 `.nums`, derecha |
| Barra | Ver "Abanico" | — |
| Máx | `24°` | Body 15 `.nums`; ink en días 1–7, ink/75 en días 8+ |
| Probabilidad | `70 %` · vacío · `—` | Body 15 azure `.nums`, derecha |

### Línea 2

Fila flex de 16 px, 4 px debajo de la línea 1, con `items-center gap-2 whitespace-nowrap`:

```
[Rombo 12] [palabra] [estado: flex-1 min-w-0 overflow-hidden] [mm: shrink-0, derecha]
```

- **Palabra:** `DUDAN` en sun · `SIN ACUERDO` en ember · `SOLO UN MODELO` en ink/75 · ninguna con acuerdo (D-12).
- **Estado:** Label ink/75. Sin separador, porque el color y los 8 px ya distinguen.
- **mm:** Label numérico en azure, alineado a la derecha, en el mismo eje que el "%".
- **Alto fijo:** la línea 2 se renderiza siempre, con `min-h-4`, aunque esté vacía. Así todas las filas miden lo mismo y el pluviómetro no se deforma. Solo con ensemble y multimodelo caídos vuelve al comportamiento de la fase 2.
- **Alto de fila:** 16 + 24 + 4 + 16 + 16 = **76 px**, más 1 px de hairline desde la segunda fila. Sin cambio respecto de la fase 2.
- **Texto de lluvia:** los días 1 a 3 (índices 0 a 2) muestran `{n} mm` si la lluvia es ≥ 1 mm. Desde el día 4, `{p10}–{p90} mm`, redondeados. Si coinciden al redondear, `{n} mm`. Si p90 < 1 mm, nada.
- **Contradicción aparente (D-10):** ensemble al 60 % y modelo principal por debajo de 1 mm se muestra como "60 %" y pluviómetro, sin mm. No es un error ni lleva aviso.

---

## Presupuesto de ancho

### Línea 1 a 390×844: columna de 342 px

| Pieza | Texto más largo | Medido | Ancho asignado | Sobra |
|-------|-----------------|--------|----------------|-------|
| Día | `Mañana` (`dom 28` = 54,4) | 55,5 | 60 | 4,5 |
| Mín | `−12°` | 38,3 | 40 | 1,7 |
| Barra | — | — | **130** (122 útiles) | — |
| Máx | `38°` | 29,2 | 36 | 6,8 |
| Probabilidad | `95 %` | 39,1 | 44 | 4,9 |
| Separaciones | 4 × 8 | — | 32 | — |
| **Total** | | | **342** | |

Nada se acorta en la línea 1.

### Línea 2: anchos medidos

| Texto | px | Texto | px |
|-------|----|-------|----|
| `TORMENTA CON GRANIZO` | 188,0 | `SOLO UN MODELO` | 134,6 |
| `CHAPARRONES DE NIEVE` | 181,2 | `SIN ACUERDO` | 101,1 |
| `CHAPARRONES FUERTES` | 178,6 | `DUDAN` | 51,9 |
| `LLOVIZNA INTENSA` | 138,6 | `4 mm` | 32,7 |
| `LLOVIZNA HELADA` | 134,3 | `120 mm` | 49,9 |
| `NEVADAS DÉBILES` | 133,9 | `5–15 mm` | 57,4 |
| `CASI DESPEJADO` | 125,5 | `15–120 mm` | 74,6 |
| `ALGO NUBLADO` | 117,2 | `120–250 mm` | 83,2 |

Ancho de los mm: **24,1 + 8,6 × dígitos + 7,5 si hay guion**.

### Qué se acorta y en qué orden

**Nunca se acortan:** el rombo, la palabra ni los mm. Solo cede el estado, en este orden:

1. **Estado completo**, si entra.
2. **Estado corto**, de la tabla de abajo.
3. **Sin estado.** Lo sigue diciendo el `srText`.

No hay puntos suspensivos ni segunda línea. La función es pura, recibe la palabra, el código y el texto de mm, y devuelve **dos textos**:

| Variante | Calculada para | Se muestra con columna |
|----------|---------------|------------------------|
| Normal | 327 px | ≥ 327 px (375, 390, 430 y desktop) |
| Compacta | 272 px | < 327 px (320, 360) |

```
disponible = ancho − [20 si hay glifo] − [palabra + 8] − [mm + 8] − 4 de seguridad
```

Los dos textos van en el HTML y una **container query** elige (`@container` en el bloque de texto de la fila; `@max-[327px]:hidden` y `hidden @max-[327px]:inline`). No depende de JS ni de la hidratación. El `overflow-hidden` del estado es una red de seguridad, no el mecanismo: nunca debería recortar.

| Etiqueta completa | Corta | px |
|-------------------|-------|----|
| Tormenta con granizo | Granizo | 67,2 |
| Chaparrones de nieve | Nieve | 43,1 |
| Chaparrones fuertes, Chaparrones | Chaparrón | 92,7 |
| Llovizna intensa, Llovizna helada | Llovizna | 72,4 |
| Nevadas débiles | Nevadas | 69,3 |
| Casi despejado | Despejado | 86,4 |
| Algo nublado | Nubes | 49,1 |
| Lluvia débil, Lluvia fuerte, Lluvia helada | Lluvia | 51,3 |
| Las demás (Despejado, Cubierto, Niebla, Llovizna, Lluvia, Nevada, Tormenta) | Iguales | — |

### Casos a 390 px (variante normal)

| Combinación | Disponible | Resultado | Ocupa de 342 |
|-------------|------------|-----------|--------------|
| ◆ + `TORMENTA CON GRANIZO` + `15–120 mm` | 220,4 | Completo | 290,6 |
| ◈ `DUDAN` + `TORMENTA CON GRANIZO` + `5–15 mm` | 177,7 | **`GRANIZO`** | 212,5 |
| ◈ `DUDAN` + `CHAPARRONES FUERTES` + `15–120 mm` | 160,5 | **`CHAPARRÓN`** | 255,2 |
| ◇ `SIN ACUERDO` + `TORMENTA CON GRANIZO` + `15–120 mm` | 111,2 | **`GRANIZO`** | 278,9 |
| ◇ `SIN ACUERDO` + `LLUVIA FUERTE` + `15–120 mm` | 111,2 | Completo | 321,1 |
| — `SOLO UN MODELO` + `CASI DESPEJADO` + `5–15 mm` | 95,0 | **`DESPEJADO`** | 314,4 |
| — `SOLO UN MODELO` + `TORMENTA` + `15–120 mm` | 77,8 | **Sin estado** | 245,2 |
| — `SOLO UN MODELO` + `LLOVIZNA` + `15–120 mm` | 77,8 | `LLOVIZNA` | 317,6 |

### A 320 px: columna de 272 px

**Línea 1:** `56 + 40 + 84 + 32 + 44` más 4 × 4 de separación = 272. La barra tiene 84 px, de los que 76 son útiles. "Mañana" entra con 0,5 px de margen; si el navegador lo corta, se revisa contra la verificación. No hay scroll horizontal.

**Línea 2 (variante compacta):**

| Combinación | Disponible | Resultado |
|-------------|------------|-----------|
| ◆ + `TORMENTA CON GRANIZO` + `15–120 mm` | 165,4 | `GRANIZO` |
| ◈ `DUDAN` + `CHAPARRONES FUERTES` + `15–120 mm` | 105,5 | `CHAPARRÓN` |
| ◇ `SIN ACUERDO` + `LLUVIA FUERTE` + `4 mm` | 98,1 | `LLUVIA` |
| ◇ `SIN ACUERDO` + `TORMENTA` + `5–15 mm` | 73,4 | Sin estado |
| — `SOLO UN MODELO` + `DESPEJADO` + sin mm | 105,4 | Completo |
| — `SOLO UN MODELO` + cualquiera + `5–15 mm` | 40,0 | Sin estado |
| — `SOLO UN MODELO` + cualquiera + `120–250 mm` | 14,2 | Sin estado; rombo, palabra y mm entran |

**Test obligatorio:** el producto cartesiano de todos los códigos WMO, las 3 palabras más ninguna, y `—`, `4 mm`, `120 mm`, `5–15 mm`, `15–120 mm` y `120–250 mm`, a 327 y 272 px. El presupuesto nunca da negativo y el texto elegido siempre entra.

---

## Abanico (D-05, D-06)

### Geometría de la celda (16 px de alto)

| Capa, de atrás hacia adelante | Posición | Color |
|-------------------------------|----------|-------|
| Hairline de escala | `inset-x-0`, centrada, 1 px | ink/12 |
| Banda izquierda | `top: 4px`, 8 px de alto | Gradiente |
| Banda derecha | `top: 4px`, 8 px de alto | Gradiente |
| Segmento mín–máx | `top: 6px`, 4 px de alto, mínimo 4 px de ancho | ink; ink/55 en días 8+ |

La banda mide el doble de alto que el segmento a propósito: al mirar la lista se ve la masa que se abre, no un hilo. Sus extremos internos son rectos.

### Área útil y posiciones

Los datos se mapean a la celda **con 4 px libres en cada punta**, para que el ancho mínimo nunca se salga.

```
U = 100% − 8px
segmento:       left:  calc(4px + lo * U);             width: max(4px, calc((hi − lo) * U))
banda izquierda: right: calc(100% − 4px − lo * U);     width: max(4px, calc((lo − bandLo) * U))
banda derecha:   left:  calc(4px + hi * U);            width: max(4px, calc((bandHi − hi) * U))
```

- **Ancho mínimo visible: 4 px por lado**, siempre que el día tenga dato de ensemble, aunque la dispersión sea nula. Así "Hoy" también muestra el principio del abanico.
- La banda izquierda se ancla por `right` y la derecha por `left`: al aplicar el mínimo, crecen hacia afuera y nunca se meten debajo del segmento.

### Gradiente

Va del segmento hacia afuera, sin borde duro en la punta:

| Tramo desde el segmento | Días 1–7 | Días 8+ |
|-------------------------|----------|---------|
| 0 % | ink / 0,45 | ink / 0,36 |
| 55 % | ink / 0,18 | ink / 0,14 |
| 85 % | ink / 0,06 | ink / 0,05 |
| 100 % | ink / 0 | ink / 0 |

```css
/* Banda izquierda, días 1–7. La derecha usa "to right". */
background: linear-gradient(to left,
  rgb(251 251 242 / .45) 0%, rgb(251 251 242 / .18) 55%,
  rgb(251 251 242 / .06) 85%, rgb(251 251 242 / 0) 100%);
```

**Días 8+:** el segmento pasa a ink/55 (fase 2) y la banda baja al 80 % de opacidad. La relación entre ambos queda más pareja y el segmento pierde protagonismo: la fila se lee más difusa, y el borde interno sigue por encima de 3:1.

### Datos y escalas

`DailyBar` suma `bandLo` y `bandHi`, en fracciones de la misma escala, o `null` si no hay dato:

- `bandLo = min(p10 de la mínima, mínima)`. `bandHi = max(p90 de la máxima, máxima)`. El principal y el ensemble pueden no coincidir: el segmento siempre queda adentro de la banda.
- **`bar7`:** el dominio es el mínimo y el máximo de `tMin`, `tMax`, `bandLo` y `bandHi` en grados, de las filas 0 a 6.
- **`bar14`:** lo mismo para las 14 filas.
- **Sin ensemble:** el dominio vuelve a ser `tMin` y `tMax` de la fase 2. Nunca se reservan puntas para bandas que no se dibujan.

---

## Pluviómetro (D-08, D-09)

### Geometría

| Propiedad | Valor |
|-----------|-------|
| Posición | `absolute`, `-right-4`, `w-2`, en el `<li>` con `relative`. Cubre de x = columna + 8 a columna + 16, y deja 8 px hasta el borde de pantalla. No genera scroll horizontal |
| Alto | Todo el `<li>`: `top: -1px` si la fila tiene hairline, `top: 0` si no; `bottom: 0`. Así cubre los `py-4` y el borde superior |
| Riel | `bg-ink/12`, siempre visible con ensemble disponible |
| Relleno | `absolute inset-x-0 bottom-0`, `height: {p}%` en azure, donde `p` es el valor mostrado |
| Muesca | 1 px en `#0e131c` (ground) a `bottom: 50%`, todo el ancho, sobre riel y relleno. Marca la mitad |
| Topes | 1 px ink/55 en todo el ancho |

El rectángulo tiene puntas rectas y no lleva borde, sombra ni redondeo.

### Por qué la tira se lee continua

Las hairlines terminan en el borde de la columna y **el pluviómetro está afuera**, así que nada lo atraviesa. Los `-1px` evitan la rendija del borde. Como el tope visible es 95 %, siempre quedan unos 3,8 px vacíos arriba de cada relleno. Dos días seguidos al 95 % se leen como dos bloques casi pegados: la tira no pierde la división por día y nunca sugiere "100 %".

### Valores de relleno

| Crudo | Mostrado | Número | Relleno de 77 px |
|-------|----------|--------|------------------|
| < 10 % (hasta 5 de 51) | — | Nada | 0, solo el riel |
| 10 % a < 92,5 % | Múltiplo de 5 más cercano | `10 %`…`90 %` | 7,7 a 69,3 px |
| ≥ 92,5 % (incluido 51 de 51) | 95 | `95 %` | 73,2 px |
| Sin dato ese día | — | `—` ink/75 | 0, solo el riel |

El umbral de 10 % se aplica al **valor crudo**, antes de redondear: 5 de 51 es 9,8 % y no se muestra; 6 de 51 es 11,8 % y muestra `10 %`.

### Días 8+: rayado, no atenuado

Los días orientativos usan el mismo azure con un rayado horizontal de grabado:

```css
background: repeating-linear-gradient(to top, #8ecae6 0 2px, transparent 2px 4px);
```

Mantiene el color y dice "esto es otra clase de dato", sin que parezca lluvia más débil.

### Puntas y corte

| Lugar | Comportamiento |
|-------|----------------|
| Primera fila | Tope de 1 px en el borde superior |
| Última fila visible | Tope de 1 px en el borde inferior. Contraída: fila 7. Expandida: fila 14 o la última que exista |
| Fila 7 expandida | Sin tope: la tira sigue |
| Nota `DEL DÍA 8 EN ADELANTE, ORIENTATIVO` | **La tira no se corta.** El `<p>` lleva `relative` y su propio tramo de riel, `-right-4 w-2 -top-px bottom-0 bg-ink/12`, sin relleno ni muesca: 49 px de riel vacío. Es lo que separa la semana de lo orientativo. Se oculta junto con la cola |
| Primera fila de la cola | No tiene hairline, así que usa `top: 0` y empalma con el tramo de la nota |
| Botón y crédito | No tienen tira |

### Estado vacío

Con probabilidad bajo 10 % queda el riel ink/12 con su muesca, sin número. **Semana seca:** una tira entera vacía, con sus dos topes y sin texto extra: el silencio es el mensaje. Con ensemble caído **no hay riel ni topes**: la columna vacía del margen no se reserva.

---

## Rombos (D-11, D-12, D-14)

Componente único `Rombo`, usado en la fila y en la leyenda. **Nunca Unicode.** Todos: `width="12" height="12" viewBox="0 0 12 12"`, `aria-hidden="true"`, `focusable="false"`, `className="shrink-0"`, `stroke-linejoin="miter"`, `fill="none"` salvo donde se indique.

| Tipo | Geometría | Color | Significado |
|------|-----------|-------|-------------|
| `coinciden` | `<path d="M6 1.25 10.75 6 6 10.75 1.25 6Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>` | azure | Lleno |
| `dudan` | `<path d="M6 1.25 10.75 6 6 10.75 1.25 6Z" stroke="currentColor" stroke-width="1.5"/>` y `<path d="M1.25 6H10.75L6 10.75Z" fill="currentColor"/>` | sun | Contorno con **la mitad inferior llena**, como el horizonte |
| `desacuerdo` | `<path d="M6 1.5 10.5 6 6 10.5 1.5 6Z" stroke="currentColor" stroke-width="2"/>` | ember | Vacío con contorno marcado |
| `solo` | `<path d="M2 6H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="butt"/>` | ink/55 | Raya tenue, no es un rombo |

Las tres siluetas llenan la misma caja: con inglete a 90° la punta queda a 0,19 px del borde en los dos primeros y a 0,09 px en el vacío. El color se fija con `text-azure`, `text-sun`, `text-ember` o `text-ink/55` en el SVG.

Con veredicto `sinDato` la fila no lleva glifo. Nunca se muestra un acuerdo falso (D-14).

---

## Despacho (D-15)

`buildDespacho(veredictos de las primeras 7 filas, hoy): string | null`, pura y con tests. Máximo 82 caracteres (el caso más largo es la regla 2 con "El miércoles"). Sin signos de exclamación. No cambia al expandir.

| Elemento | Contrato |
|----------|----------|
| Contenedor | `<p>` con `border-l-2`, `pl-4` |
| Texto | Playfair itálica 24/1.33 ink, `text-wrap: pretty` |
| Ancho útil | 324 px a 390. Alto máximo: 3 líneas (96 px) a 390; 4 líneas (128 px) a 320 |
| Regla | **azure** si la semana entera coincide · **sun** si hay duda y ningún desacuerdo · **ember** si hay algún desacuerdo · **ink/30** si manda "pocos modelos" o la regla 7b |

### Reglas, en orden de prioridad

Los días se nombran como `hoy`, `mañana` o `el jueves`. Los días `solo` y `sinDato` no cuentan como coincidencia ni como duda, excepto en la regla 1.

| # | Condición | Frase | Ejemplo |
|---|-----------|-------|---------|
| 0 | Multimodelo caído, o menos de 3 días con veredicto | Sin despacho | — |
| 1 | ≥ 4 días `solo` | Esta semana hay pocos modelos para comparar. | Igual |
| 2 | Un solo día `desacuerdo`, los demás coinciden | {Día} los modelos no se ponen de acuerdo. El resto de la semana, coinciden. | El sábado los modelos no se ponen de acuerdo. El resto de la semana, coinciden. |
| 3 | Un solo día `desacuerdo`, resto mezclado | {Día} los modelos no se ponen de acuerdo. | Mañana los modelos no se ponen de acuerdo. |
| 4 | Dos días seguidos `desacuerdo` y ningún otro | Para {día} y {día} no hay acuerdo entre los modelos. | Para el miércoles y el jueves no hay acuerdo entre los modelos. |
| 5 | Tres o más seguidos y ningún otro | {Del miércoles al viernes} no hay acuerdo entre los modelos. | Del miércoles al viernes no hay acuerdo entre los modelos. |
| 6 | Cualquier otro caso con varios días `desacuerdo` | Esta semana los modelos no se ponen de acuerdo en varios días. | Igual |
| 7 | Todos coinciden, sin días `solo` ni `sinDato` | Toda la semana los modelos coinciden. | Igual |
| 7b | Todos los días comparables coinciden, con algún día `solo` o `sinDato` | Los días que se pueden comparar, los modelos coinciden. | Igual |
| 8 | Duda solo en sábado y domingo seguidos, con al menos un día que coincide antes | Hasta el viernes los modelos coinciden. El fin de semana, dudan. Si el viernes es hoy o mañana, se nombra así: "Hoy los modelos coinciden. El fin de semana, dudan." | Igual |
| 9 | Coinciden al principio, dudan hasta el final | Hasta {día} los modelos coinciden. Después, dudan. | Hasta el jueves los modelos coinciden. Después, dudan. |
| 10 | Dudan al principio, coinciden hasta el final | {Hasta el lunes} los modelos dudan. Desde {día} se acomodan. | Hoy y mañana los modelos dudan. Desde el miércoles se acomodan. |
| 11 | ≥ 5 de 7 días `dudan` | Semana difícil de leer: los modelos dudan casi todos los días. | Igual |
| 12 | Cualquier otra mezcla | Los modelos coinciden algunos días y dudan otros. | Igual |

**Casos con hoy y mañana:** "Hoy los modelos coinciden. Después, dudan." · "Hasta mañana los modelos coinciden. Después, dudan." · "Hoy los modelos dudan. Desde mañana se acomodan." · "Hoy y mañana los modelos dudan. Desde el miércoles se acomodan."

Si la lista tiene menos de 7 filas (snapshot viejo) y todas coinciden, la regla 7 dice "Hasta el {último día} los modelos coinciden."

---

## Leyenda y crédito (D-16)

**Leyenda:** `<ul aria-label="Qué significan los rombos">`, `flex flex-wrap gap-x-4 gap-y-1`, debajo del despacho. Cada ítem: `Rombo` + 8 px + Label ink/75.

| Línea | Contenido | Ancho a 390 |
|-------|-----------|-------------|
| 1 | `◆ COINCIDEN` y `◈ DUDAN` | 192,6 de 342 |
| 2 | `◇ NO SE PONEN DE ACUERDO` | 219,7 de 342 (también entra en 272) |

La leyenda aparece junto con el despacho: si no hay veredictos, no hay ninguno de los dos. No lleva tooltips ni modales. Con `solo`, la fila ya lo dice en palabras.

**Crédito:** al pie, después del botón, Label ink/75, dos `<p>` separados 4 px. Con ensemble en falla se omite la primera línea; con multimodelo en falla, la segunda. Si faltan los dos, no hay crédito. Si no hay botón, el crédito va 24 px debajo de la última fila. `PROBABILIDAD: 51 ESCENARIOS DE ECMWF` mide 315,6 px: entra en una línea a 390 y pasa a dos a 320, lo que se acepta.

---

## Animación de entrada (D-03)

Solo CSS. Sin `motion`, sin estado de React y sin `useEffect`.

| Parámetro | Valor |
|-----------|-------|
| Qué se anima | Bandas (`scaleX` desde 0, desde su borde interno) y relleno del pluviómetro (`scaleY` desde 0, desde abajo) |
| Qué no se anima | Texto, rombos, segmento sólido, riel, hairlines. El dato está desde el primer cuadro |
| Duración | **420 ms** por pieza |
| Curva | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Escalonado | **40 ms por fila**, de arriba hacia abajo, con `--i` inline |
| Total, 7 filas | 6 × 40 + 420 = **660 ms** ≤ 700 |
| Total, cola de 7 al expandir | Igual: `--i` vuelve a 0 en la fila 8. **660 ms** |

```css
@keyframes abanico-abrir { from { transform: scaleX(0); } }
@keyframes pluvio-llenar { from { transform: scaleY(0); } }

.abanico-l, .abanico-r, .pluvio-relleno {
  animation-duration: 420ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: backwards;
  animation-delay: calc(var(--i, 0) * 40ms);
}
.abanico-l { animation-name: abanico-abrir; transform-origin: right center; }
.abanico-r { animation-name: abanico-abrir; transform-origin: left center; }
.pluvio-relleno { animation-name: pluvio-llenar; transform-origin: bottom; }
```

**Las keyframes no tienen `to`:** el estado final es el estilo natural del elemento. El servidor renderiza la geometría final.

| Situación | Qué pasa |
|-----------|----------|
| SSR e hidratación | La animación arranca con el HTML, antes del JS. `--i` es igual en servidor y cliente. React no reemplaza el DOM, así que la hidratación no la reinicia |
| Sin JS | Corre igual y termina en el estado final |
| `router.refresh()` de `Freshness` | Las claves se mantienen, por lo que no se reinicia. Una fila nueva por cambio de día se anima sola, y es aceptable |
| `prefers-reduced-motion` | La regla global de `globals.css` ya pone `animation: none` y `transition: none`. Se ve el estado final de entrada. No hace falta código nuevo |
| **Expandir a 14** | La cola pasa de `display: none` a visible y el navegador arranca sus animaciones: bandas y rellenos de las filas 8–14 se abren en 660 ms. La nota y el texto aparecen al instante. El foco queda en el botón |
| **Filas 1–7 al expandir** | Pasan de `bar7` a `bar14` con una transición de `left`, `right` y `width` de 420 ms y la misma curva, **sin** reabrirse. Revisa el "sin animación" de la fase 2, como autoriza D-03 |
| Contraer | La cola desaparece al instante y las filas 1–7 vuelven a `bar7` en 420 ms |
| Volver a expandir | La cola se anima de nuevo, sin JS extra |
| Ensemble caído | No hay piezas para animar |

---

## Estados por fila

| Caso | Barra | Línea 1, última columna | Glifo y palabra | mm | Pluviómetro |
|------|-------|------------------------|-----------------|-----|-------------|
| Datos completos, coinciden | Abanico | `70 %` | ◆ | Línea 2 | Relleno |
| Dudan | Abanico | `70 %` | ◈ `DUDAN` | Línea 2 | Relleno |
| Sin acuerdo | Abanico | `70 %` | ◇ `SIN ACUERDO` | Línea 2 | Relleno |
| Un solo modelo | Abanico | `70 %` | Raya `SOLO UN MODELO` | Línea 2 | Relleno |
| 2 modelos | Abanico | `70 %` | ◆ si no difieren; ◈ `DUDAN` si difieren. **Nunca ◇** | Línea 2 | Relleno |
| Día `sinDato` de multimodelo | Abanico | `70 %` | Nada | Línea 2 | Relleno |
| Día sin dato de ensemble | Sin banda; escala igual | `—` ink/75 | Según veredicto | Lluvia del modelo principal en línea 2, también desde el día 4 | Solo riel |
| Probabilidad < 10 % | Abanico | Vacío, conserva el ancho | Según veredicto | Línea 2 si corresponde | Solo riel |
| Probabilidad ≥ 92,5 % | Abanico | `95 %` | Según veredicto | Línea 2 | 95 % |
| Temperatura `null` | Solo hairline | Según ensemble | Según veredicto | Línea 2 | Según ensemble |

**Tocar una fila no hace nada** (fase 2). Sin hover ni estado activo.

---

## Fallas por fuente (D-17)

La fila vuelve por partes al aspecto de la fase 2. `/pronostico` nunca se rompe.

| Ensemble | Multimodelo | Barra | Última columna | Línea 2 | Tira | Despacho y leyenda | Crédito | Aviso |
|----------|-------------|-------|----------------|---------|------|--------------------|---------|-------|
| Ok | Ok | Abanico | `%` | Rombo, palabra, estado, mm | Sí | Sí | Las dos | No |
| **Falló** | Ok | Sin banda; dominio de fase 2 | **`{n} mm`** Body 15 azure | Rombo, palabra, estado | No | Sí | Solo COINCIDENCIA | Ensemble |
| Ok | **Falló** | Abanico | `%` | Estado, mm | Sí | No | Solo PROBABILIDAD | Multimodelo |
| **Falló** | **Falló** | Fase 2 | `{n} mm` | Estado, solo si hay | No | No | Sin crédito | Ambos |

**Último dato bueno:** si la fuente falló pero hay un resultado anterior, la fila se ve completa y el aviso cambia a la copy de "último dato". Un día pasado del dato viejo no se muestra.

Hay un solo `<Notice role="status">` por pantalla: si fallaron las dos fuentes va la copy de "ambos". El aviso de la fuente principal, en el encabezado, sigue independiente de la fase 2.

---

## Barra de pestañas (D-19)

Tres pestañas: **Ahora, Pronóstico, Cielo**.

| Medida | Valor |
|--------|-------|
| Ancho de cada una | `flex-1`: 130 px a 390, 106,7 px a 320, 186,7 px a partir de 560 px |
| Alto, íconos, etiquetas, subrayado | Sin cambios |

Modelos se borra por completo:
- De `lib/sections.ts`: la entrada, el `SectionId` y el comentario que la menciona.
- De `components/TabBar.tsx`: el ícono `modelos`.
- De `lib/sections.test.ts`: la aserción, y el título del test debe dejar de nombrarla.
- No existe la ruta `/modelos`, así que no hay redirección ni 404 nuevos.

La rama `aria-disabled` de `TabBar.tsx` queda sin uso y no tiene efecto visual. Queda fuera de este contrato: la decide el plan.

---

## Copywriting Contract

Castellano rioplatense, voseo, sin emojis y sin signos de exclamación.

| Elemento | Copy |
|----------|------|
| CTA principal | Sin cambios: `VER 14 DÍAS` / `VER 7 DÍAS` |
| Leyenda | `COINCIDEN` · `DUDAN` · `NO SE PONEN DE ACUERDO` |
| Palabras en la fila | `DUDAN` · `SIN ACUERDO` · `SOLO UN MODELO` |
| Crédito | `PROBABILIDAD: {M} ESCENARIOS DE ECMWF` / `COINCIDENCIA: {N} MODELOS` |
| Nota de días 8–14 | Sin cambios: `DEL DÍA 8 EN ADELANTE, ORIENTATIVO` |
| Falló el ensemble | Ahora no tenemos la probabilidad de lluvia ni el rango de temperatura. El resto del pronóstico sigue al día. |
| Falló el ensemble, y otra fuente no está al día | Ahora no tenemos la probabilidad de lluvia ni el rango de temperatura. Te mostramos el resto del pronóstico. |
| Falló el ensemble, con último dato | No pudimos actualizar la probabilidad de lluvia. Te mostramos la última que tenemos, de las {HH:mm}. Si es de otro día: del {dd/MM} a las {HH:mm}. |
| Falló el multimodelo | Ahora no podemos comparar los modelos, así que esta vez no hay rombos. El resto del pronóstico sigue al día. |
| Falló el multimodelo, y otra fuente no está al día | Ahora no podemos comparar los modelos, así que esta vez no hay rombos. Te mostramos el resto del pronóstico. |
| Falló el multimodelo, con último dato | No pudimos actualizar la comparación entre modelos. Te mostramos la última que tenemos, de las {HH:mm}. Si es de otro día: del {dd/MM} a las {HH:mm}. |
| Fallaron los dos | Ahora no tenemos la probabilidad de lluvia ni la comparación entre modelos. Te mostramos el pronóstico principal. |
| Fallaron los dos, con último dato | No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, de las {HH:mm}. Si es de otro día: del {dd/MM} a las {HH:mm}. |
| Despacho, sin coincidencias en los días comparables | Los días que se pueden comparar, los modelos dudan. |
| Estado vacío de la lista | El `<NoData>` de la fase 2, sin cambios: *Ahora no tenemos el tiempo de Winifreda.* / El servicio del pronóstico no está respondiendo. Probá de nuevo en unos minutos. / `REINTENTAR` |
| Descripción SEO de `/pronostico` | Pronóstico extendido de 7 a 14 días para Winifreda, La Pampa: máximas y mínimas, probabilidad real de lluvia y cuánto coinciden los modelos, en hora argentina. |
| Título SEO | Sin cambios |
| Confirmación destructiva | No aplica: la fase no tiene acciones destructivas |

### `srText` completo

Forma: `{día}: {estado}, mínima {t}, máxima {t}, {lluvia}. {probabilidad}. {rango, solo desde el día 4}. {coincidencia}.`

El día va en forma larga ("Sábado 25", no "sáb 25"), con `Hoy` y `Mañana` sin cambios. El estado siempre va **completo**, aunque en pantalla esté acortado u omitido. La probabilidad usa el **conteo real**, también cuando no se muestra número.

| Caso | Texto |
|------|-------|
| Coinciden, día cercano | Mañana: algo nublado, mínima 7 grados, máxima 19 grados, sin lluvia significativa. 8 de 51 escenarios traen lluvia. Los modelos coinciden. |
| Dudan, día 5 | Sábado 25: chaparrones fuertes, mínima 9 grados, máxima 24 grados, entre 5 y 15 milímetros de lluvia. 36 de 51 escenarios traen lluvia. La temperatura podría ir de 6 a 27 grados. Los modelos dudan. |
| Sin acuerdo, día 6 | Domingo 26: tormenta con granizo, mínima 11 grados, máxima 26 grados, entre 15 y 120 milímetros de lluvia. 40 de 51 escenarios traen lluvia. La temperatura podría ir de 7 a 31 grados. Los modelos no se ponen de acuerdo. |
| Un solo modelo | Jueves 6: cubierto, mínima 8 grados, máxima 18 grados, sin lluvia significativa. 12 de 51 escenarios traen lluvia. La temperatura podría ir de 3 a 24 grados. Hay un solo modelo para este día, no se puede comparar. |
| 2 modelos, coinciden | Martes 4: despejado, mínima 6 grados, máxima 22 grados, sin lluvia significativa. 3 de 51 escenarios traen lluvia. La temperatura podría ir de 2 a 27 grados. Los 2 modelos con dato coinciden. |
| Tope visual | Viernes 24: lluvia, mínima 12 grados, máxima 17 grados, entre 20 y 45 milímetros de lluvia. 51 de 51 escenarios traen lluvia. La temperatura podría ir de 10 a 20 grados. Los modelos coinciden. |
| Día sin dato de ensemble | Lunes 10: cubierto, mínima 8 grados, máxima 16 grados, 3 milímetros de lluvia. Sin dato de probabilidad. Los modelos dudan. |
| Ensemble caído | Mañana: chaparrones, mínima 7 grados, máxima 19 grados, 4 milímetros de lluvia. Los modelos dudan. |
| Multimodelo caído | Mañana: chaparrones, mínima 7 grados, máxima 19 grados, 4 milímetros de lluvia. 30 de 51 escenarios traen lluvia. |
| Los dos caídos | Mañana: chaparrones, mínima 7 grados, máxima 19 grados, 4 milímetros de lluvia. |

Las celdas visuales siguen `aria-hidden`. El `<li>` sigue llevando el `srText` en `sr-only`.

---

## `/dev/estados`

Se suma la sección **"Pronóstico con confianza"**. Cada cuadro usa `DailyFrame` y fixtures del modelo de vista (`DailyRow` extendido), no respuestas crudas: así los cuadros no dependen de la forma que defina el research.

| # | Cuadro | Qué debe mostrar |
|---|--------|------------------|
| 1 | Datos completos · 7 días | Abanico que se abre, tira con lluvia, los 3 rombos, despacho, leyenda y crédito |
| 2 | Datos completos · 14 días | Con `initialExpanded`: corte con riel vacío, rayado en 8+, topes correctos |
| 3 | Falló el ensemble | Grilla de fallback, mm en línea 1, sin tira, aviso; rombos, despacho y leyenda presentes |
| 4 | Ensemble · último dato bueno | Fila completa + aviso con hora |
| 5 | Falló el multimodelo | Sin rombos, despacho ni leyenda; abanico y tira presentes; aviso |
| 6 | Multimodelo · último dato bueno | Fila completa + aviso con hora |
| 7 | Fallaron los dos | Igual que la fase 2, con un solo aviso y sin crédito |
| 8 | Solo un modelo | Días con raya y `SOLO UN MODELO`; despacho "pocos modelos" con regla ink/30 |
| 9 | 2 modelos | ◆ y ◈, nunca ◇; crédito `COINCIDENCIA: 2 MODELOS` |
| 10 | Probabilidad baja | Crudos de 2, 5 de 51 (9,8 %, sin número), 6 de 51 (`10 %`) y 8 de 51 |
| 11 | ≥ 95 % | Tres días seguidos: 48, 50 y 51 de 51, todos `95 %`, con bloques separados |
| 12 | Semana seca | Tira vacía, sin números ni mm; abanico y rombos presentes |
| 13 | Día sin dato de ensemble | `—`, solo riel, mm del modelo principal en un día ≥ 4 |
| 14 | Textos largos · 390 | Los casos de "Casos a 390 px" |
| 15 | Textos largos · 320 | Mismo fixture en un cuadro de `w-[320px]`. Primer caso: `SOLO UN MODELO` + `120–250 mm` sin estado, el más ajustado (261,8 de 272 px). Suma los 7 días de la semana, fechas de dos dígitos, `−12°` y `95 %` |
| 16 | Despachos | Una frase por cada regla, en su regla de color, a 390 y 320 |

Los cuadros existentes (nulos, días pasados, degradado, vacío) siguen. `DailyFrame` necesita un ancho configurable para el cuadro 15.

---

## Verificación en el navegador

Criterios de aceptación, a 390×844 y a 320×568, con DevTools:

1. **La prueba clave:** con los 14 días abiertos y sin leer un número, se ve dónde se abre el abanico, cuándo llueve y qué días hay duda.
2. `document.documentElement.scrollWidth === innerWidth` en los cuadros 2, 14 y 15.
3. En los cuadros 14 y 15, `scrollWidth <= clientWidth` en cada estado y en la línea 2 completa: nada recortado y nada invade el margen del pluviómetro. Texto a la vista sin solaparse con los mm. Los anchos se comprueban con `.nums` activo, porque las medidas no aclaran si usaron dígitos tabulares.
4. Tira sin rendijas entre filas contiguas a escala 2× y 3×, incluidos los empalmes con la nota de días 8+.
5. Rombos y raya alineados con el texto y nítidos a 1×, 2× y 3×.
6. Con "reducir movimiento", ninguna pieza se mueve y todas están en su estado final en el primer cuadro.
7. Medir la duración de entrada: última pieza quieta en ≤ 700 ms, en montaje y al expandir.
8. Primera pantalla a 390×844 con insets 47/34 y despacho de 3 líneas: primera fila completa y parte de la segunda encima de la barra. El tope de 3 líneas no está medido: hay que probar las frases más largas de las reglas 2 y 3 en el cuadro 16. Si no se cumple, se documenta y se vuelve a este contrato; no se achica nada por cuenta propia.
9. La barra tiene 3 pestañas y `/modelos` sigue dando 404.
10. Los anchos medidos no tienen kerning: si el navegador contradice una tabla, manda el navegador y se ajusta la tabla, no el orden de acortado.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Ninguno (shadcn no se inicializa) | — | No aplica: sin registries de terceros ni dependencias nuevas de UI |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: FLAG (no bloquea: `REINTENTAR` heredado de la fase 2)
- [x] Dimension 2 Visuals: FLAG resuelto (punto focal declarado)
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-11-01 por gsd-ui-checker, sin cuestiones bloqueantes. El dueño todavía no vio una maqueta. Los riesgos de ancho quedan a cargo de "Verificación en el navegador".
