---
phase: 01-fundaciones-y-ahora
verified: 2026-10-23T22:50:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Abrir https://clima-winifreda.vercel.app en un iPhone real (Safari y PWA agregada a inicio)"
    expected: "Se ve el hero con temperatura, sensacion, humedad, presion, viento/rafaga/direccion, estado en rioplatense, legible a 390 px"
    why_human: "Apariencia visual real en dispositivo"
  - test: "Dejar la PWA/pestana abierta y observar el 'Actualizado hace X min' y el auto-refresh con backoff"
    expected: "La antiguedad avanza sola y se refresca sin recargar manualmente"
    why_human: "Temporizacion en cliente"
  - test: "Revisar /dev/estados (galeria de estados) en el browser"
    expected: "Los frames (ok, stale, error, sin datos) se ven coherentes con UI-SPEC"
    why_human: "Juicio visual"
---

# Phase 1: Fundaciones y Ahora - Verification Report

**Phase Goal:** El usuario abre la URL publica en Vercel y ve el tiempo actual de Winifreda, servido desde la cache del servidor, en hora argentina y con su antiguedad visible
**Status:** human_needed (todo lo verificable por codigo/produccion pasa; quedan items visuales)
**Re-verification:** No

## Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Temp, sensacion, humedad, presion, viento (vel, rafaga, direccion) + estado en rioplatense | VERIFIED | HTML de produccion: "16 deg, Cubierto, sensacion 14, HUMEDAD 63 %, PRESION 1016 hPa, VIENTO 14 km/h S, Rafagas de 32 km/h - viento del sur". Code: components/Ahora.tsx, lib/weather/wmo.ts, wind.ts (tests ok) |
| 2 | "Actualizado hace X min"; recargar no genera requests nuevos; datos <=15 min | VERIFIED | Prod muestra "ACTUALIZADO RECIEN". `app/page.tsx` y `app/api/weather/route.ts` con `revalidate = 600`; lib/sources/readThrough.ts fuerza refresh si TTL vencido (arregla staleness de unstable_cache). Smoke: `sources[0].fetchedAt` estable entre requests. Freshness.tsx cliente |
| 3 | Fuente falla: la pagina carga y muestra ultimo dato bueno o aviso | VERIFIED | `getWeatherSnapshot()` nunca rechaza (page.tsx comenta/usa); snapshot.test.ts cubre stale http_500 con last-good, WEATHER_FAULT openmeteo-down/metno-down, degraded; NoData.tsx/Notice.tsx/error.tsx/global-error.tsx existen |
| 4 | Hora argentina; 21-24 h locales no saltan de dia | VERIFIED | lib/time.test.ts: 02:59Z -> "viernes 23 ... 23:59", 03:00Z -> sabado 00:00; prod muestra "viernes 23 de octubre, 19:42 ART" con servidor en UTC (22:42Z) |
| 5 | Push a main publica en Vercel (region gru1) | VERIFIED (con nota) | origin = github.com/tomasbasso/PaginaClima; `/api/health` devuelve `{"region":"gru1","commit":"63735ae"}` = HEAD local (docs commit posterior a c210626), prueba de que el push se desplego solo; vercel.json `regions:["gru1"]` |

**Score:** 5/5

Los cambios de 01-REVIEW-FIX (backoff de auto-refresh, data-sky tambien en main) son compatibles con el objetivo (refuerzan frescura/legibilidad); no son regresiones.

## Behavioral Spot-Checks / Gates

| Check | Result |
|-------|--------|
| `npx vitest run` | 16 files, 157 tests passed |
| `npx tsc --noEmit` | sin errores |
| `npm run lint` | limpio |
| `node scripts/smoke.mjs https://clima-winifreda.vercel.app --expect-region gru1` | all checks passed (GET / 200 "Winifreda", fetchedAt estable, tempC=16, region=gru1) |
| `npm run build` | no ejecutado (el deploy de produccion en el commit HEAD prueba que el build pasa) |

## Requirements Coverage

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| DATA-01 | 01, 05, 06, 07 | SATISFIED | revalidate 600, readThrough, unstable_cache; smoke fetchedAt estable |
| DATA-02 | 05 | SATISFIED | Freshness.tsx + "ACTUALIZADO RECIEN" en prod |
| DATA-03 | 06, 07 | SATISFIED | snapshot.test.ts fallos/stale/fault; UI de aviso |
| DATA-04 | 01, 03 | SATISFIED | lib/time.ts + tests de borde 03Z |
| NOW-01 | 01, 03 | SATISFIED | Valores presentes en HTML de prod |
| NOW-02 | 03, 04 | SATISFIED | "Cubierto", wmo.ts rioplatense |
| OPS-01 | 02, 07 | SATISFIED en codigo/produccion | health commit == HEAD, gru1 |

Todos los IDs de los PLAN (DATA-01..04, NOW-01, NOW-02, OPS-01) estan en REQUIREMENTS.md y contabilizados; no hay requisitos huerfanos para Fase 1.

## Anti-Patterns

Sin TBD/FIXME/XXX en app, components, lib, proxy.ts, scripts. Sin stubs hallados en los flujos verificados.

## Warnings / Housekeeping (no bloqueantes)

- `.planning/REQUIREMENTS.md` aun marca OPS-01 como `[ ]` y "Pending" (lineas 76 y 139) aunque esta cumplido. Actualizar a `[x]` / Complete.
- Los skeleton "CARGANDO" aparecen en el HTML inicial por streaming/Suspense; el contenido real llega en el mismo documento (verificado).

## Human Verification Required

1. **iPhone real:** abrir la URL en Safari y como PWA; verificar legibilidad y diseno a 390 px.
2. **Temporizacion de refresco:** observar que "Actualizado hace X min" avanza y el auto-refresh con backoff funciona en la PWA.
3. **/dev/estados:** revisar visualmente los frames de estados.

## Gaps Summary

Sin gaps. Fase lista salvo confirmacion humana visual.

_Verified: 2026-10-23_
_Verifier: Claude (gsd-verifier)_
