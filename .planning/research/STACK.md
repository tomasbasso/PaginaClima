# Stack Research

**Domain:** Web/PWA del clima de una sola localidad (Winifreda, La Pampa) con fondo generativo animado, comparación multi-modelo y Web Push
**Researched:** 2026-10-23
**Confidence:** HIGH en el core (versiones verificadas contra el registry de npm y los docs oficiales hoy), MEDIUM en cielo generativo y push en iOS, **LOW/BLOQUEANTE en radar** (ver alerta abajo)

---

## ALERTA: RainViewer no cubre Argentina

Lo verifiqué empíricamente, no sale de la documentación. Bajé las teselas de *coverage mask* de RainViewer (`/v2/coverage/0/256/{z}/{lat}/{lon}/0/0_0.png`; según su doc, transparente = hay radar y negro = no hay) y les decodifiqué el canal alfa:

| Punto | z | Píxeles con cobertura |
|-------|---|-----------------------|
| Winifreda (-36.23, -64.23) | 5, 6, 7 | **0 / 65536** |
| Córdoba (-31.4, -64.2) | 6 | **0 / 65536** |
| Mar del Plata (-38.0, -57.5) | 6 | **0 / 65536** |
| Kansas, EE.UU. (control) | 6 | 65536 / 65536 |
| São Paulo (control) | 6 | 65419 / 65536 |

**Conclusión:** hoy RainViewer no tiene radares argentinos (SMN/SINARAME). Un mapa de RainViewer sobre Winifreda va a aparecer **vacío siempre**. Además, entre 2025 y 2026 la API gratis se recortó mucho (detalle más abajo). El requisito "Radar de lluvia (RainViewer)" tiene que redefinirse antes del roadmap. Lo que propongo está en "Radar / mapa".

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Conf. |
|------------|---------|---------|-----------------|-------|
| Next.js (App Router) | **16.4.3** | Framework, Route Handlers como proxy con caché, metadata/manifest | Es lo que el dueño domina. La 16 usa Turbopack por defecto en `dev` y en `build`. Trae `app/manifest.ts` nativo y una guía oficial de PWA + Web Push (actualizada el 2026-07-30). | HIGH |
| React / React DOM | **19.3.x** | UI | Peer de Next 16 (`^19`). Recharts 3 y react-map-gl 8 lo soportan. | HIGH |
| TypeScript | **^5 (5.9.3)** | Tipado | **No uses TS 7.0.2 (el `latest` de npm).** El checker integrado de Next no carga TS 7 (hay que activar `experimental.useTypeScriptCli`, y así se pierden los mensajes de error específicos de Next) y TS 7 mueve la API del compilador a `typescript/unstable/*`. `create-next-app@16.4.3` sigue fijando `typescript: "^5"`. | HIGH |
| Tailwind CSS | **4.3.3** | Estilos | v4 se configura desde el CSS (`@import "tailwindcss"` + `@theme`) y no lleva `tailwind.config.js`. Con Turbopack, `create-next-app` 16.4 ahora usa el loader **`@tailwindcss/turbopack`** en vez de `@tailwindcss/postcss`. Lo mejor es dejar que lo configure el scaffolder. | HIGH |
| Node.js (runtime Vercel) | **22.x o 24.x LTS** | Runtime de Route Handlers | Next 16 pide `>=20.9`. `web-push` necesita el **runtime Node.js, no Edge**, porque usa `crypto` y `https` de Node. | HIGH |
| Vercel Hobby | — | Hosting | Ya está decidido. La Data Cache/ISR de `fetch` con `revalidate` funciona en Hobby. | HIGH |
| Supabase (Postgres) | `@supabase/supabase-js` **2.118.0** | Una sola tabla `push_subscriptions` | Ya está decidido. Hay que usarlo **solo del lado del servidor**, con la service role key en una env var y sin exponer la anon key. Detalle útil: el proyecto free se pausa tras 7 días sin actividad, y el cron horario que consulta la tabla lo mantiene despierto solo. | HIGH |

