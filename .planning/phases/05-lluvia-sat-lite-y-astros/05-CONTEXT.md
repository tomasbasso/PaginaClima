# Phase 5: Lluvia, satélite y astros - Context

**Gathered:** 2026-10-25
**Status:** Ready for planning

<domain>
## Phase Boundary

La fase habilita la pestaña **Cielo** (`/cielo`), con tres bloques:

1. **Lluvia acumulada** de la semana, el mes y el año, contra el promedio 1991–2020 prorrateado a la misma fecha y aclarada como "estimado por reanálisis, no pluviómetro" (RAIN-01, RAIN-02, RAIN-03).
2. **Imagen satelital infrarroja** reciente de GOES-East centrada en Winifreda, con carga diferida, más un link externo al radar del SMN (SAT-01, SAT-02).
3. **Sol y luna**: salida y puesta del sol, duración del día y fase lunar actual dibujada como se ve desde el hemisferio sur (ASTRO-01, ASTRO-02).

Fuera de la fase:
- Probabilidad real, rango p10–p90 y semáforo (fase 4, "Pronóstico con confianza").
- Offline / service worker (fase 6).
- Alertas (fase 7).
- Estaciones del año, eclipses y luna llena como eventos del cielo animado (SKY-07, v2).
- Campaña agrícola julio–junio (ver Deferred).

</domain>

<decisions>
## Implementation Decisions

### Lluvia acumulada (discutido con el dueño)
- **D-01:** Los períodos son **de calendario**:
  - Semana: desde el lunes de la semana actual, en hora argentina.
  - Mes: desde el día 1.
  - Año: desde el 1 de enero.
  - No se usan ventanas móviles de 7/30/365 días.
- **D-02:** El año es el **año calendario** (enero–diciembre). No se muestra la campaña agrícola.
- **D-03:** Cada acumulado se muestra como **número grande + barra** contra el promedio 1991–2020 prorrateado a la misma fecha, con un texto corto. Ejemplos: "20 % menos de lo normal", "casi lo normal", "35 % más de lo normal". La barra marca dónde cae lo normal a esta fecha.
- **D-04:** Se suma una línea con la **última lluvia**: "Última lluvia: hace 6 días, 12 mm". Usa el mismo origen de datos que los acumulados. La regla de qué cuenta como "día con lluvia" la elige el planner con un umbral razonable (≥ 1 mm diario) y la documenta.
- **D-05:** Junto a los acumulados va siempre la aclaración RAIN-03: "Estimado por reanálisis, no pluviómetro".

### Claude's Discretion (el dueño no quiso discutirlo; criterios propios)
- **D-06 · Orden de la pestaña:** es una sola página con scroll, en este orden:
  1. Hero compacto con el cielo animado y la silueta, igual que `/pronostico`.
  2. Sol y luna.
  3. Lluvia acumulada.
  4. Satélite.
  - El satélite va al final porque es lo más pesado y se carga diferido.
  - No hay bloques plegables.
- **D-07 · Satélite:**
  - Muestra una **imagen fija del último pase disponible**, sin animación en esta fase, centrada en Winifreda. El encuadre (región de La Pampa y alrededores, del tamaño suficiente para ver tormentas que se acercan) lo decide el research/planner.
  - Lleva un marcador de Winifreda y la hora de la imagen en hora argentina ("imagen de las 21:40").
  - La imagen se compone o sirve desde el servidor con caché. El cliente no le pega a NASA GIBS en cada visita. Hay que verificar el GetCapabilities antes de implementar (CLAUDE.md, MEDIUM).
  - Debajo va el link "Ver radar del SMN", que abre afuera.
- **D-08 · Sol y luna:**
  - Muestra salida y puesta del sol y duración del día, en hora argentina.
  - Suma la diferencia con el día anterior ("+1 min"), que es barata y se lee bien.
  - Fase lunar dibujada para el **hemisferio sur**: en Argentina la luna creciente se ilumina del lado izquierdo, al revés que en el hemisferio norte.
  - Dibujo: un SVG propio con la iluminación de `SunCalc.getMoonIllumination()`, más el nombre de la fase y el porcentaje iluminado.
  - Las salidas y puestas de la luna y la próxima luna llena son opcionales: el planner las incluye solo si salen gratis de suncalc.
