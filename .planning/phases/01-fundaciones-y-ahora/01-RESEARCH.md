# Phase 1: Fundaciones y Ahora - Research

**Researched:** 2026-10-23
**Domain:** Next.js 16.4 App Router on Vercel Hobby (gru1). Server-side cached weather proxy (Open-Meteo + MET Norway), ISR, Argentina time handling, scaffold, Vitest, Git-based deploy.
**Confidence:** HIGH for caching semantics (verified by reading Next.js v16.4.3 source), live API shapes (real requests today) and Intl behavior (tested in Node 24 / ICU 78). MEDIUM for Vercel dashboard steps and a few ISR-on-Vercel runtime details that can only be confirmed after the first deploy.

## Summary

The phase is a walking skeleton: scaffold Next 16.4.3 → `lib/config` + `lib/time` + source adapters (Open-Meteo, MET Norway) → `getWeatherSnapshot()` aggregator → ISR page "Ahora" + `/api/weather` → Vercel Git deploy in `gru1`. Most of it is standard. The decision that needed research was D-03 ("does a failed revalidation keep the last good value?"). I read the Next.js v16.4.3 source to answer it, and the answer changes how D-01 gets implemented.

**D-03 verdict:** plain `fetch(url, { next: { revalidate } })` is **not enough** for "último dato bueno" in this architecture. Next only stores `status === 200` responses, and in a normal request a stale entry is served while it revalidates in the background. That part works. **But ISR regeneration runs in a `prerender-legacy` work unit, and `willConsumerServerCache('prerender-legacy') === true`.** In that context Next revalidates stale fetch entries **in the foreground** and hands the caller the new (failed) response, not the stale one. The adapter then throws and the page loses the last good data. `unstable_cache`, on the other hand, catches errors during revalidation (background *and* foreground) and **returns the stale cached value** (`unstable-cache.ts`: `.catch(err => { console.error(...); return cachedResponse })`). So the recommended pattern is the **D-03 fallback**, which the user already authorized: one `unstable_cache` wrapper per source that returns `{ data, fetchedAt }`. The fetch inside it is not cached on its own. The Vercel Data Cache backing `unstable_cache` **persists across deployments** (Vercel docs), is regional, is split between production and preview, and is LRU-evictable. On Hobby it is shared by every project in the team.

Three other findings will break naive plans:
1. `create-next-app@16.4.3 --yes` now writes **`cacheComponents: true` and `partialPrefetching: true`** into `next.config.ts`. You must pass `--no-cache-components` (verified) or the whole `revalidate` model stops working.
2. `Intl.DateTimeFormat('es-AR', { hour: '2-digit' })` defaults to a **12-hour clock** ("09:05 p. m."). Always pass `hourCycle: 'h23'`.
3. `suncalc@2.1.1` returns **degrees** (apparent altitude, north-based azimuth) and has **no default export**. UI-SPEC's phrase "pasada a grados" must not become a radian→degree conversion.

**Primary recommendation:** Scaffold with `--no-cache-components`. Implement each source as `unstable_cache(fetchRaw, ['<source>', 'v1'], { revalidate })`, returning `{ data, fetchedAt: ISO }` and throwing on non-2xx, timeout or Zod failure. Aggregate with `Promise.allSettled` inside a React `cache()` wrapper. Derive `sources[].status` from age vs TTL. Make the page and `/api/weather` ISR with `export const revalidate = 600`. Declare `"regions": ["gru1"]` in `vercel.json`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

> El usuario no eligió áreas para discutir ("sin preferencia"). Todas las decisiones de abajo son defaults recomendados por Claude; el usuario puede corregirlas antes de `/gsd-plan-phase 1`. Todo lo visual ya está bloqueado en `01-UI-SPEC.md` y no se repite acá.

#### Último dato bueno (DATA-03)
- **D-01:** En la fase 1 el "último dato bueno" sale de la **Data Cache de Vercel**: el adapter hace `fetch(..., { next: { revalidate } })` y **lanza** ante respuesta no-2xx o fallo de Zod, de modo que la revalidación falla y Next sigue sirviendo la entrada vieja. No se agrega Supabase en esta fase (entra en la fase 7).
- **D-02:** El snapshot lleva `sources[].status` (`ok` | `stale` | `error`) y `fetchedAt` por fuente. La UI decide entre los estados Normal / Desactualizado / Fuente caída / Sin datos del UI-SPEC con esos dos campos.
- **D-03:** El researcher tiene que **verificar** que la Data Cache persiste entre deploys y que una revalidación fallida conserva la entrada vieja en Next 16.4 (sin `cacheComponents`). Si no se cumple, el fallback es un `unstable_cache`/memo del último snapshot válido; si tampoco alcanza, se cae al estado "Sin datos" del UI-SPEC (aceptable para la fase 1).

#### Fuentes en la fase 1
- **D-04:** Una sola llamada a Open-Meteo Forecast (modelo por defecto / best match, `timezone=America/Argentina/Buenos_Aires`) con `current` + `hourly` (48 h) + `daily` (14 d). Cuesta lo mismo que pedir solo `current` y deja el snapshot listo para la fase 2. La pantalla de la fase 1 solo usa `current`.
- **D-05:** El adapter de **MET Norway** se construye en esta fase (User-Agent identificatorio, `revalidate` ≥ 1800 s, respeto de `Expires`) para cumplir el criterio 2 del roadmap y validar la caché, pero **no se muestra**: solo aparece en `sources[]` (estado "Fuente secundaria caída" del UI-SPEC).
- **D-06:** Ensemble y Archive **no** se implementan en la fase 1 (fases 4 y 5).
- **D-07:** TTLs: Open-Meteo forecast 900 s, MET Norway 1800 s, página ISR 600 s (`.planning/research/ARCHITECTURE.md` Pattern 1). Así se cumple "≤ 15 min respecto de la última corrida" y se mitiga el rate limit por IP compartida de Vercel.
- **D-08:** Fechas y horas siempre en `America/Argentina/Buenos_Aires` vía `Intl.DateTimeFormat('es-AR', …)`. El "hoy" se calcula en hora local y no en UTC. Lleva un test de Vitest para el borde 21–24 h local (00–03Z).

#### Repo y deploy (OPS-01)
- **D-09:** El repo de GitHub arranca **privado**. Pasarlo a público (portfolio) es una decisión abierta para antes de la fase 7, por el apagado de `schedule` en Actions (ver STATE.md, Blockers).
- **D-10:** La URL es `*.vercel.app` (nombre sugerido: `clima-winifreda`). En la fase 1 no hay dominio propio.
- **D-11:** El deploy es con la integración Git de Vercel (push a `main` → producción, ramas → preview), con la región de funciones en `gru1` declarada en la config del proyecto. Crear el repo remoto, autorizar la app de Vercel en GitHub y vincular el proyecto son pasos que **hace el usuario** (o que se confirman con él antes de ejecutarlos). El plan los incluye como checkpoint humano.
- **D-12:** El User-Agent de MET Norway (`ClimaWinifreda/1.0 <url del repo o contacto>`) va en una env var o constante en `lib/config.ts`. No se commitea ningún email.

#### Probar fallas y frescura
- **D-13:** Hay inyección de fallas con la env var `WEATHER_FAULT` (`openmeteo-down` | `metno-down` | `stale` | `empty`), que el aggregator solo lee si `VERCEL_ENV !== 'production'`. Sirve en local y en los previews de Vercel; en producción se ignora.
- **D-14:** Hay una página `/dev/estados` que renderiza la pantalla Ahora con fixtures en cada estado del UI-SPEC (Normal, Cargando, Desactualizado, Fuente caída, Sin datos) y cada `data-sky`. En producción devuelve `notFound()`. Es el antecedente de `/dev/sky` (fase 3).
- **D-15:** Vitest para las funciones puras: `resolveSkyState`, el mapeo WMO → etiqueta/grupo, el rumbo del viento (8 sectores, "O"), el formateo de la frescura y la fecha local en el borde UTC. Los adapters se testean con fixtures JSON reales guardadas en el repo, sin red.

