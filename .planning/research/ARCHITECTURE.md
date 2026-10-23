# Architecture Research

**Domain:** Web/PWA del clima de una sola localidad (Winifreda, La Pampa) con varias fuentes, caché en el servidor, cielo generativo y Web Push
**Researched:** 2026-10-23
**Confidence:** MEDIUM-HIGH. La parte de Next.js 16, Vercel, MET Norway y RainViewer está verificada en docs oficiales; algunos detalles de Open-Meteo y Supabase están marcados abajo.

---

## Standard Architecture

La regla de fondo es que **el navegador nunca le habla directo a las APIs del clima**, salvo a las tiles del radar. Todo pasa por una capa de datos en el servidor con caché que:

1. le pega a cada fuente como mucho una vez por ventana de TTL,
2. normaliza todo a **un solo modelo interno** (`WeatherSnapshot`),
3. sirve ese modelo a la página (Server Components), a la API JSON (para el cliente o el service worker) y al evaluador de alertas (cron).

Como hay una sola localidad con coordenadas fijas, **existe exactamente una clave de caché por fuente**. Eso hace que la caché sea casi perfecta y la carga sobre las APIs externas quede chica y constante, sin importar cuántas visitas haya.

### System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           CLIENTE (iPhone / Android / desktop)             │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────────────────┐ │
│  │ Cielo vivo   │ │ Secciones UI │ │ Radar map   │ │ PushManager (UI)   │ │
│  │ (canvas,     │ │ Ahora/48h/   │ │ (Leaflet/   │ │ subscribe/unsub    │ │
│  │  client)     │ │ 14d/Modelos/ │ │  MapLibre,  │ └─────────┬──────────┘ │
│  └──────▲───────┘ │ Lluvia/Sol   │ │  client)    │           │            │
│         │ SkyInput└──────▲───────┘ └──────┬──────┘           │            │
│         └────────────────┤ props          │ tiles directas   │ POST       │
│  ┌───────────────────────┴───────────┐    ▼                  │            │
│  │ Service Worker (public/sw.js)     │  tilecache.rainviewer │            │
│  │ shell + última página/JSON + push │                       │            │
│  └───────────────┬───────────────────┘                       │            │
└──────────────────┼───────────────────────────────────────────┼────────────┘
                   │ HTML (ISR) / GET /api/weather              │
┌──────────────────┼───────────────────────────────────────────┼────────────┐
│               VERCEL (Next.js App Router, región gru1)        │            │
│  ┌───────────────▼──────────────┐   ┌────────────────────────▼─────────┐  │
│  │ app/page.tsx (Server Comp.,  │   │ /api/push/subscribe (POST/DELETE)│  │
│  │ ISR) · /api/weather (GET)    │   └────────────────────────┬─────────┘  │
│  └───────────────┬──────────────┘   ┌──────────────────────┐ │            │
│                  │                  │ /api/cron/alerts     │◄┼── GitHub   │
│                  │                  │ (Bearer CRON_SECRET) │ │   Actions  │
│                  │                  └──────────┬───────────┘ │   (horario)│
│  ┌───────────────▼─────────────────────────────▼──────────┐  │            │
│  │      lib/weather: getWeatherSnapshot()  (agregador)    │  │            │
│  │  Promise.allSettled → normalize → derive (consenso,    │  │            │
│  │  prob. lluvia, acumulados) → WeatherSnapshot           │  │            │
│  ├────────────┬────────────┬────────────┬────────────┬────┤  │            │
│  │ openMeteo  │ ensemble   │ historical │ metNorway  │rain│  │            │
│  │ forecast   │ adapter    │ adapter +  │ adapter    │view│  │            │
│  │ (multi-    │            │ climatolog.│ (UA, 4 dec)│ er │  │            │
│  │  modelo)   │            │ estática   │            │meta│  │            │
│  └─────┬──────┴─────┬──────┴─────┬──────┴─────┬──────┴──┬─┘  │            │
│        │   Vercel Data Cache (fetch next.revalidate / tags)  │            │
│  ┌─────▼────────────────────────────────────────────────┐   │            │
│  │ lib/alerts: rules (puras) + dedupe + web-push sender │◄──┘            │
│  └──────────────────────────┬───────────────────────────┘                │
└─────────────────────────────┼────────────────────────────────────────────┘
                              ▼
               ┌──────────────────────────────┐
               │ Supabase (Postgres, free)    │
               │ push_subscriptions · alert_log│
               └──────────────────────────────┘
   Externos: api.open-meteo.com · ensemble-api.open-meteo.com ·
             archive-api.open-meteo.com · api.met.no · api.rainviewer.com
