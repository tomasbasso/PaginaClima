---
phase: 04-pron-stico-con-confianza
fixed_at: 2026-11-02T14:49:24Z
review_path: .planning/phases/04-pron-stico-con-confianza/04-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-11-02T14:49:24Z
**Source review:** .planning/phases/04-pron-stico-con-confianza/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (CR-01, WR-01, WR-02, WR-03, WR-04)
- Fixed: 5
- Skipped: 0
- Info findings IN-01 to IN-04 were left alone, as instructed.

**Checks on the final commit (`af4e4c8`):**

| Command | Result |
|---------|--------|
| `npm test` | Passed: 50 files, 974 tests |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |

Nothing was checked in a browser. `/dev/estados` was checked by printing each frame's notice text, and its layout was not viewed.

## Copy for the owner to approve

These sentences are outside the UI-SPEC copy table. `04-UI-SPEC.md` was not edited, so its table now lags the code until these are approved.

**New sentences (WR-02)**, shown when something other than the failed source is also not `ok`:

1. Ahora no tenemos la probabilidad de lluvia ni el rango de temperatura. Te mostramos el resto del pronóstico.
2. Ahora no podemos comparar los modelos, así que esta vez no hay rombos. Te mostramos el resto del pronóstico.

**New sentences (WR-01)**, shown when the data is not from today:

3. No pudimos actualizar la probabilidad de lluvia. Te mostramos la última que tenemos, del {dd/MM} a las {HH:mm}.
4. No pudimos actualizar la comparación entre modelos. Te mostramos la última que tenemos, del {dd/MM} a las {HH:mm}.
5. No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, del {dd/MM} a las {HH:mm}.

**Unchanged text, used in a new situation (WR-01):** a stale source that covers no visible day now shows the existing error copy for that source, or the "Fallaron los dos" copy when both are in that state.

**Already outside the contract, not changed by this work:** "No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, de las {HH:mm}."

Frame names in `/dev/estados` also changed, but that page is for development only.

## Fixed Issues

### CR-01: A response with no usable data is cached as a success and replaces the last good value, with no notice

**Status:** fixed
**Files modified:** `lib/sources/openMeteoEnsemble.ts`, `lib/sources/openMeteoModels.ts`, `lib/sources/openMeteoEnsemble.test.ts`, `lib/sources/openMeteoModels.test.ts`
**Commit:** 1e1d99b
**Applied fix:** Both adapters throw `SourceError(id, 'schema')` when the aggregate is empty. Each adapter has a test for an all-null payload, and the models adapter also has one for columns with no rows. A further test per adapter runs the real adapter through `readThrough` and `deriveSourceStatus`: the source is `stale` and keeps the last good value, or `error` when there is none. All 5 new tests fail without the fix.

### WR-01: The stale notice gives an hour with no date, and can describe data the page is not showing

**Status:** fixed: requires human verification (copy approval)
**Files modified:** `lib/forecast/confidenceNotice.ts`, `lib/forecast/confidenceNotice.test.ts`, `app/pronostico/page.tsx`, `app/dev/estados/fixtures.ts`
**Commit:** df61739
**Applied fix:** The signature is now `confidenceNotice(sources, now, visible)`, and the page passes `rows[0]` as `visible`. Data from an earlier day in Argentina reads `del 28/10 a las 15:00`, using `formatDayMonth`. A stale source that covers no visible day counts as `error`. Gallery frames now take their flags from their own rows, and frames 4c, 4d and 6d are new.

### WR-02: "El resto del pronóstico sigue al día" can be false

**Status:** fixed: requires human verification (copy approval)
**Files modified:** `lib/forecast/confidenceNotice.ts`, `lib/forecast/confidenceNotice.test.ts`, `app/dev/estados/fixtures.ts`
**Commit:** ca447a0
**Applied fix:** "Sigue al día" now appears only when every other source in the list is `ok`, including `open-meteo`. Otherwise that clause becomes "Te mostramos el resto del pronóstico." There is still one notice per screen. A test runs all 81 status combinations of the four sources. Gallery frames 3b and 5b are new, and frames 4b and 6b are now labelled as outside the contract.

### WR-03: `verdictFor` throws above 4 voters, and the cast hides it from the compiler

**Status:** fixed
**Files modified:** `lib/forecast/agreement.ts`, `lib/forecast/agreement.test.ts`
**Commit:** ddeff15
**Applied fix:** A voter count with no entry in `AGREEMENT_C` returns `sinDato` instead of crashing. New tests check that every count from 2 to `VOTING_MODELS.length` has an entry, and that 5 and 12 voters give `sinDato`.

### WR-04: The D-18 leak guard has a regex typo, so leaked temperature members would pass

**Status:** fixed
**Files modified:** `test/skeleton.e2e.test.ts`, `lib/weather/snapshot.test.ts`
**Commit:** af4e4c8
**Applied fix:** Both tests now use `_member\d`. Grep and a byte check both confirm the backslash is in the files, and it is also in the committed e2e test. Each test now asserts that its pattern matches `temperature_2m_max_member01`, and those assertions pass.

## Open points

- **MET Norway:** WR-02 follows "every other source" literally, so a MET Norway failure also removes "sigue al día", even though that source feeds nothing on `/pronostico`. To exclude it, filter that one id in `restOfForecast`.
- **Truncated payloads (CR-01):** only an empty aggregate is rejected, as decided. A response with a single usable day still replaces a full last good value. The review's optional minimum number of days was not added.

---

_Fixed: 2026-11-02T14:49:24Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
