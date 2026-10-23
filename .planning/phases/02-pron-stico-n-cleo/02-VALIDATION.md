---
phase: 2
slug: pron-stico-n-cleo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-23
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
| **Estimated runtime** | ~15 seconds |

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
| meteogram geometry | TBD | — | FCST-01 | — | N/A | unit | `npx vitest run lib/forecast/meteogram.test.ts` | ❌ W0 | ⬜ pending |
| daily rows | TBD | — | FCST-02 | — | N/A | unit | `npx vitest run lib/forecast/daily.test.ts` | ❌ W0 | ⬜ pending |
| headline rules | TBD | — | NOW-03 | — | N/A | unit | `npx vitest run lib/forecast/headline.test.ts` | ❌ W0 | ⬜ pending |
| localHour | TBD | — | — | — | N/A | unit | `npx vitest run lib/time.test.ts` | ✅ | ⬜ pending |
| sections enabled | TBD | — | FCST-02 | — | N/A | unit | `npx vitest run lib/sections.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

(The planner refines the Task IDs once plans exist; see 02-RESEARCH.md §Validation Architecture.)

---

## Wave 0 Requirements

- [ ] `lib/forecast/headline.test.ts` — NOW-03
- [ ] `lib/forecast/meteogram.test.ts` — FCST-01 (geometry + no label overlap at 342 px)
- [ ] `lib/forecast/daily.test.ts` — FCST-02
- [ ] Fixture builders `makeHourly` / `makeDaily` in `lib/forecast/__fixtures__/`
- [ ] `npm install d3-scale d3-shape && npm install -D @types/d3-scale @types/d3-shape`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Meteogram readable at 390 px, no horizontal scroll, scrubber drags while the page scrolls vertically | FCST-01 | Layout/touch | Browser 390×844: home → scroll to the meteogram, drag across it |
| 7 ↔ 14 toggle, note on days 8–14 | FCST-02 | Visual | `/pronostico` at 390×844 |
| Ahora + longest headline + horizon fit in the first 390×844 screen | NOW-03 | Layout | Home at 390×844 with the longest fixture headline (`/dev/estados`) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
