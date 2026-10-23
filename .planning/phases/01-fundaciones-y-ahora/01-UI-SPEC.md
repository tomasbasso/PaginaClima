---
phase: 1
slug: fundaciones-y-ahora
status: approved
reviewed_at: 2026-10-23
shadcn_initialized: false
preset: none
created: 2026-10-23
---

# Fase 1 — Contrato de diseño de UI (Fundaciones y Ahora)

> Contrato visual y de interacción de la fase 1. Lo generó gsd-ui-researcher y lo verifica gsd-ui-checker.
> Fuentes: `design/stitch/DESIGN.md` ("Pampa Cielo Editorial"), las capturas aprobadas `design/stitch/home-tarde-v2.png`, `home-atardecer.png` y `home-tormenta.png`, las decisiones que tomó el usuario en esta sesión (bloqueadas), REQUIREMENTS.md, ROADMAP.md y `.planning/research/*`.
> Cuando este documento y DESIGN.md no coinciden, **manda este documento**. Más abajo están las diferencias justificadas.

---

## Alcance visual de la fase 1

| Entra en la fase 1 | Queda para después |
|--------------------|--------------------|
| Pantalla **Ahora**: encabezado, temperatura gigante, estado + sensación, fila de datos con hairlines y "actualizado hace X min" | Titular editorial (NOW-03): **fase 2** |
| Cielo **estático con gradiente CSS** según la hora y el tiempo (6 estados), con tokens listos para que la fase 3 lo reemplace | Cielo generativo en WebGL: **fase 3** |
| Silueta del horizonte pampeano en SVG estático (llanura, alambrado, molino, caldenes) | Animación de la silueta / parallax: fase 3 (opcional) |
| Barra de pestañas inferior con 4 secciones (solo Ahora activa) | Contenido de Pronóstico (fase 2), Modelos (fase 4) y Cielo (fase 5) |
| Estados de carga, desactualizado, fuente caída y sin datos | Offline con service worker: fase 6 |

**Titular editorial en la fase 1: se omite, sin placeholder.** Un titular de relleno ("Hoy en Winifreda") sería falso y le restaría peso al de la fase 2. La pantalla queda en el orden encabezado → temperatura, y el componente `Ahora` recibe la prop opcional `headline?: string`. Si viene, se renderiza en su slot (ver Layout); si no viene, el slot no ocupa espacio. En la fase 2 solo hay que pasar la prop.

---

## Design System

| Propiedad | Valor |
|-----------|-------|
| Tool | none: sin shadcn ni librería de componentes. El sistema "Pampa Cielo Editorial" (0 px de radio, sin cards, sin sombras) choca con los defaults de shadcn y la investigación del stack descartó usar una librería. Los tokens viven en `app/globals.css` dentro de `@theme` (Tailwind v4, sin `tailwind.config.js`) |
| Preset | not applicable |
| Component library | none (componentes propios en `components/`) |
| Icon library | none: 4 íconos de línea propios en SVG inline, solo para la barra de pestañas (ver "Íconos"). No se usan íconos de clima genéricos en ningún lado |
| Font | Playfair Display (serif: números grandes en redonda y frases editoriales en itálica) + Plus Jakarta Sans (datos y etiquetas), las dos con `next/font/google` |

### Fuentes (`app/layout.tsx`)

| Familia | Config de `next/font` | Variable CSS | Uso |
|---------|-----------------------|--------------|-----|
| Playfair Display | `weight: ['400']`, `style: ['normal','italic']`, `subsets: ['latin']`, `display: 'swap'` | `--font-serif` | Temperatura, valores de la fila de datos, encabezado del estado sin datos (itálica) y el futuro titular (itálica) |
| Plus Jakarta Sans | `weight: ['400','600']`, `subsets: ['latin']`, `display: 'swap'` | `--font-sans` | Todo lo demás |

