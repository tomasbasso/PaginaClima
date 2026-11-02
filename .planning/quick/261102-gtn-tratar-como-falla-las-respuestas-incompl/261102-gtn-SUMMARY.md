---
phase: quick-261102-gtn
plan: 01
subsystem: data-sources
tags: [open-meteo, ensemble, models, cache, resilience]
requires: []
provides:
  - MIN_CONFIDENCE_DAYS threshold in lib/config.ts
  - Ensemble and models adapters that treat incomplete responses as failed refreshes
affects: [lib/weather/snapshot, /pronostico]
tech-stack:
  added: []
  patterns: [SourceError schema for well-formed but incomplete upstream bodies]
key-files:
  created: []
  modified:
    - lib/config.ts
    - lib/sources/openMeteoEnsemble.ts
    - lib/sources/openMeteoEnsemble.test.ts
    - lib/sources/openMeteoModels.ts
    - lib/sources/openMeteoModels.test.ts
decisions:
  - "One commit per task rather than separate test and fix commits, so every commit on main stays green; RED was confirmed by running the tests before the change"
metrics:
  tasks: 2
  files: 5
  completed: 2026-11-02
requirements: [FCST-03, MODL-02]
---

# Quick 261102-gtn Plan 01: Treat incomplete Open-Meteo responses as failed refreshes Summary

Both adapters now throw `SourceError('schema')` below 12 usable days (`MIN_CONFIDENCE_DAYS`), so a truncated response, or an ensemble with no usable daily block, leaves the last good value on screen as `stale`.

## What changed

- `lib/config.ts`: exports `MIN_CONFIDENCE_DAYS = 12`, with its reason (14 days shown, 2 of slack for a delayed model run).
- `lib/sources/openMeteoEnsemble.ts`: a day counts only when both `tMinP10C` and `tMaxP90C` are non-null. This one check replaces `data.length === 0` and covers null columns, a daily block with no rows, a missing limit and truncation.
- `lib/sources/openMeteoModels.ts`: rejects when `data.length < MIN_CONFIDENCE_DAYS`. `data.length` already counts only days with a vote.
- No schema changes and no cache key bump: the cached shape is the same.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | de99cd1 | Add the threshold and reject incomplete ensemble responses |
| 2 | 38b8ea9 | Reject truncated models responses |

## Verification

RED, before the change: 9 tests failed for the expected reason (7 with "promise resolved instead of rejecting", 2 with `'ok'` instead of `'stale'`). The 12-day tests and the `daily: {}` case passed already, as the plan predicted.

GREEN, after the change:

| Check | Result |
|-------|--------|
| `npm test` | 50 files, 986 tests passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `data.length === 0` in both adapters | Not found |
| Diff of both `*.schema.ts` files | Empty |
| `'v1'` cache keys | Unchanged |

No existing test was edited, and none failed because of the threshold.

## Deviations from Plan

None in the code. Commit layout only: each task is one `fix` commit, not a `test` commit followed by a `fix` commit (see decisions).

## Known limits

- Checked against the fixtures, not against a real truncated upstream response. The build did log a live `open-meteo ensemble fetched`, which means a real ensemble response passed the new check. The part of the build output that was captured does not show the same line for models.
- A truncated response cached under the `v1` keys before this change stays there until its TTL ends (3 h for the ensemble, 1 h for models).

## Self-Check: PASSED

- All 5 files in `key-files` are in commits de99cd1 and 38b8ea9.
- Both commits are on `main`.
