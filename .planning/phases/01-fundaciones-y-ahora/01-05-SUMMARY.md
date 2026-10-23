---
phase: 01-fundaciones-y-ahora
plan: 05
subsystem: data-freshness
tags: [freshness, met-norway, unstable_cache, allSettled, attribution]
requires:
  - phase: 01-03
    provides: Ahora screen, peach token, lib/time.ts formatters
  - phase: 01-04
    provides: layout/page with SkyBackdrop and TabBar (untouched here)
provides:
  - formatFreshness / isOutdated / shouldAutoRefresh (lib/weather/freshness.ts)
  - Freshness client row (ticker, outdated notice, one-shot router.refresh, Open-Meteo credit)
  - Notice component (2px peach rule), reused by plan 06
  - getMetNorway cached getter (2100 s) and two-source snapshot via Promise.allSettled
affects: [01-06, 01-07]
tech-stack:
  added: []
  patterns:
    - "Client tickers seed state from server renderedAt, then tick every 60 s (no hydration mismatch)"
    - "Per-source SourceInfo built from PromiseSettledResult; one failing source never hides another"
    - "Cache tiny summaries, never raw upstream bodies"
key-files:
  created:
    - lib/weather/freshness.ts
    - lib/weather/freshness.test.ts
    - components/Notice.tsx
    - components/client/Freshness.tsx
    - lib/sources/metNorway.schema.ts
    - lib/sources/metNorway.ts
    - lib/sources/metNorway.test.ts
    - lib/sources/__fixtures__/met-norway-compact.json
  modified:
    - components/Ahora.tsx
    - lib/config.ts
    - lib/weather/snapshot.ts
    - test/skeleton.e2e.test.ts
key-decisions:
  - "Freshness: auto-refresh at most once per fetchedAt value (useRef flag reset when the prop changes); autoRefresh=false skips the timer and listener for fixture pages"
  - "MET_NORWAY_URL built with LAT/LON.toFixed(2); If-Modified-Since deliberately not sent (not implementable inside unstable_cache)"
  - "Snapshot sources = [open-meteo, met-norway] always, both from Promise.allSettled; MET data never reaches displayed fields (D-05)"
requirements-completed: [DATA-01, DATA-02]
duration: 9 min
completed: 2026-10-23
---

# Phase 1 Plan 05: Freshness and MET Norway Summary

**The page now shows "ACTUALIZADO HACE X MIN · ESTIMADO POR MODELO", ticking live on the client. Data older than 30 min turns the label peach and shows an editorial notice, and data older than 15 min triggers one router.refresh(). There is an Open-Meteo CC BY credit. MET Norway was added as a second source, cached server-side for 2100 s and fetched in parallel through Promise.allSettled.**

## Performance

- Duration: about 9 min
- Started: 2026-10-23T21:21Z
- Completed: 2026-10-23T21:30Z
- Tasks: 3 (5 commits: Tasks 1 and 3 each have a RED and a GREEN commit)
- Files: 8 created, 4 modified

## Accomplishments

- Pure freshness functions cover every UI-SPEC label variant (RECIÉN, 1 MIN, n MIN, n H, and "EL dd/MM A LAS HH:mm" in Argentina time under TZ=UTC). Negative or NaN ages are treated as RECIÉN. The thresholds are outdated > 30 min and auto-refresh > 15 min.
- `<Freshness>`:
  - the first render matches the server's renderedAt, then it ticks every 60 s;
  - the counter uses `aria-live="off"`;
  - the outdated label turns peach and the outdated notice has `role="status"`;
  - `router.refresh()` runs once, on a 3 s mount timeout or on visibilitychange→visible;
  - the credit link "DATOS: OPEN-METEO.COM" uses `noopener noreferrer`.
- `<Notice>`: 2px peach left rule, 16px padding, Body 15 ink/75.
- MET Norway adapter: identifying User-Agent, coordinates with 2 decimals, altitude=169, 8 s timeout, coarse SourceError codes, zod validation. Only a 3-field summary is cached.
- `getWeatherSnapshot` uses Promise.allSettled. If MET is down, the snapshot still has `now`, and `sources[1]` records `{ status: 'error', errorCode: 'http_500' }`.
- Verified on the built server: `/api/weather` returns `sources[1].id === 'met-norway'` with status ok, and the served `/` HTML contains `ACTUALIZADO HACE 9 MIN`, `ESTIMADO POR MODELO` and `DATOS: OPEN-METEO.COM`.

## Task Commits

1. Task 1 RED, `b1aa02c`: test(01-05): add failing tests for freshness labels and thresholds
2. Task 1 GREEN, `64f165b`: feat(01-05): implement formatFreshness, isOutdated and shouldAutoRefresh
3. Task 2, `6c72304`: feat(01-05): freshness row with live ticker, outdated notice, one-shot refresh and Open-Meteo credit
4. Task 3 RED, `243e289`: test(01-05): add failing MET Norway adapter tests with trimmed live fixture
5. Task 3 GREEN, `5f930b7`: feat(01-05): MET Norway cached adapter and Promise.allSettled aggregator

## Verification

- `npx vitest run`: 101/101 passing
- `npx tsc --noEmit` and `npm run lint`: clean
- `npm run build`: OK
- `node scripts/smoke.mjs http://localhost:3105 --start`: all checks passed
- The fixture has exactly 3 timeseries items. It was captured with a single curl request, which returned `Expires` about 31.5 min ahead, so the 2100 s TTL stays past it.
- `grep -rn "met-norway\|getMetNorway" components app` finds nothing, so MET is not displayed.
- `git diff` touches none of app/page.tsx, app/layout.tsx or app/globals.css.

## Deviations from Plan

None in the delivered code; the plan was implemented as written. Process note: a stray `python -` invocation hung waiting on stdin during an edit and had to be killed. Nothing was installed, and the node edit then applied cleanly.

## Human check pending (end-of-phase)

Timer behavior across tabs: the label increments each minute, the label turns peach and the notice appears after 30 min, and returning to the tab triggers a single RSC refresh. This is deferred to the phase-close human verification (human_verify_mode: end-of-phase).

## Known Stubs

None.

## Next Phase Readiness

Plan 06 can build read-through refresh, 'stale' status and fault injection on top of `sourceInfo()` in snapshot.ts, and reuse `<Notice>` for the source-down notice. Plan 07's /dev/estados must pass `autoRefresh={false}` to `<Ahora>`.

## Self-Check: PASSED

All 8 created files exist, and commits b1aa02c, 64f165b, 6c72304, 243e289 and 5f930b7 are present in git log.
