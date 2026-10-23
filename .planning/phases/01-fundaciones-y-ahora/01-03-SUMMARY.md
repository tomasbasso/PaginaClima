---
phase: 01-fundaciones-y-ahora
plan: 03
subsystem: ui + display formatters
tags: [ui, tailwind-v4, next-font, intl, suncalc, wmo, vitest, tdd]
requires: ["01-01"]
provides:
  - "lib/time.ts: formatHeaderDate, formatHHmm, formatDayMonth (h23, ART) on top of withOffset/localDateKey"
  - "lib/weather/wind.ts: windSector, describeWind (8 sectors, 'O', Calma < 2 km/h)"
  - "lib/weather/wmo.ts: describeWeather(code, { night }) + WeatherGroup"
  - "lib/weather/format.ts: formatTemp (U+2212, -0 -> 0), formatInt"
  - "lib/sky/phase.ts: getSolarPhase(now) -> { phase, sunAltitude } in degrees"
  - "components/Ahora.tsx: Ahora screen (headline? slot)"
  - "components/PampaHorizon.tsx: static silhouette SVG for reuse in phase 3"
  - "components/client/LiveClock.tsx: hydration-safe 60 s clock"
  - "app/globals.css: @theme tokens, --sky-1..5 + --accent defaults (dia)"
affects: [01-04, 01-05, 01-06, 01-07]
tech-stack:
  added: []
  patterns:
    - "Dates are assembled from Intl formatToParts with hourCycle 'h23', never from ICU literal strings"
    - "Client clock initial state = server renderedAt (no hydration mismatch), then ticks"
    - "Hero split: upper sky div (S1->S3, carries the content + spacer) + 240px band (S3->S5) + bg-ground under it"
key-files:
  created:
    - lib/time.test.ts
    - lib/weather/wind.ts
    - lib/weather/wind.test.ts
    - lib/weather/wmo.ts
    - lib/weather/wmo.test.ts
    - lib/weather/format.ts
    - lib/weather/format.test.ts
    - lib/sky/phase.ts
    - lib/sky/phase.test.ts
    - lib/weather/normalize.test.ts
    - components/Ahora.tsx
    - components/PampaHorizon.tsx
    - components/client/LiveClock.tsx
  modified:
    - lib/time.ts
    - app/globals.css
    - app/layout.tsx
    - app/page.tsx
decisions:
  - "formatDayMonth pads day/month by hand: es-AR ICU ignores '2-digit' for day/month ('5/1')"
  - "suncalc getTimes 5th arg -180 confirmed empirically (22:00 local still resolves to that day's solar noon); node_modules is not readable in this environment, so the signature was probed at runtime instead of via index.d.ts"
  - "The upper sky gradient lives on a div wrapping content + spacer (not on body) so S3 meets the band exactly with no seam; main is bg-ground under the band"
  - "PampaHorizon positions the trees and windmill with percentage-anchored nested SVGs instead of a root viewBox, so they stay at 8 %/78 %/88 % on any width"
metrics:
  duration: "~15 min"
  completed: 2026-10-23
  tasks: 2
  files: 17
---

# Phase 1 Plan 03: Ahora screen Summary

The skeleton now renders the approved editorial "Ahora" screen. It has an Argentina-time header with a live 24 h clock and ART, a 112px Playfair temperature, the Rioplatense WMO state behind an accent diamond, a HUMEDAD/PRESIÓN/VIENTO `<dl>` between hairlines, the gust line, and the Pampa horizon silhouette in a 240px band. All the logic that produces this text lives in pure functions that are tested under TZ=UTC.

## Tasks

| # | Task | Commit | Notes |
|---|------|--------|-------|
| 1 (RED) | Failing tests for the formatters | 8cd1b71 | 5 files failed (missing modules/exports). normalize.test.ts passed already because it characterizes existing code. |
| 1 (GREEN) | time, wind, WMO, format, solar phase | ebe5ca2 | 67/67 tests pass |
| 2 | Ahora UI: tokens, fonts, LiveClock, Ahora, PampaHorizon, page | f558a1b | build + smoke green |

## Verification

