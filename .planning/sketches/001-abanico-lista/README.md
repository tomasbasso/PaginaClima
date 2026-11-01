---
sketch: 001
name: abanico-lista
question: "¿La lista de /pronostico atrae a la vista y se entiende de un vistazo con abanico, pluviómetro y rombos?"
winner: "A"
tags: [pronostico, fase-4, abanico]
---

# Sketch 001: Abanico en la lista

## Design Question
¿La lista de `/pronostico` de la fase 4 atrae a la vista y deja ver dónde se abre la incertidumbre, cuándo llueve y qué días hay duda, sin leer un número?

## How to View
Abrir `.planning/sketches/001-abanico-lista/index.html`. Los controles de arriba cambian de variante y de ancho.

## Variants
- **A: Contrato** — sigue `04-UI-SPEC.md`: cada día tiene su propia banda.
- **B: Río** — une las bandas en una sola forma continua que se abre y se tiñe de azul donde es probable que llueva. No está en el contrato.

## What to Look For
- La lista abierta a 14 días: ¿se ve el abanico sin leer números?
- La primera pantalla: ¿alcanza con lo que se ve antes de hacer scroll?
- Los rombos: ¿se distinguen a simple vista?

## Límites
Datos inventados y cabecera aproximada. No hay estados de falla: los cubre `/dev/estados` cuando se implemente.

## Decisión
El dueño eligió A (2026-11-01), así que `04-UI-SPEC.md` queda como está. En la maqueta las bandas se leen débil: conviene mirarlas con datos reales al implementar.
