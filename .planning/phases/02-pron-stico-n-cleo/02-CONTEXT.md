# Phase 2: Pronóstico núcleo - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning

<domain>
## Phase Boundary

El usuario entiende de un vistazo qué va a pasar en las próximas 48 h y en los próximos días: un meteograma de 48 h (temperatura, lluvia en mm y viento) legible en 390 px, un pronóstico diario de 7 a 14 días (máx, mín, estado y lluvia esperada, en días locales argentinos) y un titular editorial rioplatense arriba de Ahora que resume el día y cambia con el pronóstico.

Requisitos: FCST-01, FCST-02, NOW-03.
Fuera de la fase: cielo WebGL (fase 3), probabilidad real de ensemble y rango p10–p90 (fase 4), comparación de modelos (fase 4), lluvia acumulada/satélite/astros (fase 5), offline (fase 6), alertas (fase 7).

</domain>

<decisions>
## Implementation Decisions

### Dónde va cada cosa
- **D-01:** El **meteograma de 48 h va en la home, debajo de Ahora**. Ahora sigue llenando la primera pantalla de 390×844 (fix UAT de la fase 1: no se rompe) y el meteograma aparece al hacer scroll.
- **D-02:** El **pronóstico diario vive en `/pronostico`**. En esta fase la pestaña Pronóstico pasa a `enabled: true` en `lib/sections.ts`. La home no lleva resumen diario.
- **D-03:** El **titular editorial va en el slot `headline` de `Ahora`**, que ya existe, con el rol Headline (Playfair itálica de 32 px e interlineado 1.19). Si el titular no entra en la primera pantalla, se ajusta el layout de Ahora para que todo siga entrando en 390×844.

### Meteograma (FCST-01)
- **D-04:** **Las 48 h entran en un solo ancho**, sin scroll horizontal: etiquetas de hora cada 6 h, separadores de día con rótulos "hoy / mañana / pasado" (o el nombre del día) y lectura de la hora exacta al tocar o arrastrar (scrubber) sobre el gráfico.
- **D-05:** **Viento: una fila de flechas de dirección con km/h cada 3 h** debajo del gráfico. La ráfaga aparece solo cuando es fuerte (el umbral lo define el UI-SPEC o el planner).
- **D-06:** **Se hace en SVG a mano con `d3-scale` + `d3-shape`**, en un client component. No va Recharts: ejes mínimos, tipografía propia del sistema y barras de lluvia finas en mm. Las dependencias nuevas que se permiten son solo `d3-scale` y `d3-shape` (con sus tipos).
- **D-07:** Los datos salen de `snapshot.hourly48`, que ya existe. Las horas se muestran en `America/Argentina/Buenos_Aires` usando los helpers de `lib/time.ts`.

### Diario (FCST-02)
- **D-08:** **Se muestran 7 días por defecto, con un botón "ver 14 días"** que expande la lista. Los días 8 a 14 llevan una nota de que son orientativos. El rango p10–p90 llega en la fase 4.
- **D-09:** **Cada fila tiene barra de rango**: día · ícono/estado · mín — barra de mín a máx sobre la escala común de los días visibles — máx · lluvia.
- **D-10:** **La lluvia se muestra en mm solo si es ≥ 1 mm** (por ejemplo "4 mm"). En los días secos o con menos de 1 mm no se muestra nada. **No** se usa `precipitation_probability` del determinístico: la probabilidad real es de la fase 4.
- **D-11:** **Tocar un día no hace nada**: la lista es estática. El detalle por día queda diferido.
- **D-12:** Los días son las claves locales de `daily.date` (ya vienen en hora argentina desde Open-Meteo). El primer día es "Hoy" y el segundo "Mañana".

### Titular editorial (NOW-03) — a criterio de Claude (el usuario aceptó los defaults)
- **D-13:** Es una función pura en `lib/` con tests de Vitest. Recibe el snapshot y la hora local, y devuelve un string (o `null` si no hay datos).
- **D-14:** La ventana: de 05:00 a 20:59 local resume **lo que queda de hoy**. De 21:00 a 04:59 resume **mañana** y lo dice ("Mañana: …").
- **D-15:** La prioridad: tormenta > lluvia (con su momento: "a la tarde", "a la noche"…) > extremos de temperatura (helada, calor fuerte, fresco) > viento fuerte > estado general.
- **D-16:** Es corto (unas 6 palabras como máximo), en rioplatense y sin signos de exclamación. Ejemplos: "Mañana fresca, lluvia a la tarde", "Día de calor, tormentas a la noche". Cambia cuando cambia el pronóstico, porque se calcula en cada render del snapshot.