- `npx vitest run`: 7 files, 67 tests pass (UTC guard, D-08 day boundary 02:59Z/03:00Z, 24h `00:05`/`09:05`, no `a. m.`/`p. m.`, all wind sectors including `O`/`SO`/`NO` and wraparound, every row of the WMO table plus the night and unknown cases, U+2212 and −0, four solar phases, and normalize over the real fixture including pressure_msl, −03:00 offsets, verbatim `daily.time` and preserved nulls).
- Solar-phase test instants were confirmed with one-off `getPosition` calls. Altitudes: 15:00Z = +61.7°, 03:00Z = −39.8°, 09:15Z = −1.9° (sunrise is 09:22Z), and 22:45Z = −1.3° (sunset is 22:40Z).
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass (`/` and `/api/weather` revalidate in 10 min).
- `node scripts/smoke.mjs http://localhost:3103 --start` passes all checks.
- The served HTML contains `WINIFREDA, LA PAMPA`, `viernes 23 de octubre, 14:43`, `ART`, `aria-label="19 grados, sensación térmica 16 grados"`, `◆ Cubierto` (shown uppercase via CSS), `HUMEDAD`/`PRESIÓN`/`VIENTO`, and `Ráfagas de 35 km/h · viento del sur`.
- Acceptance greps:
  - zero matches for `rounded-`, `shadow-`, `backdrop-blur` in app and components, and for `100vh`
  - no `tailwind.config.*` file
  - `hourCycle: 'h23'` is present and `hour12` does not appear
  - no `'W'`, no radian conversion, no default SunCalc import
  - U+2212 is used in format.ts
  - LiveClock starts with `'use client'` and uses 60000
  - Ahora renders the headline with `headline &&` and has no fallback string
- Visual check: headless Chrome screenshots at 500×900 (headless Chrome won't go narrower than ~500px, so a true 390px capture still needs the human check in DevTools). The layout matches the UI-SPEC ASCII: centered header, temperature on the left, state and sensación on the right, three columns with hairlines, gust line, and the band with caldenes, windmill and fence at the bottom. Nothing overlaps, and there are no radii or shadows.

## TDD Gate Compliance

The RED commit `test(01-03)` (8cd1b71) comes before the GREEN commit `feat(01-03)` (ebe5ca2). No refactor commit was needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] es-AR ICU ignores `2-digit` for day/month**
- **Found during:** Task 1 GREEN
- **Issue:** `formatDayMonth(2026-01-05)` returned `5/1`.
- **Fix:** The parts are padded with `padStart(2, '0')`. I also added a `09:05` test so a single-digit hour is covered in HH:mm (ICU does pad hours).
- **Files:** lib/time.ts, lib/time.test.ts
- **Commit:** ebe5ca2

**2. [Rule 1 - Bug] Visible seam between the content sky and the horizon band**
- **Found during:** Task 2 visual check
- **Issue:** The plan put the S1→S3 gradient on `<body>`. Body spans the whole page including the band, so the color at the band's top edge was not S3 and a hard line showed. The 56px bottom padding also showed sky instead of ground.
- **Fix:** The S1→S3 gradient now sits on a flex-1 wrapper around the content and spacer, so S3 ends exactly at the band. `<main>` is `bg-ground`. The body keeps the gradient as a fallback. Plan 04's `<SkyBackdrop>` replaces this wrapper's background.
- **Files:** app/page.tsx (app/globals.css keeps the body gradient)
- **Commit:** f558a1b

**3. [Note] PampaHorizon has no root viewBox**
- A single root `viewBox` with `slice` would crop the trees and windmill or move them off their 8 %/78 %/88 % positions as the width changes. The ground, wires and posts span `width="100%"` at 1:1 px, and the trees and windmill are nested `<svg x="N%">` anchors. `preserveAspectRatio="xMidYMax slice"` stays on the root as the spec says, but without a viewBox it has no effect.

### Notes

- The state column uses `justify-between` with flex-wrap. When "TORMENTA CON GRANIZO" doesn't fit, the column wraps and sits left 8px below the number. Inside the column the lines stay right-aligned, which is a minor difference from "alineada a la izquierda" and only visible when the two lines have different widths.
- `node_modules/` and `.next/` are not readable in this environment. The suncalc signature and the served HTML were checked at runtime or over HTTP instead.
- REQUIREMENTS.md, STATE.md and ROADMAP.md were not touched. The orchestrator owns tracking for this wave.

## Known Stubs

None that block the goal. The "Sin datos" branch renders only the title. The full state with Reintentar is plan 06, and the freshness row under the last hairline is plan 05, both by design.

## Threat Flags

None. T-01-11: labels come only from local tables, there's no `dangerouslySetInnerHTML`, and only zod-validated numbers reach the view. T-01-12: LiveClock imports only `lib/time` and `lib/config`, both pure. T-01-13: next/font self-hosts the fonts at build.

## Self-Check: PASSED
