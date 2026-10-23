---
phase: 01-fundaciones-y-ahora
reviewed: 2026-10-23T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - app/api/weather/route.ts
  - app/dev/estados/fixtures.ts
  - app/dev/estados/page.tsx
  - app/error.tsx
  - app/globals.css
  - app/layout.tsx
  - app/loading.tsx
  - app/page.tsx
  - components/Ahora.tsx
  - components/Hero.tsx
  - components/NoData.tsx
  - components/Notice.tsx
  - components/PampaHorizon.tsx
  - components/TabBar.tsx
  - components/client/Freshness.tsx
  - components/client/LiveClock.tsx
  - components/client/RetryButton.tsx
  - components/client/SkyBackdrop.tsx
  - lib/config.ts
  - lib/sections.ts
  - lib/sky/phase.ts
  - lib/sky/state.ts
  - lib/sources/errors.ts
  - lib/sources/metNorway.schema.ts
  - lib/sources/metNorway.ts
  - lib/sources/openMeteoForecast.schema.ts
  - lib/sources/openMeteoForecast.ts
  - lib/sources/readThrough.ts
  - lib/time.ts
  - lib/weather/faults.ts
  - lib/weather/format.ts
  - lib/weather/freshness.ts
  - lib/weather/normalize.ts
  - lib/weather/snapshot.ts
  - lib/weather/status.ts
  - lib/weather/types.ts
  - lib/weather/wind.ts
  - lib/weather/wmo.ts
  - proxy.ts
  - next.config.ts
  - vercel.json
  - package.json
  - .env.example
  - scripts/smoke.mjs
findings:
  critical: 1
  warning: 10
  info: 9
  total: 20
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-23
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

The data layer is in good shape: the zod boundary works, error codes stay coarse, the snapshot never throws, `withOffset` is the only path for naive times, and fault injection is gated on production. Most of the defects are in how the parts interact over time:

- The client auto-refresh (DATA-01) breaks in its main scenario. After an idle period, ISR serves the stale entry first, and the one-shot latch then never lets the client try again.
- The `.env.example` that ships today makes MET Norway requests go out with an empty User-Agent.
- The root layout awaits the snapshot. That hides `loading.tsx` on the slow path, and there is no `global-error.tsx` behind it.
- Several latent bugs will show up as soon as phase 2 turns on more tabs or uses `daily`.

The known `region: 'local'` observation is **confirmed** (01-02-SUMMARY records `FAIL region = local`). The root cause goes a bit further than the env var: see WR-04.

## Critical Issues

### CR-01: Auto-refresh is one-shot. After the first refresh hits a stale ISR entry, the page never refreshes itself again

**File:** `components/client/Freshness.tsx:36-58`
**Issue:** `refreshed.current` resets only when `fetchedAt` changes. The usual way a user reaches the >15 min branch is opening the app after an idle period. ISR is stale-while-revalidate, so the RSC response to that first `router.refresh()` is the **same stale entry**, and the regeneration runs in the background. `fetchedAt` doesn't change, the effect doesn't run again, and `refreshed.current` stays `true` for the life of the document. Every later `visibilitychange` then exits at `if (refreshed.current) return`. So the page shows old data indefinitely, with the "Desactualizado" notice telling the user to "Recargá la página". The installed iOS standalone PWA (the main target per CLAUDE.md) has no reload button or pull-to-refresh, so the user's only way out is killing the app.
**Fix:** Replace the permanent latch with a time-based backoff, so a refresh that returns the same stale entry is retried once the regeneration has had time to land:
```tsx
const lastRefreshAt = useRef(0)
const RETRY_MS = 60_000
const maybeRefresh = () => {
  if (!shouldAutoRefresh(Date.now() - fetchedAtMs)) return
  if (Date.now() - lastRefreshAt.current < RETRY_MS) return
  lastRefreshAt.current = Date.now()
  router.refresh()
}
// reset lastRefreshAt.current = 0 when fetchedAt changes
```

## Warnings

### WR-01: While the page stays visible, data age is never checked again

