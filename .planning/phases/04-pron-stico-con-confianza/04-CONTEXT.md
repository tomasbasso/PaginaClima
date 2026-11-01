# Phase 4: Pronóstico con confianza - Context

**Gathered:** 2026-11-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Cada fila del diario de `/pronostico` muestra cuánta confianza tenerle a ese día:

1. **Probabilidad de lluvia** calculada desde los miembros del ensemble, con ≥ 1 mm en el día local (FCST-03).
2. **Rango p10–p90** de temperatura y lluvia en los días lejanos (FCST-04).
3. **Semáforo de coincidencia** entre modelos independientes, sin mostrarlos por separado (MODL-02).
4. **Quitar el botón Modelos** de la barra de pestañas (criterio 4 del roadmap).

Fuera de la fase: pestaña Modelos y comparación lado a lado (MODL-01 y MODL-03, descartados el 2026-10-25), PWA y offline (fase 6), alertas (fase 7), detalle al tocar un día (diferido desde la fase 2).

</domain>

<decisions>
## Implementation Decisions

**Origen de estas decisiones:** el dueño delegó todas las áreas con la consigna "Sorpréndeme con todo, necesito que atraiga visualmente". Todo lo de abajo es criterio de Claude, no elección del dueño. La prioridad es el impacto visual, sin romper la lectura de un vistazo ni "Pampa Cielo Editorial". El UI-SPEC puede ajustar medidas y colores; si cambia el concepto, hay que avisarle al dueño.

### Concepto visual: "el abanico"
- **D-01:** La lista deja de ser una tabla con datos sumados y pasa a **dibujar la incertidumbre**. Al recorrer los días, las barras de temperatura se abren como un abanico: finas y seguras cerca de hoy, anchas y difusas a lo lejos. La incertidumbre se ve antes de leer un número.
- **D-02:** Tres firmas visuales, y no más: **abanico** (D-05), **pluviómetro** (D-08) y **rombos** (D-11). Sin tarjetas, sombras, vidrio esmerilado, formas redondeadas ni íconos ilustrados.
- **D-03:** **Animación de entrada:** una sola vez al montar y al expandir a 14 días, las bandas se abren desde la barra central y los pluviómetros se llenan, escalonados de arriba hacia abajo. Total ≤ 700 ms, solo con CSS y sin `motion`. Con "reducir movimiento" se muestra el estado final. Esto revisa el "sin animación al expandir" de la fase 2.

### Anatomía de la fila
- **D-04:** Se mantienen las dos líneas y la grilla de la fase 2:
  - **Línea 1:** día · mínima · barra con abanico · máxima · probabilidad.
  - **Línea 2:** rombo + palabra del semáforo + estado del tiempo a la izquierda; mm a la derecha.
  - **Borde derecho:** pluviómetro.
  - Sin solapes a 390 px con el texto más largo. Si no entra, el UI-SPEC define qué se acorta; el rombo y los mm nunca se sacrifican.

### Rango p10–p90 (FCST-04)
- **D-05:** **Temperatura:** la barra sólida sigue yendo de mínima a máxima. A cada lado se suma una banda que se desvanece hasta el p10 de la mínima y el p90 de la máxima, sin borde duro.
- **D-06:** La banda se dibuja **en todos los días**, porque el abanico solo se lee si se ve abrirse desde cerca. Los días lejanos son el **día 4 en adelante** y ahí se suma el rango de lluvia como texto. Las escalas `bar7` y `bar14` tienen que incluir los extremos de las bandas para que no se recorten.
- **D-07:** **Lluvia:** los días 1 a 3 muestran mm del pronóstico principal, como hoy. Desde el día 4, el texto pasa a ser el rango del ensemble ("5–15 mm"). Si el p90 es menor que 1 mm, no se muestra nada.

### Probabilidad de lluvia (FCST-03)
- **D-08:** **Pluviómetro:** una columna vertical fina y recta en el borde derecho de la fila, de toda su altura, llena desde abajo según la probabilidad, en azure. Las filas quedan pegadas, así que forman una tira continua que se lee de un vistazo como "cuándo llueve". Es la pieza más distintiva de la fase.
- **D-09:** **Número:** "70 %" en la última columna de la línea 1, en azure. Se redondea de a 5 % para no simular una precisión que no existe. Debajo de 10 % no se muestra número y el pluviómetro queda vacío. Tope visible de 95 %: nunca se dice "100 %". El lector de pantalla recibe el conteo real: "36 de 51 escenarios traen lluvia".
- **D-10:** **Fuente y cálculo:**
  - Se usa solo **ECMWF ENS** (`ecmwf_ifs025`, 51 miembros, 15 días). Un solo ensemble cubre los 14 días y evita los saltos de los días 8 y 11, cuando ICON y GFS terminan su horizonte.
  - Se calcula por miembro, sobre la suma del día local, y recién después se cuenta (Pitfall 3).
  - Cuando el ensemble dice 60 % y el pronóstico principal marca menos de 1 mm, se muestran el número y el pluviómetro sin mm. No es un error: el semáforo y la probabilidad explican esa duda.

