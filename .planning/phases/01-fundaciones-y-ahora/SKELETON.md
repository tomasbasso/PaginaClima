# Walking Skeleton — Clima Winifreda

**Phase:** 1
**Generated:** 2026-10-23

## Capability Proven End-to-End

Un visitante abre la URL pública de Vercel (región gru1) y ve la temperatura actual de Winifreda, que viene de Open-Meteo a través de la caché del servidor (`unstable_cache` + ISR) y se muestra en hora argentina. Cada push a `main` publica una versión nueva.

> No hay base de datos en la fase 1. La lectura real es Open-Meteo a través de la Vercel Data Cache. La escritura real es el valor `{ data, fetchedAt }` que `unstable_cache` guarda y que persiste entre deploys. Supabase entra recién en la fase 7.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.4.3 App Router, React 19.3, TypeScript ^5 (5.9.3), scaffold con `create-next-app@16.4.3 --no-cache-components` | Es lo que domina el dueño. Con `--no-cache-components` se mantiene el modelo clásico `export const revalidate` (CLAUDE.md, RESEARCH Pitfall 1). TS 7 está prohibido. |
| Estilos | Tailwind 4.3.3 con `@tailwindcss/turbopack` (lo escribe el scaffolder). Tokens en `@theme` dentro de `app/globals.css`, sin `tailwind.config.js` | Contrato del UI-SPEC. v4 se configura desde el CSS. |
| Data layer | Un adapter por fuente en `lib/sources/*` (`import 'server-only'`): `unstable_cache(fetchRaw, ['<source>','v1'], { revalidate })`, que devuelve `{ data, fetchedAt }` y lanza `SourceError` ante non-2xx, timeout o fallo de zod | D-01/D-03 resuelto en RESEARCH: `unstable_cache` devuelve el valor viejo cuando la revalidación falla, incluso en la regeneración ISR. El `fetch` común con `next.revalidate` no lo hace. |
| Contrato de datos | `WeatherSnapshot` (`lib/weather/types.ts`) con `now`, `hourly48`, `daily` (14 d) y `sources[{id,status,fetchedAt,errorCode?}]`, armado por `getWeatherSnapshot()` (React `cache()`) en `lib/weather/snapshot.ts` | Es el único punto de entrada para la página, `/api/weather`, el SW (fase 6) y el cron (fase 7). Las horas son ISO con `-03:00`. `daily[].date` es la clave local `YYYY-MM-DD`. |
| Caché / TTL | Open-Meteo 900 s, MET Norway 2100 s, página y `/api/weather` ISR `revalidate = 600` | D-07. La de MET subió de 1800 a 2100 s porque su `Expires` es de unos 1815 s (RESEARCH Pitfall 7), y sigue cumpliendo el "≥ 1800" de D-05. |
| Hora | `lib/time.ts`: `withOffset(naive, utc_offset_seconds)`, `localDateKey` (`en-CA` + TZ), `Intl.DateTimeFormat('es-AR', { hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' })`. Nunca `new Date(naive)` | D-08 / DATA-04. Vitest corre con `TZ=UTC` para reproducir Vercel. |
| Auth | Ninguna | Uso personal y sin usuarios. `/dev/*` devuelve `notFound()` en producción y `WEATHER_FAULT` se ignora en producción. |
| Deployment target | Vercel Hobby, integración Git (push a `main` → producción), `vercel.json` `{ "regions": ["gru1"] }`, URL `*.vercel.app` (`clima-winifreda`) | D-09/D-10/D-11. El repo es privado. |
| Tests | Vitest 5.0.5 (entorno node, `process.env.TZ='UTC'` en `vitest.config.ts`, alias `@`, `server-only` aliasado a `test/empty.ts`). Smoke con `scripts/smoke.mjs` contra local o producción | D-15. Las funciones puras y los adapters se prueban con fixtures reales y sin red. |
| Directory layout | Sin `src/`, alias `@/*` → `./*`. `app/` (rutas), `components/` (server), `components/client/` (`'use client'`), `lib/sources/` (adapters con server-only, schemas zod aparte), `lib/weather/` (lógica pura + aggregator), `lib/sky/` (fase solar y estado del cielo), `scripts/`, `test/` | RESEARCH, Recommended Project Structure. Los schemas puros van sin `server-only` para que se puedan testear. |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner): plan 01
- [x] Routing: `/` (ISR), `/api/weather` (ISR JSON) en el plan 01, y `/dev/estados` en el plan 07
- [x] Data: lectura real de Open-Meteo (plan 01) y MET Norway (plan 05), y escritura real en la Data Cache vía `unstable_cache` (plan 01). No hay DB, a propósito.
- [x] UI: pantalla Ahora (plan 03), cielo y barra (plan 04), frescura con ticker cliente y `router.refresh()` (plan 05), botón Reintentar (plan 06)
- [x] Deployment: Vercel gru1 por integración Git (plan 02), confirmado otra vez con push + smoke en el plan 07

## Out of Scope (Deferred to Later Slices)

- Titular editorial (NOW-03), meteograma 48 h y diario: fase 2. El snapshot ya trae `hourly48` y `daily` (D-04).
- Cielo WebGL generativo: fase 3. `<SkyBackdrop state>` y los tokens `[data-sky]` son el contrato y el fallback.
- Multi-modelo, ensemble y probabilidad: fase 4 (D-06). MET Norway se cachea pero no se muestra (D-05).
- Lluvia acumulada (Archive), satélite y astros: fase 5 (D-06).
- Service worker / offline / manifest: fase 6.
- Supabase, Web Push y cron: fase 7. Repo público o privado: antes de la fase 7.
- Dominio propio: sin fase.

## Subsequent Slice Plan

- Phase 2: el usuario lee el meteograma de 48 h, el pronóstico diario y el titular editorial (consume `snapshot.hourly48` / `daily`, pasa `headline` a `Ahora`, habilita `/pronostico` en `lib/sections.ts`).
- Phase 3: el usuario ve el cielo generativo en WebGL (reemplaza el render de `<SkyBackdrop>` y conserva los tokens `[data-sky]` como fallback).
- Phase 4: el usuario compara modelos y ve la probabilidad real (adapters nuevos en `lib/sources/`, mismo patrón `unstable_cache`).
- Phase 5: el usuario ve lluvia acumulada, satélite y sol/luna.
- Phase 6: el usuario instala la PWA y la abre sin señal (el SW consume `/api/weather`).
- Phase 7: el usuario recibe alertas push (el cron consume `getWeatherSnapshot()`).