- Los números siempre van con `font-variant-numeric: lining-nums tabular-nums`, para que "hace 9 min" → "hace 10 min" no haga saltar el layout.
- Las temperaturas negativas llevan el signo menos tipográfico `−` (U+2212), no el guion. En Playfair a 112 px, el guion se ve como un punto.

### Tokens de Tailwind v4 (`@theme` en `app/globals.css`)

```css
@theme {
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-jakarta);

  --color-ink: #fbfbf2;          /* texto crema (parchment) */
  --color-ground: #0e131c;       /* zona de tierra / fondo base */
  --color-silhouette: #0f141d;   /* relleno de la silueta pampeana */
  --color-bar: #090e17;          /* barra de pestañas */
  --color-azure: #8ecae6;        /* acento día/noche/cubierto */
  --color-sun: #f4c06a;          /* acento amanecer/atardecer */
  --color-storm: #b9b7f0;        /* acento tormenta */
  --color-peach: #fcd5ce;        /* avisos (desactualizado / fuente caída) */
}
```

- La opacidad de la tinta se usa con el modificador de Tailwind: `text-ink`, `text-ink/75`, `text-ink/55`, `border-ink/12`, `border-ink/20` y `border-ink/30`.
- **Radio 0 en todo:** está prohibido usar utilidades `rounded-*`. Tampoco van `shadow-*` ni `backdrop-blur-*`, ni emojis.
- El acento cambia según el estado del cielo a través de la custom property `--accent` (ver "Color"). En el código se usa `text-[var(--accent)]` / `bg-[var(--accent)]`, o se registra `--color-accent: var(--accent)` en `@theme inline`.

---

## Spacing Scale

Valores declarados (todos múltiplos de 4):

| Token | Valor | Uso |
|-------|-------|-----|
| xs | 4px | Separación entre el número y el "°", y entre el ícono y la etiqueta de cada pestaña |
| sm | 8px | Separación entre etiqueta y valor en la fila de datos, entre ciudad y fecha en el encabezado, y entre estado y sensación |
| md | 16px | Padding vertical de la fila "actualizado", separación entre la fila de datos y la línea de ráfagas |
| lg | 24px | **Margen lateral de la pantalla** (equivale a `1.5rem` de DESIGN.md), padding superior debajo del safe area y separación titular → temperatura |
| xl | 32px | Separación entre el bloque temperatura/estado y la primera hairline |
| 2xl | 48px | Separación encabezado → (titular o temperatura) |
| 3xl | 64px | Separación mínima entre el final del contenido y el comienzo de la banda del horizonte |

Excepciones (todas justificadas):
- **Hairlines de 1 px** (horizontales y verticales), y **2 px** para la regla vertical de los avisos.
- **Barra de pestañas:** 56px de alto + `env(safe-area-inset-bottom)`. Cada pestaña tiene un área táctil mínima de 44×44px.
- **Banda del horizonte:** 240px de alto en total. Adentro va la silueta SVG de 120px, anclada abajo.
- **Botón "Reintentar":** 44px de alto (mínimo táctil de iOS).
- **Rombo del estado:** 6×6px (un cuadrado rotado 45°).
- **Safe areas:** el padding superior del hero es `calc(env(safe-area-inset-top) + 24px)`, y los laterales `max(24px, env(safe-area-inset-left/right))`.
- DESIGN.md usa 6 / 12 / 40 / 72 px (`space-xs`…`space-xl`). Para que todo sea múltiplo de 4, en la fase 1 se reemplazan por 4 / 8 / 16 / 24 / 32 / 48 / 64. El margen lateral de 24px se mantiene igual.

---

## Typography

Hay exactamente **4 tamaños** y **2 pesos** (400 y 600).

