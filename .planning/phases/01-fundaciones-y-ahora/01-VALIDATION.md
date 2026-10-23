---
phase: 1
slug: fundaciones-y-ahora
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `01-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (node environment), `process.env.TZ = 'UTC'` at the top of `vitest.config.ts` |
| **Config file** | none — Wave 0 installs `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit && npm run lint && npm run build` |
| **Estimated runtime** | ~60 seconds (full, including build) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit && npm run lint`
- **Before `/gsd-verify-work`:** Full suite + `npm run build` green, plus production smoke curls
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Requirement-level map with the real test files created by the plans.

| Requirement | Behavior | Plan / Task | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-------------|-----------|-------------------|-------------|--------|
| DATA-01 | Request URL has timezone, forecast_hours=48, forecast_days=14, km/h, pressure_msl; fixture → snapshot | 01-01 T2/T3 | e2e (mocked fetch) | `npx vitest run test/skeleton.e2e.test.ts` | ❌ W0 | ⬜ pending |
| DATA-01 | TTLs 900 / 2100 in cached getters; `revalidate = 600` on page and route; no `cacheComponents` | 01-01 T3, 01-05 T3 | static | `grep -q "revalidate = 600" app/page.tsx app/api/weather/route.ts && ! grep -q cacheComponents next.config.ts` | ❌ W0 | ⬜ pending |
| DATA-01 | Idle-then-visit: entry older than TTL triggers a foreground bucketed refresh; embedded data ≤ 900 s old while upstream is healthy | 01-06 T1 | unit (fake timers) | `npx vitest run lib/sources/readThrough.test.ts lib/weather/snapshot.test.ts` | ❌ W0 | ⬜ pending |
| DATA-01 | Repeated requests don't refetch upstream | 01-01 T3 (local), 01-02 T4, 01-07 T3 (prod) | smoke | `node scripts/smoke.mjs <url>` (fetchedAt identical across two `/api/weather` requests) | ❌ W0 | ⬜ pending |
| DATA-02 | Freshness labels (RECIÉN / 1 MIN / n MIN / n H / EL dd/MM A LAS HH:mm); 30-min outdated and 15-min auto-refresh thresholds | 01-05 T1 | unit | `npx vitest run lib/weather/freshness.test.ts` | ❌ W0 | ⬜ pending |
| DATA-03 | `deriveSourceStatus` is outcome-based (rejected → error, refreshError → stale, else ok; age never yields stale); `selectAhoraVariant` | 01-06 T1 | unit | `npx vitest run lib/weather/status.test.ts` | ❌ W0 | ⬜ pending |
| DATA-03 | Aggregator tolerates OM/MET rejection; `WEATHER_FAULT` applied only when `VERCEL_ENV !== 'production'` | 01-05 T3, 01-06 T1/T2 | unit (mocked getters) | `npx vitest run lib/weather/snapshot.test.ts test/skeleton.e2e.test.ts` | ❌ W0 | ⬜ pending |
| DATA-03 | Adapters throw `SourceError` on 500 / 400+reason / network / timeout / schema-broken fixture, never leaking `reason` | 01-05 T3, 01-06 T2 | unit (mocked fetch) | `npx vitest run lib/sources/openMeteoForecast.test.ts lib/sources/metNorway.test.ts` | ❌ W0 | ⬜ pending |
| DATA-03 | Fault builds render Sin datos; normal build never shows "No pudimos actualizar" | 01-06 T3 | smoke (local build) | `WEATHER_FAULT=empty npm run build && WEATHER_FAULT=empty node scripts/smoke.mjs http://localhost:3106 --start` | ❌ W0 | ⬜ pending |
| DATA-04 | `localDateKey` 02:59Z → 23, 03:00Z → 24; h23 formatting; `withOffset` attaches −03:00; test runs in UTC | 01-03 T1 | unit | `npx vitest run lib/time.test.ts` | ❌ W0 | ⬜ pending |
| NOW-01 | Normalizer maps current fields (pressure_msl), offsets on hourly/daily, daily date verbatim, nulls preserved | 01-03 T1 | unit | `npx vitest run lib/weather/normalize.test.ts` | ❌ W0 | ⬜ pending |
| NOW-01 | `−` sign, −0 → 0; calm < 2 km/h; 8 wind sectors with "O" | 01-03 T1 | unit | `npx vitest run lib/weather/format.test.ts lib/weather/wind.test.ts` | ❌ W0 | ⬜ pending |
| NOW-02 | WMO table per UI-SPEC; unknown → null; night (solar phase noche) 0–1 → NOCHE DESPEJADA; solar phase at fixed instants | 01-03 T1 | unit | `npx vitest run lib/weather/wmo.test.ts lib/sky/phase.test.ts` | ❌ W0 | ⬜ pending |
| NOW-02 | `resolveSkyState` at fixed instants + weather overrides | 01-04 T1 | unit | `npx vitest run lib/sky/state.test.ts` | ❌ W0 | ⬜ pending |
| OPS-01 | Push to main → production in gru1 (URL from the `PROD_URL:` line in 01-02-SUMMARY.md) | 01-02 T4, 01-07 T3 | smoke | `node scripts/smoke.mjs "$PROD_URL" --expect-region gru1 --expect-commit <sha7>` | manual-assisted | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` (TZ=UTC, `@` and `server-only` aliases) + `"test": "vitest run"` script (01-01 T2)
- [ ] `npm install -D @types/node@^24 vitest@5.0.5 vite` (01-01 T2, after the legitimacy checkpoint T1)
- [ ] `lib/sources/__fixtures__/open-meteo-forecast.json` (captured with the exact query, 01-01 T2)
- [ ] `lib/sources/__fixtures__/open-meteo-forecast.broken.json` (01-06 T2)
- [ ] `lib/sources/__fixtures__/met-norway-compact.json` (timeseries trimmed to 3 items, 01-05 T3)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/dev/estados` shows the 5 states; 404 in production | DATA-03 | visual check | open on preview (behind Vercel login); `curl -o /dev/null -w '%{http_code}' https://<prod>/dev/estados` → 404 |
| Auto-deploy on push | OPS-01 | needs user's GitHub/Vercel link | push a commit to main, confirm production deployment in Vercel |
| Visual match to UI-SPEC on iPhone 390px | NOW-01/02 | visual | open production URL on iPhone Safari |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (`vitest run` only)
- [ ] Feedback latency < 60s (confirmed once the suite exists)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
