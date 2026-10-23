# Phase 2: Pronóstico núcleo - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-23
**Phase:** 02-pronóstico-núcleo
**Areas discussed:** Dónde va cada cosa, Forma del meteograma, Diario de 7 a 14 días

---

## Dónde va cada cosa

| Option | Description | Selected |
|--------|-------------|----------|
| Meteograma debajo de Ahora | Scroll en la home | ✓ |
| Meteograma solo en /pronostico | La home queda solo con Ahora | |
| Meteograma en los dos lados | Uno corto en la home y el de 48 h en /pronostico | |
| Diario en /pronostico | La pestaña es el diario | ✓ |
| Diario también resumido en la home | 3 días en la home | |

## Forma del meteograma

| Option | Description | Selected |
|--------|-------------|----------|
| Todo en un ancho | 48 h comprimidas, con scrubber | ✓ |
| Desliza horizontal | ~12 h visibles | |
| Viento: flechas + km/h cada 3 h | Una fila debajo del gráfico | ✓ |
| Viento: curva de velocidad | Tercera serie | |
| SVG a mano con d3 | Look editorial | ✓ |
| Recharts | Más rápido de armar, look más genérico | |

**Extras (sensación, íconos, noche, marca de ahora):** sin preferencia → a criterio de Claude.

## Diario de 7 a 14 días

| Option | Description | Selected |
|--------|-------------|----------|
| 14, los lejanos atenuados | | |
| 7 + botón "ver 14" | | ✓ |
| Solo 7 | | |
| Fila con barra de rango | | ✓ |
| Tabla editorial simple | | |
| mm solo si ≥ 1 mm | | ✓ |
| Siempre los mm | | |
| precipitation_probability | | |
| Tocar: nada | | ✓ |
| Tocar: expandir el detalle | | |

## Claude's Discretion

- Las reglas del titular (el usuario aceptó los defaults propuestos: de 5 a 21 h, hoy, y si no, mañana; tormenta > lluvia > temperatura > viento; unas 6 palabras).
- Los extras del meteograma.

## Deferred Ideas

- Detalle por día, resumen de 3 días en la home.

**Instrucción final del usuario:** "Listo, escribí el contexto y empezá a hacerlo, cuando termines con todo hacé push".