| Rol | Familia | Tamaño | Peso | Line height | Tracking | Uso en la fase 1 |
|-----|---------|--------|------|-------------|----------|------------------|
| Display | Playfair Display, redonda | 112px | 400 | 1.0 (112px) | −0.03em | Temperatura actual |
| Heading | Playfair Display, redonda (itálica solo en el estado sin datos) | 24px | 400 | 1.33 (32px) | 0 | Valores de la fila de datos (38, 1012, 18), el "°" de la temperatura y el título del estado sin datos |
| Body | Plus Jakarta Sans | 15px | 400 | 1.6 (24px) | 0 | Fecha y hora, "sensación 23°", unidades (%, hPa, km/h), línea de ráfagas y texto de los avisos |
| Label | Plus Jakarta Sans, MAYÚSCULAS (salvo las pestañas) | 12px | 600 | 1.33 (16px) | 0.14em (ciudad: 0.18em; pestañas: 0.02em y sin mayúsculas) | "WINIFREDA, LA PAMPA", "ART", estado ("DESPEJADO"), etiquetas de la fila de datos, "ACTUALIZADO HACE X MIN", "ESTIMADO POR MODELO", texto del botón y pestañas |

Diferencias con DESIGN.md, a propósito:
- La temperatura va a **112px** y no a los 64px de `display-hero-mobile`, porque las capturas aprobadas muestran el número a unos 104–128px en 390px de ancho. "Temperatura gigante" es una decisión bloqueada.
- No se usa el peso 300 de `body-lg`. Plus Jakarta 300 a 15px sobre el cielo no llega a AA, y el contrato pide 2 pesos.
- `label-sm` (10px) no se usa: todas las etiquetas van a 12px.
- Las pestañas van en minúscula con mayúscula inicial ("Pronóstico"). Así entran 4 en 390px (cada una mide 97,5px): en mayúsculas con tracking de 0.14em, "PRONÓSTICO" no entra.
- La fase 2 va a sumar el rol **Headline** (Playfair itálica a 32px y 1.19 de interlineado, `headline-lg-mobile`) para el titular. Lo declara el UI-SPEC de la fase 2, no este.

---

## Color

Se repite el 60/30/10, adaptado a una app donde el fondo es el cielo:

| Rol | Valor | Uso |
|-----|-------|-----|
| Dominante (60 %) | Gradiente del cielo según el estado (tabla de abajo). La zona de contenido siempre es oscura (L ≤ 0,075) | Fondo del hero, detrás de todo el contenido de Ahora |
| Secundario (30 %) | `#0e131c` ground · `#0f141d` silhouette · `#090e17` bar | Silueta pampeana, tierra y barra de pestañas |
| Acento (10 %) | `--accent`: `#8ecae6` (azure) por defecto, `#f4c06a` (sun) en amanecer y atardecer, `#b9b7f0` (storm) en tormenta | Solo lo que dice la lista de abajo |
| Aviso | `#fcd5ce` (peach) | Regla vertical y etiqueta de los avisos de dato desactualizado o fuente caída |
| Destructivo | no aplica | En la fase 1 no hay acciones destructivas |

**El acento se reserva para:**
1. El ícono, la etiqueta y el subrayado de 16×1px de la pestaña activa (Ahora).
2. El rombo de 6px que va antes del estado del tiempo ("◆ DESPEJADO").
3. El anillo de foco (`outline: 2px solid var(--accent); outline-offset: 2px`, sin radio).
4. El borde del botón "Reintentar" en hover/focus (en reposo es `border-ink/30`).

El acento no se usa en ningún otro lado. Los valores, etiquetas y hairlines son crema.

### Tinta (texto) y reglas de contraste (WCAG AA)

| Token | Valor | Cuándo |
|-------|-------|--------|
| ink | `#fbfbf2` | Temperatura, valores, estado, ciudad, pestaña activa (en acento) |
| ink/75 | `rgba(251,251,242,0.75)` | Fecha, sensación, unidades, etiquetas de la fila de datos, "actualizado", ráfagas, texto de avisos, pestañas inactivas |
| ink/55 | `rgba(251,251,242,0.55)` | **Solo** para texto de 24px o más, o para elementos decorativos. Nunca en texto chico |
| ink/30 | `rgba(251,251,242,0.30)` | Pestañas deshabilitadas (WCAG exime los controles deshabilitados), hairline del encabezado y borde del botón en reposo |
| ink/20 | `rgba(251,251,242,0.20)` | Hairlines horizontales principales (arriba y abajo de la fila de datos) |
| ink/12 | `rgba(251,251,242,0.12)` | Hairlines verticales entre columnas de datos y hairline superior de la barra |