**File:** `components/client/Freshness.tsx:29-34, 52-53`
**Issue:** `maybeRefresh` runs only once (3 s after mount) and on `visibilitychange`. Say a user opens the app with 5-minute-old data and leaves it on screen (a common pattern for a weather PWA on a desk). The 60 s ticker updates `now`, but it never calls `maybeRefresh`, so the page doesn't auto-refresh at 15 min. It only switches to "Desactualizado" at 30 min. This contradicts the header comment ("One-shot router.refresh() when the data is older than 15 min").
**Fix:** Call `maybeRefresh()` from the 60 s tick as well, with the CR-01 backoff in place, or add a `setInterval(maybeRefresh, 60_000)` inside the auto-refresh effect.

### WR-02: Copying `.env.example` as instructed sends an empty User-Agent to MET Norway

**File:** `lib/config.ts:16-17`, `.env.example:8`
**Issue:** `.env.example` says "Copy to .env.local" and contains `WEATHER_USER_AGENT=`. Next/dotenv loads that as `''`, and `'' ?? default` evaluates to `''`. `fetchMetNorwayRaw` then sends `User-Agent: ''`. MET's ToS requires an identifying UA, and MET answers 403 to missing or generic ones. The same thing happens if the var is ever created empty in the Vercel dashboard.
**Fix:**
```ts
export const USER_AGENT =
  process.env.WEATHER_USER_AGENT?.trim() || 'ClimaWinifreda/1.0 github.com/tomasbasso/PaginaClima'
```
(and/or comment out the line in `.env.example`: `# WEATHER_USER_AGENT=`).

### WR-03: An Open-Meteo `daily` array shorter than `daily.time` produces the literal string `"undefined-03:00"`

**File:** `lib/weather/normalize.ts:49-50`, `lib/sources/openMeteoForecast.schema.ts:25-46`
**Issue:** The schema checks each parallel array on its own but never checks that they have the same length. `at()` guards the numeric arrays, but `withOffset(d.sunrise[i], off)` gets `undefined`. The template literal then turns it into `"undefined-03:00"`, which is typed as `string` and passes through to the snapshot. `Date.parse` on it gives `NaN` downstream (phase 2 sun times, phase 7 alerts). Hourly arrays shorter than `time` silently become `null`s rather than failing loudly, which goes against the CLAUDE.md rule that an upstream schema change should "fail ruidoso en el proxy".
**Fix:** Add a `.superRefine` on `hourly`/`daily` that checks every array length equals `time.length` and fails with `'schema'` otherwise. Or, in `normalize.ts`, map sunrise/sunset through a guard: `const s = d.sunrise[i]; sunrise: s ? withOffset(s, off) : null` (and widen the type to `string | null`).

### WR-04: `region` reports the build/regeneration render, not the serving region (known observation confirmed, root cause wider)

**File:** `app/api/weather/route.ts:3,11`
**Issue:** Confirmed: the route is static ISR (`revalidate = 600`, no dynamic APIs), so the JSON is produced at `next build`, where `VERCEL_REGION` is unset → `'local'` (01-02-SUMMARY: `FAIL region = local`). Even after the first background regeneration, the value is cached for 600 s+. It describes the region of whichever function last regenerated, not the region answering the request. So `smoke.mjs --expect-region gru1` is non-deterministic: it fails on every fresh deploy until a regeneration happens, and passes or fails depending on timing. That makes it a flaky deploy gate, not a check of OPS-01.
**Fix:** Move deployment diagnostics to a separate dynamic handler (`app/api/health/route.ts` with `export const dynamic = 'force-dynamic'`, returning `region` and `commit` and nothing upstream). Or have the smoke check read the `x-vercel-id` response header (`<edge>::gru1::...`), which always carries the function region. Keep `/api/weather` free of runtime-only env vars.

### WR-05: No `app/global-error.tsx`, yet the root layout does data work

**File:** `app/layout.tsx:44-45` (missing `app/global-error.tsx`)
**Issue:** `app/error.tsx` is rendered *inside* the root layout, so it cannot catch errors thrown by `RootLayout` itself. The layout awaits `getWeatherSnapshot()` and runs `skyFromSnapshot`/suncalc. The snapshot is designed not to throw, but anything that does throw there (a regression in normalize, a suncalc edge case, a `cache()` misuse in a future phase) falls through to Next's default unstyled English global error, with no Reintentar.
**Fix:** Add `app/global-error.tsx` (`'use client'`, renders its own `<html lang="es-AR"><body>`), with the same "Sin datos" copy and a retry, and logging only `error.digest`.