### Claude's Discretion
- Estructura de carpetas exacta (base: `.planning/research/ARCHITECTURE.md` "Recommended Project Structure").
- Si `/api/weather` se crea ya en la fase 1 o en la 6. Recomendación: crearlo ya, es barato y reusa `getWeatherSnapshot()`.
- Lint (ESLint del scaffolder) y gestor de paquetes.

### Deferred Ideas (OUT OF SCOPE)
- Decidir repo público o privado: antes de la fase 7.
- Dominio propio: sin fase asignada; si se quiere, como tarea rápida después del MVP.
- Persistir el último snapshot en Supabase: solo si D-03 muestra que la Data Cache no alcanza; si no, fase 7 o nunca.
</user_constraints>

> **How D-01 and D-03 resolve:** D-01 asked for the Data Cache to provide "último dato bueno" through throw-on-failure. Verified result: the Data Cache does provide it, **but only through `unstable_cache`**. Plain `fetch` + `next.revalidate` does not keep stale data during ISR regeneration (see Pattern 1 and Pitfall 2). That is exactly the fallback D-03 names, so the plan stays inside the user's decisions. The planner should implement `unstable_cache`, not plain fetch caching, and say so in the plan. Supabase is still deferred: the Data Cache persists across deploys, so it is sufficient for phase 1.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Data never older than 15 min vs latest run; visits don't hit external APIs | Pattern 1 (`unstable_cache` per source, TTL 900/2100 s) + Pattern 3 (ISR 600 s). Open-Meteo `current` has `interval: 900` (verified). Validation via identical `fetchedAt` across curls. |
| DATA-02 | "actualizado hace X min" | `fetchedAt` = ISO timestamp set inside the cached function (exact production time of the cached value). Pure `formatFreshness(ageMs)` plus a client 60 s ticker (Pattern 5). |
| DATA-03 | A failing source doesn't break the page; last good data or notice | `unstable_cache` returns stale on error (verified in source). `Promise.allSettled` aggregator. `deriveSourceStatus` (Pattern 2). `WEATHER_FAULT` injection (Pattern 6). |
| DATA-04 | Argentina time everywhere, no day cut by UTC | `lib/time` module: attach `utc_offset_seconds` to Open-Meteo naive times; `localDateKey` via `en-CA` + TZ; `hourCycle: 'h23'`; Vitest with `process.env.TZ='UTC'` (Pattern 4, verified outputs). |
| NOW-01 | Temp, feels-like, humidity, pressure, wind speed/gust/direction | Verified Open-Meteo `current` query and response (Code Examples). `pressure_msl` (1014.9) instead of `surface_pressure` (995). |
| NOW-02 | Weather state in Rioplatense Spanish | WMO table in UI-SPEC → `lib/weather/wmo.ts` (pure, tested). Night variant decided by solar phase. |
| OPS-01 | Push to `main` auto-deploys to Vercel (gru1) | `vercel.json` `regions: ["gru1"]`, Vercel Git integration checkpoint, `x-vercel-id`/`VERCEL_REGION` check (Pattern 7). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Free tier only: Vercel Hobby, GitHub Actions, Supabase free. Non-commercial use (Open-Meteo, Vercel Hobby).
- Stack: Next.js + TypeScript, Tailwind, Recharts, Route Handlers with `revalidate` as cache. **`cacheComponents` stays off.**
- **Never call the weather APIs from the client and never on each visit.** Everything goes through the server cache (MET Norway requires it).
- Mobile first (iPhone).
- Versions: Next 16.4.3, React 19.3.x, **TypeScript `^5` (5.9.3), not 7.x**, Tailwind 4.3.3 configured via CSS `@theme` (no `tailwind.config.js`), zod 4.6.7, suncalc 2.1.1 (no `@types/suncalc`), Vitest 5.0.5.
- Do not use: TS 7, `tailwind.config.js` / v3 tutorials, Edge runtime for push, client-side weather fetches, `next-pwa`, extra moon-phase libs, three.js/R3F for the sky.
- GSD workflow: file edits go through GSD commands (the executor runs inside `/gsd-execute-phase`).
- `next lint` no longer exists; the lint script is `"lint": "eslint"`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch Open-Meteo / MET Norway | API / Backend (Node runtime, `lib/sources`) | Database/Storage (Vercel Data Cache via `unstable_cache`) | MET requires a UA and caching; the client cannot set a UA; the cache must be shared across visitors. |
| Last-good-value retention | Database/Storage (Data Cache) | API (status derivation) | `unstable_cache` returns stale on error; the cache persists across deploys. |
| Normalization (DTO → `WeatherSnapshot`) | API / Backend (pure functions) | — | Anti-corruption layer; testable without network. |
| Page HTML "Ahora" | Frontend Server (RSC + ISR 600 s) | CDN (Vercel ISR cache) | Visits are served from the CDN/ISR cache, so functions only run on regeneration. |
| `/api/weather` JSON | API (Route Handler, ISR 600 s) | CDN | Same snapshot; used later by the SW (phase 6) and as a smoke-test endpoint now. |
| Live clock, "hace X min" ticker, sky recompute every 60 s | Browser / Client | — | Must advance without refetching; `fetchedAt` comes from the server. |
| Sun position (sky state) | Browser (recompute) | Frontend Server (initial render) | Server renders an approximate state at render time; the client corrects it on mount. |
| Region pinning / deploy | Vercel platform config (`vercel.json`) | Dashboard (user) | Declarative in the repo; Git integration is a human step. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.4.3 (published 2026-10-23) | App Router, ISR, Route Handlers, `unstable_cache`, `next/font` | Project decision [VERIFIED: npm registry] |
| react / react-dom | 19.3.x (scaffold pins 19.3.0; latest 19.3.1) | UI | Peer of Next 16 [VERIFIED: npm registry] |
| typescript | ^5 → 5.9.3 | Types | The scaffold pins `^5`; npm `latest` is 7.0.2 (do NOT use) [VERIFIED: npm registry dist-tags] |
| tailwindcss + @tailwindcss/turbopack | ^4 → 4.3.3 | Styles; the scaffold wires the Turbopack loader in `next.config.ts` `turbopack.rules` | Generated by `create-next-app@16.4.3` (verified scaffold output) [VERIFIED: scaffold] |
| zod | 4.6.7 | Validate upstream JSON at the server boundary | Project decision; `z.iso.datetime({ local: true })` accepts Open-Meteo's `"2026-10-23T12:00"` [CITED: zod docs via Context7] |
| suncalc | 2.1.1 | Sun altitude for `resolveSkyState` | ESM + CJS, own types; **degrees**, named exports only [VERIFIED: unpkg index.d.ts / index.js] |
| server-only | 0.0.1 | Compile-time guard so `lib/sources` never reaches the client bundle | Referenced by Next docs; `exports` has a `react-server` condition (empty) and a default that throws [VERIFIED: npm registry exports] |

### Supporting (dev)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 5.0.5 | Unit tests for pure functions and adapters with fixtures | Always. Requires Node `^22.12 \|\| ^24` (local Node is 24.18.0) [VERIFIED: npm registry engines] |
| vite | ^8 (peer of vitest, non-optional) | Vitest's engine | npm auto-installs non-optional peers; install explicitly to be safe [VERIFIED: npm peerDependenciesMeta] |
| @types/node | ^24 (scaffold writes ^20) | Node types | **Bump before installing vitest**: vitest's optional peer is `^22 \|\| >=24`, and `^20` can trigger ERESOLVE [ASSUMED: npm peer-resolution behavior] |
| eslint + eslint-config-next | ^9 / 16.4.3 | Lint (flat config generated) | Keep what the scaffold writes. CLAUDE.md mentions ESLint 10 but the scaffold pins `^9`; do not fight it [VERIFIED: scaffold output] |

