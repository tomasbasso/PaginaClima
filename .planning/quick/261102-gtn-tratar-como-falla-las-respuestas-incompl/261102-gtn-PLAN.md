---
phase: quick-261102-gtn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/config.ts
  - lib/sources/openMeteoEnsemble.ts
  - lib/sources/openMeteoEnsemble.test.ts
  - lib/sources/openMeteoModels.ts
  - lib/sources/openMeteoModels.test.ts
autonomous: true
requirements: [FCST-03, MODL-02]

must_haves:
  truths:
    - "An ensemble response with good hourly data but a null or empty daily block is a failed refresh: the temperature bands of the last good value stay on screen instead of vanishing"
    - "A response from either adapter with fewer than 12 usable days is a failed refresh and never replaces a full last good value"
    - "A response with exactly 12 usable days is accepted, so a delayed model run that leaves the last day or two unclosed does not read as a failure"
    - "After a truncated response, readThrough and deriveSourceStatus report the source as stale and keep the last good value"
  artifacts:
    - path: "lib/config.ts"
      provides: "MIN_CONFIDENCE_DAYS threshold with its reason"
      contains: "MIN_CONFIDENCE_DAYS = 12"
    - path: "lib/sources/openMeteoEnsemble.ts"
      provides: "Rejects with schema when fewer than MIN_CONFIDENCE_DAYS days have both temperature limits"
      contains: "MIN_CONFIDENCE_DAYS"
    - path: "lib/sources/openMeteoModels.ts"
      provides: "Rejects with schema when fewer than MIN_CONFIDENCE_DAYS days have votes"
      contains: "MIN_CONFIDENCE_DAYS"
  key_links:
    - from: "lib/sources/openMeteoEnsemble.ts"
      to: "lib/config.ts"
      via: "import of MIN_CONFIDENCE_DAYS"
      pattern: "MIN_CONFIDENCE_DAYS"
    - from: "lib/sources/openMeteoModels.ts"
      to: "lib/config.ts"
      via: "import of MIN_CONFIDENCE_DAYS"
      pattern: "MIN_CONFIDENCE_DAYS"
    - from: "SourceError schema thrown by the raw fetchers"
      to: "lib/sources/readThrough.ts"
      via: "getFresh rejection becomes refreshError, which deriveSourceStatus reports as stale"
      pattern: "refreshError"
---

<objective>
Treat incomplete Open-Meteo responses as failed refreshes in the ensemble and models adapters.

Purpose: today only an empty aggregate is rejected. Two cases still report `ok` and replace a full last good value: an ensemble with good hourly data but a null or empty daily block (14 days with null temperatures, so the fan bands vanish with no notice), and a response truncated to very few days (either adapter).

Output: a `MIN_CONFIDENCE_DAYS` constant, a stricter check in each raw fetcher, and tests that pin the rule at the boundary. The design is settled by the owner; do not reopen it. No schema changes and no cache key bump, because the cached shape does not change.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@lib/config.ts
@lib/sources/openMeteoEnsemble.ts
@lib/sources/openMeteoEnsemble.test.ts
@lib/sources/openMeteoModels.ts
@lib/sources/openMeteoModels.test.ts

<fixture_facts>
Checked against the fixtures and the code, so the executor does not need to rediscover them.

Both real fixtures (`lib/sources/__fixtures__/open-meteo-ensemble.json`, `open-meteo-models.json`) have 15 daily rows (2026-11-01 to 2026-11-15) and 360 hourly rows starting at `2026-11-01T00:00`. Each resolves to 14 aggregated days.

`localDayRain` (`lib/forecast/localDayRain.ts`) assigns a 00:00 stamp to the previous day and keeps only days with all 24 hours. So the first stamp of the fixture belongs to a partial "yesterday" that is dropped, and N closed days need exactly `24 * N + 1` hourly rows. Slicing hourly to `24 * N` gives only N - 1 days, which would make an "11 days" test really test 10.

`EnsembleDto` requires only `time` in the daily block and does not require any temperature column: `daily: { time: [] }` passes the schema and reaches the aggregate with every temperature null, while `daily: {}` is rejected by the schema. `aggregateEnsemble` takes its dates from the hourly block, so with a null or empty daily block it still returns 14 days with null `tMinP10C` and `tMaxP90C`.

`aggregateModels` takes its dates from `daily.time` and keeps a day only if at least one model votes, so `data.length` already counts usable days.

