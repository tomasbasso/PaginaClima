---
phase: 01-fundaciones-y-ahora
fixed_at: 2026-10-23T22:40:00Z
review_path: .planning/phases/01-fundaciones-y-ahora/01-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 11
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-10-23T22:40:00Z
**Source review:** .planning/phases/01-fundaciones-y-ahora/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 11 (CR-01, WR-01..WR-10; Info findings out of scope)
- Fixed: 11
- Skipped: 0

Final gate (after all fixes): `npx vitest run` 16 files / 157 tests pass, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` passes with `/` and `/api/weather` still ISR (Revalidate 10m) and the new `/api/health` dynamic. `node scripts/smoke.mjs http://localhost:3123 --start --expect-region local` passes.

Process note: per the orchestrator's instructions, fixes were committed directly on `main` in the main working tree (no isolated worktree / recovery sentinel was created). Nothing was pushed.

## Fixed Issues

### CR-01: Auto-refresh is one-shot. After the first refresh hits a stale ISR entry, the page never refreshes itself again

**Files modified:** `lib/weather/freshness.ts`, `lib/weather/freshness.test.ts`, `components/client/Freshness.tsx`
**Commit:** 7acde4e
**Status:** fixed: requires human verification (refresh timing logic)
**Applied fix:** Replaced the `refreshed` latch with a time-based backoff. The new pure helpers `autoRefreshBackoffMs(attempts)` (1, 2, 4, 8 min, capped at 15 min) and `shouldTriggerAutoRefresh({ ageMs, attempts, sinceLastMs })` decide each call. The attempt counter and last-refresh timestamp reset whenever `fetchedAt` changes. Unit tests cover the backoff and retry rules.

### WR-01: While the page stays visible, data age is never checked again

**Files modified:** `components/client/Freshness.tsx`
**Commit:** 540531b
**Status:** fixed: requires human verification (refresh timing logic)
**Applied fix:** The auto-refresh effect now also runs `maybeRefresh()` every 60 s while `document.visibilityState === 'visible'`, gated by the CR-01 backoff.

### WR-02: Copying `.env.example` as instructed sends an empty User-Agent to MET Norway

**Files modified:** `lib/config.ts`, `lib/config.test.ts` (new), `.env.example`
**Commit:** cede950
**Applied fix:** Added `resolveUserAgent(raw)` (`raw?.trim() || DEFAULT_USER_AGENT`) and exported `DEFAULT_USER_AGENT`. `USER_AGENT` now uses the resolver. Commented out `WEATHER_USER_AGENT=` in `.env.example`. Tests cover undefined, empty, whitespace-only and trimmed values.

### WR-03: An Open-Meteo `daily` array shorter than `daily.time` produces the literal string `"undefined-03:00"`

**Files modified:** `lib/sources/openMeteoForecast.schema.ts`, `lib/weather/normalize.test.ts`
**Commit:** 202e2c9
**Applied fix:** Added a `sameLengthAsTime` `.superRefine` on both `hourly` and `daily`. Any parallel array whose length differs from `time` fails the parse, and the adapter maps that to `'schema'`. Tests: the real fixture passes, and a short `daily.sunrise` or short `hourly.wind_gusts_10m` is rejected with the right issue path.

### WR-04: `region` reports the build/regeneration render, not the serving region

**Files modified:** `app/api/health/route.ts` (new), `app/api/weather/route.ts`, `scripts/smoke.mjs`
**Commit:** 2aa9306
**Applied fix:** New `app/api/health/route.ts` (`dynamic = 'force-dynamic'`, Node runtime, `Cache-Control: no-store`) returns only `{ region, commit }` and touches no upstream or cache. `/api/weather` no longer carries `region`/`commit`, so it reads no runtime-only env vars. In `scripts/smoke.mjs`, `--expect-region` and the `--expect-commit` polling now read `/api/health`.

### WR-05: No `app/global-error.tsx`, yet the root layout does data work

**Files modified:** `app/global-error.tsx` (new), `app/fonts.ts` (new), `app/layout.tsx`
**Commit:** 0958ae9
**Applied fix:** New client `global-error.tsx` renders its own `<html lang="es-AR" data-sky>`/`<body>` with `globals.css`, the fonts, the Hero, the same "Sin datos" `Ahora` state with `RetryButton` (`unstable_retry ?? reset`) and the TabBar. It logs only `error.digest`. The `next/font` definitions moved into the shared `app/fonts.ts` so the layout and global-error use the same instances. Copy is unchanged.

