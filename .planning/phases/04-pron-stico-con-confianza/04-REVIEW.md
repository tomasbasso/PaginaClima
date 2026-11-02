---
phase: 04-pron-stico-con-confianza
reviewed: 2026-11-02T17:30:00Z
depth: standard
files_reviewed: 43
files_reviewed_list:
  - .env.example
  - app/dev/estados/fixtures.ts
  - app/dev/estados/page.tsx
  - app/globals.css
  - app/pronostico/page.tsx
  - components/DailySection.tsx
  - components/Despacho.tsx
  - components/Rombo.tsx
  - components/TabBar.tsx
  - components/client/DailyList.tsx
  - lib/config.ts
  - lib/forecast/__fixtures__/build.ts
  - lib/forecast/agreement.test.ts
  - lib/forecast/agreement.ts
  - lib/forecast/confidenceNotice.test.ts
  - lib/forecast/confidenceNotice.ts
  - lib/forecast/daily.test.ts
  - lib/forecast/daily.ts
  - lib/forecast/despacho.test.ts
  - lib/forecast/despacho.ts
  - lib/forecast/ensemble.test.ts
  - lib/forecast/ensemble.ts
  - lib/forecast/localDayRain.test.ts
  - lib/forecast/localDayRain.ts
  - lib/forecast/rowStatus.test.ts
  - lib/forecast/rowStatus.ts
  - lib/sections.test.ts
  - lib/sections.ts
  - lib/sources/openMeteoEnsemble.schema.ts
  - lib/sources/openMeteoEnsemble.test.ts
  - lib/sources/openMeteoEnsemble.ts
  - lib/sources/openMeteoModels.schema.ts
  - lib/sources/openMeteoModels.test.ts
  - lib/sources/openMeteoModels.ts
  - lib/time.test.ts
  - lib/time.ts
  - lib/weather/faults.ts
  - lib/weather/snapshot.test.ts
  - lib/weather/snapshot.ts
  - lib/weather/status.test.ts
  - lib/weather/types.ts
  - lib/weather/wmo.ts
  - test/skeleton.e2e.test.ts
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

## Narrative Findings (AI reviewer)

# Phase 4: Code Review Report

**Reviewed:** 2026-11-02T17:30:00Z
**Depth:** standard
**Files Reviewed:** 43
**Status:** issues_found

## Summary

The pure logic holds up. The local-day rain window, member-then-count aggregation, quantiles, display rounding and verdict thresholds all behave as D-09, D-10 and D-13 require. `buildDespacho` ran over all 78,125 verdict combinations of a 7-day window, from 7 consecutive start dates, with no crash and no malformed phrase. `vitest` (959 tests), `tsc --noEmit` and `eslint` all pass.

The defects are in how the code reports a source's health. A payload with no usable data counts as a successful refresh (CR-01). The failure notices can also misstate how old the data is or how healthy the other sources are (WR-01, WR-02). A leak guard in two test files has a regex typo, so it does not check what its comment says (WR-04).

CR-01 was confirmed by running the real schemas and aggregators on all-null payloads, using a throwaway script outside the repo. WR-03 and the WR-01 notice text were confirmed the same way.

## Critical Issues

### CR-01: A response with no usable data is cached as a success and replaces the last good value, with no notice

**File:** `lib/sources/openMeteoEnsemble.ts:37-44`, `lib/sources/openMeteoModels.ts:37-44`, `lib/sources/openMeteoEnsemble.schema.ts:20-38`, `lib/sources/openMeteoModels.schema.ts:16-32`

**Issue:** Both schemas check that the columns exist and hold `number | null`. They never check that any value is non-null or that `time` has rows.

Confirmed by running the code:
- `EnsembleDto` accepts 51 all-null member columns, and `aggregateEnsemble` returns `[]`.
- `ModelsDto` accepts all-null columns, and `aggregateModels` returns `[]`.
- `ModelsDto` also accepts `time: []` with empty columns.

The adapter then returns `{ data: [], fetchedAt: now }` instead of throwing, which has three effects:
1. `unstable_cache` stores it for the full TTL (3 h for the ensemble, 1 h for the models), and `readThrough` prefers it because its `fetchedAt` is newer. The last good value is lost, which breaks the adapter comment "a failed refresh is never cached" and D-17's "se usa el último dato bueno cuando exista".
2. `deriveSourceStatus` reports `ok`, so `confidenceNotice` returns `null`.
3. `/pronostico` silently drops to the phase-2 look (ensemble) or loses its rhombi and despacho (models) with no notice. D-17 requires a notice for each failure.

This is a realistic upstream shape. The committed fixture shows Open-Meteo uses null columns to mean "no data": 170 of 360 ICON hours and 110 of 360 GEM hours are null. A truncated response has the same weakness, because a single complete day passes as a healthy source.

**Fix:** Treat an empty aggregate as a failed refresh in both adapters, and add a test for it in each adapter's test file:
```ts
const data = aggregateEnsemble(parsed.data.hourly, parsed.data.daily)
// Never let "no usable day" overwrite the last good value.
if (data.length === 0) throw new SourceError('open-meteo-ensemble', 'schema')
return { data, fetchedAt: new Date().toISOString() }
```
Consider also requiring a minimum number of days, such as 7, so a truncated payload cannot replace a full last-good value.

## Warnings

### WR-01: The stale notice gives an hour with no date, and can describe data the page is not showing

**File:** `lib/forecast/confidenceNotice.ts:19`, `lib/forecast/confidenceNotice.ts:37-43`

**Issue:** Stale age has no upper limit, because `readThrough` returns the last good value however old it is. The notice prints only `HH:mm`. A probe with a `fetchedAt` several days old printed "Te mostramos la última que tenemos, de las 15:00", which reads as today.