`lib/weather/snapshot.test.ts` mocks both adapters and does not go through the raw fetchers, and `lib/forecast/ensemble.test.ts` tests the pure aggregate, so neither should be affected by the threshold.
</fixture_facts>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add MIN_CONFIDENCE_DAYS and reject incomplete ensemble responses</name>
  <files>lib/config.ts, lib/sources/openMeteoEnsemble.ts, lib/sources/openMeteoEnsemble.test.ts</files>
  <behavior>
    - Truncated to 1 day: `fetchOpenMeteoEnsembleRaw` rejects with name `SourceError`, source `open-meteo-ensemble`, code `schema`
    - Truncated to 11 days (one below the minimum): rejects with code `schema`
    - Truncated to exactly 12 days: resolves with `data` of length 12
    - Good hourly with `daily: allNull(fixture.daily)`: rejects with code `schema`
    - Good hourly with an empty daily block: rejects with code `schema`, for both `daily: { time: [] }` (passes the schema, caught by the new check) and `daily: {}` (caught by the schema)
    - Good hourly with every `temperature_2m_min` column nulled and the max columns intact: rejects with code `schema`, which pins that a day needs BOTH limits to count
    - Truncated response through `readThrough` and `deriveSourceStatus`: status `stale`, and the settled value matches `{ value: lastGood, refreshError: 'schema' }`
  </behavior>
  <action>
RED first. In `lib/sources/openMeteoEnsemble.test.ts`, next to the existing `allNull` and `noData` helpers, add a helper `firstDays(n)` built on the real fixture: it returns the fixture with every hourly column (including `time`) sliced to `24 * n + 1` rows and every daily column (including `time`) sliced to `n` rows, so it yields exactly n closed days (see fixture_facts for why the extra row matters). Write it in the same style as `allNull`, using `Object.fromEntries` over `Object.entries`. Add the tests from the behavior list inside the existing `describe('Open-Meteo ensemble adapter')` block, using `stub(json(...))` and `load()` as the neighbouring tests do. Use the literal day counts 1, 11 and 12 rather than importing the constant, so a change of the threshold fails a test. The stale test follows the existing 'a response with no usable day leaves the last good value' test: same imports, same `nowMs`, same one-day `lastGood` literal, a `getCached` that returns `lastGood`, and `getFresh: getOpenMeteoEnsembleFresh`, stubbing `firstDays(1)`. Run the file and confirm the rejection tests fail for the right reason (the promise resolves instead of rejecting). The 12-day test and the `daily: {}` case pass already, which is expected.

GREEN. In `lib/config.ts`, directly after `OPEN_METEO_MODELS_URL` (next to the two URLs, before the GIBS block), add the exported constant `MIN_CONFIDENCE_DAYS = 12` with a doc comment giving the reason: the list shows 14 days; two days of slack because a delayed model run can leave the last day or two unclosed, and that must not read as a failure. In `lib/sources/openMeteoEnsemble.ts`, add `MIN_CONFIDENCE_DAYS` to the existing `@/lib/config` import. Replace the `data.length === 0` check: count the days of `data` where both `tMinP10C` and `tMaxP90C` are non-null, and throw `new SourceError('open-meteo-ensemble', 'schema')` when that count is below `MIN_CONFIDENCE_DAYS`. This one check covers both the null or empty daily block and the truncated response, so do not add a second one. Rewrite the comment above it to say that: the schema accepts null columns and a missing daily block, so an incomplete response gets here; it is a failed refresh and must never replace the last good value in the cache (keep the D-17 citation).

Do not change `openMeteoEnsemble.schema.ts`, `aggregateEnsemble`, or the `['open-meteo-ensemble', 'v1']` cache keys: the cached shape does not change. Do not edit or weaken any existing test. If an existing test or fixture fails because of the threshold, stop and report it rather than changing the threshold.
  </action>
  <verify>
    <automated>npx vitest run lib/sources/openMeteoEnsemble.test.ts lib/forecast/ensemble.test.ts</automated>
  </verify>
  <done>All ensemble adapter tests pass, old and new. `MIN_CONFIDENCE_DAYS = 12` is exported from `lib/config.ts` with its reason, and `openMeteoEnsemble.ts` no longer has a `data.length === 0` check.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Reject truncated models responses</name>
  <files>lib/sources/openMeteoModels.ts, lib/sources/openMeteoModels.test.ts</files>
  <behavior>
    - Truncated to 1 day: `fetchOpenMeteoModelsRaw` rejects with name `SourceError`, source `open-meteo-models`, code `schema`
    - Truncated to 11 days (one below the minimum): rejects with code `schema`
    - Truncated to exactly 12 days: resolves with `data` of length 12
    - Truncated response through `readThrough` and `deriveSourceStatus`: status `stale`, and the settled value matches `{ value: lastGood, refreshError: 'schema' }`
  </behavior>
  <action>
