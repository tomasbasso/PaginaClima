---
phase: 01-fundaciones-y-ahora
plan: 02
subsystem: ops
tags: [vercel, deploy, github]
requires: [01-01]
provides: [production deployment on Vercel via Git integration]
affects: [01-07]
key-files:
  created: []
  modified: []
duration: n/a (user-driven checkpoints)
completed: 2026-10-23
---

# 01-02 Summary

PROD_URL: https://clima-winifreda.vercel.app

**The walking skeleton is live on Vercel, deployed automatically from `main` through the Git integration.**

## Tasks

| Task | Result |
|------|--------|
| 1. Approve push | User approved and confirmed the repo is private (D-09) |
| 2. Push main | Done by the orchestrator after the user asked in chat ("Hace el push y segui"): `e28d341..b575687 main -> main`. A first attempt was blocked by the Claude Code permission classifier until the explicit request |
| 3. Link Vercel | Done by the user: project `clima-winifreda`, Hobby team, framework Next.js, root `./`, no environment variables |
| 4. Production smoke | See below |

## Production smoke (2026-10-23 22:12Z, commit b575687)

`node scripts/smoke.mjs https://clima-winifreda.vercel.app --expect-region gru1 --expect-commit b575687`

- ok `GET / -> 200` with "Winifreda"
- ok `commit = b575687` (= origin/main at the time)
- ok `sources[0].fetchedAt` stable across requests (`2026-10-23T22:09:29.448Z`): served from cache, no new upstream call
- ok `now.tempC = 16.4`
- FAIL `region = local` (expected gru1)
- Headers: `X-Vercel-Id: gru1::…` (edge PoP São Paulo), `X-Vercel-Cache: HIT`

## Deviations

1. **`region` reads `local` on the build-time ISR render.** `/api/weather` is ISR, so its first response is generated during `next build`, where `VERCEL_REGION` is not defined (it is a runtime-only system variable; `VERCEL_GIT_COMMIT_SHA` is available at build, which is why `commit` was correct). The function region is configured by `vercel.json` `regions: ["gru1"]`. The region check is repeated in plan 07 after an ISR regeneration (≥ 600 s after deploy), when the route runs at runtime in the function region.
2. The Vercel MCP in this session is authenticated to a different scope and does not see the project, so the region could not be read from the API.

## Next

Plan 07 pushes the rest of the phase and re-runs the smoke, including the region after regeneration and the 404 on `/dev/estados`.