**Not needed in phase 1:** `@vitejs/plugin-react` (no component tests), `vite-tsconfig-paths` (use `resolve.alias`), `date-fns`, `recharts`, `motion`, `serwist`, `web-push`, `@supabase/supabase-js`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unstable_cache` per source | plain `fetch` + `next.revalidate` (D-01 literal) | Loses last-good during ISR regeneration (foreground revalidation surfaces the 500). Rejected by the D-03 verification. |
| `unstable_cache` | `'use cache: remote'` + `cacheLife` | Requires `cacheComponents: true`, which is forbidden by the project decision. |
| ISR page (`revalidate = 600`) | `dynamic = 'force-dynamic'` + cached sources | Every visit invokes a function, and the first visitor after idle still gets a stale value (unstable_cache revalidates in the background in request context). ISR is cheaper with the same freshness profile. |
| `resolve.alias` for `@/` | `vite-tsconfig-paths` | One less dependency; Vitest docs show the alias approach [CITED: vitest v5 docs] |

**Installation (after scaffolding):**
```bash
npm install zod@4.6.7 suncalc@2.1.1 server-only
npm install -D @types/node@^24 vitest@5.0.5 vite
```

**Version verification (run 2026-10-23):** next 16.4.3, create-next-app 16.4.3, react 19.3.1, typescript@5 → 5.9.3 (latest tag 7.0.2), tailwindcss 4.3.3, @tailwindcss/turbopack 4.3.3, zod 4.6.7, suncalc 2.1.1, vitest 5.0.5, eslint-config-next 16.4.3.

## Package Legitimacy Audit

**slopcheck was NOT usable this session.** I invoked `slopcheck install <npm names>` from a directory without `package.json`. The tool auto-detected the **PyPI** ecosystem, and its `install` subcommand *installed* same-named PyPI packages (`next`, `react`, `typescript`, `tailwindcss`, `zod`, `vite`, `suncalc` plus 26 transitive deps) into the user's global Python 3.13 site-packages. This is the cross-ecosystem confusion hazard the protocol warns about. Cleanup (`pip uninstall`) was denied by the permission system, so it is reported to the user (see the final report). Per graceful degradation, every package below is **[ASSUMED]**. Registry metadata (npm) is provided as supporting evidence. **Never run `slopcheck install` for this project**: it installs what passes. If used later, pass `-e npm` and run it from the repo root after `package.json` exists.

| Package | Registry | Age | Downloads/wk | Source Repo | slopcheck | Disposition |
|---------|----------|-----|--------------|-------------|-----------|-------------|
| next | npm | since 2011 | 41.1M | github.com/vercel/next.js | not run | Approved [ASSUMED], postinstall: none |
| react / react-dom | npm | 2011 / 2014 | 116M / 109M | github.com/react/react | not run | Approved [ASSUMED], postinstall: none |
| typescript | npm | 2012 | 184M | github.com/microsoft/TypeScript | not run | Approved (^5 only) [ASSUMED] |
| tailwindcss | npm | 2017 | 84.7M | github.com/tailwindlabs/tailwindcss | not run | Approved [ASSUMED] |
| @tailwindcss/turbopack | npm | 2026-07-31 (~3 mo) | 783K | github.com/tailwindlabs/tailwindcss | not run | Approved: written by the official scaffolder [ASSUMED] |
| zod | npm | 2020 | 207M | github.com/colinhacks/zod | not run | Approved [ASSUMED] |
| suncalc | npm | 2011 | 270K | github.com/mourner/suncalc | not run | Approved [ASSUMED] |
| vitest / vite | npm | 2021 / 2020 | 77.5M / 119M | github.com/vitest-dev/vitest, vitejs/vite | not run | Approved [ASSUMED] |
| server-only | npm | 2022 | 11.3M | (none listed in npm metadata; React team package referenced by Next docs) | not run | Approved [ASSUMED] |
| eslint-config-next | npm | 2015 | 23.3M | github.com/vercel/next.js | not run | Approved [ASSUMED] |

**Packages removed due to slopcheck [SLOP] verdict:** none (tool not run on npm).
**Packages flagged as suspicious [SUS]:** none. All have no `postinstall`, long history and high downloads. Because slopcheck did not run, the planner may add one `checkpoint:human-verify` before the first `npm install`, or accept the npm-metadata evidence above (all packages are first-party scaffold output or named in CLAUDE.md).

## Architecture Patterns

### System Architecture Diagram

```
 iPhone / browser
   │  GET /                      GET /api/weather (smoke, phase 6 SW)
   ▼                                  ▼
 Vercel CDN ──ISR hit (≤600 s)──► cached HTML / JSON  (no function, no upstream)
   │ ISR stale → serve stale + background regeneration (prerender-legacy)
   ▼
 Function in gru1: app/page.tsx  |  app/api/weather/route.ts
   │  both call
   ▼
 getWeatherSnapshot()  [React cache(): one call per render]
   │  reads WEATHER_FAULT only if VERCEL_ENV !== 'production'
   │  Promise.allSettled
   ├──────────────────────────────┬──────────────────────────────┐
   ▼                              ▼                              │
 getOpenMeteoForecast()         getMetNorway()                   │
 unstable_cache(rev 900)        unstable_cache(rev 2100)         │
   │ fresh hit → {data,fetchedAt}                                │
   │ stale → refetch (foreground in ISR regen)                   │
   │   ├─ ok   → new {data, fetchedAt=now}                       │
   │   └─ fail → STALE {data, old fetchedAt} (error swallowed)   │
   │ miss + fail → throw                                         │
   ▼                              ▼                              │
 api.open-meteo.com              api.met.no (UA, altitude)       │
   │                              │                              │
   └──── zod parse → normalize (naive local time + offset) ─────┘
                     ▼
     WeatherSnapshot { now, hourly48, daily, sources[{id,status,fetchedAt}] }
                     ▼
 deriveSourceStatus(age vs TTL) → resolveSkyState(server now) → RSC HTML (data-sky, Ahora)
                     ▼
 Client: <Clock/> + <Freshness fetchedAt/> tick every 60 s; sky recompute every 60 s;
         if age > 15 min on mount/visibility → router.refresh() once