Diferencias con DESIGN.md: el "Muted" sube de 0.70 a **0.75** y el "Subtle" (0.45) deja de usarse para texto chico. Con 0.45 sobre `#1d3557` da 3,7:1 y no pasa AA. Con 0.75 sobre la parada más clara de la zona de contenido (`#284f75`, día) da unos 5,4:1.

**Regla de contraste estructural (bloqueada):** el texto nunca se apoya sobre cielo claro. El cielo se divide en dos capas:
- **Capa superior (zona de contenido):** gradiente vertical del 100 % del hero con las paradas S1 (0 %), S2 (40 %) y S3 (100 %). Las tres son oscuras y tienen contraste AA probado con ink/75.
- **Banda del horizonte (240px, abajo del hero, sin texto):** gradiente que arranca en S3 y pasa por S4 (60 %) y S5 (100 %, la línea del horizonte). Ahí están los colores claros (el resplandor del atardecer, el celeste del día) y la silueta se apoya encima.
- El contenido nunca se encima con la banda del horizonte (ver Layout). Así el contraste no depende del alto del dispositivo ni del tamaño de letra.

### Estados del cielo (tokens del placeholder CSS)

Cada estado se aplica con `data-sky="<estado>"` en `<html>` y define `--sky-1`…`--sky-5` y `--accent`:

| `data-sky` | S1 (0 %) | S2 (40 %) | S3 (100 % capa sup. = 0 % banda) | S4 (60 % banda) | S5 (horizonte) | `--accent` |
|------------|----------|-----------|----------------------------------|-----------------|----------------|------------|
| `noche` | `#070b14` | `#0c1323` | `#121c30` | `#172440` | `#1d2a44` | `#8ecae6` |
| `amanecer` | `#1a2340` | `#252d4f` | `#3d3f63` | `#a9747a` | `#fcd5ce` | `#f4c06a` |
| `dia` | `#1b3456` | `#22466d` | `#284f75` | `#6fa3c9` | `#a9d6ea` | `#8ecae6` |
| `atardecer` | `#1b1838` | `#2e2148` | `#4a2a50` | `#c25a48` | `#f6b26b` | `#f4c06a` |
| `cubierto` | `#1f2833` | `#29333f` | `#36424f` | `#56626f` | `#7d8894` | `#8ecae6` |
| `tormenta` | `#121326` | `#1d1f38` | `#2b2d4d` | `#33365a` | `#3d4066` | `#b9b7f0` |

Cómo se elige el estado (función pura `resolveSkyState()` en `lib/sky/state.ts`, con test en Vitest):
1. Fase solar con `SunCalc.getPosition(now, -36.23, -64.23).altitude`, pasada a grados:
   - `< −6°` → `noche`
   - `−6° … < 6°` antes del mediodía solar → `amanecer`; después → `atardecer`
   - `≥ 6°` → `dia`
2. Override por el tiempo, según la condición normalizada (ver la tabla de estados en Copy):
   - grupo `tormenta` → `tormenta`, a cualquier hora
   - grupos `cubierto`, `lluvia`, `llovizna`, `niebla`, `nieve` → `cubierto`, salvo si la fase es `noche`, que se mantiene como `noche`
   - el resto → la fase solar
3. El servidor calcula el estado con la hora del render. El cliente lo recalcula al montar y cada 60s, y cuando cambia actualiza `data-sky`.
4. **Transición:** las paradas cambian con un crossfade de 1200ms ease-in-out, superponiendo dos capas y animando la opacidad (los gradientes no se interpolan). Con `prefers-reduced-motion: reduce` el cambio es instantáneo.

