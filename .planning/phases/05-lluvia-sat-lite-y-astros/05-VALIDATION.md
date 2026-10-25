---
phase: 5
slug: lluvia-sat-lite-y-astros
status: complete
nyquist_compliant: true
wave_0_complete: true
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

IDs reales de las tareas de los planes 05-01 a 05-05. Gate de cierre (05-05-T2, 2026-10-25): 41 archivos / 680 tests en verde, typecheck y lint limpios, build con `/cielo` ○ (ISR 10m) y `/api/satelite/[stamp]` ƒ, smoke local con `--expect-satellite` en verde.

| Task ID | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|-------------|----------|-----------|-------------------|-------------|--------|
| 05-01-T1 | ASTRO-01 | `sunDay`: 06:20 / 19:42 el 25/10, diferencia con ayer; pestaña Cielo en las secciones | unit | `npx vitest run lib/sky/sun.test.ts lib/sections.test.ts` | ✅ | ✅ green |
| 05-01-T2 | ASTRO-02 | `moonPath` hemisferio sur, nombres de fase, `nextFullMoon`; helpers de fecha | unit | `npx vitest run lib/sky/moon.test.ts lib/time.test.ts` | ✅ | ✅ green |
| 05-02-T1 | RAIN-01 | Schemas zod de archivo ERA5 y recent (fixtures reales) | unit | `npx vitest run lib/sources/openMeteoArchive.test.ts lib/sources/openMeteoRecentRain.test.ts` | ✅ | ✅ green |
| 05-02-T2 | RAIN-01 | Inicio de semana/mes/año en ART, cruce de año; costura ERA5/recent, hoy parcial | unit | `npx vitest run lib/rain/periods.test.ts lib/rain/stitch.test.ts` | ✅ | ✅ green |
| 05-02-T3 | RAIN-01, RAIN-03 | View model del bloque (filas, Notice de datos atrasados, aclaración) | unit | `npx vitest run lib/rain/view.test.ts` | ✅ | ✅ green |
| 05-03-T1 | RAIN-02 | Normal prorrateada, climatología ≈ 702 mm, 365 valores | unit | `npx vitest run lib/rain/normal.test.ts` | ✅ | ✅ green |
| 05-03-T2 | RAIN-02, RAIN-01/D-04 | `compareRain` tabla y bordes; `lastRain` con umbral 1 mm | unit | `npx vitest run lib/rain/compare.test.ts lib/rain/lastRain.test.ts` | ✅ | ✅ green |
| 05-03-T3 | RAIN-02 | Barra contra lo normal y bloque con comparación | unit | `npx vitest run lib/rain/view.test.ts` | ✅ | ✅ green |
| 05-04-T1 | SAT-01 | `parseStamp`, `markerPosition`, BBOX 800 km, textos del pase | unit | `npx vitest run lib/satellite/frame.test.ts` | ✅ | ✅ green |
| 05-04-T2 | SAT-01 | `latestSlotFromDomains`, selección de candidato (negro, XML 200); ruta `image/jpeg` + inmutable, stamp inválido → 404 | unit + smoke | `npx vitest run lib/sources/gibs.test.ts "app/api/satelite/[stamp]/route.test.ts"` y `MSYS_NO_PATHCONV=1 node scripts/smoke.mjs http://localhost:3107 --start --expect-satellite` | ✅ | ✅ green |
| 05-04-T3 | SAT-01, SAT-02 | Bloque Satélite en `/cielo`; link al SMN con `target=_blank` y `rel="noopener noreferrer"` | smoke | `MSYS_NO_PATHCONV=1 node scripts/smoke.mjs http://localhost:3107 --start --expect-satellite --expect-html '/cielo::Satélite' --expect-html '/cielo::href="https://www.smn.gob.ar/radar"'` | ✅ | ✅ green |
| 05-05-T1 | RAIN-01..03, SAT-01, ASTRO-01/02 | Galería `/dev/estados` (#luna, #sol, #lluvia, #satelite) con todos los estados y sin URLs de GIBS | smoke | `MSYS_NO_PATHCONV=1 node scripts/smoke.mjs http://localhost:3107 --start --expect-html '/dev/estados::Cuarto creciente' … --reject-html '/dev/estados::gibs\.earthdata'` | ✅ | ✅ green |
| 05-05-T2 | todas | Gate completo + smoke local de `/cielo` | gate + smoke | `npm test && npm run typecheck && npm run lint && npm run build && MSYS_NO_PATHCONV=1 node scripts/smoke.mjs http://localhost:3107 --start --expect-satellite --expect-html '/cielo::Mirando para arriba' --expect-html '/cielo::Lluvia acumulada' --expect-html '/cielo::Satélite' --expect-html '/cielo::href="https://www.smn.gob.ar/radar"' --expect-html '/::href="/cielo"'` | ✅ | ✅ green |
| — | RAIN-03 | Aclaración siempre visible con números | manual / `/dev/estados` | revisión visual | — | ✅ green (revisión visual del orquestador, 2026-10-25) |
| — | ASTRO-02 | Creciente vista iluminada a la izquierda | manual (`/dev/estados#luna`) | revisión visual | — | ✅ green (revisión visual del orquestador, 2026-10-25) |
| — | SAT-01 | Imagen satelital centrada y legible | manual (`/cielo`, `/dev/estados#satelite`) | revisión visual | — | ✅ green (revisión visual del orquestador, 2026-10-25) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Fixtures reales en `lib/sources/__fixtures__/`: `open-meteo-archive-era5.json`, `open-meteo-recent-rain.json`, `gibs-domains.xml`, `gibs-blank.jpg`, `gibs-frame.jpg`
- [x] `lib/rain/climatology-1991-2020.json` generado por `scripts/climatology.mjs`
- [x] Tests nuevos de la tabla. Framework ya instalado.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Aclaración de reanálisis visible | RAIN-03 | Composición visual | `/cielo` y `/dev/estados#lluvia`: con números siempre aparece "Estimado por reanálisis, no pluviómetro" | ✅ green (revisión visual del orquestador, 2026-10-25) |
| Luna creciente iluminada a la izquierda | ASTRO-02 | Orientación visual del dibujo | `/dev/estados#luna`, grilla de 8 fases | ✅ green (revisión visual del orquestador, 2026-10-25) |
| Imagen satelital centrada y legible | SAT-01 | Juicio visual | `/cielo` en 390 px: marcador en el centro, hora ART del pase, sin salto de layout; `/dev/estados#satelite` | ✅ green (revisión visual del orquestador, 2026-10-25) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** automated map complete 2026-10-25; manual-only rows pending the orchestrator's visual review