```

### Recommended Project Structure (no `src/`, alias `@/*` → `./*`, as the scaffold writes)
```
app/
├── layout.tsx              # fonts (Playfair, Jakarta), metadata, viewport, <html lang="es-AR" data-sky>
├── page.tsx                # export const revalidate = 600; renders <Ahora/>
├── loading.tsx             # "CARGANDO" variant (rarely visible: page is ISR)
├── error.tsx               # 'use client'; "Sin datos" + Reintentar via unstable_retry
├── globals.css             # @import "tailwindcss"; @theme tokens; [data-sky=...] blocks
├── api/weather/route.ts    # export const revalidate = 600; GET → Response.json(snapshot)
└── dev/estados/page.tsx    # fixtures in every state; notFound() when VERCEL_ENV==='production'
components/
├── Ahora.tsx               # server; props: snapshot-derived view model, headline?
├── SkyBackdrop.tsx         # CSS-gradient placeholder honoring the phase-3 contract
├── PampaHorizon.tsx        # static SVG silhouette
├── TabBar.tsx              # from lib/sections.ts
└── client/                 # 'use client': LiveClock, Freshness, SkySync, RetryButton
lib/
├── config.ts               # LAT/LON/ALT, TZ, TTL, USER_AGENT, URLs
├── time.ts                 # withOffset, localDateKey, formatHeaderDate, formatHHmm (pure)
├── sections.ts             # tab config
├── sources/
│   ├── openMeteoForecast.ts        # 'server-only'; unstable_cache wrapper + raw fetcher
│   ├── openMeteoForecast.schema.ts # zod schema (no server-only → testable)
│   ├── metNorway.ts / metNorway.schema.ts
│   ├── errors.ts                   # SourceError(code)
│   └── __fixtures__/*.json         # real responses captured with curl
├── weather/
│   ├── types.ts            # WeatherSnapshot contract
│   ├── normalize.ts        # DTO → snapshot parts (pure)
│   ├── status.ts           # deriveSourceStatus (pure)
│   ├── wmo.ts              # code → label/group (pure)
│   ├── wind.ts             # deg → N/NE/.../O, long name, calma (pure)
│   ├── format.ts           # temp (U+2212, −0→0), freshness label (pure)
│   └── snapshot.ts         # getWeatherSnapshot() + fault injection
└── sky/state.ts            # resolveSkyState (pure, suncalc)
vercel.json                 # { "regions": ["gru1"] }
vitest.config.ts
```

### Pattern 1: Cached source = `unstable_cache` around fetch + zod, returning `{ data, fetchedAt }`
**What:** Each source exports a cached getter. Internally it fetches with no Next fetch caching, validates, and stamps `fetchedAt`.
**Why (verified in next@16.4.3 source):**
- `unstable-cache.ts`: when the entry is stale, the callback is re-run. On rejection, `.catch(err => { console.error('revalidating cache with key: …', err); return cachedResponse })`. In ISR regeneration (`willConsumerServerCache` true for `prerender-legacy`), the page *awaits* this promise, so it receives the **stale value** on failure. In request context it returns stale immediately and revalidates in the background. On a **miss** the error propagates (→ "Sin datos").
- Inside `unstable_cache`, `patch-fetch.ts` forces `pageFetchCacheMode = 'force-no-store'` for nested fetches, so there is only one cache layer. A nested no-store fetch does **not** mark the page dynamic (no `revalidateStore` inside `unstable-cache`).
- The cache key is `cb.toString()` + `keyParts` + JSON(args). **Changing the function's source changes the key.** Put a schema version in `keyParts` and expect a cold cache on deploys that edit the adapter.
- The value is stored with `JSON.stringify`, so return plain JSON only (ISO strings, no `Date`).

**Example:**
```ts
// lib/sources/openMeteoForecast.ts
// Source of behavior: next@16.4.3 packages/next/src/server/web/spec-extension/unstable-cache.ts
import 'server-only'
import { unstable_cache } from 'next/cache'
import { OPEN_METEO_URL, TTL, USER_AGENT } from '@/lib/config'
import { ForecastDto } from './openMeteoForecast.schema'
import { SourceError } from './errors'

export type Cached<T> = { data: T; fetchedAt: string }

export async function fetchOpenMeteoForecastRaw(): Promise<Cached<ForecastDto>> {
  let res: Response
  try {
    res = await fetch(OPEN_METEO_URL, {
      cache: 'no-store', // explicit; forced anyway inside unstable_cache
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
  } catch {
    throw new SourceError('open-meteo', 'network')
  }
  if (!res.ok) throw new SourceError('open-meteo', `http_${res.status}`)
  const parsed = ForecastDto.safeParse(await res.json())
  if (!parsed.success) throw new SourceError('open-meteo', 'schema')
  console.info('[upstream] open-meteo forecast fetched') // count these in Vercel logs
  return { data: parsed.data, fetchedAt: new Date().toISOString() }
}

export const getOpenMeteoForecast = unstable_cache(
  fetchOpenMeteoForecastRaw,
  ['open-meteo-forecast', 'v1'],
  { revalidate: TTL.openMeteoForecast /* 900 */, tags: ['open-meteo'] },
)
```

### Pattern 2: Status derivation (D-02), pure and testable
With `unstable_cache`, a failed refresh is invisible except through **age**. In ISR regeneration a stale entry is refreshed in the foreground, so a successful render always has `age ≤ TTL`. `age > TTL + grace` therefore means the refresh failed.
```ts
// lib/weather/status.ts
export type SourceStatus = 'ok' | 'stale' | 'error'
export function deriveSourceStatus(fetchedAt: string | null, nowMs: number, ttlS: number, graceS = 120): SourceStatus {
  if (!fetchedAt) return 'error'
  const ageS = (nowMs - Date.parse(fetchedAt)) / 1000
  return ageS > ttlS + graceS ? 'stale' : 'ok'
}
```
UI mapping (UI-SPEC states):
| Primary source (Open-Meteo) | Client age | UI state |
|---|---|---|
| `ok` | ≤ 30 min | Normal |
| `ok` | > 30 min (stale ISR HTML served after idle) | Desactualizado ("Estos datos tienen más de media hora…") |
| `stale`, or `error` with data (fault injection) | any | Fuente caída con último dato bueno ("No pudimos actualizar… de las {HH:mm}") |
| `error`, no data | — | Sin datos |
| MET Norway not `ok` | — | nothing visible (only `sources[]`) |

Caveat: under `next dev` the page renders in request context (background revalidation), so `stale` can appear briefly after idle. Validate status behavior with `next build && next start` or on a preview deployment.

### Pattern 3: ISR page + route handler sharing one memoized snapshot
```ts
// lib/weather/snapshot.ts
import 'server-only'
import { cache } from 'react'
export const getWeatherSnapshot = cache(async (): Promise<WeatherSnapshot> => {
  const fault = process.env.VERCEL_ENV === 'production' ? undefined : process.env.WEATHER_FAULT
  const [om, met] = await Promise.allSettled([getOpenMeteoForecast(), getMetNorway()])
  return applyFault(buildSnapshot({ om, met }, Date.now()), fault)
})

// app/page.tsx
export const revalidate = 600 // must be a literal, statically analyzable
export default async function Page() { const snap = await getWeatherSnapshot(); /* … */ }

// app/api/weather/route.ts
export const revalidate = 600
export async function GET() { return Response.json(await getWeatherSnapshot()) }
```
- React `cache()` dedupes the layout + page calls inside one render. Otherwise two `unstable_cache` misses could fire two upstream requests.
- **Never throw from the page when the source fails.** At build time a throw fails the deploy. Render the degraded state instead. ISR will retry after 600 s.
- ISR is per deployment (each deploy prerenders `/` at build, which means one upstream call per deploy). The Data Cache persists across deploys, but **"Cache is not updated at build time"** on Vercel and the build region may differ from gru1. Expect the first runtime regeneration to refetch.

### Pattern 4: Time module (DATA-04)
- Open-Meteo with `timezone=America/Argentina/Buenos_Aires` returns **naive local** strings (`"2026-10-23T12:00"`) plus `utc_offset_seconds: -10800` (verified). **Never `new Date(naive)`**: Node parses it in the runtime TZ (UTC on Vercel, ART on the dev laptop), which is a bug that only shows up in production. Convert with `withOffset(naive, -10800)` → `"2026-10-23T12:00:00-03:00"`.
- `daily.time` is already the **local date key** (`"2026-10-23"`). Use it as-is and never parse it.
- "Today" = `new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(now)`. Verified: `02:59Z → 2026-10-23`, `03:00Z → 2026-10-24`.
- Header text: build it from `formatToParts` with `{ weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZone: TZ }`, then assemble `${weekday} ${day} de ${month}, ${hour}:${minute}` manually. Verified parts in Node 24 / ICU 78.3: weekday `viernes`, month `octubre` (already lowercase), hour `23`/`00`. Assembling from parts avoids ICU punctuation differences between Node and iOS Safari (`", "` literals) and keeps SSR and client output identical.
- Vercel's Node runtime ships full ICU (Node ≥13 default) [ASSUMED: Vercel uses standard Node builds]. A test with `TZ=UTC` covers the production condition.

### Pattern 5: Client-side freshness without hydration mismatch
- The server passes `fetchedAt` and `renderedAt` (ISO). Client components initialize their state from `renderedAt` (so SSR and the first client render match), then `useEffect` sets `Date.now()` immediately and every 60 s.
- On mount and on `visibilitychange → visible`: if `now - fetchedAt > 15 min`, call `router.refresh()` **once** (UI-SPEC). On mount, delay ~3 s so the ISR background regeneration triggered by this very request has time to finish [ASSUMED: typical regen < 3 s].
- Counter `aria-live="off"`; stale notice `role="status"` (UI-SPEC).

### Pattern 6: Fault injection (D-13), deterministic at aggregator level
`applyFault(snapshot, fault)`:
- `openmeteo-down` → keep the real cached data (if any) as last-good, set `status:'error'` → "Fuente caída con último dato bueno" (or "Sin datos" if there was none).
- `metno-down` → MET `status:'error'` → nothing visible (verifies "Fuente secundaria caída").
- `stale` → shift Open-Meteo `fetchedAt` back 45 min, status `ok` → client shows Desactualizado.
- `empty` → drop all data, status `error` → Sin datos.
- Gate: `process.env.VERCEL_ENV === 'production'` → ignore. `VERCEL_ENV` is **undefined locally** (`next dev`/`next start`), so injection works locally. On Vercel it is `production|preview` at build *and* runtime [CITED: vercel.com/docs/environment-variables/system-environment-variables].
- Env var changes on Vercel apply only to **new deployments** (redeploy the preview after setting `WEATHER_FAULT` for the Preview environment) [ASSUMED: standard Vercel behavior].
- Because the page is ISR, a fault set at runtime shows up only after the next regeneration. In local `next start`, delete `.next/cache` or wait out the revalidate window.

### Pattern 7: Region + Git deploy (OPS-01)
```json
// vercel.json
{ "$schema": "https://openapi.vercel.sh/vercel.json", "regions": ["gru1"] }
```
- Hobby allows a **single** function region. The default for new projects is `iad1`. The region can be set in `vercel.json` `regions` or in Settings → Functions → Function Regions [CITED: vercel.com/docs/functions/configuring-functions/region]. **The ISR cache lives in the project's default Function region** [CITED: vercel.com/docs/incremental-static-regeneration], so pinning gru1 also moves ISR storage.
- Precedence between `vercel.json` and the dashboard is not documented on that page [ASSUMED: vercel.json wins for deployments built from the repo]. Verify after deploy by exposing `region: process.env.VERCEL_REGION ?? 'local'` in `/api/weather` (runtime-only var), and in the deployment summary.
- Human checkpoint (D-11): (1) confirm `origin` = `github.com/tomasbasso/PaginaClima` is private and push `main` (the remote **already exists**; `main` on origin is at `e28d341`, local is ahead); (2) vercel.com/new → Import Git Repository → authorize the Vercel GitHub app for that repo → framework Next.js auto-detected → project name `clima-winifreda` → Deploy; (3) Settings → Git: Production Branch = `main`; (4) optionally add `WEATHER_FAULT` only to the **Preview** environment. The Vercel CLI 54.7.1 is installed locally (`vercel link` is optional), but `gh` is not.
- **Preview deployments are protected by Vercel Authentication (Standard Protection) by default.** `curl` against a preview URL returns an auth wall. Use the browser while logged in, `vercel curl` [ASSUMED: CLI subcommand per Vercel changelog "Use native curl syntax with Vercel CLI"], or Protection Bypass for Automation. Production domains are not protected under Standard Protection [CITED: vercel.com/docs/deployment-protection].

### Pattern 8: Scaffold into a non-empty repo
The repo already contains `.planning/`, `design/`, `CLAUDE.md`, `NUEVO-PROYECTO.md`, `.claude/`. `create-next-app` refuses non-empty directories with conflicting files [ASSUMED: CNA "directory contains files that could conflict" check]. Scaffold into a temp dir and copy:
```bash
npx create-next-app@16.4.3 <tmp>/clima --ts --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*" --use-npm --skip-install --disable-git --no-agent-feedback \
  --no-cache-components --no-react-compiler --yes