### Semáforo (MODL-02)
- **D-11:** **Rombos, no círculos:** el sistema de diseño usa rombos y forma recta. La forma y el color codifican juntos, así nunca depende solo del color:
  - **◆ lleno, azure:** coinciden.
  - **◈ medio lleno, sun (`--color-sun`):** dudan.
  - **◇ vacío con contorno marcado, color nuevo tipo brasa (`--color-ember`):** no se ponen de acuerdo. `--color-peach` sigue reservado para los avisos. El tono lo define el UI-SPEC y debe pasar contraste sobre `ground`.
- **D-12:** **El rombo está en todos los días; la palabra solo cuando hay duda.** Con acuerdo va el rombo solo; "DUDAN" o "SIN ACUERDO" aparecen cuando corresponde. Así la fila tranquila queda tranquila y la duda salta a la vista. La frase completa "no se ponen de acuerdo" va en la leyenda y en el texto para lector de pantalla.
- **D-13:** **Cálculo:**
  - Votan ECMWF, GFS, ICON y GEM si cubre la zona. MET Norway no vota.
  - Se compara máxima, mínima y lluvia ≥ 1 mm sí/no. No se compara `weather_code` (Pitfall 2).
  - Punto de partida, a calibrar con datos reales en el research: coinciden si todos dicen lo mismo sobre la lluvia y la dispersión de temperatura es ≤ 3 °C; no se ponen de acuerdo si la lluvia queda dividida en mitades o la dispersión es > 6 °C; dudan en el resto.
  - Los umbrales son constantes con tests, en una función pura.
- **D-14:** **Días sin modelos suficientes:** cuando queda un solo modelo con dato, en lugar del rombo se muestra una raya tenue y "SOLO UN MODELO". Nunca se muestra un acuerdo falso. Con 2 modelos, el máximo posible es "dudan" si difieren y "coinciden" si no; el planner verifica los horizontes reales.

### Lectura editorial
- **D-15:** **Despacho de confianza:** arriba de la lista, una sola frase generada por reglas, en Playfair itálica y con la regla vertical de 2 px del "Editorial Atmosphere Callout". Ejemplo: "Hasta el jueves los modelos coinciden. El fin de semana, dudan." Es una función pura con tests, en rioplatense y sin signos de exclamación. Si no hay datos, no se muestra.
- **D-16:** **Leyenda de una línea** debajo del despacho, en tipografía de etiqueta: "◆ COINCIDEN · ◈ DUDAN · ◇ NO SE PONEN DE ACUERDO". Sin tooltips ni modales. Junto a ella o al pie de la lista va el crédito "Probabilidad: 51 escenarios de ECMWF".

### Fallas y datos
- **D-17:** **Degradación por fuente (DATA-03):** si falla el ensemble, la fila vuelve al aspecto de la fase 2, sin abanico, número ni pluviómetro. Si falla el multimodelo, no hay rombos ni despacho. Cada falla lleva un aviso discreto; `/pronostico` nunca se rompe y se usa el último dato bueno cuando exista.
- **D-18:** **Caché:** el ensemble y el multimodelo tienen adapters propios con `readThrough` y TTL largo, según la frecuencia de cada corrida. Al snapshot y al cliente llega solo el resultado agregado por día, nunca los miembros crudos. Se piden solo las variables necesarias, porque el ensemble cuenta varias "calls" en Open-Meteo.

### Barra de pestañas
- **D-19:** **Modelos se elimina del todo**, no se oculta: se borran la entrada, el `SectionId`, el ícono de `TabBar.tsx` y la aserción de `lib/sections.test.ts`. La barra queda con tres pestañas: Ahora, Pronóstico y Cielo.

