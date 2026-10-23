# Phase 1: Fundaciones y Ahora - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning

<domain>
## Phase Boundary

El usuario abre la URL pública en Vercel (región gru1) y ve el tiempo actual de Winifreda —temperatura, sensación, humedad, presión, viento con ráfaga y dirección, y el estado en rioplatense— servido desde la caché del servidor, en hora argentina y con "actualizado hace X min". Si la fuente falla, la página no se rompe. Cada push a `main` se publica solo.

Requisitos: DATA-01, DATA-02, DATA-03, DATA-04, NOW-01, NOW-02, OPS-01.
Fuera de la fase: titular editorial (fase 2), meteograma y diario (fase 2), cielo WebGL (fase 3), modelos/ensemble (fase 4), lluvia acumulada/satélite/astros (fase 5), service worker/offline (fase 6), Supabase y push (fase 7).

</domain>

<decisions>
## Implementation Decisions

> El usuario no eligió áreas para discutir ("sin preferencia"). Todas las decisiones de abajo son defaults recomendados por Claude; el usuario puede corregirlas antes de `/gsd-plan-phase 1`. Todo lo visual ya está bloqueado en `01-UI-SPEC.md` y no se repite acá.

### Último dato bueno (DATA-03)
- **D-01:** En la fase 1 el "último dato bueno" sale de la **Data Cache de Vercel**: el adapter hace `fetch(..., { next: { revalidate } })` y **lanza** ante respuesta no-2xx o fallo de Zod, de modo que la revalidación falla y Next sigue sirviendo la entrada vieja. No se agrega Supabase en esta fase (entra en la fase 7).
- **D-02:** El snapshot lleva `sources[].status` (`ok` | `stale` | `error`) y `fetchedAt` por fuente. La UI decide entre los estados Normal / Desactualizado / Fuente caída / Sin datos del UI-SPEC con esos dos campos.
- **D-03:** El researcher tiene que **verificar** que la Data Cache persiste entre deploys y que una revalidación fallida conserva la entrada vieja en Next 16.4 (sin `cacheComponents`). Si no se cumple, el fallback es un `unstable_cache`/memo del último snapshot válido; si tampoco alcanza, se cae al estado "Sin datos" del UI-SPEC (aceptable para la fase 1).

### Fuentes en la fase 1
- **D-04:** Una sola llamada a Open-Meteo Forecast (modelo por defecto / best match, `timezone=America/Argentina/Buenos_Aires`) con `current` + `hourly` (48 h) + `daily` (14 d). Cuesta lo mismo que pedir solo `current` y deja el snapshot listo para la fase 2. La pantalla de la fase 1 solo usa `current`.
- **D-05:** El adapter de **MET Norway** se construye en esta fase (User-Agent identificatorio, `revalidate` ≥ 1800 s, respeto de `Expires`) para cumplir el criterio 2 del roadmap y validar la caché, pero **no se muestra**: solo aparece en `sources[]` (estado "Fuente secundaria caída" del UI-SPEC).
- **D-06:** Ensemble y Archive **no** se implementan en la fase 1 (fases 4 y 5).
- **D-07:** TTLs: Open-Meteo forecast 900 s, MET Norway 1800 s, página ISR 600 s (`.planning/research/ARCHITECTURE.md` Pattern 1). Así se cumple "≤ 15 min respecto de la última corrida" y se mitiga el rate limit por IP compartida de Vercel.
- **D-08:** Fechas y horas siempre en `America/Argentina/Buenos_Aires` vía `Intl.DateTimeFormat('es-AR', …)`. El "hoy" se calcula en hora local y no en UTC. Lleva un test de Vitest para el borde 21–24 h local (00–03Z).

### Repo y deploy (OPS-01)
- **D-09:** El repo de GitHub arranca **privado**. Pasarlo a público (portfolio) es una decisión abierta para antes de la fase 7, por el apagado de `schedule` en Actions (ver STATE.md, Blockers).
- **D-10:** La URL es `*.vercel.app` (nombre sugerido: `clima-winifreda`). En la fase 1 no hay dominio propio.
- **D-11:** El deploy es con la integración Git de Vercel (push a `main` → producción, ramas → preview), con la región de funciones en `gru1` declarada en la config del proyecto. Crear el repo remoto, autorizar la app de Vercel en GitHub y vincular el proyecto son pasos que **hace el usuario** (o que se confirman con él antes de ejecutarlos). El plan los incluye como checkpoint humano.
- **D-12:** El User-Agent de MET Norway (`ClimaWinifreda/1.0 <url del repo o contacto>`) va en una env var o constante en `lib/config.ts`. No se commitea ningún email.