### WR-06: `loading.tsx` can't render on the slow path because the root layout awaits the snapshot first

**Files modified:** `app/layout.tsx`, `components/Hero.tsx`, `app/globals.css`, `components/client/SkyBackdrop.tsx`
**Commit:** a9114a3
**Status:** fixed: requires human verification (visual: accent and tab bar before and after hydration, and CARGANDO on a cold render)
**Applied fix:**
- The root layout is now synchronous with no snapshot fetch. `<html data-sky>` is the solar-phase fallback only.
- `<Hero>` puts the weather-aware `data-sky` on `<main>`, so the diamond and focus ring are correct in the server HTML.
- `globals.css` adds `html:has(main[data-sky="…"])` accent rules so the tab bar, which sits in the layout outside `<main>`, follows the page sky before hydration.
- `SkyBackdrop live` now updates both `<html>` and its host `<main>`.

### WR-07: TabBar hard-codes `aria-current="page"` and the active styling on every enabled tab

**Files modified:** `lib/sections.ts`, `lib/sections.test.ts` (new), `components/TabBar.tsx`
**Commit:** 9dce863
**Applied fix:**
- TabBar is now a client component that uses `usePathname()` and `next/link`.
- `aria-current="page"`, the accent color and the underline go only on the active tab. Enabled but inactive tabs use ink/75, as the UI-SPEC says.
- New pure `isActiveSection(pathname, href)`: `/` matches only itself, other sections match their sub-routes, and a trailing slash is tolerated. Unknown routes (404, `/dev/*`) get no active tab.
- Tests cover these cases.

### WR-08: "Reintentar" can't recover within the ISR window

**Files modified:** `components/client/RetryButton.tsx`, `lib/weather/status.ts`, `lib/weather/status.test.ts`
**Commit:** b768c51
**Status:** fixed: requires human verification (retry flow timing against real ISR)
**Applied fix:**
- The default action (no `onRetry`) first fetches our own `/api/weather`, which is a separate ISR entry, and then calls `router.refresh()`.
- If the API already has current data, the button waits 2.5 s and, if it is still mounted (the page is still empty), refreshes a second time. The first refresh starts the page's background regeneration and the second one picks it up.
- REINTENTANDO… stays visible for the whole flow.
- It never contacts upstream directly (T-01-25), and the copy is unchanged.
- New pure `snapshotHasNow(json: unknown)` with tests.
- Error boundaries still pass `onRetry`.

### WR-09: One `null` in a `current` field discards the whole Open-Meteo response

**Files modified:** `lib/sources/openMeteoForecast.schema.ts`, `lib/weather/types.ts`, `lib/weather/wind.ts`, `lib/weather/wind.test.ts`, `lib/weather/normalize.test.ts`, `components/Ahora.tsx`
**Commit:** d8a3c47
**Applied fix:**
- `time`, `temperature_2m`, `weather_code` and `is_day` stay strict. The other `current` fields are now `z.number().nullable()`, and `NowData` is widened to match.
- `describeWind` handles nulls: no speed gives "—", no direction gives speed only, and a missing direction or gust removes the gust line.
- In `Ahora`, null humidity, pressure or wind show "—" in ink/55 (the same treatment as CARGANDO). When the feels-like value is null, the "sensación" line is hidden and the aria-label leaves it out, so no new copy was needed.
- Tests cover nullable gust and pressure, and that the strict fields still reject null.

### WR-10: The client SkyBackdrop and the server's `data-sky` on `<html>` can disagree after `router.refresh()`

**Files modified:** `components/client/SkyBackdrop.tsx`
**Commit:** 9aa9106
**Status:** fixed: requires human verification (visual, after an auto-refresh or Reintentar)
**Applied fix:** The sync moved to `useLayoutEffect`, and `state.sunAltitude` is added to the deps. That value changes with every server render, so a refresh that brings a new render re-runs the sync. The sync now writes the token to `<html>` and the host `<main>` right away, after React patches the server attributes and before paint. The 60 s tick and the layer crossfade are unchanged.

---

_Fixed: 2026-10-23T22:40:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
