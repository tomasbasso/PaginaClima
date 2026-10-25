---
phase: 05-lluvia-sat-lite-y-astros
plan: 01
subsystem: cielo / astros
tags: [suncalc, isr, svg, astro]
requires: [lib/sky/astro.ts, lib/time.ts, components/Hero.tsx, components/Header.tsx]
provides: [sunDay, moonInfo, moonPath, moonPhaseName, nextFullMoon, monthLong, formatDayOfMonth, formatDayLong, /cielo]
affects: [lib/sections.ts (pestaña Cielo habilitada)]
tech-stack:
  added: []
  patterns: [cálculo astronómico local en el render ISR, bloques de /cielo dentro de un divide-y en Hero below]
key-files:
  created:
    - lib/sky/sun.ts
    - lib/sky/sun.test.ts
    - lib/sky/moon.ts
    - lib/sky/moon.test.ts
    - components/cielo/CieloHead.tsx
    - components/cielo/SolLuna.tsx
    - components/cielo/MoonDisc.tsx
    - app/cielo/page.tsx
    - app/cielo/loading.tsx
  modified:
    - lib/sky/astro.ts
    - lib/time.ts
    - lib/time.test.ts
    - lib/sections.ts
    - lib/sections.test.ts
decisions:
  - "Lado iluminado de la luna por `waxing` de suncalc (true → izquierda, hemisferio sur), terminador vertical sin rotar"
  - "'Llena el …' se omite mientras el nombre sea 'Luna llena' (ventana ±0,0339), no solo si es hoy"
  - "Si la luna solo se pone en el día local, la línea arranca con 'Se pone' (mayúscula inicial)"
metrics:
  duration: ~8 min
  completed: 2026-10-25
  tasks: 2
  files: 14
---

# Fase 5 Plan 01: Sol y luna en /cielo — Resumen

La pestaña Cielo quedó habilitada y lleva a /cielo, una página ISR (revalidate 600) con Hero compacto y el título "Mirando para arriba". El bloque Sol y luna se calcula entero con suncalc, sin red. Muestra la salida y la puesta del sol en hora argentina, la duración del día con la diferencia contra ayer y la regla de 24 h, y la luna dibujada para el hemisferio sur (la creciente iluminada a la izquierda), con nombre, porcentaje, próxima luna llena y salida/puesta de la luna.

## Tareas

| # | Tarea | Commits |
|---|-------|---------|
| 1 | Corte Sol: sunDay() con tests, /cielo con Hero compacto, pestaña Cielo habilitada | b77e8e0 (RED), b905cab (GREEN) |
| 2 | Corte Luna: moon.ts con tests, MoonDisc SVG, helpers de mes en lib/time.ts | 59924d8 (RED), 6e40523 (GREEN) |

## Verificación

- 30 archivos de test y 562 tests en verde (`npx vitest run`). Typecheck y lint en 0.
- `npm run build`: `/cielo` aparece como `○` (estática, 10m) y no como dinámica.
- Smoke local (`scripts/smoke.mjs --start`): /cielo responde 200 con "Mirando para arriba", "Salida del sol", "Iluminada al" y `viewBox="0 0 64 64"`. La home tiene `href="/cielo"`.
- Valores reales del 2026-10-25T14:00Z: sol 06:20 / 19:42, "13 h 22 min", "2 min más que ayer". Luna: "Luna llena", "Iluminada al 99 %" y próxima llena el 2026-10-26 (ART).

## Desvíos del plan

1. **[Ajuste de test] Salida de la luna del 25/10.** El research anotaba "rise 07:29", pero suncalc formateado en 24 h da **19:29**, que es lo correcto: la luna llena sale cerca del atardecer. Esa nota venía de una lectura en 12 h. El test espera `'Sale 19:29 · se pone 05:37'` y la implementación no se tocó.
2. **[Agregado menor] `formatDuration(minutes)` exportada desde lib/sky/sun.ts.** Sirve para testear el caso "13 h 06 min", porque no hay un día real fácil de fijar con esa duración.
3. **[Rule 2] `srText` de la luna.** El plan lo pedía en `moonInfo` pero no definía la copy. Se armó así: "{nombre}, iluminada al N por ciento. La próxima luna llena es el …. La luna sale a las …. Se pone a las …." Cada parte opcional se omite si falta.

Las tablas y los textos del UI-SPEC se respetaron. Modelos no se tocó: sigue `enabled: false`.

## Known Stubs

Ninguno. El `divide-y` de app/cielo/page.tsx tiene un solo bloque a propósito: los planes siguientes suman Lluvia acumulada y Satélite.

## TDD Gate Compliance

Cada tarea tiene su commit `test(...)` (RED, fallando) seguido del `feat(...)` (GREEN).

## Self-Check: PASSED

- Archivos creados verificados: lib/sky/sun.ts, lib/sky/moon.ts, components/cielo/{CieloHead,SolLuna,MoonDisc}.tsx, app/cielo/{page,loading}.tsx
- Commits verificados: b77e8e0, b905cab, 59924d8, 6e40523