### Probar fallas y frescura
- **D-13:** Hay inyección de fallas con la env var `WEATHER_FAULT` (`openmeteo-down` | `metno-down` | `stale` | `empty`), que el aggregator solo lee si `VERCEL_ENV !== 'production'`. Sirve en local y en los previews de Vercel; en producción se ignora.
- **D-14:** Hay una página `/dev/estados` que renderiza la pantalla Ahora con fixtures en cada estado del UI-SPEC (Normal, Cargando, Desactualizado, Fuente caída, Sin datos) y cada `data-sky`. En producción devuelve `notFound()`. Es el antecedente de `/dev/sky` (fase 3).
- **D-15:** Vitest para las funciones puras: `resolveSkyState`, el mapeo WMO → etiqueta/grupo, el rumbo del viento (8 sectores, "O"), el formateo de la frescura y la fecha local en el borde UTC. Los adapters se testean con fixtures JSON reales guardadas en el repo, sin red.

### Claude's Discretion
- Estructura de carpetas exacta (base: `.planning/research/ARCHITECTURE.md` "Recommended Project Structure").
- Si `/api/weather` se crea ya en la fase 1 o en la 6. Recomendación: crearlo ya, es barato y reusa `getWeatherSnapshot()`.
- Lint (ESLint del scaffolder) y gestor de paquetes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contrato visual (bloqueado)
- `.planning/phases/01-fundaciones-y-ahora/01-UI-SPEC.md` — layout, tokens, tipografía, estados de datos, copy, tabla WMO → etiqueta → grupo, rumbos del viento, `resolveSkyState`, contrato `<SkyBackdrop>` con la fase 3
- `design/stitch/DESIGN.md` — sistema "Pampa Cielo Editorial" (el UI-SPEC manda cuando difieren)
- `design/stitch/home-tarde-v2.png`, `design/stitch/home-atardecer.png`, `design/stitch/home-tormenta.png` — capturas aprobadas

### Alcance y requisitos
- `.planning/ROADMAP.md` §Phase 1 — objetivo y 5 criterios de éxito
- `.planning/REQUIREMENTS.md` — DATA-01..04, NOW-01, NOW-02, OPS-01
- `.planning/PROJECT.md` — restricciones (gratis, no comercial, mobile first, nada de fetch externo desde el cliente)

### Arquitectura y stack
- `.planning/research/ARCHITECTURE.md` — adapters/normalizers/aggregator, `WeatherSnapshot`, TTLs, anti-patterns (RSC que llama a su propia API, fetch desde el cliente)
- `.planning/research/STACK.md` y `CLAUDE.md` §Technology Stack — versiones (Next 16.4.3, TS ^5, Tailwind 4.3.3, zod 4, suncalc 2.1.1), sin `cacheComponents`
- `.planning/research/PITFALLS.md` — trampas de UTC/zona horaria, MET Norway User-Agent, rate limits
- `.planning/research/FEATURES.md` — el "ahora" de Open-Meteo es modelo, no observación ("ESTIMADO POR MODELO")

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Ninguno: el repo solo tiene docs (`.planning/`, `design/`, `CLAUDE.md`, `NUEVO-PROYECTO.md`). La fase 1 hace el scaffold con `create-next-app@16.4.3`.

### Established Patterns
- Todavía no hay patrones de código. Los que fijan los docs: tokens en `@theme` de `app/globals.css` (sin `tailwind.config.js`), componentes propios en `components/`, lógica pura en `lib/` con tests de Vitest, y secciones configuradas en `lib/sections.ts`.

### Integration Points
- `getWeatherSnapshot()` es el punto único que van a consumir la página, `/api/weather`, el SW (fase 6) y el cron de alertas (fase 7).
- `<SkyBackdrop state>` y `PampaHorizon.tsx` los reemplaza o reusa la fase 3.
- La prop `headline?` de `Ahora` la llena la fase 2.

</code_context>

<specifics>
## Specific Ideas

- Coordenadas fijas: -36.23, -64.23 (una constante en `lib/config.ts`).
- El snapshot se arma pensando en la fase 2 (hourly 48 h y daily 14 d ya presentes), aunque la fase 1 no los muestre.

</specifics>

<deferred>
## Deferred Ideas

- Decidir repo público o privado: antes de la fase 7.
- Dominio propio: sin fase asignada; si se quiere, como tarea rápida después del MVP.
- Persistir el último snapshot en Supabase: solo si D-03 muestra que la Data Cache no alcanza; si no, fase 7 o nunca.

</deferred>

---

*Phase: 01-fundaciones-y-ahora*
*Context gathered: 2026-10-23*
