---
phase: 1
slug: fundaciones-y-ahora
status: draft
nyquist_compliant: false
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

Requirement-level map (task IDs get filled in by the planner/executor once the plans exist).

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| DATA-01 | Open-Meteo adapter parses real fixture; URL has timezone, forecast_hours=48, forecast_days=14, km/h | unit | `npx vitest run lib/sources` | ❌ W0 | ⬜ pending |
| DATA-01 | TTLs 900 / 2100 in cached getters; `revalidate = 600` on page and route; no `cacheComponents` | static | `grep -q "revalidate = 600" app/page.tsx app/api/weather/route.ts && ! grep -q cacheComponents next.config.ts` | ❌ W0 | ⬜ pending |
| DATA-01 | Repeated requests don't refetch upstream | smoke (prod) | `curl -s https://<prod>/api/weather \| jq -r '.sources[0].fetchedAt'` twice → identical | manual-assisted | ⬜ pending |
| DATA-02 | Freshness labels (RECIÉN / 1 MIN / n MIN / n H / EL dd/MM A LAS HH:mm) | unit | `npx vitest run lib/weather/format.test.ts` | ❌ W0 | ⬜ pending |
| DATA-03 | `deriveSourceStatus` ok/stale/error boundaries (TTL + 120 s grace) | unit | `npx vitest run lib/weather/status.test.ts` | ❌ W0 | ⬜ pending |
| DATA-03 | Aggregator tolerates OM/MET rejection; `WEATHER_FAULT` ignored in production | unit | `npx vitest run lib/weather/snapshot.test.ts` | ❌ W0 | ⬜ pending |
| DATA-03 | Adapters throw `SourceError` on 500 / network / schema-broken fixture | unit | `npx vitest run lib/sources` | ❌ W0 | ⬜ pending |
| DATA-04 | `localDateKey` 02:59Z → 23, 03:00Z → 24; h23 formatting; `withOffset` attaches −03:00; test runs in UTC | unit | `npx vitest run lib/time.test.ts` | ❌ W0 | ⬜ pending |
| NOW-01 | Normalizer maps current fields; `−` sign, −0 → 0; calm < 2 km/h; 8 wind sectors with "O" | unit | `npx vitest run lib/weather/normalize.test.ts lib/weather/wind.test.ts` | ❌ W0 | ⬜ pending |
| NOW-02 | WMO table per UI-SPEC; unknown → null; night 0–1 → NOCHE DESPEJADA | unit | `npx vitest run lib/weather/wmo.test.ts` | ❌ W0 | ⬜ pending |
| NOW-02 | `resolveSkyState` at fixed instants + weather overrides | unit | `npx vitest run lib/sky/state.test.ts` | ❌ W0 | ⬜ pending |
| OPS-01 | Push to main → production in gru1 | smoke | `curl -sI https://<prod>/` → 200; `/api/weather` `.region` → `gru1` | manual-assisted | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` (TZ=UTC, `@` alias) + `"test": "vitest run"` script
- [ ] `npm install -D @types/node@^24 vitest@5.0.5 vite`
- [ ] `lib/sources/__fixtures__/open-meteo-forecast.json` (captured with the exact query)
- [ ] `lib/sources/__fixtures__/open-meteo-forecast.broken.json`
- [ ] `lib/sources/__fixtures__/met-norway-compact.json` (timeseries trimmed to ~3 items)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/dev/estados` shows the 5 states; 404 in production | DATA-03 | visual check | open on preview (behind Vercel login); `curl -o /dev/null -w '%{http_code}' https://<prod>/dev/estados` → 404 |
| Auto-deploy on push | OPS-01 | needs user's GitHub/Vercel link | push a commit to main, confirm production deployment in Vercel |
| Visual match to UI-SPEC on iPhone 390px | NOW-01/02 | visual | open production URL on iPhone Safari |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