**Contrato con la fase 3:** el fondo es un único componente `<SkyBackdrop state={SkyState} />` con `SkyState = { phase: 'noche'|'amanecer'|'dia'|'atardecer'; weather: 'despejado'|'cubierto'|'lluvia'|'tormenta'|'niebla'; sunAltitude: number }`. En la fase 1 lo renderiza el gradiente CSS de esta tabla. La fase 3 lo reemplaza por el canvas WebGL y **mantiene estos tokens como fallback** (sin WebGL / SKY-05). `--accent`, `data-sky` y la división capa superior / banda del horizonte se mantienen: el shader tiene que respetar que la zona de contenido sea oscura.

`<meta name="theme-color">` fijo en `#0e131c`.

---

## Layout: pantalla Ahora (iPhone 390 × 844, mobile first)

Estructura, de arriba hacia abajo. El hero mide `min-height: 100svh`, es una columna flex y lleva `padding-bottom` igual al alto de la barra más el safe area:

```
┌──────────────────────────────────────────┐  safe-area-top + 24
│           WINIFREDA, LA PAMPA            │  Label 12/600, 0.18em, ink, centrado
│              ────────────                │  hairline 160×1 ink/30, 8px arriba y abajo
│     jueves 23 de octubre, 17:40  ART     │  Body 15 ink/75 + Label 12 ink/75
│                                          │  48px
│  [slot titular: vacío en la fase 1]      │  (fase 2: titular + 24px abajo)
│  24°                         ◆ DESPEJADO │  Display 112 · columna derecha alineada abajo
│                            sensación 23° │  Body 15 ink/75, valor en ink
│                                          │  32px
│──────────────────────────────────────────│  hairline full ink/20
│  HUMEDAD   │   PRESIÓN    │    VIENTO     │  Label 12 ink/75 · 16px arriba
│   38 %     │   1012 hPa   │  18 km/h NE   │  Heading 24 ink + unidad Body 15 ink/75 · 16px abajo
│──────────────────────────────────────────│  hairline full ink/20 (verticales ink/12)
│  Ráfagas de 32 km/h · viento del noreste │  Body 15 ink/75 · 16px arriba
│──────────────────────────────────────────│  hairline ink/12 · 16px arriba
│  ACTUALIZADO HACE 6 MIN  ESTIMADO POR MODELO │  Label 12 ink/75 · 16px arriba y abajo
│  [aviso de dato viejo, si corresponde]    │  ver Estados
│                 (flex: 1, ≥ 64px)        │
│░░░░░░ banda del horizonte 240px ░░░░░░░░░│  resplandor S3→S5
│  calden     ─┼──┼──┼──┼──   molino calden│  silueta SVG de 120px, de borde a borde
├──────────────────────────────────────────┤
│  Ahora   Pronóstico   Modelos   Cielo    │  barra fija de 56px + safe-area-bottom
└──────────────────────────────────────────┘
```