### Datos meteorológicos (todos verificados con requests reales a Winifreda hoy)

| Fuente | Endpoint | Uso | Notas verificadas | Conf. |
|--------|----------|-----|-------------------|-------|
| Open-Meteo Forecast | `api.open-meteo.com/v1/forecast` | Ahora, 48 h, 7–14 días, multi-modelo | `models=ecmwf_ifs,ecmwf_ifs025,gfs_seamless,icon_seamless` funciona y devuelve `temperature_2m_<modelo>` por modelo. `ecmwf_ifs` = IFS HRES 9 km, que es mejor que `ecmwf_ifs025`, así que conviene usar ese. Con `timezone=America/Argentina/Buenos_Aires` devuelve horas locales (UTC-3 fijo, Argentina no tiene DST). Para Sudamérica no hay modelos regionales: solo globales. | HIGH |
| Open-Meteo Ensemble | `ensemble-api.open-meteo.com/v1/ensemble` | Probabilidad real de lluvia | `models=ecmwf_ifs025` funciona (51 miembros, 15 días) y devuelve `precipitation_memberNN_ecmwf_ifs025_ensemble`. Los demás: GFS 0.25° (31 miembros, 10 d) y ICON-EPS (40 miembros, 7.5 d). La probabilidad se calcula en el servidor (miembros con >= 0.2 mm / total) y al cliente se le manda **solo el resultado**, porque la respuesta cruda pesa mucho. | HIGH |
| Open-Meteo Historical | `archive-api.open-meteo.com/v1/archive` | Lluvia acumulada vs. promedio | La climatología (por ejemplo 1991–2020) es casi inmutable: conviene calcularla una vez y cachearla con `revalidate` de días, o directamente generar un JSON estático en build. | MEDIUM |
| MET Norway Locationforecast 2.0 | `api.met.no/weatherapi/locationforecast/2.0/compact` | 4.º modelo | Responde 200 para Winifreda con `User-Agent` propio. Manda `Expires` (unos 30 min) y `Last-Modified`: hay que respetarlos, así que `revalidate` va en 1800 s o más. El UA tiene que identificar la app y un contacto, por ejemplo `ClimaWinifreda/1.0 github.com/<user>/<repo>`. | HIGH |
| Sol y luna | `suncalc` **2.1.1** | Salida/puesta, crepúsculos, altura del sol (para el cielo), fase e iluminación lunar | Revivió en septiembre/octubre de 2026: es ESM, trae tipos propios (`index.d.ts`) y es de mourner. `getMoonIllumination()` ya da la fase (0–1), así que **no hace falta una librería de fase lunar aparte**. La altura del sol en tiempo real (`getPosition`) es lo que mueve el cielo generativo; con el sunrise/sunset diario de Open-Meteo no alcanza. | HIGH |

### Radar / mapa (requiere decisión)

| Opción | Estado | Recomendación |
|--------|--------|---------------|
| RainViewer Weather Maps API | Sigue viva para "uso personal/educativo": `api.rainviewer.com/public/weather-maps.json` responde. Desde el 01/01/2026 tiene **zoom máximo 7**, **un solo esquema de color** (Universal Blue), **sin nowcast ni satélite** (las claves `nowcast`/`satellite` siguen en el JSON pero no sirven), y un límite de 100 req/IP/min. Los `path` ahora son **hashes** (`/v2/radar/a642cb5f6ba2`) y ya no timestamps, así que siempre hay que leerlos del JSON. **Cobertura sobre Argentina: nula.** | **No usar como radar principal.** |
| Satélite GOES-East (NASA GIBS WMTS) | Gratis, sin key. Capa `GOES-East_ABI_Band13_Clean_Infrared_v0_NRT_ZENJPEG` en EPSG:3857, cada 10 min, día y noche, cubre toda Argentina. | **Recomendado como reemplazo**: "nubes y tormentas en infrarrojo". Muestra los topes fríos de las tormentas convectivas, que en La Pampa es lo que importa. Antes de implementar hay que verificar el `GetCapabilities` (MEDIUM). |
| Imágenes de radar SMN (smn.gob.ar/radar, radar Anguil a ~60 km) | Hay imágenes PNG con ruido (nombres, bordes) y no hay API pública documentada. smn.gob.ar respondió 402 al fetch automático. El radar de Anguil tuvo problemas de disponibilidad. | Como mucho, un link externo "Ver radar SMN". No scrapear. |
| Lluvia prevista por modelo | Ya la tenemos (Open-Meteo, por hora). | Mostrarla en el meteograma con barras de precipitación por modelo. Esto cubre el "¿llueve en las próximas horas?" mejor que un radar vacío. |

