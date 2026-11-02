---
phase: 04-pron-stico-con-confianza
verified: 2026-11-02T18:00:00Z
status: gaps_found
score: 3/4 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Si una fuente de confianza falla, el Pronóstico lo avisa y conserva el último dato bueno (D-17)"
    status: failed
    reason: "CR-01 confirmado en el código: un payload sin datos útiles (columnas todo null, o time vacío) pasa el schema, aggregate devuelve [] y el adapter lo devuelve como éxito. unstable_cache lo guarda por el TTL completo, pisa el último dato bueno, deriveSourceStatus da ok y no hay aviso."
    artifacts:
      - path: "lib/sources/openMeteoEnsemble.ts"
        issue: "Línea ~41: devuelve data: aggregateEnsemble(...) sin chequear data.length === 0"
      - path: "lib/sources/openMeteoModels.ts"
        issue: "Mismo patrón; el schema solo valida presencia de columnas, no valores no nulos ni filas"
    missing:
      - "Lanzar SourceError('schema') si el agregado queda vacío (idealmente por debajo de un mínimo de días), en ambos adapters, con test en cada uno"
human_verification:
  - test: "Frecuencia de DUDAN: abrir /pronostico con 14 días y leer la lista"
    expected: "Se lee tranquila; hoy hay 5 coinciden / 9 dudan (de 14), si es mucho se sube AGREEMENT_C"
    why_human: "Juicio de diseño del dueño; no respondido"
  - test: "Bandas con datos reales"
    expected: "Se ve el abanico abrirse sin leer números"
    why_human: "Percepción visual; no respondido"
  - test: "Transición al alternar 7 y 14 días en el iPhone"
    expected: "Corre fluida; si no, plan B con transform"
    why_human: "Rendimiento en dispositivo; no respondido"
  - test: "Prueba clave: sin leer un número, ver dónde se abre el abanico, cuándo llueve y qué días hay duda"
    expected: "Las tres cosas se entienden de un vistazo"
    why_human: "Revisión visual del dueño (04-10 Task 3); no respondida"
  - test: "Aprobar o cambiar las frases fuera del contrato (cuadros 16 y 6c)"
    expected: "Copy aprobado por el dueño"
    why_human: "Decisión de copy"
  - test: "Autorizar la corrección de CLAUDE.md (fila Open-Meteo Ensemble)"
    expected: "grep -c precipitation_member01 CLAUDE.md > 0 tras aplicar; hoy da 0"
    why_human: "Un agente no puede autorizar cambios en CLAUDE.md; criterio de 04-10 Task 2 sin cumplir"
---

# Phase 4: Pronóstico con confianza - Verification Report

**Phase Goal:** El usuario sabe cuánta confianza tenerle al pronóstico sin salir del Pronóstico: probabilidad de lluvia real, rango de incertidumbre en días lejanos y semáforo de coincidencia entre modelos.
**Status:** gaps_found (más ítems humanos pendientes)

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FCST-03: probabilidad de lluvia por día desde miembros del ensemble (>= 1 mm día local) | VERIFIED | `lib/forecast/ensemble.ts`, `localDayRain.ts` con tests; producción trae 14 `data-pluvio` en /pronostico; vitest 959/959 |
| 2 | FCST-04: rango p10-p90 de temperatura y lluvia en días lejanos | VERIFIED | Agregación por cuantiles en ensemble.ts (tests verdes); `Qué significan los rombos`/bandas renderizados; la lectura visual queda para el dueño |
| 3 | MODL-02: semáforo de coincidencia, solo modelos independientes, sin pestaña aparte | VERIFIED | `agreement.ts`, 20 `data-rombo` en producción; sin ruta /modelos (404 según smoke); datos reales 5 coinciden / 9 dudan |
| 4 | D-17: fallo de fuente solo afecta la confianza, con aviso y último dato bueno | FAILED (BLOCKER) | CR-01 confirmado: `openMeteoEnsemble.ts` retorna el agregado sin chequear vacío; `openMeteoModels.schema.ts` solo exige columnas presentes (superRefine con `usable.length === 0` mira presencia, no valores) |

**Score:** 3/4

## Requirements Coverage

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| FCST-03 | 04-10 (y anteriores) | SATISFIED | ver truth 1 |
| FCST-04 | 04-10 (y anteriores) | SATISFIED (pendiente revisión visual) | truth 2 |
| MODL-02 | 04-10 (y anteriores) | SATISFIED | truth 3 |

Sin requisitos huérfanos: REQUIREMENTS.md mapea solo estos tres IDs a la fase 4.

## Behavioral Spot-Checks

| Check | Result | Status |
|-------|--------|--------|
| `npx vitest run` | 50 archivos, 959 tests pasan | PASS |
| Producción /pronostico (https://clima-winifreda.vercel.app) | data-pluvio x14, data-rombo x20, leyenda y crédito ECMWF presentes | PASS |
| `grep -c precipitation_member01 CLAUDE.md` | 0 | FAIL (criterio conocido de 04-10 Task 2, pendiente de aprobación del dueño) |

## Otros hallazgos de 04-REVIEW.md (WARNING, no bloquean el objetivo central)

- WR-01: aviso stale con solo HH:mm, sin fecha; puede describir datos que la página no muestra.
- WR-02: "El resto del pronóstico sigue al día" puede ser falso (error + stale, o fuente principal caída).
- WR-03: `verdictFor` lanza TypeError con más de 4 votantes (`AGREEMENT_C[n as 2|3|4]`); fuera del allSettled, tumbaría `/`, `/pronostico` y `/api/weather` si se agrega un quinto modelo. Hoy no se dispara (2 votantes).
- WR-04: regex `/_memberd|.../` (falta `\`) en `test/skeleton.e2e.test.ts:131` y `lib/weather/snapshot.test.ts:311`; la guarda D-18 no chequea lo que dice. Nota: el smoke de producción sí usa `_member\d` y pasó, así que no hay fuga hoy.
- IN-01..IN-04: leyenda ligada a Despacho, espera innecesaria de `/`, timeout de body logueado como schema, duplicación.

## Gaps Summary

La entrega visible (probabilidad, rango, semáforo) existe, está cableada a datos reales y desplegada. El único fallo de verdad es CR-01: el contrato D-17 (último dato bueno + aviso) se rompe ante respuestas vacías, un caso realista según el fixture (columnas null de ICON/GEM). Corregirlo es un cambio chico en dos adapters. La fase no debería darse por cerrada hasta cerrar CR-01 y la revisión del dueño (ítems de `human_verification`); WR-01..WR-04 conviene atenderlos en el mismo plan de cierre.

_Verifier: Claude (gsd-verifier)_
