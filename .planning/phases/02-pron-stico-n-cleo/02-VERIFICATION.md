---
phase: 02-pron-stico-n-cleo
verified: 2026-10-24T00:00:00Z
status: human_needed
score: 3/3 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Abrir la home en un iPhone real (Safari y PWA instalada), bajar hasta PRÓXIMAS 48 HORAS"
    expected: "Meteograma completo en 390 px, sin scroll horizontal, etiquetas (horas, días, máx/mín, mm) sin encimarse, tipografía legible en Safari"
    why_human: "Render de fuentes y SVG en WebKit real; las mediciones en Chrome headless no lo cubren"
  - test: "Arrastrar el dedo horizontalmente sobre el meteograma y luego hacer swipe vertical sobre él"
    expected: "El arrastre horizontal selecciona la hora y actualiza la lectura fija; el swipe vertical sigue scrolleando la página"
    why_human: "Gestos táctiles reales (pointer capture + touch-action: pan-y) en iOS"
  - test: "Home en iPhone real con safe-area (notch/home indicator)"
    expected: "Ahora + titular más largo (34 car.) + silueta del horizonte entran en la primera pantalla; el meteograma aparece al scrollear"
    why_human: "Insets reales de safe-area; solo se midieron con emulación"
  - test: "/pronostico en iPhone real: alternar VER 14 DÍAS / VER 7 DÍAS"
    expected: "Filas legibles, nota 'DEL DÍA 8 EN ADELANTE, ORIENTATIVO' solo al expandir, sin scroll horizontal"
    why_human: "Apariencia visual en dispositivo"
---

# Fase 2: Pronóstico núcleo — Informe de verificación

**Objetivo:** El usuario entiende de un vistazo qué va a pasar en las próximas 48 h y en los próximos días, con un titular que resume el día.
**Estado:** human_needed (todo verificable en código está verificado; falta pasada en iPhone real)
**Re-verificación:** No, verificación inicial

## Verdades observables

| # | Verdad (criterio del roadmap) | Estado | Evidencia |
|---|---|---|---|
| 1 | Meteograma 48 h con temperatura, lluvia mm y viento a 390 px, sin scroll horizontal ni etiquetas encimadas | VERIFICADO (código) / humano en iPhone | `components/client/Meteogram.tsx` (273 líneas): SVG con curva de temperatura, barras de lluvia con pico en mm, fila de 16 flechas de viento + km/h, ticks 00/06/12/18, separadores de día, bandas nocturnas, scrubber `role=slider` con `touch-action: pan-y`. Geometría pura en `lib/forecast/meteogram.ts` (437 líneas) con test "sin solape a 342 px" (412 líneas de tests). Ancho fijo 342 px en SSR y ResizeObserver después. `MeteogramSection` lo monta en la home bajo el horizonte con `selectFutureHours(snapshot.hourly48, now)`. |
| 2 | Diario 7–14 días con máx, mín, estado y lluvia por día, días locales argentinos | VERIFICADO | `lib/forecast/daily.ts` `buildDailyRows` filtra desde `localDateKey(now)` (ART), máx 14, barras de rango comunes, `rainText` solo desde 1 mm. `DailyList` alterna 7/14 con nota ORIENTATIVO. `/pronostico/page.tsx` cableado a `snapshot.daily`; tab Pronóstico habilitada en `lib/sections.ts`. |
| 3 | Titular editorial rioplatense arriba que resume el día y cambia con el pronóstico | VERIFICADO | `lib/forecast/headline.ts` `buildHeadline(snapshot, now)`: pura, reglas con umbrales, vocabulario local, prefijo "Mañana: " desde las 21 h, null sin datos. `app/page.tsx` la recalcula en cada render ISR (`revalidate = 600`) y `Ahora.tsx` la muestra arriba de la temperatura en Playfair itálica 28/1.21. |

**Puntaje:** 3/3

## Flujo de datos (nivel 4)

La config pide `forecast_days: 14` y `precipitation_sum` (`lib/config.ts`). El schema zod valida (`openMeteoForecast.schema.ts`) y `normalize.ts` produce `hourly48` y `daily`. La home y `/pronostico` los consumen desde `getWeatherSnapshot()`. FLUYE; no hay datos fijos ni props vacías.

## Comprobaciones de comportamiento

| Comprobación | Resultado |
|---|---|
| `npm test` | 20 archivos, 250 tests, todos pasan |
| `npm run typecheck` | limpio |
| `npm run lint` | limpio |
| Sondas (probes) | no declaradas en esta fase; no aplica |

No ejecuté `next build` ni la prueba de humo (requiere levantar servidor). Me apoyo en los resultados de CDP que registra 02-VALIDATION.md (scrollWidth 390, 0 etiquetas encimadas), que no verifiqué de forma independiente.

## Cobertura de requisitos

| ID | Plan | Descripción | Estado | Evidencia |
|---|---|---|---|---|
| NOW-03 | 02-01, 02-05 | Titular editorial por reglas | SATISFECHO | `headline.ts` + tests + cableado en `app/page.tsx` y `Ahora.tsx` |
| FCST-01 | 02-03, 02-04, 02-05 | Meteograma 48 h legible a 390 px | SATISFECHO (código); pasada en iPhone pendiente | `Meteogram.tsx`, `meteogram.ts` |
| FCST-02 | 02-02, 02-05 | Diario 7–14 días | SATISFECHO | `daily.ts`, `DailyList.tsx`, `/pronostico` |

Los tres IDs figuran en REQUIREMENTS.md como Phase 2 / Complete. No hay requisitos huérfanos: REQUIREMENTS.md no mapea otros IDs a la Fase 2.

## Antipatrones

Sin marcadores TBD/FIXME/XXX en `lib/forecast`, `components` ni `app`. Ningún stub detectado. `git status` limpio.

Nota informativa: el titular usa 28 px en vez de los 32 px de la UI-SPEC. Es un ajuste documentado en `Ahora.tsx` para que entre en la primera pantalla (decisión de diseño, no brecha).

## Verificación humana requerida

Ver la lista en el frontmatter. Son las comprobaciones en iPhone real que la emulación headless no cubre: render de fuentes en Safari, safe-area real y arrastre con el dedo.

## Resumen de brechas

Ninguna brecha en código. Estado human_needed solo por las comprobaciones en dispositivo real.

---

_Verificado: 2026-10-24_
_Verificador: Claude (gsd-verifier)_