**Librería de mapa:** **MapLibre GL JS 6.15.0** + **react-map-gl 8.1.3** (`react-map-gl/maplibre`), con basemap vectorial de **OpenFreeMap** (gratis, sin key y sin límites declarados; atribución OSM obligatoria). Por qué MapLibre y no Leaflet: el basemap se puede re-estilizar (paleta oscura y tipografía editorial) para que combine con el cielo, la animación de frames con `raster-opacity` es fluida, y el overzoom de teselas raster (GIBS/RainViewer z7) queda prolijo. El costo es el peso (~250 KB gz): se carga con `next/dynamic({ ssr:false })` **solo en la sección del mapa**. Conf.: MEDIUM-HIGH.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Conf. |
|---------|---------|---------|-------------|-------|
| `recharts` | **3.10.1** | Meteograma 48 h y gráficos de lluvia acumulada | `ComposedChart` con `Area` (temperatura), `Bar` (lluvia), `Line` por modelo, doble `YAxis`, y `shape` custom para las flechas de viento. Es client-only (`'use client'`). La v3 reescribió el estado interno y algunos props de la v2 cambiaron, así que conviene usar docs de la v3. Peer: `react-is` (hay que instalarlo explícitamente). | HIGH |
| `serwist` + `@serwist/turbopack` | **9.5.13** | Service worker: precache del shell, offline, handler de `push` | Ver "PWA" más abajo. Requiere `esbuild` como devDependency. | MEDIUM-HIGH |
| `web-push` | **3.6.7** (+ `@types/web-push` 3.6.4) | Enviar Web Push (VAPID, aes128gcm) desde el Route Handler del cron | Es la librería que usa la guía oficial de Next. El último release es de enero 2024, pero el protocolo está estable y anda. **Solo con runtime Node** (`export const runtime = 'nodejs'`). Alternativa moderna: `web-push-neo` (Web Crypto, ESM), aunque es joven (pocas estrellas). | HIGH (uso) / MEDIUM (mantenimiento) |
| `zod` | **4.6.7** | Validar las respuestas de Open-Meteo/MET Norway y el body de suscripción push | Siempre en el borde servidor→API externa: un cambio de schema upstream tiene que fallar ruidoso en el proxy y no romper el cliente. | HIGH |
| `suncalc` | **2.1.1** | Sol/luna (ver arriba) | Siempre. | HIGH |
| `motion` | **14.6.0** | Transiciones de UI (entrada de tarjetas, cambio de sección) | Opcional. **No** se usa para el cielo (eso va en canvas). Si el cielo se lleva todo el presupuesto de animación, se puede prescindir y usar CSS transitions. | MEDIUM |
| `next/font` (Google) | built-in | Tipografía editorial | Self-hosting automático y sin layout shift. Para la serif display hay candidatas variables: Fraunces, Instrument Serif, Newsreader. Es una decisión de diseño. | HIGH |
| `@date-fns/tz` + `date-fns` | 1.5.0 / 4.4.0 | Formateo de fechas en es-AR | **Probablemente innecesario**: Open-Meteo ya devuelve hora local y Argentina es UTC-3 fijo. Primero probar con `Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })` y sumar date-fns solo si molesta. | MEDIUM |

