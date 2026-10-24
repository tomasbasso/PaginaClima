---
phase: 02-pron-stico-n-cleo
plan: 01
subsystem: forecast-headline
tags: [headline, NOW-03, time, tz, fixtures, ahora, layout]
requires: []
provides:
  - "buildHeadline(snapshot, now) + umbrales con nombre (lib/forecast/headline.ts)"
  - "hourOf, dayKeyOf, selectFutureHours, dayPart, DAY_PART_PHRASE (lib/forecast/hours.ts)"
  - "localHour, addDaysToKey, weekdayShort, weekdayLong, relativeDayLabel (lib/time.ts)"
  - "makeHourly / makeDaily (lib/forecast/__fixtures__/build.ts)"
  - "Header exportado (components/Header.tsx)"
affects: [02-02, 02-03, 02-04, 02-05]
tech-stack:
  added: []
  patterns:
    - "Hora/día leídos por slice del ISO -03:00 o Intl con timeZone; nunca getHours"
    - "Funciones puras con now explícito, tests bajo TZ=UTC"
    - "Titular armado solo desde una tabla local de frases (sin strings upstream)"
key-files:
  created:
    - lib/forecast/hours.ts
    - lib/forecast/hours.test.ts
    - lib/forecast/__fixtures__/build.ts
    - lib/forecast/headline.ts
    - lib/forecast/headline.test.ts
    - components/Header.tsx
  modified:
    - lib/time.ts
    - lib/time.test.ts
    - components/Ahora.tsx
    - components/Hero.tsx
    - app/globals.css
    - app/page.tsx
decisions:
  - "Rol Headline del titular: fallback UI-SPEC 28px / 1.21 (32/1.19 desbordaba 0,8 px a 390×844 con insets de iPhone 47/34)"
  - "El título de /pronostico (plan 02-02) debe usar el mismo rol Headline ya ajustado: 28px / 1.21"
  - "MAX_WORDS = 7 y MAX_CHARS = 34 (el ejemplo del UI-SPEC 'Día de calor, tormentas a la noche' tiene 7 palabras)"
metrics:
  duration: "~25 min"
  completed: 2026-10-23
  tasks: 3
  files: 12
---

# Phase 2 Plan 01: Titular editorial (NOW-03) Summary

Titular rioplatense basado en reglas (`buildHeadline`) arriba de la temperatura en Ahora, con ventana hoy/"Mañana:" según la hora local, prioridad tormenta > lluvia > temperatura > viento > estado general, y límite de 7 palabras / 34 caracteres. Se suman helpers de hora/día a prueba de TZ y los builders de fixtures que reusa el resto de la fase.

## Tareas

| # | Tarea | Commits |
|---|-------|---------|
| 1 | Helpers TZ-proof, filtro de horas futuras, franjas y builders de fixtures | b13efac (test), 5b5c19a (feat) |
| 2 | `buildHeadline`: ventana, prioridad, franjas y composición | 5f0934d (test), 2d8586a (feat) |
| 3 | Titular en Ahora con el rol Headline y nuevo presupuesto de la primera pantalla | 7bbeee2 |

## Verificación

- `npm test`: 18 archivos, 207 tests en verde (37 nuevos del titular, 9 de hours y 4 nuevos de time), bajo TZ=UTC.
- `npm run typecheck`, `npm run lint` y `npm run build` en verde. `/` sigue con revalidate de 10 min.
- `node scripts/smoke.mjs http://localhost:3107 --start`: todas las verificaciones pasaron.
- Fixture real de Open-Meteo a 2026-10-23T17:30Z: el resultado no es null y cumple los límites.
- Grep de aceptación: 0 `getHours` fuera de comentarios en lib/time.ts; 0 `new Date()|getHours|precipitation_probability` en headline.ts.

## Medición de la primera pantalla a 390×844

Se midió con Chrome headless por CDP (`Emulation.setDeviceMetricsOverride` 390×844 DPR 3 mobile, con `document.fonts.ready` para que Playfair esté cargada), sobre `next start -p 3107` con el build de producción. El escenario con insets usa `Emulation.setSafeAreaInsetsOverride` top 47 / bottom 34, que corresponde al iPhone en standalone. La fila de ráfagas estaba visible ("Ráfagas de 25 km/h · viento del sur").

