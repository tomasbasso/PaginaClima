---
phase: 4
slug: pron-stico-con-confianza
status: draft
nyquist_compliant: false
wave_0_complete: false
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

Los Task ID se completan cuando existan los planes. La tabla sale de "Validation Architecture" en `04-RESEARCH.md`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | FCST-03 | — | N/A | unit | `npx vitest run lib/forecast/localDayRain.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FCST-03, FCST-04 | — | N/A | unit | `npx vitest run lib/forecast/ensemble.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FCST-03 | — | Respuesta rota → `SourceError('schema')` | unit | `npx vitest run lib/sources/openMeteoEnsemble.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FCST-04, MODL-02 | — | N/A | unit | `npx vitest run lib/forecast/daily.test.ts` | ✅ se extiende | ⬜ pending |
| TBD | TBD | TBD | MODL-02 | — | N/A | unit | `npx vitest run lib/forecast/agreement.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MODL-02 | — | Respuesta rota → `SourceError('schema')` | unit | `npx vitest run lib/sources/openMeteoModels.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MODL-02 | — | N/A | unit | `npx vitest run lib/forecast/despacho.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | D-04 | — | N/A | unit | `npx vitest run lib/forecast/rowStatus.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | D-17, D-18 | — | Faults ignorados en producción; sin datos de miembros ni de modelos en `/api/weather` | unit | `npx vitest run lib/weather/snapshot.test.ts` | ✅ se extiende | ⬜ pending |
| TBD | TBD | TBD | Criterio 4 | — | N/A | unit | `npx vitest run lib/sections.test.ts` | ✅ se cambia | ⬜ pending |
| TBD | TBD | TBD | Criterio 4 | — | N/A | smoke | `node scripts/smoke.mjs` con `--expect-404` (con `MSYS_NO_PATHCONV=1`) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/sources/__fixtures__/open-meteo-ensemble.json` — captura real de la URL final
- [ ] `lib/sources/__fixtures__/open-meteo-models.json` — captura real
- [ ] Constructor sintético en `lib/forecast/__fixtures__/` — el cruce de medianoche no se repite en capturas nuevas, así que debe ser sintético
- [ ] Archivos de test marcados ❌ W0 en la tabla

No hace falta instalar nada.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Abanico, pluviómetro, rombos y despacho se ven como dice el contrato | FCST-03, FCST-04, MODL-02 | Son juicios visuales y el proyecto no tiene tests de componentes | "Verificación en el navegador" de `04-UI-SPEC.md`: 10 criterios y 16 cuadros de `/dev/estados` |
| Las bandas de los días lejanos se leen con datos reales | FCST-04 | En la maqueta se leían débil; solo se puede juzgar con datos reales | Abrir `/pronostico` a 14 días en 390 y 320 px (ver `.planning/sketches/001-abanico-lista/README.md`) |
| La frecuencia de "DUDAN" es aceptable | MODL-02 | Es una decisión del dueño | Revisar con el dueño en la verificación final |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