# copy app/, public/, eslint.config.mjs, next.config.ts, next-env.d.ts, package.json,
# tsconfig.json, AGENTS.md, .gitignore into the repo root (README optional), then npm install
```
Verified output with these flags: `next.config.ts` has **only** the `turbopack.rules` Tailwind loader (no `cacheComponents`), `package.json` scripts `dev/build/start/lint`, devDeps `@tailwindcss/turbopack ^4`, `@types/node ^20`, `eslint ^9`, `eslint-config-next 16.4.3`, `tailwindcss ^4`, `typescript ^5`. `AGENTS.md` is generated (and `next dev` re-adds its managed block; it never touches `CLAUDE.md`, as verified in `generate-agent-files.ts`). Then:
- Remove the scaffold demo (`app/page.tsx` content, `public/*.svg`, Geist fonts).
- `.gitignore`: append `.claude/settings.local.json`. Note that the scaffold's `.env*` rule also ignores `.env.example`; add `!.env.example` if one is committed.
- `package.json`: add `"engines": { "node": "24.x" }` [ASSUMED: Vercel honors `engines.node` major], `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`.

### Anti-Patterns to Avoid
- **Plain `fetch` + `next.revalidate` as the only last-good mechanism:** fails during ISR regeneration (Pitfall 2).
- **Throwing from `page.tsx` when the source fails:** breaks `next build` on Vercel if upstream is down at deploy time.
- **`new Date('2026-10-23T12:00')`:** runtime-TZ dependent.
- **`Intl` hour formatting without `hourCycle:'h23'`:** renders "p. m.".
- **Page calling its own `/api/weather` over HTTP:** an extra hop, and the URL doesn't exist at build (ARCHITECTURE Anti-Pattern 1).
- **Exposing raw upstream error text in the snapshot:** use coarse codes (`network`, `http_429`, `schema`).
- **`@/lib/sources/*` imported from a client component:** `server-only` makes this a build error, which is intended.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Last-good-value cache | module-level variable / custom KV | `unstable_cache` (Vercel Data Cache) | Serverless instances don't share memory; the Data Cache persists across deploys and has stale-on-error semantics. |
| Sun altitude | own solar formulas | `suncalc.getPosition` (degrees) / `getTimes(...).solarNoon` | Refraction and Meeus details are already handled. |
| Timezone math | `getTimezoneOffset`, fixed `-3` arithmetic scattered around | `Intl.DateTimeFormat` with `timeZone`, plus a single `withOffset` using the API's `utc_offset_seconds` | A DST return or runtime TZ differences would break everything. |
| JSON validation | manual `typeof` checks | zod 4 schemas | Loud failure at the boundary; inferred types. |
| Fonts | `<link>` to Google Fonts | `next/font/google` | Self-hosted, no CLS. |
| Error boundary retry | custom reload logic | `error.tsx` with `unstable_retry` (Next 16) | Re-fetches the segment [CITED: Next 16.2.9 docs via Context7] |

**Key insight:** every "clever" cache or time trick in this phase has a platform primitive whose edge cases (stale-on-error, ICU, DST) are already solved.

## Runtime State Inventory

Not a rename/refactor phase, so this is omitted, with one relevant external state item: the GitHub remote `origin` (`tomasbasso/PaginaClima`) already exists with `main` at `e28d341`. Vercel will import this repo. Visibility (private per D-09) is unverified and must be checked by the user in the human checkpoint.

## Common Pitfalls

### Pitfall 1: The scaffolder turns on Cache Components
**What goes wrong:** `create-next-app@16.4.3 … --yes` writes `cacheComponents: true` and `partialPrefetching: true`. With that config, `export const revalidate` is replaced by `'use cache'`/`cacheLife`, and the whole plan breaks.
**How to avoid:** pass `--no-cache-components` (verified to produce a clean config). Add a verification grep: `! grep -q cacheComponents next.config.ts`.

### Pitfall 2: Fetch Data Cache doesn't serve stale during ISR regeneration
**What goes wrong:** with `fetch(url,{next:{revalidate}})`, during ISR regeneration (`prerender-legacy`) a stale entry is refetched **in the foreground** (`patch-fetch.ts`: `if (willConsumerServerCache(workUnitStore) && entry.isStale) isForegroundRevalidate = true`). A 500 from upstream reaches the adapter, which throws, and the page loses the data.
**How to avoid:** use `unstable_cache` (Pattern 1). Background revalidation in plain request context *does* serve stale, which is why this bug hides in `next dev`.

### Pitfall 3: es-AR defaults to the 12-hour clock
**What goes wrong:** `{hour:'2-digit', minute:'2-digit'}` with `es-AR` → `"09:05 p. m."` (verified, Node 24).
**How to avoid:** always set `hourCycle:'h23'` (not `hour12:false`, which some engines map to h24 → "24:05") [ASSUMED: known V8/ICU quirk]. Test `00:05` local renders `"00:05"`.

### Pitfall 4: suncalc v2 is in degrees
**What goes wrong:** copying v1 examples (radians, `* 180/Math.PI`, south-based azimuth) yields altitudes ~57× too large. `import SunCalc from 'suncalc'` fails because there is no default export.
**How to avoid:** `import * as SunCalc from 'suncalc'` or named `import { getPosition, getTimes } from 'suncalc'`. Thresholds −6° / 6° compare directly against `.altitude`. For "before solar noon", use `getTimes(now, LAT, LON, 0, -180).solarNoon` (the 5th arg is the UTC offset in minutes, giving the civil day) [VERIFIED: index.d.ts].

### Pitfall 5: `server-only` throws in Vitest
**What goes wrong:** `server-only`'s default export throws outside the `react-server` condition. Vitest (node) imports the default.
**How to avoid:** keep pure logic and zod schemas in files **without** `import 'server-only'`, and test the raw fetchers by mocking `fetch`. If a test must import a `server-only` module, alias it in `vitest.config.ts`: `resolve: { alias: { 'server-only': fileURLToPath(new URL('./test/empty.ts', import.meta.url)) } }` and `vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn }))`.

### Pitfall 6: TZ in Vitest has to be set in the main process
**What goes wrong:** `test.env.TZ` or `process.env.TZ` in a setup file has no effect in thread pools [CITED: vitest v5 docs "Time Zone Does Not Change in Worker Threads"].
**How to avoid:** put `process.env.TZ = 'UTC'` at the top of `vitest.config.ts` (runs in the main process before workers start), and add a guard test: `expect(new Date(2026,0,1).getTimezoneOffset()).toBe(0)`.

### Pitfall 7: MET Norway `Expires` is slightly longer than 1800 s
**What goes wrong:** the real response at 15:04:59Z had `Expires: 15:35:14Z` (≈ 1815 s). `revalidate: 1800` can refetch ~15 s before `Expires`, which technically violates the ToS ("don't repeat requests until the time indicated in Expires").
**How to avoid:** `revalidate: 2100` (35 min). This satisfies D-05's "≥ 1800 s" and always lands after `Expires`. `If-Modified-Since` is *recommended, not mandatory* in the ToS [CITED: api.met.no/doc/TermsOfService]. It is not implementable with `unstable_cache` (the callback cannot read the previous entry), so document it as a deliberate omission. Other ToS rules: UA with app name + URL/contact, ≤ 4 decimals (we use 2), `altitude` recommended (use 169 m, the elevation Open-Meteo returns), CC BY 4.0, no "Yr".

### Pitfall 8: First visitor after idle sees old HTML
**What goes wrong:** ISR is stale-while-revalidate. After hours without visits, the first request gets the old page ("ACTUALIZADO HACE 3 H" + the Desactualizado notice) while regeneration runs.
**How to avoid:** the client mount check (Pattern 5) does a single delayed `router.refresh()`. Accept that DATA-01's "≤ 15 min" is measured against the *served-after-refresh* state. Document this in verification.

### Pitfall 9: Hydration mismatch from clocks
**What goes wrong:** client components computing `new Date()` during render differ from the SSR HTML.
**How to avoid:** initial state from server-provided `renderedAt`; update in `useEffect`. The same applies to `resolveSkyState` on the client.

### Pitfall 10: Cache key churn and eviction
**What goes wrong:** `unstable_cache` keys include the function source, so editing an adapter means a cold cache on the next deploy (no last-good for that first miss). The Hobby Data Cache is shared across all the team's projects and LRU-evicted.
**How to avoid:** accept it (D-03 allows "Sin datos" as the floor). Keep `keyParts` versioned. Don't store large payloads: the item limit is 2 MB, and the Open-Meteo response here is ~10 KB [CITED: vercel.com/docs/caching/runtime-cache/data-cache].

### Pitfall 11: Open-Meteo errors are HTTP 400 with JSON `{error:true, reason}`
Verified with an invalid variable. The adapter must check `res.ok` before parsing and must not surface `reason` to the client.

### Pitfall 12: Open-Meteo request weight and shared IP
26 variables × 14 days counts as several "calls" (> 10 variables are counted fractionally) [CITED: open-meteo.com/en/pricing via PITFALLS.md]. At one refresh per 900 s that is ~100 refreshes/day × ~3 = ~300 calls/day, far below the 10,000/day per-IP cap. Vercel's egress IPs are shared, though, so occasional 429s are possible. The `unstable_cache` stale-on-error behavior covers them.

### Pitfall 13: `@types/node ^20` vs Vitest 5 peer
The scaffold writes `@types/node: ^20`; vitest 5 declares an optional peer `@types/node ^22 || >=24`. Bump it to `^24` first to avoid ERESOLVE [ASSUMED].

### Pitfall 14: Attribution missing from the UI contract
Open-Meteo data is CC BY 4.0 and requires attribution [CITED: open-meteo.com/en/terms via PITFALLS.md]. UI-SPEC (locked) has no credit line. See Open Questions.

## Code Examples

### Open-Meteo request (verified 2026-10-23, HTTP 200)
```
https://api.open-meteo.com/v1/forecast?latitude=-36.23&longitude=-64.23
 &current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,
          wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,is_day,precipitation
 &hourly=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,
         wind_gusts_10m,wind_direction_10m,relative_humidity_2m,is_day
 &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,wind_gusts_10m_max
 &forecast_hours=48&forecast_days=14
 &timezone=America%2FArgentina%2FBuenos_Aires&wind_speed_unit=kmh
```
Verified response facts: `utc_offset_seconds: -10800`, `timezone_abbreviation: "GMT-3"`, snapped grid `-36.239017, -64.25226`, `elevation: 169`. `current.time: "2026-10-23T12:00"` with `interval: 900` (start of the current 15-min slot, local). `hourly.*` has length **48 starting at the current hour** (`forecast_hours` limits hourly only). `daily.*` has length **14** starting today, `sunrise: "2026-10-23T06:22"`. Units: `km/h`, `hPa`, `°C`, `%`, `°`. `pressure_msl 1014.9` vs `surface_pressure 995` → use MSL. No `Cache-Control`/`Last-Modified` headers from Open-Meteo, only `Date`. Hourly and daily phase-2 variables are included now per D-04; trim if desired.

```ts
// lib/sources/openMeteoForecast.schema.ts (no server-only → testable)
import { z } from 'zod'
const localDT = z.iso.datetime({ local: true })          // "2026-10-23T12:00"
const nums = z.array(z.number().nullable())
export const ForecastDto = z.object({
  utc_offset_seconds: z.number().int(),
  timezone: z.literal('America/Argentina/Buenos_Aires'),
  current: z.object({
    time: localDT, interval: z.number(),
    temperature_2m: z.number(), apparent_temperature: z.number(),
    relative_humidity_2m: z.number(), pressure_msl: z.number(),
    wind_speed_10m: z.number(), wind_gusts_10m: z.number(), wind_direction_10m: z.number(),
    weather_code: z.number().int(), is_day: z.union([z.literal(0), z.literal(1)]),
    precipitation: z.number(),
  }),
  hourly: z.object({ time: z.array(localDT), temperature_2m: nums, apparent_temperature: nums,
    precipitation: nums, weather_code: nums, wind_speed_10m: nums, wind_gusts_10m: nums,
    wind_direction_10m: nums, relative_humidity_2m: nums, is_day: nums }),
  daily: z.object({ time: z.array(z.iso.date()), weather_code: nums, temperature_2m_max: nums,
    temperature_2m_min: nums, precipitation_sum: nums, sunrise: z.array(localDT),
    sunset: z.array(localDT), wind_gusts_10m_max: nums }),
})
export type ForecastDto = z.infer<typeof ForecastDto>
```
(Verify that `z.iso.date()` exists in zod 4.6 when writing; otherwise use `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` [ASSUMED].)

### MET Norway compact (verified 2026-10-23, HTTP 200)
```
GET https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-36.23&lon=-64.23&altitude=169
User-Agent: ClimaWinifreda/1.0 github.com/tomasbasso/PaginaClima
```
Response headers: `Expires` (~30 min 15 s ahead), `Last-Modified`, `Content-Length: 40383`. Body: GeoJSON `Feature`, `properties.meta.updated_at`, `properties.timeseries[91]` with `time` in **UTC `Z`**, `data.instant.details` {air_pressure_at_sea_level, air_temperature, cloud_area_fraction, relative_humidity, wind_from_direction, wind_speed (**m/s**)}, optional `next_1_hours/next_6_hours/next_12_hours.summary.symbol_code` (absent in later steps). Minimal schema:
```ts
export const MetDto = z.object({
  type: z.literal('Feature'),
  properties: z.object({
    meta: z.object({ updated_at: z.string() }),
    timeseries: z.array(z.object({
      time: z.string(),
      data: z.object({ instant: z.object({ details: z.object({ air_temperature: z.number() }).passthrough() }) }).passthrough(),
    })).min(1),
  }),
})
```
(`.passthrough()` is deprecated in zod 4 in favor of `z.looseObject`; either works. The default strip behavior is fine here [CITED: zod docs].) Store only a tiny normalized summary (e.g. `updatedAt`, first temperature) in the cache value, not the 40 KB body.

### Wind sector (UI-SPEC table, "O" not "W")
```ts
const SHORT = ['N','NE','E','SE','S','SO','O','NO'] as const
const LONG  = ['norte','noreste','este','sudeste','sur','sudoeste','oeste','noroeste'] as const
export function windSector(deg: number) {
  const i = Math.floor((((deg % 360) + 360) % 360 + 22.5) / 45) % 8
  return { short: SHORT[i], long: LONG[i] }
}
// tests: 0→N, 22.4→N, 22.5→NE, 337.4→NO, 337.5→N, 360→N, 177→S (live value today)
```

### Vitest config
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
process.env.TZ = 'UTC' // main process, before workers → reproduces Vercel
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { environment: 'node', include: ['**/*.test.ts'], exclude: ['node_modules', '.next'] },
})
```

### Header date assembly (verified parts)
```ts
const TZ = 'America/Argentina/Buenos_Aires'
const fmt = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric',
  month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
