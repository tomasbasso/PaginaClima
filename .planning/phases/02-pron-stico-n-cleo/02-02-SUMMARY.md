---
phase: 02-pron-stico-n-cleo
plan: 02
subsystem: forecast-daily
tags: [FCST-02, pronostico, hero, daily, tabbar, isr]
requires:
  - "02-01: Header, relativeDayLabel/localDateKey, makeDaily, rol Headline 28/1.21"
provides:
  - "Hero con caja del cielo de primera pantalla, slot `below` y variante `compact` (components/Hero.tsx)"
  - "buildDailyRows, rainText, DailyRow, DailyBar, MAX_DAYS, DEFAULT_DAYS (lib/forecast/daily.ts)"
  - "Isla DailyList 7/14 días (components/client/DailyList.tsx)"
  - "Ruta /pronostico (ISR 600 s) + loading; pestaña Pronóstico habilitada"
affects: [02-03, 02-04, 02-05]
tech-stack:
  added: []
  patterns:
    - "--bar-h en :root y 0px dentro de la caja del cielo: el horizonte del gradiente es el borde inferior de la caja"
    - "SkyBackdrop ubica el host del acento con closest('[data-sky]')"
    - "Escalas 7 y 14 calculadas en el servidor; la isla solo elige bar7/bar14"
key-files:
  created:
    - lib/forecast/daily.ts
    - lib/forecast/daily.test.ts
    - components/Pronostico.tsx
    - components/client/DailyList.tsx
    - app/pronostico/page.tsx
    - app/pronostico/loading.tsx
  modified:
    - components/Hero.tsx
    - components/client/SkyBackdrop.tsx
    - app/globals.css
    - app/dev/estados/page.tsx
    - lib/sections.ts
    - lib/sections.test.ts
decisions:
  - "Título de /pronostico en el rol Headline ajustado (28px / 1.21 itálica), no 32px: un solo tamaño de Headline en la app"
  - "Freshness en /pronostico solo con variante normal/degraded (oculta en loading y en empty sin filas)"
  - "Mapa lineal con clamp escrito inline en daily.ts (sin d3 hasta el plan 03)"
metrics:
  duration: "~10 min"
  completed: 2026-10-23
  tasks: 3
  files: 12
---

# Phase 2 Plan 02: Pronóstico diario (FCST-02) Summary

/pronostico muestra 7 días locales (Hoy, Mañana, "dom 25"…), que se pueden expandir a 14. Cada día tiene mínima, barra de rango sobre la escala común de los días visibles, máxima, estado y lluvia en mm solo cuando hay ≥ 1 mm. Todo va bajo un cielo compacto con la silueta de 120 px. Para esto se refactorizó Hero: la caja del cielo ocupa la primera pantalla y se sumaron el slot `below` y la variante `compact`, sin que la home pierda nada.

## Tareas

| # | Tarea | Commits |
|---|-------|---------|
| 1 | Refactor de Hero: caja del cielo, `below`, `compact` y sincronización del acento | 1a45b98 |
| 2 | Filas diarias (etiquetas, escalas 7/14, regla de lluvia, filtro de días pasados) y pestaña habilitada | cb8aaaa (test), 6f1c670 (feat) |
| 3 | Página /pronostico: hero compacto, título, estados e isla DailyList | 58b931f, 4c54cfc |

## Verificación

- `npm test`: 19 archivos y 221 tests en verde, bajo TZ=UTC. Son 13 tests nuevos de daily y 1 de SECTIONS.
- `npm run typecheck`, `npm run lint` y `npm run build` en verde. En el build, `/pronostico` sale estática con revalidate de 10 min, igual que `/`.
- `node scripts/smoke.mjs http://localhost:3107 --start`: pasaron todas las verificaciones (después de la tarea 1 y de la tarea 3).
- `curl /pronostico` con `next start`: devuelve 200 y contiene `Los próximos días`, `VER 14 DÍAS`, `Pronóstico por día`, `aria-controls="dias-8-14"` y `Hoy`. Pronóstico tiene `aria-current="page"`, mientras que Modelos y Cielo siguen con `aria-disabled`.
- Greps de aceptación: `precipitation_probability|getDay()|toLocaleDateString` = 0 en daily.ts; `precipitation_probability` = 0 en DailyList y Pronostico; `searchParams` = 0 en la página.

