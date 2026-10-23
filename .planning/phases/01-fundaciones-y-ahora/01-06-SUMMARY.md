---
phase: 01-fundaciones-y-ahora
plan: 06
subsystem: data-resilience
tags: [read-through, unstable_cache, source-status, fault-injection, error-boundary, ui-states]
requires:
  - phase: 01-04
    provides: SkyBackdrop + PampaHorizon hero in app/page.tsx, skyFromSnapshot
  - phase: 01-05
    provides: Notice, Freshness (suppressOutdatedNotice/autoRefresh), getMetNorway, allSettled aggregator
provides:
  - readThrough() foreground bucketed refresh + getOpenMeteoForecastFresh(bucket)
  - deriveSourceStatus (outcome-based) and selectAhoraVariant
  - WEATHER_FAULT injection (readFault/applyFault), ignored in production
  - Ahora variants normal/degraded/empty/loading, NoData, RetryButton, Hero shell
  - app/loading.tsx (CARGANDO) and app/error.tsx (Sin datos + Reintentar)
affects: [01-07]
tech-stack:
  added: []
  patterns:
    - "Status is outcome-based: 'stale' only from an explicit refreshError, never from age"
    - "Time-bucketed unstable_cache key (JSON(args)) as a guaranteed awaited miss per 15-min bucket, safe in ISR"
    - "Tests that use vi.resetModules build SourceError from the post-reset module graph (instanceof)"
    - "Shared Hero shell in components/ (no hooks, no server-only) so page, loading and the client error boundary render the same layout"
key-files:
  created:
    - lib/sources/readThrough.ts
    - lib/sources/readThrough.test.ts
    - lib/sources/openMeteoForecast.test.ts
    - lib/sources/__fixtures__/open-meteo-forecast.broken.json
    - lib/weather/status.ts
    - lib/weather/status.test.ts
    - lib/weather/faults.ts
    - lib/weather/snapshot.test.ts
    - components/NoData.tsx
    - components/Hero.tsx
    - components/client/RetryButton.tsx
    - app/loading.tsx
    - app/error.tsx
    - .env.example
  modified:
    - lib/sources/openMeteoForecast.ts
    - lib/weather/snapshot.ts
    - components/Ahora.tsx
    - app/page.tsx
key-decisions:
  - "readThrough refreshes only when age > TTL (strictly), bucket = floor(nowMs / TTL ms); newer fetchedAt wins; getCached rejection propagates (Sin datos)"
  - "MET Norway gets no read-through (ToS Expires); its status is ok/error only"
  - "Hero shell lives in components/Hero.tsx, not as an export of app/page.tsx (Next rejects extra page exports, and the client error.tsx cannot import the server page module)"
  - "app/error.tsx uses unstable_retry ?? reset (Next 16 passes both; unstable_retry re-fetches the segment); logs digest only"
  - "readFault takes an explicit {VERCEL_ENV, WEATHER_FAULT} object (passing process.env trips TS weak-type detection)"
requirements-completed: [DATA-03, DATA-01]
duration: 9min
completed: 2026-10-23
---

# Phase 01 Plan 06: Fallas visibles, honestas e inofensivas Summary

**Read-through refresh over a 15-min bucketed `unstable_cache` getter, outcome-based source status, production-gated `WEATHER_FAULT` injection, and the UI-SPEC data states (fuente caída, sin datos + reintentar, cargando, route error boundary).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-10-23T21:33:30Z
- **Completed:** 2026-10-23T21:42:30Z
- **Tasks:** 3
- **Files:** 18 (14 created, 4 modified)

## Accomplishments

- `readThrough()` reads the last-good entry and, only when it is past the 900 s TTL, awaits `getOpenMeteoForecastFresh(floor(now / 900 000))`. After an idle period, the first render gets fresh data instead of a false "No pudimos actualizar…". A failed refresh keeps the last-good value and records the coarse `refreshError` code.
- `deriveSourceStatus` doesn't look at age: `stale` means a refresh really failed. `selectAhoraVariant` maps the snapshot to normal, degraded or empty.
- The aggregator wires Open-Meteo through `readThrough`, keeps MET Norway on a plain `allSettled` slot, and ends with `applyFault(built, readFault(env), nowMs)`.
- `WEATHER_FAULT` supports openmeteo-down, metno-down, stale (−45 min) and empty. It's limited to those four values and ignored when `VERCEL_ENV=production`. `.env.example` documents it.
- The adapter failure tests cover http_500, http_400 (the upstream `reason` is never leaked), network, timeout (`TimeoutError`) and schema (broken fixture), plus the bucketed getter.
- On the UI side, Ahora has degraded, empty and loading variants, alongside new NoData, RetryButton (REINTENTANDO… and disabled while pending), `app/loading.tsx` and `app/error.tsx`.