### WR-06: `loading.tsx` can't render on the slow path because the root layout awaits the snapshot first

**File:** `app/layout.tsx:44`, `app/loading.tsx`
**Issue:** The `loading.tsx` Suspense boundary wraps the page *below* the root layout. The layout `await`s `getWeatherSnapshot()` before it returns any JSX, so on any render where the snapshot is slow (cold Data Cache, readThrough miss with up to 8 s timeout per source, every `/dev/estados` request, every `router.refresh()`), nothing streams until the data arrives and CARGANDO never shows. The UI-SPEC "Cargando" state is effectively reachable only through client navigations that don't re-run the layout. The comment in `proxy.ts:2-3` ("root app/loading.tsx makes the response stream") is inaccurate for the same reason.
**Fix:** Don't fetch in the root layout. Render `<html data-sky>` from the solar phase only (no weather) and let the page's `SkyBackdrop live` set `document.documentElement.dataset.sky` once mounted. Or move the snapshot-dependent part into a Suspense-wrapped child.

### WR-07: TabBar hard-codes `aria-current="page"` and the active styling on every enabled tab

**File:** `components/TabBar.tsx:78-83`, `lib/sections.ts:1-2`
**Issue:** Every enabled section is rendered as the current page, whatever the route. Today only `/` is enabled, but `sections.ts` says phase 2 flips `pronostico` to `enabled: true`. From then on both tabs are announced as the current page and both get the accent underline. It's already wrong on `/dev/estados` and on the 404 page, where "Ahora" claims to be current.
**Fix:** Make the active state route-aware: a small client `TabBar` using `usePathname()` (or pass `active` from each page), and set `aria-current` and the accent only when `pathname === s.href`. Switch `<a>` to `next/link` while there, so tab changes don't do a full document reload, which would also reset the CR-01 refresh state.

### WR-08: "Reintentar" can't recover within the ISR window

**File:** `components/client/RetryButton.tsx:18-22`, `app/page.tsx:7`
**Issue:** On the Sin datos page, `router.refresh()` fetches the route's ISR entry, which is the same cached "Sin datos" render for at least 600 s (and the first request after expiry still returns it while regeneration runs in the background). The button shows REINTENTANDO… and then the identical empty state, even after upstream has recovered. The user can't tell that retrying did nothing.
**Fix:** Retry against something that isn't served from the ISR entry. For example, fetch `/api/weather` (separate cache entry) and call `router.refresh()` only if `sources[0].status !== 'error'`, otherwise show "Todavía sin datos, probá en unos minutos". At minimum, change the copy after a no-op retry. Optionally lower the page `revalidate` so a failed render isn't pinned for 10 min. Either way, keep the "never hits upstream directly" guarantee (T-01-25).

### WR-09: One `null` in a `current` field discards the whole Open-Meteo response

**File:** `lib/sources/openMeteoForecast.schema.ts:11-24`
**Issue:** Every `current.*` field is `z.number()` (non-nullable). Open-Meteo sometimes returns `null` for a single current variable (e.g. `wind_gusts_10m` or `pressure_msl` during a model hiccup). That isn't a schema change, but the whole parse fails with `'schema'`: on a cold cache the result is Sin datos, and otherwise a "No pudimos actualizar" notice, even though temperature and the 48 h/14 d blocks were fine. The hourly and daily arrays already accept `null` for exactly this reason.
**Fix:** Keep `temperature_2m`, `weather_code`, `is_day` and `time` strict, and make the secondary fields `z.number().nullable()`. Widen `NowData` to match, and render "—" in `Ahora` for the null ones.

### WR-10: The client SkyBackdrop and the server's `data-sky` on `<html>` can disagree after `router.refresh()`

**File:** `components/client/SkyBackdrop.tsx:39`, `app/layout.tsx:49`
**Issue:** SkyBackdrop writes `document.documentElement.dataset.sky` outside React. When a later RSC payload (auto-refresh or Reintentar) carries a *different* `data-sky` than the previous render, React patches the attribute back to the server's value, which may be up to 10 min old (or much older if ISR was stale). The SkyBackdrop effect doesn't run again (deps `[live, weather]` unchanged) until the next 60 s tick, so for up to a minute the accent (tab bar, diamond, focus ring) doesn't match the sky layer behind it.
**Fix:** Tie the effect to the refresh as well (e.g. include `state.sunAltitude` or a `renderedAt` prop in the deps so it re-ticks right away). Or stop rendering `data-sky` from the server and let the client own it, as suggested in WR-06.

