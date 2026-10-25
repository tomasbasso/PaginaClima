---
phase: 5
slug: lluvia-sat-lite-y-astros
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-25
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (`environment: 'node'`, `TZ=UTC`) |
| **Config file** | `vitest.config.ts` (existe) |
| **Quick run command** | `npx vitest run lib/rain lib/sky lib/satellite lib/sources` |
| **Full suite command** | `npm test && npm run typecheck && npm run lint && npm run build` |
| **Estimated runtime** | ~5 s (quick) / ~90 s (full con build) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <archivos tocados>`
- **After every plan wave:** `npm test && npm run typecheck`
- **Before `/gsd-verify-work`:** suite completa + `npm run build` (`/cielo` sigue siendo ISR)
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

Lo completa el planner/executor con los IDs reales. Mapa requisito → test (de 05-RESEARCH.md):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| RAIN-01 | Costura ERA5/recent, hoy parcial | unit | `npx vitest run lib/rain/stitch.test.ts` | ❌ W0 | ⬜ pending |
| RAIN-01 | Inicio de semana/mes/año en ART, cruce de año | unit | `npx vitest run lib/rain/periods.test.ts` | ❌ W0 | ⬜ pending |
| RAIN-02 | Normal prorrateada, climatología ≈ 702 mm, 365 valores | unit | `npx vitest run lib/rain/normal.test.ts` | ❌ W0 | ⬜ pending |
| RAIN-02 | `compareRain` tabla y bordes | unit | `npx vitest run lib/rain/compare.test.ts` | ❌ W0 | ⬜ pending |
| RAIN-01/D-04 | `lastRain` con umbral 1 mm | unit | `npx vitest run lib/rain/lastRain.test.ts` | ❌ W0 | ⬜ pending |
| RAIN-01 | Schemas zod archivo y recent | unit | `npx vitest run lib/sources/openMeteoArchive.test.ts lib/sources/openMeteoRecentRain.test.ts` | ❌ W0 | ⬜ pending |
| RAIN-03 | Aclaración siempre visible con números | manual / `/dev/estados` | revisión visual | — | ⬜ pending |
| SAT-01 | `latestSlotFromDomains`, selección de candidato (negro, XML 200) | unit | `npx vitest run lib/sources/gibs.test.ts` | ❌ W0 | ⬜ pending |
| SAT-01 | `parseStamp`, `markerPosition`, BBOX 800 km | unit | `npx vitest run lib/satellite/frame.test.ts` | ❌ W0 | ⬜ pending |
| SAT-01 | Ruta `/api/satelite/[stamp]`: `image/jpeg` + inmutable; stamp inválido → 404 | smoke | `node scripts/smoke.mjs ... --start` | ❌ W0 | ⬜ pending |
| SAT-02 | Link al SMN con `target=_blank` y `rel="noopener noreferrer"` | smoke | `--expect-html '/cielo::smn.gob.ar/radar'` | ❌ W0 | ⬜ pending |
| ASTRO-01 | `sunDay`: 06:20 / 19:42 el 25/10, diferencia con ayer | unit | `npx vitest run lib/sky/sun.test.ts` | ❌ W0 | ⬜ pending |
| ASTRO-02 | `moonPath` hemisferio sur, nombres de fase, `nextFullMoon` | unit | `npx vitest run lib/sky/moon.test.ts` | ❌ W0 | ⬜ pending |
| ASTRO-02 | Creciente vista iluminada a la izquierda | manual (`/dev/estados`) | revisión visual | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Fixtures reales en `lib/sources/__fixtures__/`: `open-meteo-archive-era5.json`, `open-meteo-recent-rain.json`, `gibs-domains.xml`, `gibs-blank.jpg`, `gibs-frame.jpg`
- [ ] `lib/rain/climatology-1991-2020.json` generado por `scripts/climatology.mjs`
- [ ] Tests nuevos de la tabla. Framework ya instalado.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Aclaración de reanálisis visible | RAIN-03 | Composición visual | `/cielo` y `/dev/estados`: con números siempre aparece "Estimado por reanálisis, no pluviómetro" |
| Luna creciente iluminada a la izquierda | ASTRO-02 | Orientación visual del dibujo | `/dev/estados`, grilla de 8 fases |
| Imagen satelital centrada y legible | SAT-01 | Juicio visual | `/cielo` en 390 px: marcador en el centro, hora ART del pase, sin salto de layout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