export function formatHeaderDate(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]))
  return `${p.weekday} ${p.day} de ${p.month}, ${p.hour}:${p.minute}`
}
// 2026-10-24T02:59Z → "viernes 23 de octubre, 23:59"; 03:00Z → "sábado 24 de octubre, 00:00"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fetch` cached by default (Next 13/14) | Not cached unless `next.revalidate`/`force-cache` | Next 15 | Must opt in explicitly. |
| `unstable_cache` / `revalidate` model | `'use cache'` + `cacheLife` with `cacheComponents` | Next 16 (docs say "replaced") | `unstable_cache` is still shipped and documented under "Caching without Cache Components". We use it on purpose; revisit if Next removes it. |
| CNA default: no Cache Components | CNA 16.4.3 default writes `cacheComponents: true` | 16.4.x | `--no-cache-components` is required. |
| `error.tsx` `reset()` | `unstable_retry()` (re-fetches the segment) | Next 16.x | Use it for "Reintentar" in `error.tsx`. |
| suncalc 1.x (radians, CJS, `@types/suncalc`) | suncalc 2.x (degrees, ESM, bundled types) | 2026 | Don't install `@types/suncalc`. |
| Vercel "Data Cache" naming | "Runtime Cache" (for `use cache: remote`) vs "Data Cache" (fetch/`unstable_cache`, Beta) | 2025–2026 | Our layer is the Data Cache. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All npm packages legitimate (slopcheck did not run on npm) | Package Audit | Low: all are scaffold/first-party with years of history and no postinstall. |
| A2 | `@types/node ^20` triggers ERESOLVE with vitest 5 | Stack / Pitfall 13 | Low: the bump is harmless either way. |
| A3 | Vercel Node runtime has full ICU | Pattern 4 | Medium: wrong month/weekday names; mitigated by the TZ=UTC test plus a post-deploy smoke check of the header text. |
| A4 | `vercel.json` `regions` takes effect over the dashboard default | Pattern 7 | Low: verify via `VERCEL_REGION` in `/api/weather`; fall back to the dashboard setting. |
| A5 | Env var changes need a redeploy on Vercel | Pattern 6 | Low: affects only fault-injection testing. |
| A6 | ISR regeneration finishes within ~3 s (delayed `router.refresh`) | Pattern 5 | Low: worst case the user sees one more stale render, then the next refresh. |
| A7 | `create-next-app` refuses non-empty dirs with these files | Pattern 8 | Low: temp-dir scaffolding works either way. |
| A8 | `hour12:false` → h24 quirk | Pitfall 3 | None: we use `hourCycle:'h23'`. |
| A9 | `vercel curl` subcommand exists for protected previews | Pattern 7 | Low: the browser while logged in works. |
| A10 | Vercel honors `engines.node: "24.x"` | Pattern 8 | Low: the dashboard Node version setting is the alternative. |
| A11 | `z.iso.date()` exists in zod 4.6.7 | Code Examples | Low: a regex fallback is given. |
| A12 | ISR regeneration on Vercel runs the page as `prerender-legacy` (as `next start` does) | Pattern 1/2 | Medium: if it ran in request context, stale is still returned (background path), only the status-by-age semantics shift. Last-good holds either way. |

