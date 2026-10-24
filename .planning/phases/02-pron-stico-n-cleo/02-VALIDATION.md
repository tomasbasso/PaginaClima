---
phase: 2
slug: pron-stico-n-cleo
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-23
completed: 2026-10-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (`environment: 'node'`, `TZ=UTC`) |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run lib/forecast lib/time.test.ts` |
| **Full suite command** | `npm test && npm run typecheck && npm run lint` |
| **Estimated runtime** | ~15 seconds (measured: 2.4 s for 250 tests in 20 files) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/forecast lib/time.test.ts`
- **After every plan wave:** Run `npm test && npm run typecheck && npm run lint`
- **Before `/gsd-verify-work`:** Full suite green + `next build` + browser check at 390×844
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-T1 (localHour, hours: selectFutureHours / dayPart) | 02-01 | 1 | NOW-03 | — | N/A | unit | `npx vitest run lib/time.test.ts lib/forecast/hours.test.ts` | ✅ | ✅ green |
| 02-01-T2 (headline rules) | 02-01 | 1 | NOW-03 | — | Only local words; upstream gives numbers/codes | unit | `npx vitest run lib/forecast/headline.test.ts` | ✅ | ✅ green |
| 02-02-T2 (daily rows + sections enabled) | 02-02 | 2 | FCST-02 | — | N/A | unit | `npx vitest run lib/forecast/daily.test.ts lib/sections.test.ts` | ✅ | ✅ green |
| 02-03-T2 (meteogram geometry, no label overlap at 342 px) | 02-03 | 3 | FCST-01 | — | N/A | unit | `npx vitest run lib/forecast/meteogram.test.ts` | ✅ | ✅ green |
| 02-04-T1 (wind columns, gust line, readout, x→index) | 02-04 | 4 | FCST-01 | — | N/A | unit | `npx vitest run lib/forecast/meteogram.test.ts` | ✅ | ✅ green |
| 02-05-T1 (/dev/estados phase-2 frames, 404 in production) | 02-05 | 5 | FCST-01, FCST-02, NOW-03 | T-02-12 | `notFound()` when `VERCEL_ENV=production` | build + smoke | `npm run build && node scripts/smoke.mjs http://localhost:3107 --start` | ✅ | ✅ green |
| 02-05-T3 (production smoke) | 02-05 | 5 | FCST-01, FCST-02, NOW-03 | T-02-12, T-02-13 | 404 on /dev/estados, deployed commit = origin/main | smoke | `MSYS_NO_PATHCONV=1 node scripts/smoke.mjs "$PROD_URL" --expect-region gru1 --expect-commit <sha> --expect-404 /dev/estados` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/forecast/headline.test.ts` — NOW-03
- [x] `lib/forecast/meteogram.test.ts` — FCST-01 (geometry + no label overlap at 342 px)
- [x] `lib/forecast/daily.test.ts` — FCST-02
- [x] Fixture builders `makeHourly` / `makeDaily` in `lib/forecast/__fixtures__/`
- [x] `npm install d3-scale d3-shape && npm install -D @types/d3-scale @types/d3-shape`

---

## Manual-Only Verifications

Checked in headless Chrome (CDP device emulation, 390×844, DPR 3) during 02-05; the real-device pass stays on the `/gsd-verify-work` list.

| Behavior | Requirement | Why Manual | Test Instructions | 02-05 result |
|----------|-------------|------------|-------------------|--------------|
| Meteogram readable at 390 px, no horizontal scroll, scrubber drags while the page scrolls vertically | FCST-01 | Layout/touch | Browser 390×844: home → scroll to the meteogram, drag across it | scrollWidth 390, 0 overlapping / 0 clipped labels (home + 5 gallery frames), drag → index 30, vertical touch swipe on the chart scrolls (380 → 174), `touch-action: pan-y` |
| 7 ↔ 14 toggle, note on days 8–14 | FCST-02 | Visual | `/pronostico` at 390×844 | 7 → 14 → 7 rows, ORIENTATIVO note only when expanded, scrollWidth 390 |
| Ahora + longest headline + horizon fit in the first 390×844 screen | NOW-03 | Layout | Home at 390×844 with the 34-char headline injected in the DOM | 2 lines (67.75 px); silhouette 668–788 (insets 0) and 634–754 (insets 47/34), bottom on the tab bar top |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-24 (02-05 phase gate)