## Info

### IN-01: Status and variant logic depend on array position, not source id

**File:** `lib/weather/status.ts:17`, `components/Ahora.tsx:88`
**Issue:** `sources[0]` is assumed to be Open-Meteo. Phases 4 and 7 will add sources, and a reorder would silently move the UI to another source's status.
**Fix:** `s.sources.find((x) => x.id === 'open-meteo')`.

### IN-02: MET Norway never reports `stale`

**File:** `lib/weather/snapshot.ts:52-53`
**Issue:** If MET refreshes fail for days, `unstable_cache` keeps serving the old summary and `sources[1]` stays `status: 'ok'` with an old `fetchedAt`. That's harmless in phase 1 (not displayed), but phase 4/7 consumers would trust it.
**Fix:** Document this on `SourceInfo`, or compute `stale` once `fetchedAt` is older than 2 × TTL for sources without read-through.

### IN-03: The `stale` fault produces `status: 'ok'`

**File:** `lib/weather/faults.ts:44-51`
**Issue:** `WEATHER_FAULT=stale` shifts `fetchedAt` by 45 min and forces `status: 'ok'`, which tests the age-based Desactualizado notice and not `SourceStatus 'stale'` (the degraded branch). The name is misleading for anyone testing the "No pudimos actualizar" path.
**Fix:** Rename to `outdated`, or add a separate fault that sets `status: 'stale'`.

### IN-04: Duplicate SVG `id` and an ineffective `preserveAspectRatio`

**File:** `components/PampaHorizon.tsx:58, 65`
**Issue:** `id="pampa-fence-posts"` repeats once per instance (11× on `/dev/estados`), so the IDs aren't unique. `preserveAspectRatio` does nothing without a `viewBox`.
**Fix:** Use `useId()`-derived ids (or a single shared `<defs>`), and drop `preserveAspectRatio`.

### IN-05: Flaky `fetchedAt` check and `--start` probing a server that's already running

**File:** `scripts/smoke.mjs:116-121, 163-176`
**Issue:** The two `/api/weather` reads 2 s apart can straddle an ISR regeneration and fail even though caching works. With `--start`, a server already listening on the port answers the readiness probe, so the smoke tests the wrong build.
**Fix:** On a mismatch, retry once. Before spawning, check that the port is free.

### IN-06: WMO 73 (moderate snow) is labelled "Nevadas débiles"

**File:** `lib/weather/wmo.ts:35`
**Issue:** 71 is slight, 73 moderate and 75 heavy snow. Showing 73 as "débiles" understates it. Confirm against the UI-SPEC table.
**Fix:** `73: e('Nevada', 'nieve')` (or "Nevadas moderadas").

### IN-07: Two upstream fetches per bucket when the cached entry is stale

**File:** `lib/sources/readThrough.ts:22-27`
**Issue:** A stale `getCached()` triggers `unstable_cache`'s own background revalidation, and `getFresh(bucket)` then misses and fetches again. That's two Open-Meteo calls per refresh, which matters for the shared-IP rate limits D-07 is meant to protect.
**Fix:** Accept and document it, or replace `getCached` with a long-revalidate "last good" entry that only `getFresh` writes.

### IN-08: The degraded notice shows only HH:mm

**File:** `components/Ahora.tsx:114-115`
**Issue:** "…de las 14:05" is ambiguous when the last good data is from another day, while `formatFreshness` already switches to a date after 24 h.
**Fix:** Include `formatDayMonth` when the age is ≥ 24 h.

### IN-09: The fixture error code `fetch_failed` never occurs in real data

**File:** `app/dev/estados/fixtures.ts:72, 77-78`
**Issue:** Real codes are `network | timeout | http_N | schema | unknown | fault`. The fixtures can drift from real states unnoticed.
**Fix:** Use `'network'`.

---

_Reviewed: 2026-10-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