## Open Questions

1. **Attribution line (Open-Meteo CC BY 4.0) is absent from the locked UI-SPEC.**
   - Known: the license requires attribution. MET is not displayed in phase 1, so it needs none yet.
   - Recommendation: the planner adds a minimal credit (e.g. Label 12/600 ink/55-on-large or ink/75 "DATOS: OPEN-METEO.COM" link) next to "ESTIMADO POR MODELO", flagged for user confirmation since the UI-SPEC is locked.
2. **"NOCHE DESPEJADA": solar phase `noche` (alt < −6°) or Open-Meteo `is_day=0`?** They differ during civil twilight. Recommendation: use the same solar phase as `resolveSkyState` for visual coherence.
3. **Repo visibility.** `origin` exists. Is it private per D-09? The user confirms in the deploy checkpoint.
4. **`data-sky` on `<html>`** requires the root layout to read the snapshot. Recommendation: the layout calls the memoized `getWeatherSnapshot()` (cheap) and computes `data-sky`. CSS uses `[data-sky="…"]` attribute selectors (not `html[data-sky]`) so `/dev/estados` can override per wrapper element.
5. **D-07 literal "MET 1800 s" vs the measured Expires (~1815 s).** Recommendation: 2100 s, which is within D-05's "≥ 1800".

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build, Vitest 5 (`^22.12 \|\| ^24`) | ✓ | 24.18.0 | — |
| npm | install | ✓ | 11.16.0 | pnpm 12.15.0 also present |
| git | push to `main` | ✓ | 2.45.2 | — |
| GitHub remote | OPS-01 | ✓ | `origin` = github.com/tomasbasso/PaginaClima (`main` at e28d341) | — |
| Vercel CLI | optional link / `vercel curl` | ✓ | 54.7.1 | Dashboard |
| gh CLI | — | ✗ | — | Not needed (remote exists) |
| Open-Meteo API | DATA/NOW | ✓ | HTTP 200 today | — |
| MET Norway API | D-05 | ✓ | HTTP 200 today with UA | — |
| Vercel account + GitHub app authorization | OPS-01 | unknown | — | **Human checkpoint** (blocking for OPS-01 only) |