### Cielo vivo generativo

**Recomendación: un solo `<canvas>` con WebGL2 "a mano", sin three.js. Un fragment shader full-screen dibuja el gradiente del cielo, las nubes y la niebla (ruido fBm), y encima van las partículas (lluvia, estrellas). El horizonte pampeano va como SVG estático encima del canvas.** Si escribir boilerplate WebGL molesta, **`ogl` 1.0.11** (~25 KB, API mínima) sirve. Conf.: MEDIUM (es criterio de ingeniería apoyado en las características conocidas de las GPU móviles; no hay benchmark oficial).

Por qué:
- El cielo es casi todo **campos continuos** (gradientes que dependen de la altura del sol, nubes, niebla, relámpagos). Eso es justo lo que resuelve bien un fragment shader con 1 draw call. En Canvas 2D se haría con `createLinearGradient` + sprites de nube, que es más pesado en CPU y queda menos orgánico.
- three.js (0.186) / R3F (9.8) suman 150–600 KB por un único quad: no tiene sentido. Pixi 8 está pensado para sprites y juegos, que no es el caso.
- CSS/SVG puros alcanzan para un gradiente, pero no para nubes y lluvia generativas creíbles.

Reglas de performance en iPhone (son obligatorias, no opcionales):
1. **Renderizar a baja resolución** (escala 0.5× o DPR 1 en vez de 3) y dejar que el CSS lo estire. Un cielo es de baja frecuencia y no se nota, mientras que a DPR 3 la GPU del iPhone se calienta.
2. **Limitar a 30 fps** y **pausar** con `visibilitychange` y con `IntersectionObserver` cuando se hace scroll lejos del cielo.
3. **`prefers-reduced-motion`**: renderizar un frame estático.
4. Manejar **`webglcontextlost` / `webglcontextrestored`**, porque iOS libera contextos WebGL cuando la PWA pasa a segundo plano.
5. **Fallback**: si no hay WebGL2, un gradiente CSS calculado con los mismos parámetros. La primera pintura siempre sale del **gradiente CSS renderizado en el servidor**, y el canvas aparece encima con fade-in, así no hay flash ni bloqueo de LCP.
6. El "estado del cielo" (hora solar, nubosidad, precipitación, viento, código WMO) se calcula en una función pura de TS que se puede testear, y le pasa uniforms al shader. Así se puede previsualizar cualquier combinación (`?sky=storm&t=19:40`).

### PWA

**Recomendación: `app/manifest.ts` nativo de Next + Serwist con `@serwist/turbopack`.**

- La guía oficial de Next 16 dice que, para offline completo con service worker, "one option is Serwist", con ejemplos para Turbopack y webpack. Next además ahora trae `useOffline` (experimental) para la UI que depende de la conectividad.
- `@serwist/turbopack` (9.5.13) no es un plugin de webpack: sirve el SW desde un Route Handler (`app/serwist/[path]/route.ts` con `createSerwistRoute`), con `app/sw.ts` como fuente y `<SerwistProvider swUrl="/serwist/sw.js">` en el layout. Esto evita el problema de Next 16, cuyo `build` falla si hay config de webpack custom y no se pasa `--webpack`.
- En `app/sw.ts` van, además del precache/runtime cache, los listeners `push` y `notificationclick`.
- Alternativa válida si se quiere cero dependencias: un SW escrito a mano en `public/sw.js` con solo `push` + `notificationclick` + una caché mínima, como en la guía oficial de Next. Es aceptable porque el valor offline de una app del clima es bajo (los datos viejos sirven poco). Si en el roadmap el offline queda fuera de scope, **esta es la opción más simple** y Serwist se puede sumar después.
- Ojo con el scope: el SW servido desde `/serwist/sw.js` necesita el header `Service-Worker-Allowed: /` o registrarse con el scope que corresponda. Serwist ya lo resuelve; hay que verificarlo en la fase de PWA.

### Web Push en iOS