```

### Component Responsibilities

| Componente | Qué le toca | Implementación típica | Habla con |
|-----------|-------------|-----------------------|-----------|
| **config/location** | Coordenadas fijas, zona horaria, unidades, umbrales de alerta | `lib/config.ts` con constantes (`LAT=-36.23`, `LON=-64.23`, `TZ='America/Argentina/Buenos_Aires'`) | Todos (solo lectura) |
| **Source adapters** | Un módulo por fuente: arma la URL, hace el fetch con su TTL y devuelve el DTO crudo tipado | `lib/sources/{openMeteo,ensemble,archive,metNorway,rainviewer}.ts` con `fetch(url, { next: { revalidate, tags } })` y validación con Zod | APIs externas, Data Cache |
| **Normalizers** | Pasan el DTO de cada fuente al modelo interno (`HourlyPoint`, `DailyPoint`, `ModelSeries`). Mapean los símbolos de MET a códigos WMO y dejan las horas en hora local | `lib/weather/normalize/*.ts`, funciones puras | Adapters (input) y aggregator |
| **Aggregator** | `getWeatherSnapshot()`: llama a todos los adapters en paralelo con `Promise.allSettled`, tolera que falle alguno y arma un `WeatherSnapshot` con un `sources[].status` | `lib/weather/snapshot.ts` | Normalizers, derivers |
| **Derivers** | Cálculos de dominio: consenso entre modelos, probabilidad de lluvia desde los miembros del ensemble, lluvia acumulada contra la normal, sensación térmica si falta | `lib/weather/derive/*.ts`, funciones puras y testeables | Aggregator |
| **Page (RSC)** | Renderiza en el servidor con el snapshot (ISR) y pasa props serializables a las secciones | `app/page.tsx` + `export const revalidate = 600` | Aggregator (llamada directa, sin HTTP) |
| **Weather API** | `GET /api/weather` devuelve el snapshot en JSON para refrescar en el cliente y para la caché offline del SW | `app/api/weather/route.ts` | Aggregator |
| **UI sections** | Ahora, 48 h (meteograma), 7–14 días, Modelos, Lluvia acumulada, Sol y Luna | Server Components para la estructura y Client Components solo donde hay interacción o Recharts | Reciben props, sin fetch propio |
| **Sky engine** | Traduce condiciones + hora local + posición del sol en parámetros visuales y los anima | `lib/sky/deriveSkyState.ts` (puro) + `components/sky/SkyCanvas.tsx` (client, Canvas 2D o WebGL) + `suncalc` | Recibe `SkyInput` de la página y recalcula el sol en el cliente |
| **Radar** | Mapa con frames pasados de RainViewer | Client component cargado con `dynamic(..., { ssr: false })`; la lista de frames (`weather-maps.json`) se trae del servidor con caché de 5 min o directo del cliente | tilecache.rainviewer.com (tiles directas) |
| **PWA shell** | Manifest, íconos, registro del SW, fallback offline | `app/manifest.ts` (convención oficial de Next) + `public/sw.js` escrito a mano | Navegador |
| **Push subscribe API** | Guarda o borra suscripciones | `app/api/push/subscribe/route.ts` con el cliente Supabase **service role** del lado del servidor | Supabase |
| **Alert engine** | Evalúa reglas sobre el snapshot, deduplica y manda pushes | `lib/alerts/rules.ts` (puro), `lib/alerts/dedupe.ts`, `lib/alerts/send.ts` (`web-push` + VAPID) | Aggregator, Supabase, push services (APNs/FCM vía Web Push) |
| **Cron trigger** | Dispara la evaluación una vez por hora | `.github/workflows/alerts.yml` con `schedule` + `curl -H "Authorization: Bearer $CRON_SECRET"` | `/api/cron/alerts` |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Home: RSC, ISR (revalidate), arma secciones
│   ├── layout.tsx                # fuentes editoriales, metadata, theme-color, apple-touch-icon
│   ├── manifest.ts               # MetadataRoute.Manifest (convención oficial)
│   ├── offline/page.tsx          # fallback si no hay nada cacheado
│   └── api/
│       ├── weather/route.ts      # GET → WeatherSnapshot JSON
│       ├── radar/route.ts        # GET → frames RainViewer (cache 5 min)
│       ├── push/subscribe/route.ts   # POST/DELETE suscripción
│       └── cron/alerts/route.ts  # POST protegido con CRON_SECRET
├── lib/
│   ├── config.ts                 # coords, TZ, unidades, umbrales, TTLs
│   ├── sources/                  # 1 archivo por API externa (fetch + Zod)
│   │   ├── openMeteoForecast.ts
│   │   ├── openMeteoEnsemble.ts
│   │   ├── openMeteoArchive.ts
│   │   ├── metNorway.ts
│   │   └── rainviewer.ts
│   ├── weather/
│   │   ├── types.ts              # MODELO INTERNO (el contrato central)
│   │   ├── normalize/            # DTO de cada fuente → modelo interno
│   │   ├── derive/               # consenso, probLluvia, acumulados, sol/luna
│   │   └── snapshot.ts           # getWeatherSnapshot()
│   ├── sky/
│   │   ├── deriveSkyState.ts     # (condición, hora, sol) → SkyParams. Puro.
│   │   └── palettes.ts           # gradientes por momento del día
│   ├── alerts/
│   │   ├── rules.ts              # helada / tormenta / viento. Puro.
│   │   ├── dedupe.ts             # alert_log en Supabase
│   │   └── send.ts               # web-push + limpieza 404/410
│   ├── supabase/server.ts        # cliente service-role (solo server)
│   └── format/                   # es-AR: fechas, unidades, textos rioplatenses
├── components/
│   ├── sky/                      # SkyCanvas, Horizon (SVG pampeano)
│   ├── sections/                 # Now, Hourly48, Daily, Models, RainTotals, SunMoon
│   ├── radar/                    # RadarMap (client-only)
│   └── pwa/                      # SWRegister, InstallHint (iOS), PushToggle
├── data/
│   └── climatology.json          # normales de lluvia precalculadas (script)
└── scripts/
    └── build-climatology.ts      # baja 30 años del archive una sola vez
public/
├── sw.js                         # service worker escrito a mano
└── icons/                        # 192, 512, maskable, apple-touch-icon 180
.github/workflows/alerts.yml      # cron horario
supabase/migrations/              # push_subscriptions, alert_log
```

### Structure Rationale

- **`lib/sources/` separado de `lib/weather/normalize/`:** el fetch (con sus reglas de caché, User-Agent y TTL) cambia por motivos distintos que el mapeo de datos. Si mañana Open-Meteo renombra un campo, se toca un solo normalizer. Si MET Norway pide otro header, se toca un solo adapter.
- **`lib/weather/types.ts` es el contrato central:** UI, cielo y alertas dependen **solo** de este modelo, nunca de los DTO de las APIs. Es lo primero que hay que diseñar.
- **`lib/sky` y `lib/alerts` son puros:** se pueden testear con snapshots de ejemplo (fixtures) sin red. Es clave para el cielo, que tiene muchos estados (amanecer, siesta, tormenta, noche estrellada, niebla), y para las alertas, que deben dar cero falsos positivos.
- **`data/climatology.json` estático:** el promedio histórico no cambia. No tiene sentido pedir 30 años al archive en runtime (es una respuesta pesada y lenta). Se calcula una vez con un script y se commitea.

---

## Architectural Patterns

### Pattern 1: Single cached snapshot (agregador con caché por fuente)

**Qué es:** una sola función `getWeatherSnapshot()` que usan la página, `/api/weather` y el cron. Cada adapter tiene su propio TTL en la Data Cache de Vercel, así que el agregador es barato aunque se llame seguido.

**Cuándo usarlo:** siempre en este proyecto. Es lo que cumple la restricción de no pegarle a las APIs en cada visita.

**Trade-offs:** con una sola localidad no hay contras reales. La desventaja es que el snapshot tiene la frescura de su fuente más vieja, así que hay que mostrar "actualizado hace X min".

**TTLs recomendados (ajustar a la frecuencia de actualización de cada fuente):**

| Fuente | TTL | Por qué |
|--------|-----|---------|
| Open-Meteo Forecast (current + hourly + daily, multi-modelo) | 600–900 s | `current` se actualiza cada 15 min; los modelos, cada 1 a 6 h |
| Open-Meteo Ensemble | 3600–10800 s | Los ensembles corren cada 6 h (ECMWF IFS 0.25°, GFS) o cada 12 h (ICON-EPS) |
| Open-Meteo Archive (acumulados recientes) | 21600–86400 s | Datos diarios con varios días de retraso |
| MET Norway locationforecast | ≥ `Expires` (en la práctica ~1800 s) | Lo exigen sus ToS |
| RainViewer `weather-maps.json` | 300 s | Frames nuevos cada 5–10 min |
| Página (ISR) | 600 s | Igual al TTL más corto relevante |

**Ejemplo:**
```typescript
// lib/sources/openMeteoForecast.ts
export async function fetchForecast() {
  const res = await fetch(buildForecastUrl(), {
    next: { revalidate: 900, tags: ['forecast'] },
  });
  if (!res.ok) throw new SourceError('open-meteo-forecast', res.status);
  return ForecastDto.parse(await res.json()); // Zod
}

// lib/weather/snapshot.ts
export async function getWeatherSnapshot(): Promise<WeatherSnapshot> {
  const [fc, ens, arch, met] = await Promise.allSettled([
    fetchForecast(), fetchEnsemble(), fetchArchive(), fetchMetNorway(),
  ]);
  return buildSnapshot({ fc, ens, arch, met }, new Date());
}
```

**Nota de caché en Next.js 16 (verificado en docs v16.2.9):** hay dos modelos y conviene **elegir uno y no mezclarlos**:
- **Sin `cacheComponents` (recomendado acá, más simple):** `fetch(url, { next: { revalidate, tags } })` + `export const revalidate = 600` en `page.tsx` y en los route handlers. Es lo que pide PROJECT.md ("Route Handlers con revalidate").
- **Con `cacheComponents: true`:** las route segment configs `revalidate`/`dynamic`/`fetchCache` se reemplazan por `'use cache'` + `cacheLife()`, y `'use cache'` no se puede poner directo en el cuerpo del Route Handler (va en una función helper). Es válido, pero suma conceptos nuevos sin beneficio real para una sola página.

### Pattern 2: Anti-corruption layer (modelo interno normalizado)

**Qué es:** cada fuente habla su propio idioma. Open-Meteo devuelve arrays paralelos (`hourly.time[]`, `hourly.temperature_2m[]`) con sufijos por modelo cuando se piden varios (`temperature_2m_ecmwf_ifs025`). MET Norway devuelve GeoJSON con `timeseries[].data.instant.details` y `symbol_code` como `"rain"` o `"partlycloudy_day"`. El Ensemble devuelve una columna por miembro (`precipitation_member01..NN`). Todo eso se traduce a tipos propios.

**Modelo interno mínimo sugerido:**
```typescript
type ModelId = 'ecmwf' | 'gfs' | 'icon' | 'metno';
interface HourlyPoint { t: string /* ISO con offset -03:00 */; tempC: number; feelsC?: number;
  precipMm: number; windKmh: number; gustKmh?: number; windDirDeg?: number;
  humidity?: number; pressureHpa?: number; cloudPct?: number; wmo: number; isDay: boolean }