**Missing with no fallback:** none for code. The Vercel Git link is a human step.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (node environment), TZ forced to UTC in `vitest.config.ts` |
| Config file | `vitest.config.ts` (Wave 0, does not exist yet) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run && npx tsc --noEmit && npm run lint && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Adapter parses the real fixture; URL has `timezone`, `forecast_hours=48`, `forecast_days=14`, km/h | unit | `npx vitest run lib/sources/openMeteoForecast.test.ts` | ❌ Wave 0 |
| DATA-01 | Cached getters use TTL 900 / 2100; page & route export `revalidate = 600` | static check | `grep -q "revalidate = 600" app/page.tsx app/api/weather/route.ts && ! grep -q cacheComponents next.config.ts` | ❌ |
| DATA-01 | Repeated requests don't refetch upstream | smoke (prod) | `curl -s https://<prod>/api/weather \| jq -r '.sources[0].fetchedAt'` twice within 5 min → identical; Vercel logs show ≤ 1 `[upstream] open-meteo` per 15 min | manual-assisted |
| DATA-01 | Build output marks `/` and `/api/weather` as ISR (revalidate 10m) | build | `npm run build` (inspect route table) | ❌ |
| DATA-02 | Freshness labels: <1 min "RECIÉN", 1, n (2–59), n H, ≥24 h "EL dd/MM A LAS HH:mm" | unit | `npx vitest run lib/weather/format.test.ts` | ❌ |
| DATA-03 | `deriveSourceStatus` ok/stale/error boundaries (TTL+grace) | unit | `npx vitest run lib/weather/status.test.ts` | ❌ |
| DATA-03 | Aggregator: OM rejected → status error, no throw; MET rejected → only MET error; faults applied only when `VERCEL_ENV !== 'production'` | unit (mocked getters) | `npx vitest run lib/weather/snapshot.test.ts` | ❌ |
| DATA-03 | Adapter throws `SourceError` on 500, network error and schema-broken fixture | unit (mocked fetch) | `npx vitest run lib/sources` | ❌ |
| DATA-03 | `/dev/estados` renders all 5 states; returns 404 in production | manual + smoke | browser on preview; `curl -o /dev/null -w '%{http_code}' https://<prod>/dev/estados` → 404 | manual |
| DATA-04 | `localDateKey` 02:59Z → 23, 03:00Z → 24; header string for 21:00–23:59 local keeps day; `00:05` renders "00:05" (h23); `withOffset` attaches −03:00 | unit (TZ=UTC) | `npx vitest run lib/time.test.ts` | ❌ |
| DATA-04 | Guard: test process runs in UTC | unit | same file: `getTimezoneOffset() === 0` | ❌ |
| NOW-01 | Normalizer maps current → tempC, feelsC, humidity, pressureHpa (MSL), windKmh, gustKmh, windDirDeg; temp formatting `−`, −0→0; calm < 2 km/h | unit | `npx vitest run lib/weather/normalize.test.ts lib/weather/wind.test.ts` | ❌ |
| NOW-02 | WMO table per UI-SPEC, unknown code → null label, night 0–1 → "NOCHE DESPEJADA" | unit | `npx vitest run lib/weather/wmo.test.ts` | ❌ |
| NOW-02 | `resolveSkyState` at fixed instants (e.g. 2026-10-23T15:00Z día, 22:45Z atardecer, 03:00Z noche) + weather overrides | unit | `npx vitest run lib/sky/state.test.ts` | ❌ |
| OPS-01 | Push to `main` → production deployment; region gru1 | smoke | `curl -sI https://<prod>/` → 200; `curl -s https://<prod>/api/weather \| jq -r .region` → `gru1` | manual-assisted (needs the Vercel link) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit && npm run lint`
- **Phase gate:** full suite + `npm run build` green, plus production smoke curls (fetchedAt stability, region, 404 on `/dev/estados`) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `vitest.config.ts` (TZ=UTC, `@` alias) + `"test": "vitest run"` script
- [ ] `lib/sources/__fixtures__/open-meteo-forecast.json`: capture with the exact query above (`curl -s '<url>' > …`)
- [ ] `lib/sources/__fixtures__/open-meteo-forecast.broken.json`: e.g. `current.temperature_2m` removed
- [ ] `lib/sources/__fixtures__/met-norway-compact.json`: capture with the UA (trim `timeseries` to ~3 items to keep the repo small)
- [ ] `test/empty.ts` (stub for the `server-only` alias, only if needed)
- [ ] Framework install: `npm install -D @types/node@^24 vitest@5.0.5 vite`

## Security Domain

ASVS Level 1 (config `security_asvs_level: 1`, block on high).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in phase 1 |
| V3 Session Management | no | — |
| V4 Access Control | yes (minor) | `/dev/estados` → `notFound()` when `VERCEL_ENV==='production'`; `WEATHER_FAULT` ignored in production |
| V5 Input Validation | yes | zod 4 on every upstream response; no user input (no query params read by `/api/weather`) |
| V6 Cryptography | no | — |
| V7 Error Handling & Logging | yes | Coarse error codes in `sources[].errorCode`; never forward upstream `reason`/stack to the client; server `console.error` only |
| V10 Malicious Code / V14 Config | yes | `server-only` on adapters; no secrets in phase 1; UA has no email (D-12); `.gitignore` covers `.env*`, `.vercel`, `.claude/settings.local.json`; lockfile committed |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Upstream cost amplification (each visit hits APIs → ban/429) | DoS | ISR + `unstable_cache`; no client fetches; `/api/weather` takes no params, so there is one cache key |
| Fault-injection switch reachable in prod | Tampering | Gate on `VERCEL_ENV==='production'` (set at build and runtime by Vercel) |
| Debug page exposure | Info disclosure | `notFound()` in production; no secrets rendered |
| Upstream schema poisoning (bad 200 JSON cached) | Tampering | zod throws inside the cached fn, so the bad payload is never cached and the stale value is kept |
| Leaking server modules to the client bundle | Info disclosure | `import 'server-only'` in `lib/sources/*` and `lib/weather/snapshot.ts` |
| Supply chain | Tampering | Pinned versions, committed `package-lock.json`, no postinstall scripts (verified) |

## Sources

### Primary (HIGH confidence)
- next.js **v16.4.3 source** (raw.githubusercontent.com/vercel/next.js/v16.4.3): `packages/next/src/server/lib/patch-fetch.ts` (only `res.status === 200` cached; stale handling; `willConsumerServerCache` → foreground revalidate; no-store inside unstable-cache), `server/web/spec-extension/unstable-cache.ts` (stale returned on revalidation error; key = `cb.toString()` + keyParts + args; JSON serialization), `server/app-render/work-unit-async-storage.external.ts` (`prerender-legacy` → true), `server/app-render/app-render.tsx` (`prerender-legacy` when not cacheComponents), `server/lib/generate-agent-files.ts` (AGENTS.md only).
- Context7 `/vercel/next.js/v16.2.9`: ISR error handling ("last successfully generated data… will continue to be served"), `unstable_cache` reference (replaced by `use cache` in 16, still documented), `error.tsx` `unstable_retry`.
- Context7 `/vitest-dev/vitest/v5.0.3`: TZ in worker threads, alias config. Context7 `/colinhacks/zod`: `z.iso.datetime({ local: true })`, strip default.
- vercel.com/docs/caching/runtime-cache/data-cache (2026-08-21): persistent across deployments, regional, env-isolated, Hobby shared cache, LRU, 2 MB items, not updated at build time.
- vercel.com/docs/incremental-static-regeneration (2026-08-28): failure → serve stale + retry 30 s; ISR cache per deployment; ISR cache in the default Function region.
- vercel.com/docs/functions/configuring-functions/region (2026-08-11): Hobby single region, `vercel.json` `regions`, default `iad1`.
- vercel.com/docs/environment-variables/system-environment-variables: `VERCEL_ENV` build+runtime, `VERCEL_REGION` runtime.
- vercel.com/docs/deployment-protection (2026-09-15): Standard Protection protects everything except production domains.
- api.met.no/doc/TermsOfService: UA, Expires, If-Modified-Since recommended, ≤ 4 decimals, 203/403/429, CC BY 4.0, no "Yr".
- Live requests 2026-10-23 ~15:05Z: Open-Meteo forecast (200, shape above; 400 error shape), MET Norway compact (200, Expires +30m15s).
- Local scaffold of `create-next-app@16.4.3` (default vs `--no-cache-components`), Node 24.18 / ICU 78.3 Intl tests, npm registry (versions, engines, peers, exports, postinstall, downloads), unpkg `suncalc@2.1.1` `index.d.ts`/`index.js`/README.

### Secondary (MEDIUM confidence)
- open-meteo.com/en/docs (current = 15-minutely model data, interpolated hourly outside EU/NA; `forecast_hours`; error format).
- Project research files (ARCHITECTURE.md, PITFALLS.md, STACK.md) for Open-Meteo pricing/terms and MET data-model notes.

### Tertiary (LOW confidence)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Registry-verified, scaffold-verified.
- Architecture (caching semantics): HIGH from source reading. MEDIUM on Vercel-specific runtime context (A12), confirmable on the first preview deploy.
- Time handling: HIGH. Executed in Node 24 under both local TZ and `TZ=UTC`.
- Pitfalls: HIGH for 1–7 and 11 (verified). MEDIUM for 8, 10, 12, 13.
- Deploy steps: MEDIUM (dashboard flows; human checkpoint).

**Research date:** 2026-10-23
**Valid until:** 2026-11-06 (14 days; Next 16.4.3 was published today and the scaffolder defaults are moving)