Detalles bloqueados:
- **Encabezado:** centrado. No hay menú hamburguesa, ni buscador, ni selector de localidad. La fecha se arma a mano con `Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })`: `{weekday long} {day} de {month long}, {HH:mm}` en 24h, todo en minúscula, seguido de la etiqueta "ART". Se refresca en el cliente cada 60s.
- **Temperatura:** a la izquierda. El "°" va en Heading 24, alineado con la altura de las mayúsculas del número y separado 4px. No se muestra la unidad "C" (es implícita en Argentina, como en las capturas de atardecer y tormenta). Se redondea con `Math.round` y "−0" se muestra como "0".
- **Estado + sensación:** columna a la derecha, alineada abajo con la línea base del número y con el texto alineado a la derecha. Si el ancho no alcanza (estados largos como "TORMENTA CON GRANIZO"), la columna baja debajo del número, alineada a la izquierda y a 8px.
- **Fila de datos:** `<dl>` con 3 columnas iguales separadas por hairlines verticales de 1px en ink/12 y contenido centrado. La dirección del viento va dentro del valor ("18 km/h NE"). Con viento en calma (< 2 km/h) se muestra "Calma", sin dirección y sin la línea de ráfagas.
- **Banda del horizonte:** va siempre al final del primer viewport. El espaciador `flex: 1` tiene `min-height: 64px`, así que en pantallas bajas (iPhone SE, 667px) o con texto agrandado el hero crece y la banda baja, pero nunca se encima con el texto.
- **Silueta:** un único SVG inline (`components/PampaHorizon.tsx`) de `width: 100%` y `height: 120px`, con `preserveAspectRatio="xMidYMax slice"` y relleno `#0f141d`. Incluye la llanura (franja de tierra de 16px), un alambrado con postes cada ~56px y 3 hilos de 1px, un molino en x ≈ 78 % (de unos 112px de alto) y dos caldenes de copa ancha y achatada en x ≈ 8 % y x ≈ 88 %. No lleva sombras ni degradés internos. Es `aria-hidden="true"`. La fase 3 reusa este mismo SVG.
- **Desktop (≥ 768px):** el cielo, la banda y la barra ocupan todo el ancho. El contenido se centra con un ancho máximo de 560px, igual que los ítems de la barra. En la fase 1 no se usa el layout de dos hemisferios de DESIGN.md.
- **`<html lang="es-AR">`**, `viewport-fit=cover` y `apple-mobile-web-app-status-bar-style: black-translucent`. Las alturas van con `svh`/`dvh`, nunca con `100vh`.

### Barra de pestañas

- Es `<nav aria-label="Secciones">`, fija abajo, de 56px + `env(safe-area-inset-bottom)`, con fondo `#090e17` y una hairline superior de 1px en ink/12. Tiene 4 ítems de igual ancho, cada uno con el ícono de 24px arriba, 4px de separación y la etiqueta Label 12/600 con tracking de 0.02em.
- **Activa (Ahora):** `<a href="/" aria-current="page">`, con el ícono y la etiqueta en `--accent` y un subrayado de 16×1px en `--accent` 4px debajo de la etiqueta.
- **Pestañas sin contenido (Pronóstico, Modelos, Cielo): se ven, pero deshabilitadas.** Se renderizan como `<span aria-disabled="true">` (no son links ni reciben foco), con ícono y etiqueta en ink/30. Tienen un texto oculto para lectores de pantalla, "(próximamente)", y al tocarlas no pasa nada: no hay feedback, ni toast, ni página "en construcción".
  - **Por qué así y no ocultas:** el alto de la barra (56px + safe area) define dónde termina el primer viewport y dónde se apoya la silueta. Si la barra apareciera recién en la fase 2, se correría toda la composición ya aprobada. Además, con las 4 pestañas visibles la app se ve completa como pieza de portfolio y se mantiene fiel a las capturas. Un `<span>` deshabilitado no manda a ninguna ruta rota, así que no hacen falta páginas vacías.
  - Las secciones se configuran en `lib/sections.ts` (`{ id, label, href, enabled }`). Cada fase pasa la suya a `enabled: true`: `/pronostico` en la fase 2, `/modelos` en la 4 y `/cielo` en la 5.

### Íconos (SVG inline propios, solo en la barra)

Van en un `viewBox="0 0 24 24"` con `stroke-width="1.5"`, `stroke-linecap="square"`, `stroke-linejoin="miter"`, `fill="none"` y `stroke="currentColor"`:
- **Ahora:** semicírculo de sol sobre una línea de horizonte, con 3 rayos cortos.
- **Pronóstico:** calendario rectangular con 2 anillas y una fila de cuadraditos.
- **Modelos:** polilínea en zigzag con 4 vértices marcados.
- **Cielo:** luna creciente.

---

## Estados de interacción y de datos