**Con 32px / 1.19 (rol original):**

| Escenario | Titular | Líneas | --band-h | Silueta de 120 px entera sobre la barra |
|-----------|---------|--------|----------|-----------------------------------------|
| Sin insets | "Noche nublada" (real) | 1 | 200 px | sí |
| Sin insets | "Calor fuerte, tormentas a la noche" (34) | 2 | 200 px | sí |
| Insets 47/34 | "Noche nublada" (real) | 1 | 120 px | sí |
| Insets 47/34 | "Calor fuerte, tormentas a la noche" (34) | 2 | 120 px | **no**: desborda 0,83 px (svg bottom 754,83 > barra 754; scrollHeight 845) |

**Con el fallback 28px / 1.21 aplicado:**

| Escenario | Titular | Líneas | --band-h | Silueta entera |
|-----------|---------|--------|----------|----------------|
| Sin insets | real | 1 | 200 px | sí |
| Sin insets | 34 caracteres | 2 (67,75 px) | 200 px | sí |
| Insets 47/34 | real | 1 | 120 px | sí |
| Insets 47/34 | 34 caracteres | 2 (67,75 px) | 120 px | sí (svg bottom 754 = barra 754, scrollHeight 844) |

Con insets, la banda ya queda en el mínimo de 120 px. Es decir, con el titular de 2 líneas el contenido usa todo el presupuesto y no sobra espacio.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Medición] Se aplicó el fallback tipográfico del UI-SPEC**
- **Found during:** Tarea 3 (medición obligatoria)
- **Issue:** a 390×844 con insets de iPhone, el titular de 34 caracteres a 32/1.19 empujaba la silueta 0,83 px debajo de la barra.
- **Fix:** se pasó la constante `HEADLINE` de Ahora a `text-[28px] leading-[1.21]` y no se tocó nada más, como indica el plan. Después se volvió a medir: entra.
- **Consecuencia sobre la aceptación:** el criterio "Ahora.tsx contiene `text-[32px]` y `leading-[1.19]`" ya no se cumple a propósito. Se mantienen `[text-wrap:balance]`, la itálica, el tracking y los gaps mt-6/mb-4/mt-6.
- **Files modified:** components/Ahora.tsx
- **Commit:** 7bbeee2

**2. [Detalle] Comentario sobre getHours en lib/time.ts**
- El JSDoc "Never `d.getHours()`" contaba en el grep de aceptación (`grep -v '^\s*//'` no excluye `/** */`), así que se reescribió como comentario `//` sin la palabra.

### Interpretaciones menores

- Si hay lluvia por suma (≥ 1 mm) pero ninguna hora ≥ 0,1 mm, las horas de lluvia pasan a ser las de precip > 0. Se evita así una franja vacía; con datos reales este caso no se da.
- La clase "llovizna"/"nevadas" se decide sobre las horas lluviosas con código conocido.

## Known Stubs

Ninguno. El titular toma los datos reales del snapshot. Si devuelve null, el slot desaparece y vuelve el espaciado de la fase 1 (mt-12).

## Notas para planes siguientes

- 02-02 (`/pronostico`): ya puede importar `Header` desde `components/Header.tsx`. El título "Los próximos días" tiene que ir en el rol Headline ajustado (28px / 1.21 itálica) para no tener dos tamaños de Headline.
- 02-05: hay que repetir el UAT de la primera pantalla después del refactor de Hero. El script de medición por CDP está en `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\43f7effc-2a61-4c9e-8aea-b093a474d9ef\scratchpad\measure.mjs` (es temporal; si se quiere conservar, habría que moverlo a scripts/).

## Self-Check: PASSED

- Archivos creados: todos presentes (hours.ts, hours.test.ts, __fixtures__/build.ts, headline.ts, headline.test.ts, Header.tsx).
- Commits: b13efac, 5b5c19a, 5f0934d, 2d8586a, 7bbeee2 presentes en `git log`.