### Claude's Discretion
- Los extras del meteograma (sensación térmica, íconos de estado, franjas de noche, marca de "ahora"): el usuario no tuvo preferencia. Los decide el UI-SPEC/planner priorizando la legibilidad en 390 px.
- Los umbrales concretos del titular (helada, calor, viento fuerte) y el vocabulario de franjas horarias.
- Los íconos del diario: reusar los grupos WMO de `lib/weather/wmo.ts`.
- Los estados vacío y de error del meteograma y del diario: siguen el patrón de la fase 1 (Notice/NoData, último dato bueno).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Alcance y requisitos
- `.planning/ROADMAP.md` §Phase 2 — objetivo y 3 criterios de éxito
- `.planning/REQUIREMENTS.md` — FCST-01, FCST-02, NOW-03 (y FCST-03/04 de la fase 4, para no adelantarlos)
- `.planning/PROJECT.md` — restricciones (gratis, mobile first, nada de fetch externo desde el cliente)

### Contrato visual
- `.planning/phases/01-fundaciones-y-ahora/01-UI-SPEC.md` — tokens, tipografía, slot del titular, barra de pestañas, copy de estados. La fase 2 suma el rol Headline
- `design/stitch/DESIGN.md` — sistema "Pampa Cielo Editorial"
- `design/stitch/home-*.png` — capturas aprobadas

### Arquitectura y stack
- `.planning/research/ARCHITECTURE.md` — adapters/aggregator, `WeatherSnapshot`, TTLs
- `.planning/research/STACK.md` y `CLAUDE.md` §Alternatives Considered — SVG + d3-shape para el meteograma editorial
- `.planning/research/PITFALLS.md` — trampas de UTC y día local
- `.planning/phases/01-fundaciones-y-ahora/01-CONTEXT.md` — decisiones de la fase 1 (D-04: el snapshot ya trae hourly 48 h y daily 14 d)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/weather/types.ts`: `HourlyPoint`, `DailyPoint` y `WeatherSnapshot.hourly48` / `.daily` ya están poblados por `lib/weather/normalize.ts`.
- `lib/weather/wmo.ts`: el mapeo WMO → etiqueta rioplatense → grupo, para el estado del diario y el titular.
- `lib/weather/wind.ts`: el rumbo en 8 sectores, para las flechas del meteograma.
- `lib/time.ts`: el formateo en hora argentina y el "hoy" local.
- `components/Ahora.tsx`: la prop `headline?: string` ya renderiza el slot del titular.
- `components/Notice.tsx`, `components/NoData.tsx`: los estados de error y sin datos.
- `app/dev/estados/fixtures.ts`: fixtures para la galería de estados.

### Established Patterns
- La lógica pura va en `lib/` con tests de Vitest al lado (`*.test.ts`). Los componentes de servidor van en `components/` y los de cliente en `components/client/`.
- La página llama a `getWeatherSnapshot()` directamente (ISR de 600 s) y nunca lanza.
- Los tokens van en `@theme` de `app/globals.css`. No hay `tailwind.config.js`.

### Integration Points
- `app/page.tsx`: suma el meteograma debajo de Ahora y le pasa `headline`.
- `app/pronostico/page.tsx` (nuevo): el diario. `lib/sections.ts` pasa a `pronostico.enabled = true`.
- `/dev/estados`: conviene sumar los estados del meteograma y del diario.

</code_context>

<specifics>
## Specific Ideas

- "Sin scroll horizontal forzado ni etiquetas encimadas" en 390 px es criterio de éxito: hay que verificarlo en el navegador con viewport móvil.
- El titular reemplaza al slot vacío de la fase 1. Ejemplo del roadmap: "Mañana fresca, lluvia a la tarde".

</specifics>

<deferred>
## Deferred Ideas

- Detalle expandible por día (viento máximo, sol, mañana/tarde): después del MVP.
- Probabilidad de lluvia y rango p10–p90 en el diario: fase 4.
- Resumen de 3 días en la home: descartado por ahora.

</deferred>

---

*Phase: 02-pron-stico-n-cleo*
*Context gathered: 2026-10-23*