| Estado | Cuándo | Qué ve el usuario |
|--------|--------|-------------------|
| **Normal** | Hay datos de la fuente "ahora" (Open-Meteo `current`) con una antigüedad ≤ 30 min | Layout completo. Fila "ACTUALIZADO HACE X MIN · ESTIMADO POR MODELO" en ink/75 |
| **Cargando** | Primer render sin caché (`app/loading.tsx`) | El mismo layout, con el cielo y el encabezado reales. La temperatura y los valores muestran "—" en ink/55 (Display/Heading, como texto grande), el estado dice "CARGANDO" y la fila de frescura no aparece. **Sin shimmer ni skeletons con forma de card** |
| **Desactualizado** | Antigüedad > 30 min (2 × TTL de 15 min) aunque la fuente haya respondido bien, por ejemplo si quedó congelada | La etiqueta de frescura pasa a peach `#fcd5ce` y debajo aparece el **aviso editorial**: regla vertical de 2px en peach a la izquierda, 16px de padding a la izquierda y texto Body 15 en ink/75 (copy en la tabla). Los datos se siguen viendo |
| **Fuente caída, con último dato bueno** | Falla el adapter y hay un snapshot anterior | Se muestran los datos viejos y el mismo aviso editorial, con la copy de fuente caída y la hora del último dato bueno. El resto de la página se ve normal (DATA-03) |
| **Fuente secundaria caída** | Falla MET Norway u otra fuente que la fase 1 no muestra | No se ve nada. Solo queda registrado en `sources[].status` |
| **Sin datos** | Falla la fuente y no hay ningún dato previo, o `app/error.tsx` | Se mantienen el cielo (con estado solo por fase solar), el encabezado, la banda y la barra. En lugar de la temperatura va un título en Playfair itálica 24/400 ink, 8px más abajo el texto Body 15 ink/75 y 24px más abajo el botón "Reintentar" |
| **Foco (teclado)** | Cualquier elemento enfocable | `outline: 2px solid var(--accent); outline-offset: 2px`, sin radio. Nunca `outline: none` sin reemplazo |
| **Botón: reposo / hover / activo** | "Reintentar" | Rectángulo de 44px de alto, 24px de padding horizontal, borde 1px en ink/30, fondo transparente y Label 12/600 en mayúsculas con 0.14em de tracking. En hover/focus el fondo pasa a ink/8 y el borde a `--accent`; en active, el fondo a ink/12. Mientras reintenta, el texto cambia a "REINTENTANDO…" y el botón queda deshabilitado |

Frescura ("actualizado hace X min", DATA-02):
- Se calcula desde el `fetchedAt` de la fuente "ahora" (no desde la hora del render). Se recalcula en el cliente cada 60s sin volver a pedir datos.
- Si la pestaña vuelve a estar visible (`visibilitychange`) y la antigüedad pasa los 15 min, se llama a `router.refresh()` una sola vez.
- `aria-live="off"` en el contador, para que el lector de pantalla no lo anuncie cada minuto. El aviso de desactualizado sí va con `role="status"`.

Accesibilidad:
- La temperatura tiene `aria-label="24 grados, sensación térmica 23 grados"`.
- La silueta y el cielo son `aria-hidden`.
- Hay un `<h1>` visualmente oculto: "Clima en Winifreda, La Pampa".
- Con `prefers-reduced-motion` se apagan el crossfade del cielo y cualquier transición.

---

## Copywriting Contract

Castellano rioplatense, con voseo cuando hay que hablarle al usuario. No se usan emojis.

