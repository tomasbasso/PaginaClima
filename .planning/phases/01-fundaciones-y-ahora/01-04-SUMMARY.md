---
phase: 01-fundaciones-y-ahora
plan: 04
subsystem: ui (sky + navigation)
tags: [ui, sky, suncalc, css-gradient, crossfade, tab-bar, vitest, tdd]
requires: ["01-03"]
provides:
  - "lib/sky/state.ts: resolveSkyState(now, group), skyToken(state), skyFromSnapshot(snapshot, now), SkyState/SkyToken/SkyWeather"
  - "components/client/SkyBackdrop.tsx: <SkyBackdrop state live? className?>, the phase-3 replacement point"
  - "app/globals.css: six [data-sky] token blocks + .sky-layer hero gradient + 1200ms crossfade"
  - "lib/sections.ts: SECTIONS { id, label, href, enabled }"
  - "components/TabBar.tsx: bottom navigation"
affects: [01-05, 01-06, 01-07, phase-2, phase-3]
tech-stack:
  added: []
  patterns:
    - "data-sky lives on <html> (server) AND on each backdrop layer; plain [data-sky=...] selectors so any element/frame can override tokens"
    - "One gradient over the whole hero with calc() stops: S1->S3 in the content zone, S3->S5 in the 240px band ending at the horizon (100% - bar height), ground below"
    - "Two-layer opacity crossfade; the hidden layer gets the new token, then opacities swap"
key-files:
  created:
    - lib/sky/state.ts
    - lib/sky/state.test.ts
    - components/client/SkyBackdrop.tsx
    - lib/sections.ts
    - components/TabBar.tsx
  modified:
    - app/globals.css
    - app/layout.tsx
    - app/page.tsx
decisions:
  - "llovizna maps to SkyWeather 'lluvia' and nieve to 'cubierto' (the UI-SPEC phase-3 enum has neither)"
  - "skyFromSnapshot(snapshot, now) helper is shared by layout (data-sky on <html>) and page (SkyBackdrop) to avoid duplicating the describeWeather + night-flag logic"
  - "SkyBackdrop's first live recompute runs in a setTimeout(0) instead of synchronously in the effect, which keeps setState out of the effect body for the React hooks lint rules"
  - "Tab icons use camelCase SVG props (strokeLinecap etc.); the served HTML has stroke-linecap=\"square\""
metrics:
  duration: "~12 min"
  completed: 2026-10-23
  tasks: 3
  files: 8
---

# Phase 1 Plan 04: Sky states and tab bar Summary

The sky behind "Ahora" now follows Winifreda's real sun and the current weather. It uses the six static CSS-gradient states from the UI-SPEC, resolved on the server into `data-sky` on `<html>`. On the client it is recomputed on mount and every 60 s, with a 1.2 s two-layer crossfade. The bottom tab bar is in place too (Ahora active; Pronóstico, Modelos and Cielo disabled), so the composition approved in the UI-SPEC is complete: sky, content, horizon and bar.

## Tasks

| # | Task | Commit | Notes |
|---|------|--------|-------|
| 1 (RED) | Failing tests for sky state | e76d8d5 | The module was missing, so the suite failed |
| 1 (GREEN) | resolveSkyState / skyToken / skyFromSnapshot | 8f932c5 | 20/20 tests pass; all 6 tokens covered |
| 2 | SkyBackdrop, [data-sky] tokens, server data-sky, live recompute | 41191bf, 708b9a2 | 708b9a2 rewords a CSS comment so the `html\[data-sky` grep is 0 |
| 3 | TabBar + lib/sections.ts | 591bdb2 | build and smoke pass |

## Verification

- `npx vitest run`: 87 tests pass.
- `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass.
- `node scripts/smoke.mjs http://localhost:3104 --start` passed all checks, and so did the rerun on port 3105 after Task 3.
- In the served HTML of `/`:
  - `<html lang="es-AR" data-sky="cubierto"` appears. At 21:16Z the sun was up and the code was 3, so the sky correctly resolved to overcast by day.
  - Both backdrop layers carry `data-sky`.
  - The bar has `aria-label="Secciones"`, `aria-current="page"`, the labels `Pronóstico`/`Modelos`/`Cielo`, `próximamente` and `stroke-linecap="square"`.
- Acceptance greps:
  - all eight hex values from the spec are present, along with `prefers-reduced-motion` and `1200ms`
  - `html\[data-sky` returns 0
  - SkyBackdrop starts with `'use client'` and contains aria-hidden, setInterval, 60_000, dataset.sky and clearInterval
  - layout contains `data-sky=` and `getWeatherSnapshot`
  - TabBar has 0 matches for `rounded-`/`shadow-`
  - `Date.now|new Date()` returns 0 in state.ts
- Human checks for gradient look, crossfade timing and tab focus order were not done here; they are left for the phase verification.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A CSS comment matched the forbidden-selector grep**
- **Found during:** Task 2 acceptance check
- **Issue:** The explanatory comment literally contained `html[data-sky]`, so `grep -c "html\[data-sky"` returned 1.
- **Fix:** Reworded the comment. No code changed.
- **Commit:** 708b9a2

**2. [Rule 1 - Bug] Hyphenated SVG attributes in JSX**
- **Found during:** Task 3
- **Issue:** The plan's literal `stroke-linecap="square"` in JSX makes React warn about an invalid DOM property.
- **Fix:** Switched to camelCase props, which render as `stroke-linecap="square"` in the HTML (verified in served HTML). A comment in TabBar.tsx records the rendered attributes.
- **Commit:** 591bdb2

**3. [Rule 1 - Layout] Tab item height**
- The planned stack of 24px icon + 4px + 16px label + 4px + 1px underline, plus top padding, would have overflowed the 56px bar. I dropped the extra padding and centered the content vertically. Disabled tabs get a transparent underline placeholder so all labels stay aligned.

## Notes

- `/_not-found` now shows a 15m revalidate in the build output, because the layout calls `getWeatherSnapshot()`. This is expected and harmless.
- With ISR, the `data-sky` the server writes on `<html>` can be up to 10 min old. The client corrects it on mount.

## Known Stubs

- The Pronóstico, Modelos and Cielo tabs are intentionally disabled (`enabled: false` in lib/sections.ts). Phases 2, 4 and 5 turn them on, as the UI-SPEC specifies.

## Self-Check: PASSED

- All 5 created files and 3 modified files exist.
- Commits e76d8d5, 8f932c5, 41191bf, 708b9a2 and 591bdb2 are present in git log.