interface DailyPoint { date: string /* YYYY-MM-DD local */; minC: number; maxC: number;
  precipMm: number; precipProb?: number /* 0..1 desde ensemble */; wmo: number;
  sunrise: string; sunset: string }
interface ModelSeries { model: ModelId; hourly: HourlyPoint[]; daily: DailyPoint[] }
interface WeatherSnapshot {
  generatedAt: string; location: { name: 'Winifreda'; lat: number; lon: number; tz: string };
  now: HourlyPoint & { observedAt: string };
  hourly48: HourlyPoint[]; daily: DailyPoint[];          // "best match"
  models: ModelSeries[]; agreement: AgreementIndex;       // los modelos opinan
  rain: { week: RainTotal; month: RainTotal; year: RainTotal }; // vs normal
  astro: { sunrise: string; sunset: string; moonPhase: number; moonIllum: number };
  sources: Array<{ id: string; ok: boolean; fetchedAt?: string; error?: string }>;
}
```

**Trade-offs:** escribir los normalizers lleva trabajo al principio, pero desacopla todo lo demás. Sin esta capa, el cambio de una API rompe la UI, el cielo y las alertas al mismo tiempo.

### Pattern 3: Derivación pura de escena para el cielo vivo

**Qué es:** se separa **qué** mostrar (estado de escena) de **cómo** dibujarlo (renderer).
`deriveSkyState({ wmo, cloudPct, precipMm, windKmh, isFog, sunAltitudeDeg, sunAzimuth, moonPhase, localHour })` devuelve `SkyParams { gradientStops, cloudDensity, rainIntensity, lightningRate, starsOpacity, fogOpacity, sunPos, horizonTint }`.
El canvas solo interpola entre `SkyParams` y dibuja.

**Cuándo usarlo:** siempre que la visual dependa de muchas variables. Así se puede armar una página de debug interna (`/dev/sky?hour=6&wmo=95`) para ver todos los estados sin esperar a que llueva de verdad.

**Detalles importantes:**
- **La posición del sol se calcula en el cliente** (con `suncalc` o equivalente) a partir de lat/lon fijos y el reloj del dispositivo, y se recalcula cada minuto. Así el cielo sigue vivo aunque los datos tengan 10 min, y el amanecer pasa en vivo con la app abierta.
- **La condición (WMO, nubes, lluvia) viene del snapshot del servidor.** Se pasa como prop serializable (`SkyInput`), sin fetch propio.
- **Hidratación:** el SSR no conoce la hora exacta del cliente. Conviene renderizar en el servidor un gradiente estático aproximado (calculado con la hora del servidor en la TZ de Argentina) y montar el canvas en `useEffect`. Así se evita el mismatch de hidratación y el flash.
- **Performance móvil:** `requestAnimationFrame` con límite de ~30 fps, pausa con `visibilitychange`, `devicePixelRatio` acotado a 2, y respeto de `prefers-reduced-motion` (escena estática). En un iPhone, una animación sin pausar se come la batería.

### Pattern 4: Cron externo → endpoint protegido e idempotente

**Qué es:** GitHub Actions hace un `POST /api/cron/alerts` con `Authorization: Bearer ${CRON_SECRET}`. El endpoint:
1. valida el secreto con una comparación en tiempo constante; si no coincide, devuelve 401,
2. obtiene el snapshot (**reusa la misma caché**, sin un fetch aparte a las APIs),
3. evalúa reglas puras y obtiene `AlertCandidate[]` con una `dedupeKey` determinística,
4. hace `INSERT ... ON CONFLICT (dedupe_key) DO NOTHING RETURNING *` en `alert_log`, y **solo manda push por las filas que se insertaron**,
5. manda las notificaciones con `web-push`; ante un 404 o 410 borra la suscripción,
6. responde un resumen en JSON (que queda visible en el log del Action).

**Clave de deduplicación:** `${tipo}:${fechaEventoLocal}[:${franja}]`, por ejemplo `helada:2026-10-25` o `viento:2026-10-24:tarde`. Así una helada pronosticada para el sábado se avisa **una vez**, aunque el cron corra 24 veces y el pronóstico oscile alrededor del umbral. Para pronósticos que oscilan conviene sumar **histéresis**: avisar con mín ≤ 0 °C y no volver a avisar el mismo evento aunque baje y suba.

```typescript
// app/api/cron/alerts/route.ts
export const dynamic = 'force-dynamic'; // nunca cachear esta ruta
export async function POST(req: Request) {
  if (!isAuthorized(req.headers.get('authorization'))) return new Response(null, { status: 401 });
  const snap = await getWeatherSnapshot();
  const candidates = evaluateRules(snap, THRESHOLDS);       // puro
  const fresh = await claimAlerts(candidates);              // ON CONFLICT DO NOTHING
  const result = await sendToAll(fresh);                    // web-push + limpieza 410
  return Response.json({ evaluated: candidates.length, sent: fresh.length, ...result });
}
```

**Trade-offs:** GitHub Actions `schedule` no es puntual: puede demorarse, sobre todo en `:00`. Conviene usar un minuto raro (`17 * * * *`), que además cumple el pedido de MET de no concentrar requests en horas redondas. Una alerta con 10–20 min de demora es aceptable para helada o viento. Además, en repos **públicos** los workflows programados se **desactivan solos tras 60 días sin actividad** en el repo (docs de GitHub). Hay que tenerlo en cuenta o vigilarlo.

### Pattern 5: Offline "última data conocida" en el service worker

**Qué es:** un SW chico, escrito a mano, con tres estrategias:
- **Navegación (HTML):** network-first con timeout (~3 s); si falla, se usa la última página cacheada y, si no hay ninguna, `/offline`.
- **`/api/weather`:** stale-while-revalidate. El cliente puede mostrar un aviso tipo "sin conexión, datos de las 14:20" usando `generatedAt`.
- **Assets estáticos (`/_next/static/*`, fuentes, íconos):** cache-first (son inmutables por hash).
- **Tiles de radar:** **no** cachearlas. No tienen valor offline y ocupan mucho.

Los handlers `push` y `notificationclick` viven en el mismo `sw.js`, siguiendo el patrón de la guía oficial de PWA de Next.js 16.

**Trade-offs:** escribirlo a mano son unas 80 líneas, se controla todo y no tiene problemas con Turbopack. Una librería (Serwist) da precaching automático, pero suma integración con el bundler. Para una sola página no lo vale. (La compatibilidad de Serwist con Turbopack en Next 16 tiene confianza LOW y no la verifiqué.)

---

## Data Flow

### Request Flow (visita normal)

```
Usuario abre la PWA
    ↓
SW intercepta la navegación → network-first
    ↓
Vercel CDN: ¿HTML ISR fresco (< 600 s)? ──sí──► devuelve HTML cacheado (0 llamadas externas)
    │ no / stale
    ↓ (regeneración en background)
page.tsx → getWeatherSnapshot()
    ↓
adapters → Vercel Data Cache por fuente ──hit──► DTO
    │ miss
    ↓
API externa (Open-Meteo / MET / ...) → DTO → Zod → normalize → derive
    ↓
WeatherSnapshot → props → secciones RSC + SkyInput → HTML
    ↓
Cliente: hidrata SkyCanvas (sol calculado localmente), Recharts, radar (lazy)
    ↓
SW guarda la respuesta HTML como "última conocida"
```

### Flujo de refresco en el cliente

```
App en foreground por más de 10 min, o visibilitychange → visible
    ↓
fetch('/api/weather') → (SW: stale-while-revalidate) → route handler → snapshot cacheado
    ↓
router.refresh() o actualización de estado → secciones y cielo se actualizan
```

### Flujo de alertas (cron)

```
GitHub Actions (cron "17 * * * *")
    ↓ POST + Bearer CRON_SECRET
/api/cron/alerts
    ↓
getWeatherSnapshot()  ← misma caché que la página
    ↓
evaluateRules() → candidates[{ type, dedupeKey, title, body }]
    ↓
Supabase alert_log: INSERT ON CONFLICT DO NOTHING RETURNING
    ↓ (solo las nuevas)
Supabase push_subscriptions: SELECT *
    ↓
web-push.sendNotification() × N ──410/404──► DELETE suscripción
    ↓
Push service (APNs para iOS PWA, FCM para Chrome) → SW 'push' → showNotification
```

### Flujo de suscripción

```
Usuario (PWA instalada en iOS 16.4+) toca "Activar alertas"   ← debe ser un gesto del usuario
    ↓
Notification.requestPermission() → registration.pushManager.subscribe({ userVisibleOnly, applicationServerKey: VAPID público })
    ↓
POST /api/push/subscribe { endpoint, keys: { p256dh, auth } }
    ↓
Supabase upsert por endpoint (único)
```

### State Management

No hace falta un store global. El estado está en tres lugares:
- **Servidor:** `WeatherSnapshot` (fuente de verdad, cacheado).
- **Cliente:** props desde RSC, más estado local mínimo (sección activa del radar, estado de la suscripción push, reloj para el sol).
- **SW Cache Storage:** la última página y el último JSON, para usar offline.

Ni React Query ni Zustand se justifican en una sola página con un solo dataset.

### Key Data Flows

1. **Probabilidad de lluvia real:** el Ensemble devuelve la precipitación horaria por miembro. En el servidor se agrega a total diario por miembro y se calcula `P(lluvia) = miembros con ≥ 1 mm / total` (también puede usarse 0,2 mm como "algo"). Al cliente solo viaja el agregado, nunca los ~51 miembros. La página de Ensemble no expone una variable `precipitation_probability` lista para usar, así que el cálculo es propio.
2. **Los modelos opinan:** una sola llamada a Forecast con `models=ecmwf_ifs025,gfs_seamless,icon_seamless` (los IDs exactos hay que confirmarlos en la doc) más MET Norway por separado. Se normalizan a `ModelSeries[]` y se calcula el índice de coincidencia por día (desvío de máximas y mínimas, y acuerdo sobre lluvia sí/no).
3. **Lluvia acumulada vs normal:** semana, mes y año en curso se arman con **archive para los días viejos + `past_days` de Forecast para los últimos días**, porque el archive tiene retraso de días. Las normales salen de `data/climatology.json` (ver Pitfalls).
4. **Cielo:** `snapshot.now` (WMO, nubes, lluvia, viento, visibilidad o niebla) + `astro` → `SkyInput` (prop). El cliente suma `Date.now()` y la posición del sol → `deriveSkyState` → canvas.

---

## Scaling Considerations

Es uso personal o de portfolio. El "scaling" relevante acá es **no pasarse de los límites gratuitos ni de las reglas de las APIs**, no la cantidad de usuarios.

| Escala | Ajustes |
|--------|---------|
| 1–100 usuarios | La arquitectura tal cual. Las llamadas externas son fijas: unas 100–200 por día en total, porque son por TTL y no por visita. |
| 100–10k usuarios | Igual. ISR + Data Cache absorben todo. Lo único que crece es el envío de push: N suscripciones por alerta, en lotes con `Promise.allSettled` y concurrencia de ~10. |
| Más de 10k | Fuera de alcance: se violaría el uso no comercial de Open-Meteo y de Vercel Hobby. Haría falta un plan pago. |

### Scaling Priorities

1. **Lo primero que se rompe son las reglas de terceros, no el servidor.** Un fetch sin caché a MET Norway en el render puede terminar en un ban por User-Agent. Un componente cliente que le pega directo a Open-Meteo multiplica las llamadas por visita. Hay que vigilar que **ningún** fetch externo salga del navegador, salvo las tiles de RainViewer (100 req/IP/min desde el 1/1/2026, que se cuentan por cada usuario y no por la app).
2. **Lo segundo es el tamaño del payload.** El JSON del ensemble con todos los miembros pesa cientos de KB. Hay que agregarlo en el servidor. El límite de respuesta de las funciones de Vercel es 4,5 MB.

---

## Anti-Patterns

### Anti-Pattern 1: Server Component que llama a su propia API route

**Qué se hace:** `page.tsx` hace `fetch('https://miapp.vercel.app/api/weather')`.
**Por qué está mal:** suma un salto HTTP, una invocación de función extra y una caché duplicada. Durante el build la URL ni siquiera existe.
**Qué hacer:** importar y llamar `getWeatherSnapshot()` directamente. La route handler es solo para clientes (navegador, SW, curl).

### Anti-Pattern 2: Fetch a las APIs del clima desde el cliente

**Qué se hace:** `useEffect(() => fetch('https://api.open-meteo.com/...'))`.
**Por qué está mal:** cada visita es una llamada. MET Norway prohíbe eso sin identificación y el navegador no deja setear User-Agent. Además se duplica la lógica de normalización.
**Qué hacer:** pasar todo por `lib/sources` en el servidor.

### Anti-Pattern 3: Que la UI o las alertas consuman los DTO crudos

**Qué se hace:** `data.hourly.temperature_2m_ecmwf_ifs025[i]` en un componente.
**Por qué está mal:** acopla la UI al formato de una API. Cambiar de modelo o de fuente obliga a tocar 10 archivos.
**Qué hacer:** que todo consuma `WeatherSnapshot`.

### Anti-Pattern 4: Mezclar `cacheComponents` con route segment config

**Qué se hace:** activar `cacheComponents: true` y además dejar `export const revalidate = 600`.
**Por qué está mal:** en Next 16 con Cache Components esas configs se reemplazan por `'use cache'` + `cacheLife`. Mezclarlas lleva a errores de build o a una caché que no se comporta como uno espera.
**Qué hacer:** elegir un modelo. Acá se recomienda el modelo clásico (`next.revalidate`).

### Anti-Pattern 5: Cron que no deduplica, o que deduplica en memoria

**Qué se hace:** mandar la alerta cada vez que la regla da true, o guardar "ya avisé" en una variable del módulo.
**Por qué está mal:** las funciones serverless no guardan memoria entre invocaciones. El resultado es 24 pushes de "helada" por día y que el usuario desinstale.
**Qué hacer:** usar `alert_log` en Supabase con una `dedupe_key` única e insert atómico.

### Anti-Pattern 6: Hora del servidor como hora local

**Qué se hace:** `new Date().getHours()` en Vercel (UTC) para decidir si es de noche o para agrupar días.
**Por qué está mal:** los días se cortan a las 21:00 de Argentina, los acumulados quedan corridos y el cielo muestra la noche a la tarde.
**Qué hacer:** pedir a Open-Meteo con `timezone=America/Argentina/Buenos_Aires`, convertir los timestamps de MET (vienen en UTC) a la TZ local en el normalizer, y formatear siempre con `Intl` y `timeZone` explícito.

### Anti-Pattern 7: Animación del cielo sin presupuesto

**Qué se hace:** partículas de lluvia sin límite a 60 fps y a resolución 3x en el iPhone, sin pausar en background.
**Por qué está mal:** batería, calor del teléfono y scroll trabado, justo en el diferencial del producto.
**Qué hacer:** limitar fps y DPR, pausar con `visibilitychange` y tener un modo estático para `prefers-reduced-motion`.

---

## Integration Points

### External Services

| Servicio | Patrón de integración | Notas y gotchas |
|---------|-----------------------|-----------------|
| **Open-Meteo Forecast** | Fetch en el servidor, 1 llamada con `current` + `hourly` + `daily` + `models=...` + `timezone` + `past_days` | Sin API key. Uso no comercial. Con varios modelos, las claves del JSON llevan sufijo por modelo. Conviene una llamada "best match" para Ahora/48h/días y otra multi-modelo, o una sola si el payload no es grande (confianza MEDIUM). |
| **Open-Meteo Ensemble** | Fetch en el servidor, TTL largo, agregado en el servidor | ECMWF IFS 0.25° llega a 15 días y GFS Ensemble 0.25° a 10 días, ambos cada 6 h. ICON-EPS global llega a 7,5 días (verificado en la doc). Para 14 días usar ECMWF IFS (y combinar con GFS para los primeros 10 si se quiere más miembros). La probabilidad se calcula a mano. |
| **Open-Meteo Historical (archive)** | Script offline para la climatología + fetch en runtime con TTL de 24 h para el año en curso | Tiene retraso de varios días respecto a hoy: completar con `past_days` de Forecast. |
| **MET Norway Locationforecast 2.0** | Fetch en el servidor con `User-Agent: ClimaWinifreda/1.0 (https://<dominio>; <email>)`, coordenadas truncadas a **≤ 4 decimales**, sin pedir de nuevo antes de `Expires`, y `If-Modified-Since` = `Last-Modified` previo exacto | 403 = falta el UA o sobran decimales. 429 = throttling, hay que frenar. 203 = versión deprecada, loguear. **Fuera de los países nórdicos usa datos de ECMWF**, así que en Winifreda "MET Norway" va a coincidir bastante con ECMWF. Conviene contarlo en la UI o no venderlo como un modelo independiente (confianza MEDIUM). La Data Cache de Next no hace requests condicionales: el TTL fijo de ~30 min es una aproximación razonable a `Expires`. Si se quiere un `If-Modified-Since` real, hay que guardar `Last-Modified` y el body en Supabase (no vale la pena en la v1). |
| **RainViewer** | `weather-maps.json` (lista de frames pasados) con caché en el servidor de 5 min; las tiles las pide el cliente directo | Desde el 1/1/2026: **zoom máximo 7**, solo el esquema de color **Universal Blue**, **sin nowcast** (solo pasado), 100 req/IP/min, uso personal o educativo y atribución obligatoria con link. Hay que diseñar el radar para zoom ≤ 7 (escala regional, no urbana). Falta verificar la cobertura de radares en La Pampa (los del SINARAME): hay que probarlo de entrada. |
| **Web Push (APNs / FCM)** | Librería `web-push` en Node runtime, claves VAPID en env vars | En iOS solo funciona con la PWA instalada (16.4+) y con permiso pedido por un gesto del usuario. Ante un 404 o 410, borrar la suscripción. |
| **Supabase** | Cliente `@supabase/supabase-js` con service role **solo en el servidor**. RLS activado sin policies públicas | El free tier pausa proyectos inactivos (unos 7 días, confianza MEDIUM). El cron horario que lee `alert_log` lo mantiene activo. |
| **GitHub Actions** | `on: schedule` + `workflow_dispatch` (para probar a mano), `curl --fail` con secret | Puede demorarse. Se desactiva tras 60 días sin actividad en repos públicos. Los secrets van en GitHub (`CRON_SECRET`, `APP_URL`). |

### Internal Boundaries

| Límite | Comunicación | Consideraciones |
|--------|--------------|-----------------|
| sources ↔ normalize | Llamada directa: DTO validado con Zod | Si falla el parseo de Zod, se lanza `SourceError` y el agregador marca la fuente como caída. No se propaga basura. |
| snapshot ↔ UI | Props serializables (RSC → Client) | Solo JSON plano: nada de `Date` ni clases. Fechas como ISO string con offset. |
| snapshot ↔ sky | `SkyInput` (subconjunto chico del snapshot) | El cielo nunca importa `lib/weather` entero. Recibe lo mínimo para poder testearlo aparte. |
| snapshot ↔ alerts | Llamada directa en el servidor | Las reglas son funciones `(snapshot, thresholds) → candidates`, sin I/O. |
| alerts ↔ Supabase | SQL vía supabase-js | El insert atómico con unique constraint es lo que garantiza la deduplicación aunque haya dos ejecuciones concurrentes. |
| app ↔ SW | `navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })` | Versionar el nombre de la caché y limpiar las versiones viejas en `activate`. |

### Esquema mínimo de Supabase

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_success_at timestamptz
);
create table alert_log (
  dedupe_key text primary key,      -- 'helada:2026-10-25'
  type text not null,               -- helada | tormenta | viento
  payload jsonb not null,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
alter table alert_log enable row level security;  -- sin policies: solo service role
```

---

## Suggested Build Order

Las dependencias van de abajo hacia arriba: **contrato del modelo, después fuentes, después UI, después capas de plataforma (PWA y push)**.

```
1. Fundaciones + contrato ──► 2. Pronóstico núcleo ──► 3. Modelos + ensemble
        │                              │                        │
        └──► 2b. Cielo vivo + identidad visual (en paralelo, con fixtures)
                                       │
                                       ▼
                    4. Lluvia acumulada + radar + sol/luna
                                       │
                                       ▼
                    5. PWA (manifest, SW, offline, instalación iOS)
                                       │
                                       ▼
                    6. Web Push (Supabase + cron GH Actions + dedupe)
```

1. **Fundaciones y contrato de datos.** Scaffold de Next.js, `config.ts`, `types.ts` (WeatherSnapshot), adapter de Open-Meteo Forecast + normalizer + `getWeatherSnapshot()` con caché, `/api/weather`, sección **Ahora** básica. **Deploy a Vercel desde el día 1** (región `gru1` São Paulo, más cerca que la default `iad1`) para validar la caché real en Vercel.
   - *Por qué primero:* todo lo demás consume el snapshot. Validar la caché en producción temprano evita sorpresas con el comportamiento de ISR o de la Data Cache.
2. **Pronóstico núcleo:** meteograma de 48 h (Recharts, client) y pronóstico diario. Formateo es-AR y manejo de la TZ.
   **2b. Cielo vivo + tipografía + horizonte**, en paralelo apenas exista `SkyInput`. Se desarrolla con fixtures y con la página `/dev/sky`, sin depender de las otras fuentes. Como es el diferencial (Core Value), conviene arrancarlo temprano para iterar el diseño.
3. **Los modelos opinan + probabilidad real:** multi-modelo de Open-Meteo, adapter de MET Norway (UA, 4 decimales, TTL), Ensemble y el deriver de probabilidad y coincidencia.
   - *Depende de:* el patrón de adapters y normalizers de la fase 1.
4. **Lluvia acumulada, radar, sol y luna:** script de climatología + archive con `past_days`, radar client-only con las restricciones de RainViewer, y astro.
   - Son independientes entre sí. Se pueden reordenar.
5. **PWA:** `manifest.ts`, íconos (incluido `apple-touch-icon`), `sw.js` con las estrategias de arriba, página `/offline`, indicador de "datos de las HH:MM" e instrucciones para instalar en iOS.
   - *Por qué acá:* el SW cachea páginas y JSON. Hacerlo antes de que la UI esté estable complica el debugging (cachés viejas). Es requisito de push en iOS.
6. **Web Push:** claves VAPID, tablas en Supabase, subscribe API, PushToggle, reglas puras con tests, dedupe, `/api/cron/alerts`, workflow de GitHub Actions con `workflow_dispatch` para probar.
   - *Depende de:* el SW (fase 5) y el snapshot completo (fases 1 y 3).

**Flags de investigación por fase:**
- Fase 3: confirmar los IDs exactos de modelos de Open-Meteo y el formato de los sufijos, y el umbral de probabilidad. Revisar si conviene mostrar MET Norway como "ECMWF via MET" (confianza MEDIUM).
- Fase 4: verificar la cobertura real de RainViewer sobre La Pampa a zoom ≤ 7, y el retraso del archive.
- Fase 5: comportamiento del SW y de la caché en iOS standalone (iOS puede purgar el storage de PWAs poco usadas).
- Fase 6: payload y límites de Web Push en iOS, y si conviene una UI de umbrales o hardcodearlos.
- Fases 1 y 2: patrones estándar, no requieren investigación extra.

---

## Sources

- Next.js 16.2.9 docs (Context7 `/vercel/next.js/v16.2.9`): Route Handlers + `revalidate`, `fetch` `next.revalidate`, migración a Cache Components (`revalidate`/`dynamic`/`fetchCache` → `'use cache'` + `cacheLife`; `'use cache'` no va directo en el cuerpo del Route Handler), guía oficial de PWA (`manifest.ts`, `sw.js`, `web-push`, VAPID). Confianza HIGH.
- MET Norway Terms of Service: https://api.met.no/doc/TermsOfService (User-Agent, `Expires`, `If-Modified-Since`, ≤ 4 decimales, 203/403/429, < 20 req/s). Confianza HIGH.
- MET Locationforecast data model: https://api.met.no/doc/locationforecast/datamodel (ECMWF fuera de la región nórdica). Confianza MEDIUM.
- RainViewer API: https://www.rainviewer.com/api.html y Transition FAQ https://www.rainviewer.com/api/transition-faq.html (zoom máx. 7, solo Universal Blue, sin nowcast, 100 req/IP/min desde el 1/1/2026; uso personal o educativo; atribución). Confianza HIGH.
- Open-Meteo Ensemble API docs: https://open-meteo.com/en/docs/ensemble-api (modelos, horizontes, frecuencias; sin variable de probabilidad directa). Confianza HIGH para lo listado.
- Vercel Functions limits: https://vercel.com/docs/functions/limitations (Hobby: 300 s, 2 GB, región única configurable con default `iad1`, payload de 4,5 MB). Confianza HIGH.
- GitHub Docs, disable/enable workflows: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows (schedule desactivado tras 60 días sin actividad en repos públicos). Confianza HIGH.
- Pausa por inactividad del free tier de Supabase: conocimiento previo, sin verificar en esta sesión. Confianza MEDIUM.

---
*Architecture research for: PWA del clima de una sola localidad (Winifreda) en Next.js + Vercel Hobby*
*Researched: 2026-10-23*