## Task Commits

1. **Task 1: Read-through + outcome-based status + aggregator wiring.** RED `9d1b232`, GREEN `7a8ffbe`
2. **Task 2: Fault injection + adapter failure tests.** RED `f044031`, GREEN `2e67d45`
3. **Task 3: UI states + loading/error routes.** `f42d36f`

## Verification

- `npx vitest run`: 14 files and 138 tests pass. `npx tsc --noEmit`, `npm run lint` and `npm run build` are clean.
- In the build route table, `/` and `/api/weather` are still ○ ISR with a 10m revalidate, so the bucketed getter didn't make them dynamic.
- A normal `smoke.mjs --start` passes, and the served `/` HTML doesn't contain `No pudimos actualizar`.
- The `WEATHER_FAULT=empty` build succeeds, and its smoke passes (it warns `open-meteo status=error (fault)`). The served `/` contains `Ahora no tenemos el tiempo de Winifreda.`, `Probá de nuevo en unos minutos.` and `REINTENTAR`.
- In the `WEATHER_FAULT=openmeteo-down` build, the served `/` contains "No pudimos actualizar el pronóstico. Te mostramos el último dato bueno, de las 18:41" (Argentina time).
- After the fault checks, `.next` was rebuilt without a fault.
- The acceptance greps came out as specified: `fetchOpenMeteoForecastRaw` doesn't appear in snapshot.ts, status.ts has no age inputs, readThrough.ts doesn't call `Date.now`, page.tsx has no `throw`, and error.tsx doesn't use `error.message`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The aggregator test saw `SourceError` as 'unknown' after `vi.resetModules`**
- **Found during:** Task 1 (GREEN)
- **Issue:** The test imported `SourceError` statically, while the aggregator re-imported it after the module reset. The two classes were different, so `instanceof` failed.
- **Fix:** Added a `sourceError()` helper to the test that builds the error from the post-reset module graph.
- **Files modified:** lib/weather/snapshot.test.ts
- **Commit:** 7a8ffbe

**2. [Rule 3 - Blocking] TS weak-type error passing `process.env` to `readFault`**
- **Fix:** Pass `{ VERCEL_ENV, WEATHER_FAULT }` explicitly (the `applyFault(` link is unchanged).
- **Files modified:** lib/weather/snapshot.ts
- **Commit:** 2e67d45

**3. [Rule 3 - Blocking] The Hero shell went to `components/Hero.tsx` instead of an export of `app/page.tsx`**
- **Issue:** Next rejects non-standard named exports from `page.tsx`. The client `app/error.tsx` also can't import the page module, which pulls in `server-only` via the snapshot.
- **Fix:** `components/Hero.tsx` has no hooks and no server-only imports. It's used by page, loading and error.
- **Commit:** f42d36f

### Notes

- The plan described the Task 2 adapter tests as RED, but they passed on first run because the adapter already existed from plan 01. They're characterization/regression tests. The fault cases in the same commit did fail first, as expected.
- The Next 16 error-boundary props (`unstable_retry` and `reset`) were confirmed from the Context7 docs for Next v16.2.9, because reading `node_modules` wasn't allowed in this session.

## TDD Gate Compliance

Both TDD tasks have a `test(...)` commit followed by a `feat(...)` commit: 9d1b232 then 7a8ffbe, and f044031 then 2e67d45.

## Known Stubs

None.

## Threat Flags

None. The new surfaces (`WEATHER_FAULT`, the error boundary and the extra Open-Meteo calls) are covered by T-01-22 to T-01-26 and T-01-30.

## Pending human check

The plan's visual `human-check` (each `WEATHER_FAULT` state at 390×844, and the REINTENTANDO… feedback) wasn't run interactively. The HTML-level checks above cover the copy. The visual pass belongs to the phase-close verification (01-07).

## Self-Check: PASSED