RED first. In `lib/sources/openMeteoModels.test.ts`, next to the existing `allNull` and `noData` helpers, add the same `firstDays(n)` helper as in Task 1 (hourly columns sliced to `24 * n + 1` rows, daily columns sliced to `n` rows, built on this file's fixture). Add the tests from the behavior list inside the existing `describe('Open-Meteo models adapter')` block, with the literal day counts 1, 11 and 12. The stale test follows the existing 'a response with no usable day leaves the last good value' test: same imports, same `nowMs`, same one-day `lastGood` literal, a `getCached` that returns `lastGood`, and `getFresh: getOpenMeteoModelsFresh`, stubbing `firstDays(1)`. Run the file and confirm the rejection tests fail because the promise resolves.

GREEN. In `lib/sources/openMeteoModels.ts`, add `MIN_CONFIDENCE_DAYS` to the existing `@/lib/config` import. Replace the `data.length === 0` check with: throw `new SourceError('open-meteo-models', 'schema')` when `data.length < MIN_CONFIDENCE_DAYS`. `data.length` already counts only days with at least one vote, so no extra filtering is needed. Rewrite the comment above it to say that the schema accepts null columns and short responses, so an incomplete response gets here; it is a failed refresh and must never replace the last good value in the cache (keep the D-17 citation).

Do not change `openMeteoModels.schema.ts`, `aggregateModels`, or the `['open-meteo-models', 'v1']` cache keys. Do not edit or weaken any existing test. If an existing test or fixture fails because of the threshold, stop and report it rather than changing the threshold.
  </action>
  <verify>
    <automated>npx vitest run lib/sources/openMeteoModels.test.ts</automated>
  </verify>
  <done>All models adapter tests pass, old and new, and `openMeteoModels.ts` no longer has a `data.length === 0` check.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Open-Meteo API to server adapter | The upstream body is untrusted and can be well-formed but incomplete |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261102-01 | Tampering | `fetchOpenMeteoEnsembleRaw`, `fetchOpenMeteoModelsRaw` | mitigate | A response under `MIN_CONFIDENCE_DAYS` usable days throws `SourceError`, so `unstable_cache` never stores it over the last good value |
| T-261102-02 | Information disclosure | `SourceError` from the new checks | mitigate | Only the coarse code `schema` is thrown, with no upstream text, matching the existing contract |
| T-261102-03 | Denial of service | Repeated incomplete responses | accept | The source shows as `stale` with its last good value; if there is no last good value it shows as `error`, as with any other failed refresh |
</threat_model>

<verification>
Run from the repo root on `main`. Execution does not use a worktree, because new worktrees have no `node_modules`.

- `npm test` passes in full. Any failure outside the two adapter test files gets reported, not worked around by changing the threshold.
- `npm run typecheck` passes.
- `npm run lint` passes.
- `grep -n "data.length === 0" lib/sources/openMeteoEnsemble.ts lib/sources/openMeteoModels.ts` finds nothing.
- `git diff --stat -- lib/sources/openMeteoEnsemble.schema.ts lib/sources/openMeteoModels.schema.ts` is empty, and the `'v1'` cache keys are unchanged.

Stage only the files in `files_modified` plus this task's planning artifacts. Do not touch `CLAUDE.md` or the untracked `.impeccable/` directory.
</verification>

<success_criteria>
- Both adapters reject 1 and 11 usable days with `schema` and accept exactly 12
- The ensemble rejects null daily columns, an empty daily block, and a missing temperature limit, all with good hourly data
- In each adapter, a truncated response leaves the last good value as `stale`
- All pre-existing tests pass without being edited
- No schema change and no cache key bump
</success_criteria>

<output>
Create `.planning/quick/261102-gtn-tratar-como-falla-las-respuestas-incompl/261102-gtn-SUMMARY.md` when done
</output>