If the last good value no longer overlaps the visible days, the page has nothing to show. `ensembleUp` is `false`, so the rows use the phase-2 look, yet the notice still says "Te mostramos la última que tenemos". Rows joined to an old run also carry no sign of its age beyond this notice.

**Fix:** Pass `now` into `confidenceNotice` and include the date when the data is not from today, for example `del 28/10 a las 15:00` with `formatDayMonth`. When the stale source covers no visible day, use the error copy. The page can pass a flag derived from `rows` (`rows[0].ensembleUp`, `rows[0].modelsUp`).

### WR-02: "El resto del pronóstico sigue al día" can be false

**File:** `lib/forecast/confidenceNotice.ts:3-4`, `lib/forecast/confidenceNotice.ts:29-34`

**Issue:** The two single-error messages say the rest of the forecast is up to date, and two cases contradict that:
- One confidence source is in `error` and the other is `stale`. The "error wins over stale" branch returns first, so the stale source goes unmentioned. Gallery frames 4b and 6b show this state.
- The main `open-meteo` source is stale or down with last-good rows. The function deliberately ignores that source, so the page header reports old data while this notice says the rest is current.

**Fix:** Say "sigue al día" only when every other source is `ok`, which means also passing in the main source's status. Otherwise use neutral copy, such as "Te mostramos el resto del pronóstico", or combine both failures in one sentence. The copy table needs the same change.

### WR-03: `verdictFor` throws above 4 voters, and the cast hides it from the compiler

**File:** `lib/forecast/agreement.ts:48`, `lib/config.ts:153`

**Issue:** `AGREEMENT_C[n as 2 | 3 | 4]` is `undefined` for `n > 4`, so the destructuring throws. The probe confirmed a `TypeError` with 5 votes.

`verdictFor` runs in `buildConfidence` (`lib/weather/snapshot.ts:102`), outside the `Promise.allSettled` that isolates source failures. Adding a fifth entry to `VOTING_MODELS` would therefore compile and then make `getWeatherSnapshot` reject, which takes down `/`, `/pronostico` and `/api/weather`. That breaks its documented "Never throws" guarantee and D-17's rule that these sources only affect `confidence`. No test covers this bound.

**Fix:** Tie the table to the tuple, or fail safe:
```ts
const thresholds = AGREEMENT_C[n as keyof typeof AGREEMENT_C]
if (!thresholds) return 'sinDato' // never a false verdict, never a crash
```
Add a test that every voter count from 2 to `VOTING_MODELS.length` has an entry in `AGREEMENT_C`.

### WR-04: The D-18 leak guard has a regex typo, so leaked temperature members would pass

**File:** `test/skeleton.e2e.test.ts:131`, `lib/weather/snapshot.test.ts:311`

**Issue:** The pattern is `/_memberd|.../`, where `d` is a literal letter. The intended `\d` is missing its backslash, so the first alternative can never match a real column. A snapshot leaking `temperature_2m_max_member01` would pass both tests, because only `precipitation_member` is effectively checked. D-18 requires that raw members never reach the public `/api/weather` payload, so this guard needs to work.

**Fix:** Use `/_member\d|precipitation_member/` in the e2e test, and make the same correction in the longer pattern in `snapshot.test.ts`.

## Info

### IN-01: The rhombi can appear with no legend

**File:** `components/DailySection.tsx:31-35`, `components/Despacho.tsx:26-40`

**Issue:** The legend is rendered inside `Despacho`, so it disappears whenever `buildDespacho` returns `null`. That happens when fewer than 3 of the first 7 days have a verdict, or when verdicts exist only on days 8-14. In those cases rhombi are still drawn with no key.

**Fix:** Move the legend to its own component in `DailySection`, shown when `rows.some(r => r.verdict !== 'sinDato')`.

### IN-02: Pages that do not use confidence data still wait for it

**File:** `lib/weather/snapshot.ts:66-86`

**Issue:** `/` and `/api/weather` now wait for the ensemble and models requests as well. During an upstream outage failed refreshes are not cached, so each regeneration can wait up to the 8 s timeout. A failure stays out of the home page's data, but its delay does not.

**Fix:** Consider a separate `getConfidence()` called only by `/pronostico`, if the phase 6 and 7 consumers do not need confidence in the snapshot.

### IN-03: A timeout while reading the body is logged as `schema`

**File:** `lib/sources/openMeteoEnsemble.ts:32-36`, `lib/sources/openMeteoModels.ts:32-36`

**Issue:** The abort signal also covers `res.json()`, but that catch always reports `schema`. The ensemble has the largest payload (51 columns of 360 hours), so it is the most likely to hit this. The resulting `errorCode` would point diagnosis at the wrong cause.

**Fix:** Use the same `TimeoutError`/`AbortError` check as the `fetch` catch.

### IN-04: Duplicated code and constants

**File:** `lib/sources/openMeteoEnsemble.ts:14-45`, `lib/sources/openMeteoModels.ts:14-45`, `lib/forecast/rowStatus.ts:61`, `lib/forecast/daily.ts:13`, `lib/forecast/daily.ts:54`, `lib/forecast/ensemble.ts:34`, `lib/forecast/agreement.ts:56`

**Issue:**
- The two adapters are identical except for their ID, URL, schema and aggregator, so the CR-01 fix has to be applied twice.
- `StatusWord` duplicates `DoubtWord`.
- `Block` is declared in two files.
- `NBSP` is declared in both `daily.ts` and `ensemble.ts`.
- `rainText` hardcodes `1` instead of using `RAIN_DAY_MM`.

**Fix:** Extract a shared fetch-and-validate helper, export the shared types and constants once, and use `RAIN_DAY_MM` in `rainText`.

---

_Reviewed: 2026-11-02T17:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