### Claude's Discretion
- Medidas, opacidades, curvas de la animación y tono exacto de `--color-ember`: los define el UI-SPEC.
- Reglas exactas del despacho y su vocabulario, siguiendo el titular de la fase 2.
- Forma de los nuevos tipos en `WeatherSnapshot` y reparto en módulos.
- Texto de los avisos de D-17.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Alcance y requisitos
- `.planning/ROADMAP.md` §Phase 4 — objetivo, 4 criterios de éxito y temas a investigar
- `.planning/REQUIREMENTS.md` — FCST-03, FCST-04, MODL-02 y los MODL-01/03 descartados
- `.planning/PROJECT.md` — restricciones y la decisión de quitar la pestaña Modelos
- `.planning/quick/20261025-fase4-sin-pestana-modelos/SUMMARY.md` — por qué cambió el alcance

### Contrato visual
- `design/stitch/DESIGN.md` — "Pampa Cielo Editorial": forma recta, rombos, hairlines, Editorial Atmosphere Callout
- `design/stitch/home-*.png` — capturas aprobadas
- `.planning/phases/02-pron-stico-n-cleo/02-UI-SPEC.md` — anatomía actual de la fila del diario
- `.planning/phases/02-pron-stico-n-cleo/02-CONTEXT.md` — D-08 a D-12 del diario; D-08 anticipa el rango de esta fase

### Datos y trampas
- `.planning/research/PITFALLS.md` — Pitfall 2 (ECMWF votando doble) y Pitfall 3 (probabilidad mal agregada)
- `.planning/research/FEATURES.md` — abanico p10–p90, semáforo y frase; qué evitar en estadística cruda
- `.planning/research/ARCHITECTURE.md` — adapters, derivers y TTL del ensemble
- `.planning/research/STACK.md` y `CLAUDE.md` §Datos meteorológicos — IDs y horizontes. Ojo: mencionan ≥ 0,2 mm; **manda el ≥ 1 mm de FCST-03**

### A verificar en el research
- Cobertura de GEM en Winifreda y sus IDs en Open-Meteo. Si no cubre, votan 3 modelos.
- Horizontes reales por modelo en la Forecast API, no solo en la Ensemble API.
- Umbrales de D-13 contra datos reales de Winifreda.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/forecast/daily.ts`: `buildDailyRows`, `DailyRow`, `DailyBar` y `rainText`. Las escalas y los `srText` se extienden acá.
- `components/client/DailyList.tsx`: `RangeBar` y `Row`, ya con la grilla de 5 columnas y la lectura precalculada.
- `lib/sources/openMeteoForecast.ts` y su `.schema.ts`: patrón de adapter con Zod y fixtures en `lib/sources/__fixtures__/`.
- `lib/weather/snapshot.ts`: agregador; las fuentes se construyen con `Promise.allSettled` y el estado depende del resultado real.
- `components/Notice.tsx`: avisos de falla por fuente.
- `app/dev/estados/`: galería donde se suman los estados de la fase.

### Established Patterns
- La lógica pura va en `lib/` con tests de Vitest al lado; las islas de cliente van en `components/client/`.
- La fila llega precalculada y serializable desde el servidor; la isla solo elige `bar7` o `bar14`.
- `/pronostico` usa ISR de 600 s, sin query params, y nunca lanza.
- Los tokens van en `@theme` de `app/globals.css`; `--color-azure`, `--color-sun` y `--color-storm` ya existen.

### Integration Points
- `app/pronostico/page.tsx`: pasa los datos nuevos y monta el despacho y la leyenda sobre `DailyList`.
- `lib/sections.ts`, `components/TabBar.tsx` y `lib/sections.test.ts`: eliminación de Modelos.
- `lib/seo` en `app/pronostico/page.tsx`: la descripción puede sumar la probabilidad real.

</code_context>

<specifics>
## Specific Ideas

- Consigna textual del dueño: "Sorpréndeme con todo necesito que atraiga visualmente".
- La prueba clave: con la lista de 14 días abierta, y sin leer un número, tiene que verse dónde se abre el abanico, cuándo llueve y qué días hay duda.
- Hay que verificar a 390×844 con el texto más largo posible y revisar la tira del pluviómetro entre filas contiguas, incluido el corte en "DEL DÍA 8 EN ADELANTE".

</specifics>

<deferred>
## Deferred Ideas

- Sumar la coincidencia al titular de la home ("Fresco y seguro: los modelos coinciden").
- Umbral de "lluvia importante" (≥ 10 mm) además del ≥ 1 mm.
- Detalle por día al tocar la fila, con los escenarios crudos: sigue diferido desde la fase 2.
- Abanico o probabilidad en el meteograma de 48 h.

</deferred>

---

*Phase: 04-pron-stico-con-confianza*
*Context gathered: 2026-11-01*