| Elemento | Copy |
|----------|------|
| CTA principal (solo en el estado sin datos) | **Reintentar** (en el botón: `REINTENTAR`, y mientras carga: `REINTENTANDO…`) |
| Título del estado sin datos | *Ahora no tenemos el tiempo de Winifreda.* |
| Texto del estado sin datos | El servicio del pronóstico no está respondiendo. Probá de nuevo en unos minutos. |
| Estado de error (fuente caída, con último dato) | No pudimos actualizar el pronóstico. Te mostramos el último dato bueno, de las {HH:mm}. |
| Estado desactualizado (dato viejo, fuente "ok") | Estos datos tienen más de media hora. Recargá la página para traer los nuevos. |
| Etiqueta de frescura | `ACTUALIZADO RECIÉN` (< 1 min) · `ACTUALIZADO HACE 1 MIN` · `ACTUALIZADO HACE {n} MIN` (2–59) · `ACTUALIZADO HACE {n} H` (1–23 h) · `ACTUALIZADO EL {dd/MM} A LAS {HH:mm}` (≥ 24 h) |
| Aclaración de la fuente | `ESTIMADO POR MODELO`: el "ahora" de Open-Meteo es salida de modelo, no una observación (FEATURES.md) |
| Estado cargando | `CARGANDO` (en el lugar del estado del tiempo), con los valores en "—" |
| Confirmación destructiva | no aplica: no hay acciones destructivas en la fase 1 |
| Encabezado | `WINIFREDA, LA PAMPA` · `{jueves 23 de octubre}, {17:40}` · `ART` |
| Etiquetas de la fila de datos | `HUMEDAD` · `PRESIÓN` · `VIENTO` |
| Valores | `38 %` · `1012 hPa` · `18 km/h NE` · en calma: `Calma` |
| Sensación | `sensación {n}°` |
| Línea de ráfagas | `Ráfagas de {n} km/h · viento del {dirección larga}` |
| Pestañas | `Ahora` · `Pronóstico` · `Modelos` · `Cielo` (para lectores de pantalla en las deshabilitadas: `Pronóstico (próximamente)`) |
| `<title>` / descripción | `Clima en Winifreda` / `El tiempo de Winifreda, La Pampa: ahora, en hora argentina.` |

Unidades: espacio entre el número y `%`, `hPa` y `km/h`; sin espacio antes del `°`. Los números van sin decimales.

### Direcciones del viento (8 rumbos, sectores de 45° centrados)

| Grados | Corta | Larga (para "viento del …") |
|--------|-------|-----------------------------|
| 337,5–22,5 | N | norte |
| 22,5–67,5 | NE | noreste |
| 67,5–112,5 | E | este |
| 112,5–157,5 | SE | sudeste |
| 157,5–202,5 | S | sur |
| 202,5–247,5 | SO | sudoeste |
| 247,5–292,5 | O | oeste |
| 292,5–337,5 | NO | noroeste |

Se usa O (oeste), no W. Es la grafía del SMN.

### Estado del tiempo (NOW-02): WMO `weather_code` → etiqueta → grupo del cielo

| Código | Etiqueta (se muestra en MAYÚSCULAS) | Grupo (`resolveSkyState`) |
|--------|-------------------------------------|---------------------------|
| 0 | Despejado | despejado |
| 1 | Casi despejado | despejado |
| 2 | Algo nublado | despejado |
| 3 | Cubierto | cubierto |
| 45, 48 | Niebla | niebla |
| 51, 53 | Llovizna | llovizna |
| 55 | Llovizna intensa | llovizna |
| 56, 57 | Llovizna helada | llovizna |
| 61 | Lluvia débil | lluvia |
| 63 | Lluvia | lluvia |
| 65 | Lluvia fuerte | lluvia |
| 66, 67 | Lluvia helada | lluvia |
| 71, 73, 77 | Nevadas débiles | nieve |
| 75 | Nevada | nieve |
| 80, 81 | Chaparrones | lluvia |
| 82 | Chaparrones fuertes | lluvia |
| 85, 86 | Chaparrones de nieve | nieve |
| 95 | Tormenta | tormenta |
| 96, 99 | Tormenta con granizo | tormenta |
| desconocido | (se oculta el rombo y la etiqueta y se muestra solo la sensación) | fase solar |

De noche, los códigos 0–1 se muestran como `NOCHE DESPEJADA`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| ninguno (shadcn no se inicializa) | — | no aplica: no hay registries de terceros ni componentes externos |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: FLAG (no bloqueante: "Reintentar" sin sustantivo)
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: FLAG (no bloqueante: rombo de 6px)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-23 (gsd-ui-checker)