### UAT-01 de la home después del refactor (CDP, 390×844, DPR 3)

| Escenario | Titular | --band-h | svg bottom | borde de la caja | barra | Silueta entera | scrollHeight |
|-----------|---------|----------|------------|------------------|-------|----------------|--------------|
| Sin insets | real (1 línea) | 200 | 788 | 788 | 788 | sí | 844 |
| Sin insets | 34 caracteres (2 líneas) | 200 | 788 | 788 | 788 | sí | 844 |
| Insets 47/34 | real | 120 | 754 | 754 | 754 | sí | 844 |
| Insets 47/34 | 34 caracteres | 120 | 754 | 754 | 754 | sí | 844 |

Los valores son idénticos a la medición de 02-01. El borde inferior de la caja del cielo, que es donde termina el gradiente, coincide con la base de la silueta y con el borde superior de la barra. `main[data-sky]` y `html[data-sky]` se sincronizan después de hidratar ("noche"). `/dev/estados` responde 200.

### /pronostico (CDP, 390×844)

- Título a 28px, banda de 120 px y caja del cielo terminando exactamente en la base de la silueta (382,7 px sin insets y 429,7 px con insets 47/34).
- Contraída: 7 filas (Hoy, Mañana, dom 25 … jue 29), botón "VER 14 DÍAS" con `aria-expanded="false"` y la nota oculta.
- Expandida: 14 filas, la nota ORIENTATIVO visible, botón "VER 7 DÍAS", y los segmentos de las primeras 7 filas se re-escalan (por ejemplo, Hoy pasa de 166/55 px a 162/46 px). Al volver a contraer queda igual que al principio.
- Sin scroll horizontal (scrollWidth 390).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Consistencia] El título de /pronostico va a 28px / 1.21 y no a 32px / 1.19**
- **Found during:** Tarea 3
- **Issue:** el plan pedía `text-[32px] leading-[1.19]`, pero 02-01 bajó el rol Headline a 28/1.21 y dejó anotado que /pronostico tiene que usar el mismo.
- **Fix:** se usa la constante `HEADLINE` con 28px / 1.21 itálica y tracking −0.01em.
- **Files modified:** components/Pronostico.tsx
- **Commit:** 58b931f

**2. [Rule 1 - Copy del test] La tercera fila al 23/10/2026 es "dom 25", no "sáb 25"**
- El 2026-10-23 cae viernes, así que el 25 es domingo. El `<behavior>` del plan ya decía "dom 25"; el "sáb 25" del must_have era solo ilustrativo. El test usa la salida real de `relativeDayLabel`.

**3. [Detalle] Comentario reformulado**
- El comentario de la página nombraba `searchParams` y hacía fallar el grep de aceptación. Se cambió a "no query params" (4c54cfc).

### Interpretaciones menores

- `Pronostico` muestra Freshness solo en las variantes normal y degraded. En `empty` (sin filas) no hay datos en pantalla de los que informar la antigüedad, igual que hace Ahora.
- El segmento de la barra usa `max(4px, …)`. Si un día tuviera mín = máx = máximo de la escala, se pasaría hasta 4 px del borde derecho de la columna. No se ve, porque queda dentro del gap de 8 px.

## Known Stubs

Ninguno. Las filas salen del `snapshot.daily` real.

## Threat Flags

Ninguno. No hay endpoints nuevos ni llamadas upstream nuevas: /pronostico reusa el snapshot cacheado con ISR 600 s.

## Notas para planes siguientes

- 02-03: Hero ya acepta `below` (sobre ground, con los mismos márgenes y max-w 560) para montar el meteograma debajo del horizonte en la home.
- Script de medición de /pronostico: `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\43f7effc-2a61-4c9e-8aea-b093a474d9ef\scratchpad\measure-pron.mjs`. La versión de la home que además mide el borde de la caja y el data-sky está en `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\43f7effc-2a61-4c9e-8aea-b093a474d9ef\scratchpad\measure2.mjs`.

## Self-Check: PASSED

- Archivos creados: daily.ts, daily.test.ts, Pronostico.tsx, DailyList.tsx, app/pronostico/page.tsx y app/pronostico/loading.tsx, todos presentes.
- Commits 1a45b98, cb8aaaa, 6f1c670, 58b931f y 4c54cfc, todos presentes en `git log`.