- **D-09 · Pestaña:** se pone `enabled: true` para `cielo` en `lib/sections.ts`. El botón **Modelos** no se toca en esta fase; se elimina en la fase 4 (decisión del 2026-10-25).
- **D-10 · Datos de lluvia:**
  - Fuentes: el acumulado observado del año en curso sale del archivo histórico de Open-Meteo (ERA5) cosido con `past_days` del forecast para los últimos días que el archivo todavía no cubre. La climatología 1991–2020 se calcula una vez y se cachea por días, o se genera estática en build.
  - Nada se pide desde el cliente; todo pasa por el servidor con `revalidate`, según CLAUDE.md.
  - La costura exacta entre ERA5 y `past_days` es tema del research.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y alcance
- `.planning/ROADMAP.md` §Phase 5: objetivo, criterios de éxito y research requerido (GIBS GetCapabilities, ToS de OpenFreeMap, costura ERA5 + `past_days`)
- `.planning/REQUIREMENTS.md`: RAIN-01..03, SAT-01..02, ASTRO-01..02
- `.planning/PROJECT.md`: Key Decisions (satélite IR en vez de RainViewer, sin Geocoding, coordenadas fijas)
- `CLAUDE.md`: stack, no pegarle a APIs desde el cliente, RainViewer sin cobertura, NASA GIBS (`GOES-East_ABI_Band13_Clean_Infrared_v0_NRT_ZENJPEG`), Open-Meteo Historical, suncalc 2.1.1

### Diseño heredado
- `.planning/phases/03-cielo-vivo/03-UI-SPEC.md`: tokens, tipografía, contraste sobre el cielo, Hero compacto
- `.planning/phases/02-pron-stico-n-cleo/02-UI-SPEC.md`: patrones de la lista diaria y de la página `/pronostico`
- `.planning/phases/03-cielo-vivo/03-CONTEXT.md`: D-05 (la fase lunar dibujada era de esta fase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/Hero.tsx` con `compact` y `below`: es la misma estructura que `app/pronostico/page.tsx`, así que `/cielo` la copia.
- `lib/sky/astro.ts`: ya importa `getTimes`, `getMoonIllumination` y `getMoonPosition` de suncalc con `LAT`/`LON` de `lib/sky/phase.ts`, y es la base de ASTRO-01/02.
- `lib/sources/readThrough.ts` + `unstable_cache`: el patrón de adapter con caché y `fetchedAt`, reusable para el archivo histórico y el satélite.
- `lib/sections.ts`: el flag `enabled` por pestaña. `components/TabBar.tsx` ya renderiza la pestaña habilitada o la deshabilitada.
- `lib/time.ts`: formateo en hora argentina.

### Established Patterns
- Las páginas son ISR con `export const revalidate`, sin query params, y nunca tiran error (DATA-03). Si no hay datos muestran `NoData` + `RetryButton`.
- Las respuestas externas se validan con zod en el borde del servidor (`*.schema.ts`).
- Funciones puras en `lib/` con tests de Vitest al lado.

### Integration Points
- Ruta nueva `app/cielo/page.tsx` (+ `loading.tsx`).
- `lib/sections.ts` (habilitar `cielo`).
- Adapters nuevos en `lib/sources/` (archivo histórico / climatología, satélite GIBS).

</code_context>

<specifics>
## Specific Ideas

- La gente del pueblo pregunta "¿cuándo llovió por última vez?", por eso va la línea de última lluvia (D-04).
- Los textos de comparación tienen que leerse como los diría alguien de acá ("en lo que va del mes", "menos de lo normal"), no como un informe técnico.

</specifics>

<deferred>
## Deferred Ideas

- **Campaña agrícola (julio–junio):** se ofreció y el dueño eligió solo el año calendario. Se puede reconsiderar para un público rural.
- **Animación del satélite** (últimas horas): queda para después de medir el peso de la imagen fija.
- **Eventos astronómicos** (eclipses, superluna): SKY-07, v2.

</deferred>

---

*Phase: 05-lluvia-sat-lite-y-astros*
*Context gathered: 2026-10-25*