- Solo funciona con la **PWA instalada en la pantalla de inicio** (Safari en pestaña no expone `PushManager`). El mínimo histórico es iOS 16.4; desde **iOS 18.4** existe además **Declarative Web Push** (el payload JSON con `navigate` lo muestra el sistema aunque el SW no corra). Lo recomendable es mandar payloads compatibles con los dos formatos.
- El permiso tiene que pedirse **con un gesto del usuario** (botón "Activar alertas"), nunca al cargar.
- El manifest necesita `display: "standalone"`. Conviene sumar `apple-touch-icon` y un flujo "Compartir → Agregar a inicio", porque `beforeinstallprompt` no existe en iOS.
- Las suscripciones de Apple (`web.push.apple.com`) expiran o se invalidan: ante un 404 o 410 del push service, **hay que borrar la fila en Supabase**.

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| ESLint + `eslint-config-next` | 10.13 / 16.4.3 | Lint | En Next 16 `next lint` ya no está y el script es `"lint": "eslint"` (lo hace `create-next-app`). La alternativa ofrecida por el scaffolder es Biome 2.6.2; cualquiera de las dos sirve, es cuestión de gusto. |
| Vitest | 5.0.5 | Unit tests | Para las funciones puras: estado del cielo, probabilidad del ensemble, índice de coincidencia de modelos, reglas de alerta (helada/tormenta/viento). Ahí está el riesgo lógico. |
| Playwright | 1.64.1 | E2E/smoke | Opcional. Sirve para smoke-testear el manifest y que la home renderice sin datos. |
| `next dev --experimental-https` | built-in | Probar SW/Push en local | Lo pide la guía oficial para probar notificaciones. |
| GitHub Actions (`schedule`) | — | Cron horario | `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/alerts`. Los schedules pueden atrasarse 5–30 min (para alertas de helada alcanza) y **GitHub deshabilita los workflows programados tras 60 días sin actividad en el repo**: conviene un `workflow_dispatch` manual y un recordatorio. |

## Installation

