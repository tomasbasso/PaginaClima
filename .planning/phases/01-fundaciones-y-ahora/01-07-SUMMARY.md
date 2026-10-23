---
phase: 01-fundaciones-y-ahora
plan: 07
subsystem: ops / dev tooling
tags: [dev-gallery, deploy, smoke]
requires: [01-02, 01-06]
provides: [/dev/estados gallery, production smoke of the full phase]
key-files:
  created:
    - app/dev/estados/page.tsx
    - app/dev/estados/fixtures.ts
    - proxy.ts
  modified: []
completed: 2026-10-23
---

# 01-07 Summary

**`/dev/estados` shows every Ahora state and sky token outside production; the complete phase is live and passes the production smoke in gru1.**

## Tasks

| Task | Result | Commit |
|------|--------|--------|
| 1. `/dev/estados` gallery (11 frames of 390×844: Normal, Cargando, Desactualizado, Fuente caída, Sin datos + 6 sky tokens), 404 in production | done | 37ababd |
| 2. Approve push | User approved the push of the 20 pending commits in chat; later gave standing approval for pushes once the suite is green | — |
| 3. Push + production smoke | Pushed `b575687..dfbd35d`, then the review fixes `dfbd35d..c210626`; smoke passed | — |

## Production smoke (2026-10-23 ~22:45Z, commit c210626)

`node scripts/smoke.mjs https://clima-winifreda.vercel.app --expect-region gru1 --expect-commit c210626 --expect-404 /dev/estados`

- ok `GET / -> 200` with "Winifreda"
- ok `commit = c210626`
- ok `sources[0].fetchedAt` stable across requests (cache reused, no upstream call per visit)
- ok `now.tempC = 16`
- ok `region = gru1` (read from the new force-dynamic `/api/health`, WR-04)
- ok `GET /dev/estados -> 404`
- Served `/` contains "ACTUALIZADO", "DATOS: OPEN-METEO.COM", `data-sky`, exactly one `aria-current="page"`, and no "No pudimos actualizar"
- Vercel dashboard (user screenshot): Function Region São Paulo (gru1), marked "overridden" by `vercel.json`

## Deviations

1. **`proxy.ts` for the production 404 (Rule 2, T-01-27).** `notFound()` alone returned 200 because the response had already started streaming; `proxy.ts` (matcher `/dev/:path*`) returns a plain 404 with `x-robots-tag: noindex` when `VERCEL_ENV === 'production'`. `notFound()` stays as a second line of defense.
2. **Region check moved to `/api/health`.** `/api/weather` is ISR and its build-time render has no `VERCEL_REGION`, so it reported `local` even after regeneration. Fixed in the code review (WR-04): a dynamic `/api/health` returns `{ region, commit }`, and the smoke script reads it.
3. The code-review fixes (CR-01, WR-01..WR-10, see `01-REVIEW-FIX.md`) were applied before the final smoke.

## Pending manual checks (end-of-phase human verification)

- Look of the 11 `/dev/estados` frames at 390 px (preview or local `next start`)
- Ahora on a real iPhone: layout at 390 px, sky crossfade, freshness ticking, auto-refresh with backoff on the installed PWA, `:has()` tab-bar accent
