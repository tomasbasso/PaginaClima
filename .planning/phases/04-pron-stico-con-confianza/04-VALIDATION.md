---
phase: 4
slug: pron-stico-con-confianza
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-11-01
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^5.0.5, entorno `node`, `TZ=UTC` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run lib/forecast lib/sources lib/weather lib/sections.test.ts` |
| **Full suite command** | `npm test && npm run typecheck && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/forecast lib/sources lib/weather lib/sections.test.ts`
- **After every plan wave:** Run `npm test && npm run typecheck && npm run lint`
- **Before `/gsd-verify-work`:** Full suite must be green, más `npm run build`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

La tabla sale de "Validation Architecture" en `04-RESEARCH.md`, con los IDs reales. Última corrida completa: 2026-11-02, 50 archivos y 959 tests en verde.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 04-01 | 1 | Criterio 4 | — | N/A | unit | `npx vitest run lib/sections.test.ts` | ✅ | ✅ green |
| 04-02-T1 | 04-02 | 1 | FCST-03 | — | N/A | fixture + e2e | `npx vitest run test/skeleton.e2e.test.ts` | ✅ | ✅ green |
| 04-02-T2 | 04-02 | 1 | FCST-03 | — | N/A | unit | `npx vitest run lib/forecast/localDayRain.test.ts` | ✅ | ✅ green |
| 04-02-T2 | 04-02 | 1 | FCST-03, FCST-04 | — | N/A | unit | `npx vitest run lib/forecast/ensemble.test.ts` | ✅ | ✅ green |
| 04-02-T2 | 04-02 | 1 | FCST-03 | — | Respuesta rota → `SourceError('schema')` | unit | `npx vitest run lib/sources/openMeteoEnsemble.test.ts` | ✅ | ✅ green |
| 04-02-T2 | 04-02 | 1 | D-17, D-18 | — | Sin datos de miembros en `/api/weather` | unit | `npx vitest run lib/weather/snapshot.test.ts` | ✅ | ✅ green |
| 04-03-T1 | 04-03 | 2 | FCST-03 | — | N/A | unit | `npx vitest run lib/forecast/daily.test.ts` | ✅ | ✅ green |
| 04-03-T2 | 04-03 | 2 | FCST-03 | — | N/A | smoke | `node scripts/smoke.mjs` con `--expect-html '/pronostico::data-pluvio'` | ✅ | ✅ green |
| 04-04-T1 | 04-04 | 3 | FCST-04 | — | N/A | unit | `npx vitest run lib/forecast/daily.test.ts lib/forecast/ensemble.test.ts` | ✅ | ✅ green |
| 04-04-T2 | 04-04 | 3 | FCST-04 | — | N/A | smoke | `node scripts/smoke.mjs` con `--expect-html '/pronostico::abanico-l'` | ✅ | ✅ green |
| 04-05-T1 | 04-05 | 4 | MODL-02 | — | Respuesta rota → `SourceError('schema')` | unit | `npx vitest run lib/sources/openMeteoModels.test.ts` | ✅ | ✅ green |
| 04-05-T2 | 04-05 | 4 | MODL-02 | — | Sin valores por modelo en `/api/weather` | unit | `npx vitest run lib/forecast/agreement.test.ts lib/weather/snapshot.test.ts` | ✅ | ✅ green |
| 04-06-T1 | 04-06 | 5 | MODL-02 | — | Nunca un acuerdo falso (D-14) | unit | `npx vitest run lib/forecast/daily.test.ts` | ✅ | ✅ green |
| 04-06-T2 | 04-06 | 5 | MODL-02 | — | N/A | smoke | `node scripts/smoke.mjs` con `--expect-html '/pronostico::data-rombo'` | ✅ | ✅ green |
| 04-07-T1 | 04-07 | 6 | D-04 | — | N/A | unit | `npx vitest run lib/forecast/rowStatus.test.ts` | ✅ | ✅ green |
| 04-07-T2 | 04-07 | 6 | D-04 | — | N/A | unit | `npx vitest run lib/forecast/daily.test.ts` | ✅ | ✅ green |
| 04-08-T1 | 04-08 | 6 | D-17, D-18 | — | Faults ignorados en producción; `errorCode` nunca llega a pantalla | unit | `npx vitest run lib/weather/snapshot.test.ts lib/forecast/confidenceNotice.test.ts` | ✅ | ✅ green |
| 04-08-T2 | 04-08 | 6 | D-17 | — | N/A | smoke | `WEATHER_FAULT=ensemble-down` y `WEATHER_FAULT=models-down`, con `node scripts/smoke.mjs` en cada build | ✅ | ✅ green |
| 04-09-T1 | 04-09 | 7 | MODL-02 | T-04-18, T-04-19 | Frases solo de tablas locales; sin acuerdo falso | unit | `npx vitest run lib/forecast/despacho.test.ts` | ✅ | ✅ green |
| 04-09-T2 | 04-09 | 7 | MODL-02, FCST-03 | — | N/A | unit + smoke | `npx vitest run lib/forecast/daily.test.ts` y `node scripts/smoke.mjs` con `--expect-html '/pronostico::Qué significan los rombos'` | ✅ | ✅ green |
| 04-10-T1 | 04-10 | 8 | FCST-03, FCST-04, MODL-02 | T-04-20, T-04-23 | `/dev/estados` da 404 en producción | smoke | `node scripts/smoke.mjs` con `--expect-html '/dev/estados::Cuadro 16'` en local y `--expect-404 /dev/estados` en producción | ✅ | ✅ green |
| 04-10-T2 | 04-10 | 8 | Criterio 4 | T-04-22 | Sin datos de miembros ni de modelos en `/api/weather` | smoke | `node scripts/smoke.mjs` (con `MSYS_NO_PATHCONV=1`) con `--expect-404 /modelos` y `--reject-html '/api/weather::_member\d\|ecmwf_ifs\|gfs_seamless\|icon_seamless\|gem_seamless'` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/sources/__fixtures__/open-meteo-ensemble.json` — captura real de la URL final
- [x] `lib/sources/__fixtures__/open-meteo-models.json` — captura real
- [x] Constructor sintético en `lib/forecast/__fixtures__/build.ts` — el cruce de medianoche no se repite en capturas nuevas, así que debe ser sintético
- [x] Archivos de test marcados ❌ W0 en la tabla original: existen todos y están en verde

No hizo falta instalar nada.

---

## Manual-Only Verifications

La revisión técnica en Chrome está en `04-10-SUMMARY.md`. Estas filas siguen pendientes del dueño, para la verificación final de la fase.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Abanico, pluviómetro, rombos y despacho se ven como dice el contrato | FCST-03, FCST-04, MODL-02 | Son juicios visuales y el proyecto no tiene tests de componentes | "Verificación en el navegador" de `04-UI-SPEC.md`: 10 criterios y 16 cuadros de `/dev/estados` |
| Las bandas de los días lejanos se leen con datos reales | FCST-04 | En la maqueta se leían débil; solo se puede juzgar con datos reales | Abrir `/pronostico` a 14 días en 390 y 320 px (ver `.planning/sketches/001-abanico-lista/README.md`) |
| La frecuencia de "DUDAN" es aceptable | MODL-02 | Es una decisión del dueño | Revisar con el dueño en la verificación final |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** mapa automático completo el 2026-11-02. Las verificaciones manuales de arriba quedan para el dueño.