```bash
# Scaffold (TS, App Router, Tailwind v4 con @tailwindcss/turbopack, ESLint)
npx create-next-app@16.4.3 clima-winifreda --ts --app --tailwind --eslint --turbopack

# Core de la app
npm install recharts react-is suncalc zod @supabase/supabase-js web-push

# Mapa (cargado con next/dynamic, ssr:false)
npm install maplibre-gl react-map-gl

# PWA (Serwist, variante Turbopack)
npm install -D @serwist/turbopack serwist esbuild

# Tipos y testing
npm install -D @types/web-push vitest @playwright/test

# Opcionales
npm install motion ogl
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Recharts 3 | **SVG a mano con `d3-scale` + `d3-shape`** (o `@visx/*` 4.0) | Si el meteograma tiene que verse 100 % editorial (ejes mínimos, tipografía propia, gradiente de temperatura a lo largo de la curva). Recharts sirve en un 80 % y pelear con su DOM para el 20 % restante cuesta caro. Mi recomendación: **Recharts para el MVP**; si en la fase de diseño se pide un look muy custom, migrar solo el meteograma a SVG + d3-shape. |
| Recharts 3 | ECharts 6.1 | Si hiciera falta zoom/pan o miles de puntos. No es el caso (48–336 puntos) y pesa ~300 KB+. |
| WebGL2 a mano / `ogl` | Canvas 2D | Si el diseño termina siendo "ilustración plana": gradiente + pocas partículas. Es más simple de depurar, pero en iPhone escala peor con muchas partículas. |
| WebGL2 a mano / `ogl` | three.js / R3F | Solo si el cielo pasara a ser 3D real (volumetría, cámara). No es el caso. |
| MapLibre + react-map-gl | Leaflet 1.9.4 + react-leaflet 5.0.0 | Si la prioridad es el peso (~40 KB) y alcanza con un basemap raster. Leaflet 2.0 sigue en alpha desde agosto de 2025, así que conviene no adoptarlo. Un basemap raster gratis y digno (CARTO dark) tiene límites de uso no comercial. |
| Serwist (`@serwist/turbopack`) | SW a mano en `public/sw.js` | Si el offline queda fuera de scope (ver PWA). |
| `web-push` | `web-push-neo` | Si se quisiera correr el envío en Edge runtime. No hace falta. |
| Supabase | Upstash Redis / Vercel KV (Marketplace) | Equivalente para guardar 1–5 suscripciones. Supabase ya está decidido y el dueño lo domina, así que no cambia. |
| Route Handlers + `fetch(..., { next: { revalidate } })` | Cache Components (`cacheComponents: true` + `'use cache'` + `cacheLife`) | Next 16 ofrece el modelo nuevo, pero **al activarlo deja de existir `export const revalidate`** (se reemplaza por `cacheLife`). **Recomendación: dejar `cacheComponents` apagado** (es el default) y usar el modelo clásico de `revalidate`, tal como dice PROJECT.md. Es más simple y está bien documentado. Si más adelante se activa, `'use cache'` no puede ir en el cuerpo del Route Handler, sino en una función helper. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **RainViewer como radar para Winifreda** | Cobertura nula en Argentina (verificado con el coverage mask), zoom máximo 7, sin nowcast desde 2026 | Satélite IR GOES-East (NASA GIBS) + lluvia horaria por modelo |
| `next-pwa` (5.6.0, 2022) / `@ducanh2912/next-pwa` (10.2.9, 2024) | Abandonados, plugins de webpack, incompatibles con el build Turbopack por defecto de Next 16 | `@serwist/turbopack` o SW a mano |
| TypeScript 7.0.x | El checker de Next no lo carga sin flag experimental, y hay roturas en el ecosistema por la API `unstable/*` | `typescript@^5` (5.9.3) |
| `tailwind.config.js` / tutoriales de Tailwind v3 | v4 se configura desde CSS (`@theme`), con otras directivas | Docs de Tailwind v4 |
| three.js / R3F / Pixi para el cielo | Cientos de KB para un quad full-screen, más batería | WebGL2 a mano u `ogl` |
| Llamar a las APIs meteorológicas desde el cliente | MET Norway exige UA y caché, el cliente no puede mandar un UA propio, y el ensemble pesa mucho | Todo pasa por Route Handlers con `revalidate` |
| Edge runtime en el Route Handler de push | `web-push` depende de `crypto`/`https` de Node | `export const runtime = 'nodejs'` |
| Cron de Vercel para alertas horarias | Hobby solo permite un cron diario | GitHub Actions `schedule` + secreto |
| Librerías de fase lunar aparte (`lunarphase-js`, etc.) | Redundantes | `SunCalc.getMoonIllumination()` |
| `localStorage` de localidades / Geocoding | Fuera de scope | Coordenadas fijas en una constante |

## Stack Patterns by Variant

**Si el offline queda fuera del MVP:**
- SW a mano (`public/sw.js`), solo con `push` + `notificationclick`, y el registro en un client component.
- Porque un clima offline sirve poco y se ahorra una dependencia con integración Turbopack todavía joven.

**Si el offline entra al MVP:**
- `@serwist/turbopack`, con precache del shell y `NetworkFirst` para `/api/*`, mostrando "datos de hace X min".

**Si el meteograma necesita un look 100 % custom:**
- SVG + `d3-scale`/`d3-shape` en un client component, manteniendo Recharts para los gráficos secundarios (lluvia acumulada).

**Si el mapa no aporta lo suficiente sin radar:**
- Bajarlo a "imagen satelital estática del último frame + animación de 6 frames" sin librería de mapa: componer las teselas GIBS z5–6 en un `<canvas>` sobre una silueta de La Pampa. Así se ahorran ~250 KB.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@16.4.3 | react@^19, node>=20.9 | Turbopack por defecto en build. `--webpack` si hay plugin webpack. |
| next@16.4.3 | typescript@^5 | TS 7 solo con `experimental.useTypeScriptCli: true`. |
| tailwindcss@4.3.3 | @tailwindcss/turbopack@4.3.3 (o @tailwindcss/postcss@4.3.3) | Mantener las versiones alineadas. |
| recharts@3.10.1 | react@^19, react-is@^19 | `react-is` es peer: instalarlo con la misma versión mayor que React. |
| @serwist/turbopack@9.5.13 | next>=14, esbuild>=0.25 <1 | Serwist 10 está en preview (10.0.0-preview.14): fijar 9.5.x. |
| react-map-gl@8.1.3 | maplibre-gl@6.x | Importar desde `react-map-gl/maplibre`. |
| web-push@3.6.7 | Node runtime | No anda en Edge. |
| suncalc@2.1.1 | ESM + CJS, tipos incluidos | No instalar `@types/suncalc` (es de la 1.x). |

## Sources

- npm registry (`npm view`), consultado el 2026-10-23: versiones de next, react, tailwindcss, @tailwindcss/turbopack, recharts, serwist, @serwist/turbopack, web-push, supabase-js, maplibre-gl, react-map-gl, leaflet, react-leaflet, suncalc, three, ogl, zod, typescript (dist-tags), vitest, playwright, eslint, biome. HIGH
- https://nextjs.org/docs/app/guides/progressive-web-apps (lastUpdated 2026-07-30): manifest nativo, web-push, Serwist para Turbopack/webpack, `useOffline`, iOS 16.4+. HIGH
- Context7 `/vercel/next.js/v16.2.9`: Route Handlers + `use cache`/`cacheLife`, y que con Cache Components `revalidate` se reemplaza. HIGH
- https://serwist.pages.dev/docs/next/turbo: `@serwist/turbopack`, `createSerwistRoute`, `SerwistProvider`. HIGH
- `create-next-app@16.4.3` template (GitHub vercel/next.js, `packages/create-next-app/templates/index.ts`): `typescript: "^5"`, `@tailwindcss/turbopack`, scripts de lint ESLint/Biome. HIGH
- Requests reales del 2026-10-23 a Open-Meteo Forecast (`models=ecmwf_ifs,ecmwf_ifs025,gfs_seamless,icon_seamless`), Ensemble (`ecmwf_ifs025`), MET Norway (200 + `Expires`) y RainViewer `weather-maps.json` (paths con hash). HIGH
- Coverage mask de RainViewer decodificado a mano para Winifreda, Córdoba, Mar del Plata, Kansas y São Paulo. HIGH (que la interpretación transparente = cobertura es correcta lo confirman los controles)
- https://rainviewer.com/api/transition-faq.html y https://www.rainviewer.com/api/weather-maps-api.html: recortes 2025–2026, zoom 7, Universal Blue, 100 req/IP/min. HIGH
- https://open-meteo.com/en/docs y https://open-meteo.com/en/docs/ensemble-api: modelos, miembros y horizontes. HIGH
- Next.js 16.3 + TS 7 (achromatic.dev, ecorpit.com y la doc de Next sobre `useTypeScriptCli`). MEDIUM
- https://webkit.org/?p=16535 (Declarative Web Push), docs de OneSignal/Pushpad sobre iOS. MEDIUM
- NASA GIBS WMTS, directorio `GOES-East_ABI_Band13_Clean_Infrared_v0_NRT_ZENJPEG` (gibs-a.earthdata.nasa.gov). MEDIUM (verificar GetCapabilities)
- OpenFreeMap (simonwillison.net 2024, guía Nuxt Scripts). MEDIUM (leer https://openfreemap.org/tos/)
- Windy Community (radar de Argentina no disponible) y el registro de UCAR del radar INTA Anguil. LOW-MEDIUM, como contexto
- web-push-neo (GitHub ryoppippi). LOW

---
*Stack research for: PWA del clima de una sola localidad con cielo generativo*
*Researched: 2026-10-23*
