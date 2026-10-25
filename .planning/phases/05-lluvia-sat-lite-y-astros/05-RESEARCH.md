# Fase 5: Lluvia, satélite y astros — Research

**Investigado:** 2026-10-25 (requests reales entre 13:50 y 14:00 UTC)
**Dominio:** Open-Meteo Historical (ERA5 + IFS), NASA GIBS WMS/WMTS (GOES-East Band 13), suncalc 2.1.1 y route handlers binarios en Next 16 / Vercel
**Confianza:** HIGH (casi todo se verificó con requests reales a Winifreda o con el código instalado)

## Summary

Las tres piezas se pueden hacer **sin dependencias nuevas**. No hace falta `sharp`, ni librería de mapa, ni basemap. Tampoco hace falta leer los ToS de OpenFreeMap, porque no se usa basemap.

**Satélite.** GIBS sirve la capa por **WMS GetMap**, que devuelve un único JPEG de 720×720 ya recortado al bbox que pidamos, de unos 20–50 KB. Así no hay teselas que componer.

- El nombre de la capa que figura en CLAUDE.md (`…_v0_NRT_ZENJPEG`) **ya no existe**. La vigente es `GOES-East_ABI_Band13_Clean_Infrared`: PNG en WMTS, nivel máximo 6 (unos 2 km/px) y un paso cada 10 minutos.
- La paleta **no es gris pura**. Es gris para lo cálido y pasa a cian, azul, verde, amarillo, rojo y blanco para topes por debajo de unos −20 °C. Corresponde, entonces, la variante de pie **"con escala de color"** del UI-SPEC.
- **Pitfall verificado dos veces:** el DescribeDomains de GIBS anuncia el último paso (por ejemplo 13:30Z) antes de que el WMS lo tenga. Mientras tanto, el WMS responde **200 con un JPEG negro de 3321 bytes**. Hay que detectar la imagen en blanco (por tamaño) y retroceder de a 10 min.
- La latencia real fue de unos 30–40 min.

**Lluvia.** La costura queda resuelta con datos.

- El archivo con `models=era5` llega hasta **7 días atrás**: el 25/10 el último día completo era el 18/10, y el día local 19/10 viene `null` porque está incompleto.
- El archivo con `best_match` o `ecmwf_ifs`, y el `past_days` del forecast, traen **IFS HRES** hasta hoy, incluidas las horas *futuras* de hoy, que son pronóstico.
- ERA5 e IFS difieren bastante. En el acumulado 2026 hasta el 18/10, ERA5 da 432,8 mm e IFS 489,3 mm (+13 %). En abril, 28,8 contra 62,3.
- Como la normal 1991–2020 sale obligatoriamente de ERA5 (IFS empieza en 2017), lo coherente es: **ERA5 explícito (`models=era5`) para todo lo que ERA5 cubre, más el `past_days` del forecast (IFS) solo para el hueco de unos 7 días, y hoy sumado por hora hasta la hora actual**.
- La climatología 1991–2020 de ERA5 se bajó en una sola request: 198 KB, 4,7 s, sin nulls. Da **702 mm/año**, un valor plausible. Pesa unas 783 "API calls" en el cómputo de Open-Meteo, así que se genera **una sola vez con un script** y se commitea como JSON de 365 valores.

**Astros.** suncalc 2.1.1 ya da todo gratis:

- `getTimes(date, lat, lon, 0, -180)` coincide con Open-Meteo: salida 06:20, puesta 19:42 y duración de 801,8 min, contra 801,9 de Open-Meteo.
- `getMoonTimes(date, lat, lon, -180)` da salida y puesta de la luna.
- `getMoonIllumination()` trae `fraction`, `phase`, `angle` y `waxing`.
- La próxima luna llena no viene en la API, pero se obtiene en unos 7 ms barriendo `phase` hora por hora.

**Recomendación principal:** cinco módulos.

1. `lib/rain/*`: funciones puras para la costura, los acumulados, la normal prorrateada, la última lluvia y la comparación.
2. Dos adapters en `lib/sources/`: `openMeteoArchive` (ERA5) y `openMeteoRecentRain` (`past_days`).
3. Un JSON de climatología commiteado.
4. `lib/sources/gibs.ts` (DescribeDomains + WMS con fallback de paso en blanco) y una ruta `app/api/satelite/[stamp]/route.ts` que sirve bytes cacheados con `Cache-Control` inmutable por stamp.
5. `lib/sky/astro.ts` ampliado con funciones puras para sol y luna.

<user_constraints>
## User Constraints (de CONTEXT.md)

### Decisiones bloqueadas
- **D-01:** Los períodos son **de calendario**:
  - Semana: desde el lunes de la semana actual, en hora argentina.
  - Mes: desde el día 1.
  - Año: desde el 1 de enero.
  - No se usan ventanas móviles de 7/30/365 días.
- **D-02:** El año es el **año calendario** (enero–diciembre). No se muestra la campaña agrícola.
- **D-03:** Cada acumulado se muestra como **número grande + barra** contra el promedio 1991–2020 prorrateado a la misma fecha, con un texto corto. Ejemplos: "20 % menos de lo normal", "casi lo normal", "35 % más de lo normal". La barra marca dónde cae lo normal a esta fecha.
- **D-04:** Se suma una línea con la **última lluvia**: "Última lluvia: hace 6 días, 12 mm". Usa el mismo origen de datos que los acumulados. La regla de qué cuenta como "día con lluvia" la elige el planner con un umbral razonable (≥ 1 mm diario) y la documenta.
- **D-05:** Junto a los acumulados va siempre la aclaración RAIN-03: "Estimado por reanálisis, no pluviómetro".

### A criterio de Claude (el dueño no quiso discutirlo; tomadas como bloqueadas por el UI-SPEC)
- **D-06 · Orden de la pestaña:** es una sola página con scroll, en este orden:
  1. Hero compacto con el cielo animado y la silueta, igual que `/pronostico`.
  2. Sol y luna.
  3. Lluvia acumulada.
  4. Satélite.
  - El satélite va al final porque es lo más pesado y se carga diferido.
  - No hay bloques plegables.
- **D-07 · Satélite:**
  - Muestra una **imagen fija del último pase disponible**, sin animación en esta fase, centrada en Winifreda. El encuadre (región de La Pampa y alrededores, del tamaño suficiente para ver tormentas que se acercan) lo decide el research/planner.
  - Lleva un marcador de Winifreda y la hora de la imagen en hora argentina ("imagen de las 21:40").
  - La imagen se compone o sirve desde el servidor con caché. El cliente no le pega a NASA GIBS en cada visita. Hay que verificar el GetCapabilities antes de implementar (CLAUDE.md, MEDIUM).
  - Debajo va el link "Ver radar del SMN", que abre afuera.
- **D-08 · Sol y luna:**
  - Muestra salida y puesta del sol y duración del día, en hora argentina.
  - Suma la diferencia con el día anterior ("+1 min"), que es barata y se lee bien.
  - Fase lunar dibujada para el **hemisferio sur**: en Argentina la luna creciente se ilumina del lado izquierdo, al revés que en el hemisferio norte.
  - Dibujo: un SVG propio con la iluminación de `SunCalc.getMoonIllumination()`, más el nombre de la fase y el porcentaje iluminado.
  - Las salidas y puestas de la luna y la próxima luna llena son opcionales: el planner las incluye solo si salen gratis de suncalc.
- **D-09 · Pestaña:** se pone `enabled: true` para `cielo` en `lib/sections.ts`. El botón **Modelos** no se toca en esta fase; se elimina en la fase 4 (decisión del 2026-10-25).
- **D-10 · Datos de lluvia:**
  - Fuentes: el acumulado observado del año en curso sale del archivo histórico de Open-Meteo (ERA5) cosido con `past_days` del forecast para los últimos días que el archivo todavía no cubre. La climatología 1991–2020 se calcula una vez y se cachea por días, o se genera estática en build.
  - Nada se pide desde el cliente; todo pasa por el servidor con `revalidate`, según CLAUDE.md.
  - La costura exacta entre ERA5 y `past_days` es tema del research.

### Ideas diferidas (FUERA DE ALCANCE)
- **Campaña agrícola (julio–junio):** se ofreció y el dueño eligió solo el año calendario. Se puede reconsiderar para un público rural.
- **Animación del satélite** (últimas horas): queda para después de medir el peso de la imagen fija.
- **Eventos astronómicos** (eclipses, superluna): SKY-07, v2.

**Contrato de UI aprobado:** `05-UI-SPEC.md` (status: approved). Copy, tamaños, estados y umbrales del texto comparativo están fijados ahí. Este research solo resuelve los puntos que el UI-SPEC dejó abiertos (ver "Puntos abiertos del UI-SPEC: resueltos").
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descripción | Qué lo habilita en este research |
|----|-------------|----------------------------------|
| RAIN-01 | Lluvia acumulada de semana, mes y año | Costura ERA5 + `past_days` (§Patrón 1). URLs verificadas. `stitchDailyRain` + `accumulate` puras |
| RAIN-02 | Comparación contra 1991–2020 prorrateado a la misma fecha | JSON de climatología ERA5 (702 mm/año, suavizado circular de 31 días). Normal prorrateada al mismo último día observado, con hoy proporcional a las horas (§Patrón 2) |
| RAIN-03 | Aclaración "estimado por reanálisis, no pluviómetro" | Copy fija del UI-SPEC. Matiz: los últimos ~7 días son IFS (análisis/pronóstico), no ERA5 (Open Question 1, resuelta: se mantiene la copy) |
| SAT-01 | Imagen IR GOES-East reciente centrada en Winifreda | Capa `GOES-East_ABI_Band13_Clean_Infrared` verificada en GetCapabilities. WMS GetMap 720×720 JPEG con bbox EPSG:3857 de 800 km. Fallback de paso en blanco. Ruta `/api/satelite/[stamp]` (§Patrón 3) |
| SAT-02 | Link externo al radar del SMN | `https://www.smn.gob.ar/radar` responde 200 ("Imagenes Radar", incluye "Anguil (La Pampa)"). No hay deep link por radar (lo filtra JS) |
| ASTRO-01 | Salida/puesta del sol y duración del día | `getTimes(…, 0, -180)` verificado contra Open-Meteo (±0,1 min) |
| ASTRO-02 | Fase lunar dibujada para el hemisferio sur | `getMoonIllumination` → `fraction`, `phase`, `waxing`. `moonPath` puro. `getMoonTimes` y la búsqueda de la próxima llena salen gratis |
</phase_requirements>

## Project Constraints (de CLAUDE.md)

- Todo gratis: Vercel Hobby, Open-Meteo free (no comercial: máximo 10.000 calls/día, 5.000/h, 600/min).
- **No pegarle a las APIs externas en cada visita.** Todo pasa por la caché del servidor (`unstable_cache` + `readThrough` en este repo). El cliente nunca llama a NASA ni a Open-Meteo.
- Stack: Next.js 16.4.3 (App Router, Turbopack), TypeScript ^5, Tailwind v4, zod 4 en el borde servidor→API externa, Vitest para funciones puras.
- `cacheComponents` apagado: se usa `export const revalidate` (modelo clásico).
- Runtime Node en route handlers que lo necesiten. Nada de Edge.
- Coordenadas fijas (`LAT`/`LON` en `lib/config.ts`), sin geocoding.
- RainViewer no cubre Argentina: el reemplazo es el satélite IR de GIBS (esta fase).
- No instalar `@types/suncalc` (suncalc 2.1.1 trae tipos propios).
- Mobile first (iPhone).
- Flujo GSD: los cambios se hacen dentro de `/gsd-execute-phase`.
- Patrones del repo: adapters `lib/sources/*` con `fetch…Raw` (lanza `SourceError`) + `unstable_cache` + getter `…Fresh(bucket)` + `readThrough`; schemas `*.schema.ts` con zod; tests junto al módulo; `process.env.TZ='UTC'` en Vitest; fechas con `lib/time.ts` (nunca `new Date(naive)` ni `toLocaleString` sin `hourCycle: 'h23'`).

## Architectural Responsibility Map

| Capacidad | Tier primario | Tier secundario | Por qué |
|-----------|---------------|-----------------|---------|
| Serie diaria de lluvia observada (costura) | API / Backend (adapters + funciones puras en server components) | Data Cache (`unstable_cache`) | Requests pesadas a Open-Meteo, validación zod, cuota compartida: nunca en el cliente |
| Climatología 1991–2020 | Estático (JSON commiteado, generado por script) | — | Inmutable. Recalcularla cuesta unas 783 calls |
| Acumulados, normal prorrateada, comparación, última lluvia | Funciones puras en `lib/rain/` (corren en el render del servidor) | — | Lógica con riesgo, testeable con Vitest |
| Último paso disponible de GOES-East | API / Backend (`lib/sources/gibs.ts`) | Data Cache | DescribeDomains + verificación de imagen en blanco |
| Bytes de la imagen satelital | Route Handler `app/api/satelite/[stamp]` | CDN de Vercel (`s-maxage` inmutable) | El cliente pide solo una URL propia (D-07) |
| Marcador de Winifreda | Browser (capa HTML/SVG sobre `<img>`) | — | Nítido a cualquier DPR. Posición calculada en el servidor desde el bbox |
| Sol y luna | Funciones puras sobre suncalc, render del servidor | — | Cálculo local, nunca falla |
| `onError` de la imagen | Browser (isla cliente mínima, opcional) | — | Único caso cliente del bloque (UI-SPEC) |

## Standard Stack

### Core (ya instalado, sin cambios)
| Librería | Versión | Propósito | Fuente |
|----------|---------|-----------|--------|
| next | 16.4.3 | Página ISR `/cielo`, route handler binario | `package.json` [VERIFIED: codebase] |
| suncalc | 2.1.1 | Sol, luna, fase, salida/puesta de la luna | `node_modules/suncalc/index.d.ts` leído [VERIFIED: codebase] |
| zod | ^4.6.7 | Schemas de archivo y `past_days` | [VERIFIED: codebase] |
| vitest | 5.0.5 | Tests de funciones puras | `npx vitest --version` [VERIFIED] |

### Servicios externos (sin key)
| Servicio | Endpoint verificado | Uso |
|----------|---------------------|-----|
| Open-Meteo Archive | `https://archive-api.open-meteo.com/v1/archive` (`models=era5`, `daily=precipitation_sum`) | Serie observada del año + climatología (script) [VERIFIED: request real] |
| Open-Meteo Forecast | `https://api.open-meteo.com/v1/forecast` (`hourly=precipitation&past_days=14&forecast_days=1`) | Relleno del hueco de ERA5 y de hoy [VERIFIED: request real] |
| NASA GIBS WMTS DescribeDomains | `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/GOES-East_ABI_Band13_Clean_Infrared/default/GoogleMapsCompatible_Level6/all/{start}--{end}.xml` | Último paso disponible (respuesta de unos 380 B) [VERIFIED: request real] |
| NASA GIBS WMS | `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&…` | JPEG 720×720 del bbox [VERIFIED: request real] |

### Alternativas consideradas
| En vez de | Se podría usar | Por qué no |
|-----------|----------------|------------|
| WMS GetMap (un JPEG) | Teselas WMTS z6 (PNG de unos 45–48 KB c/u) compuestas con `sharp` | Suma una dependencia nativa (binarios en Vercel). Habría que componer 4–6 teselas y recortar. El WMS ya hace el recorte y el resampleo |
| WMS GetMap | Teselas WMTS en una grilla CSS en el cliente | El cliente le pegaría a NASA (viola D-07). Además serían 6 requests y PNG pesados |
| GetCapabilities completo (5,8 MB) para la hora | DescribeDomains con ventana corta (380 B) | 15.000 veces más liviano |
| Archivo `best_match` para todo el año (sin costura) | — | Es IFS, no ERA5. Inconsistente con la normal ERA5: +13 % en 2026 |
| Climatología con `revalidate` de días | JSON commiteado | Cada refetch cuesta unas 783 calls y 4,7 s. El dato no cambia nunca |
| Climatología generada en `next build` | JSON commiteado | El build dependería de Open-Meteo y gastaría cuota en cada deploy |

**Instalación:** ninguna. No se agregan paquetes.

## Package Legitimacy Audit

No aplica: la fase **no instala paquetes nuevos**. `sharp` se evaluó y se descartó (no hace falta componer teselas). slopcheck no se ejecutó porque no hay paquetes que auditar.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (ninguno) | — | — |

**Packages removed:** ninguno. **Packages flagged:** ninguno.

## Architecture Patterns

### Diagrama de flujo

```
               ┌───────────────────────── render ISR de /cielo (revalidate 600) ─────────────────────────┐
               │                                                                                          │
 now ─────────►│ astro: getTimes / getMoonIllumination / getMoonTimes ──► sunDay(), moonInfo() ──► Bloque 1│
               │                                                                                          │
               │ getRainSeries() ─┬─► readThrough(archive ERA5, TTL 6 h) ──► archive-api (models=era5)    │
               │                  └─► readThrough(recent IFS, TTL 30 min) ──► forecast (past_days=14)     │
               │        │                                                                                 │
               │        ▼                                                                                 │
               │ stitchDailyRain(era5Daily, recentHourly, now) ──► {days[], dataUntil, todayFraction}     │
               │        │                     climatology.json (365 valores, commiteado)                  │
               │        ▼                                │                                                │
               │ periodTotals(semana/mes/año) + normalFor(período, dataUntil, fracción) ──► compareRain() │
               │ lastRain(days, ≥1 mm) ──────────────────────────────────────────────────────► Bloque 2  │
               │                                                                                          │
               │ getSatelliteLatest() (readThrough, TTL 600)                                               │
               │   ├─ DescribeDomains [now−3h, now] ──► último paso T                                     │
               │   └─ para T, T−10, T−20: getSatelliteFrame(stamp)  ◄── unstable_cache por stamp          │
               │         (WMS GetMap JPEG; lanza error si no es image/jpeg o si pesa < 8 KB = en blanco) │
               │   ──► {stamp, timeISO} ──► <img src="/api/satelite/20261025T1320Z.jpg"> + marcador ─► Bloque 3│
               └──────────────────────────────────────────────────────────────────────────────────────────┘

 Browser (lazy) ──GET /api/satelite/[stamp]──► valida el stamp (regex, grilla de 10 min, ventana de 24 h)
                                         ──► getSatelliteFrame(stamp) (misma caché) ──► bytes JPEG
                                         ──► Cache-Control: public, max-age=86400, s-maxage=31536000, immutable
                                         (CDN de Vercel: GIBS se toca a lo sumo una vez por stamp)
```

### Estructura recomendada

```
app/cielo/page.tsx                    # ISR 600, <Hero compact below={…}> (copia de /pronostico)
app/cielo/loading.tsx
app/api/satelite/[stamp]/route.ts     # runtime nodejs, bytes JPEG con Cache-Control inmutable
components/cielo/SolLuna.tsx          # server
components/cielo/LluviaAcumulada.tsx  # server
components/cielo/Satelite.tsx         # server (+ client/SateliteImg.tsx si se usa onError)
components/cielo/MoonDisc.tsx         # SVG puro (server)
lib/rain/stitch.ts (+ .test.ts)       # costura ERA5 + recent, dataUntil, fracción de hoy
lib/rain/periods.ts (+ .test.ts)      # lunes de la semana, día 1, 1 de enero (ART); acumulados
lib/rain/normal.ts (+ .test.ts)       # normal prorrateada con climatology.json
lib/rain/compare.ts (+ .test.ts)      # compareRain() (tabla del UI-SPEC)
lib/rain/lastRain.ts (+ .test.ts)     # umbral RAIN_DAY_MM = 1
lib/rain/climatology-1991-2020.json   # generado por scripts/climatology.mjs (commiteado)
lib/sources/openMeteoArchive.ts/.schema.ts/.test.ts
lib/sources/openMeteoRecentRain.ts/.schema.ts/.test.ts
lib/sources/gibs.ts/.test.ts          # domains → latest slot, URL WMS, detección de blanco
lib/satellite/frame.ts (+ .test.ts)   # BBOX 3857, stamp <-> ISO, validación del stamp, posición del marcador
lib/sky/moon.ts (+ .test.ts)          # moonPath, moonPhaseName, nextFullMoon
lib/sky/sun.ts (+ .test.ts)           # sunDay(now): salida, puesta, duración, delta vs ayer
scripts/climatology.mjs               # one-shot, documentado; NO corre en build
```

### Patrón 1: costura ERA5 + `past_days` (D-10) [VERIFIED: requests reales]

**Datos medidos el 2026-10-25:**

| Fuente | Último día con dato | Notas |
|--------|---------------------|-------|
| archive `models=era5` | **2026-10-18** (el 19/10 local es `null`: el hourly de ERA5 llega hasta 19/10 20:00 ART = 23:00 UTC) | Open-Meteo documenta "Daily with 5 days delay"; en la práctica fueron **7 días** |
| archive `era5_seamless` | 2026-10-18 | Igual que `era5` para precipitación acá |
| archive `era5_land` | sin datos en octubre | No usar |
| archive `best_match` / `ecmwf_ifs` | 2026-10-25 **incluidas las horas futuras de hoy** | Es IFS HRES 9 km, no reanálisis |
| forecast `past_days=14` (best_match) | idéntico a archive `ecmwf_ifs` día por día | En Winifreda, best_match = IFS |

- `end_date` > hoy da error: `"Parameter 'end_date' is out of allowed range from 1940-01-01 to 2026-10-25"`. Usar siempre `end_date = localDateKey(now)` (ART). Entre las 21:00 y las 24:00 ART la fecha ART es menor que la UTC, así que nunca se pasa del rango.
- La `timezone=America/Argentina/Buenos_Aires` hace que `daily` agregue por día local y que un día local incompleto venga `null`. Es la señal de "ERA5 todavía no cubre este día".

**Algoritmo (función pura `stitchDailyRain(era5Daily, recentHourly, now)`):**

1. `todayKey = localDateKey(now)` y `hourNow = localHour(now)`.
2. Se agrega `recentHourly` por día local (`time.slice(0,10)`).
   - Un día pasado es **completo** si tiene 24 valores no nulos.
   - Para hoy se suman solo las horas con `HH ≤ hourNow`. El valor horario de Open-Meteo es la suma de la hora *anterior*: el de las 10:00 cubre de 09 a 10.
   - `todayFraction = (hourNow + 1) / 24` sirve para prorratear la normal de hoy. Alternativa más simple: `hourNow / 24`. Cualquiera de las dos es aceptable; hay que documentar la elegida.
3. Se recorre `d` desde `seriesStart` hasta `todayKey`:
   - Si `era5[d] != null`, se usa ERA5 (`source: 'era5'`).
   - Si no, si `d` está en `recent` (completo, o hoy parcial), se usa ese valor (`source: 'recent'`).
   - Si no, **se corta**: `dataUntil = d − 1`, y los días siguientes no se inventan.
4. Devuelve `{ days: {date, mm, source}[], dataUntil, todayIncluded, todayFraction }`.
5. "Datos atrasados" (Notice del UI-SPEC) se da cuando `dataUntil < addDaysToKey(todayKey, -1)`. Con `past_days=14` solo pasa si ERA5 se atrasa más de unos 13 días o si falla el adapter `recent`.

**Inicio de la serie:** `seriesStart = min(lunesDeLaSemana, 1 de enero) − 90 días`.

- El lunes puede caer en diciembre del año anterior (por ejemplo, el 01/01/2027 es viernes y la semana arranca el lunes 28/12/2026).
- Los 90 días de margen le dan a "Última lluvia" historia suficiente en enero. Cuestan unas 6,5 calls extra por fetch, que es aceptable.
- Si el planner prefiere la versión mínima, `seriesStart = min(lunes, 1 de enero)`, y la copy "Sin lluvias … desde el {1 de enero}" cubre el caso.

**Fallo parcial:**

- Si falla el adapter ERA5 → estado "Sin datos" del bloque (UI-SPEC).
- Si falla solo `recent` → hay serie hasta el último día ERA5 y aparece el Notice "Los datos de lluvia llegan hasta el {sábado 18}". No hay que tirar todo el bloque.

**TTLs:**

- Archive ERA5: 6 h (21.600 s). ERA5 se actualiza una vez por día; un fetch de unos 390 días pesa unas 28 calls, o sea ~110 calls/día con el bucket fresh.
- Recent: 1800 s (unas 1–2 calls por fetch).
- Las dos van con `readThrough` y su getter `…Fresh(bucket)`, igual que `openMeteoForecast.ts`.

**URLs** (siempre con `URLSearchParams`; con curl, el `/` sin codificar del timezone falló):

```ts
// Source: request real verificada 2026-10-25
const archiveUrl = (start: string, end: string) =>
  `https://archive-api.open-meteo.com/v1/archive?${new URLSearchParams({
    latitude: String(LAT), longitude: String(LON),
    start_date: start, end_date: end,
    daily: 'precipitation_sum', models: 'era5', timezone: TZ,
  })}`
// Devuelve daily.precipitation_sum (sin sufijo, porque es un solo modelo). Grilla ERA5: lat -36.25, lon -64.25.

const RECENT_RAIN_URL = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
  latitude: String(LAT), longitude: String(LON),
  hourly: 'precipitation', past_days: '14', forecast_days: '1', timezone: TZ,
})}`
```

**Sesgo de la costura:** los últimos unos 7 días salen de IFS y el resto de ERA5. Comparados día a día en octubre (`10-15: 1,0 / 1,0`; `10-16: 0,1 / 0,0`), son parecidos en eventos chicos. En sumas largas difieren, pero solo se cosen unos 7 días: el error es acotado y aceptable [VERIFIED: requests reales].

### Patrón 2: climatología y normal prorrateada [VERIFIED: request real]

- Request única: `archive?…&start_date=1991-01-01&end_date=2020-12-31&daily=precipitation_sum&models=era5&timezone=…`. Devuelve 10.958 días, 0 nulls, 198 KB, en 4,7 s.
- Resultado: **702,0 mm/año** (mínimo 397, máximo 1109).
- Promedios mensuales: ene 83,1 · feb 79,2 · mar 88,7 · abr 69,2 · may 30,2 · jun 15,5 · jul 17,8 · ago 25,6 · sep 48,9 · oct 84,7 · nov 75,5 · dic 83,7.
- Días con ≥ 1 mm: 78/año. Días con ≥ 0,1 mm: 123/año. Esto es llovizna espuria de ERA5 y justifica el umbral de 1 mm.

**Script `scripts/climatology.mjs`** (one-shot, se corre a mano y su salida se commitea):

1. Calcula la media por `MM-DD` sobre un calendario no bisiesto de 365 días. El 29/02 se descarta: aporta 0,02 mm/año.
2. Aplica un **suavizado circular de 31 días** (media móvil centrada, que conserva el total anual).
3. Redondea a 3 decimales y escribe `{ source: 'Open-Meteo archive ERA5', lat, lon, period: '1991-2020', smoothing: 'circular-31d', annualMm: 702.0, daily: number[365] }` (unos 3 KB).

Efecto del suavizado, medido:

| Ventana | Normal 19–25/10 | Normal 1–25/10 | Normal 1/1–25/10 | Semana 8–14/06 |
|---------|-----------------|----------------|------------------|----------------|
| cruda | 17,3 | 65,0 | 523,1 | 3,6 |
| 15 días | 18,1 | 65,9 | 524,3 | 4,3 |
| 31 días | 19,0 | 65,4 | 525,6 | 3,7 |

La serie cruda es ruidosa día a día (de 0,02 a 8,82 mm/día). Para la fila "semana" conviene suavizar; el anual no cambia. **Usar 31 días.**

**Normal prorrateada** (`normalFor(start, dataUntil, todayFraction)`):

- Es la suma de `daily[doy(d)]` para `d` en `[start, dataUntil]`, mapeando el 29/02 al valor del 28/02.
- Si `dataUntil == today`, el día de hoy se pondera por `todayFraction`.
- **Se prorratea hasta `dataUntil`, no hasta hoy**, para que "a la misma fecha" sea literal cuando los datos están atrasados.

**Cuota:** según open-meteo.com/en/pricing, más de 2 semanas cuenta como varias calls, en forma fraccional. 30 años son unas 783 calls: está bajo el límite de 5.000/h y 10.000/día, pero es un desperdicio repetirlo [CITED: open-meteo.com/en/pricing].

### Patrón 3: satélite GIBS por WMS [VERIFIED: requests reales]

**Capa** (del GetCapabilities EPSG:3857, 5,8 MB, leído el 2026-10-25):

- `GOES-East_ABI_Band13_Clean_Infrared`, título "Clean Infrared (10.3 µm, Band 13, ABI, GOES-East)".
- Formato `image/png` (WMTS), TileMatrixSet `GoogleMapsCompatible_Level6`, dimensión Time con paso `PT10M` y una ventana de unas 18 h de NRT en el listado.
- Colormap: `https://gibs.earthdata.nasa.gov/colormaps/v1.3/Clean_Longwave_Infrared_Window_Band.xml`.
- **No existe** `GOES-East_ABI_Band13_Clean_Infrared_v0_NRT_ZENJPEG` (ni ninguna capa `ZENJPEG` o `v0_NRT`): **CLAUDE.md está desactualizado en ese nombre.**
- También existe en EPSG:4326 (TileMatrixSet `2km`).

**Paleta** (colormap leído, 239 entradas en °C):

- Gris lineal de 183 a 12 para temperaturas de brillo entre unos −17 °C y +53 °C (más frío = más claro).
- Por debajo de unos −20 °C: cian (0,255,255), azules, verde (77,255,0), naranja (255,128,0), rojo oscuro (77,0,0) y, por debajo de −80 °C, gris claro a blanco.
- La imagen de las 00:00Z del 25/10 mostró núcleos cian, azul y verde.
- **Conclusión: va el pie "con escala de color"** del UI-SPEC: `Los colores fuertes marcan topes de nube muy fríos, típicos de las tormentas.`

**Encuadre recomendado: 800 km de lado, centrado en Winifreda, EPSG:3857, 720×720 JPEG.**

- Centro en 3857: x = −7.150.051, y = −4.332.316 (fórmula Web Mercator, R = 6.378.137).
- Factor de escala a −36,23°: k = 1/cos(lat) = 1,2397. Medio lado = 400 km × k = 495.878 m de Mercator.
- **BBOX = `-7645928,-4828193,-6654173,-3836438`** (minx, miny, maxx, maxy; en WMS 1.3.0 con EPSG:3857 el orden de ejes es x,y). Verificado: 200 `image/jpeg`.
- Por qué 800 km:
  - Cubre toda La Pampa (−35° a −39,3°, −63,4° a −68,3°: de Winifreda al borde oeste hay unos 4,4°, o sea unos 400 km) y el sur de Córdoba, San Luis y el oeste de Buenos Aires.
  - Una tormenta a 50 km/h tarda unas 8 h en cruzar el medio lado: alcanza para "lo que se acerca".
- Resolución nativa de unos 2 km/px (unos 405 px nativos en el bbox). GIBS reescala a 720, así que se ve suave, no pixelado.
- Tamaño medido: **19,6–46 KB** por imagen (≤ 200 KB del UI-SPEC).
- **El marcador queda en el centro exacto (50 %, 50 %)** porque el bbox está centrado. Igual se calcula con una función pura `markerPosition(lat, lon, bbox)`, como pide el UI-SPEC.
- El lado real en el suelo varía de unos 835 km en el borde norte a unos 760 km en el sur (Mercator). El pie dice `unos 800 km`.

**Elegir el paso** (`getSatelliteLatest`):

1. DescribeDomains con ventana `[now−3h, now]` → `<Domain>2026-10-25T11:00:00Z/2026-10-25T13:30:00Z/PT10M</Domain>`. Puede venir una lista separada por comas: se toma el `end` del último rango.
   - La respuesta trae `Cache-Control: public, max-age=1800` (CloudFront). Por eso el `end` de la URL se redondea al bucket de 10 min, así la URL cambia y no queda pegada 30 min a una respuesta vieja.
2. **Pitfall verificado dos veces:** a las 13:50Z el domain anunciaba 13:20Z y el WMS devolvía JPEG **negro de 3321 bytes**; dos minutos después ya estaba. A las 13:58Z pasó lo mismo con 13:30Z. Por eso se prueban candidatos `T, T−10, T−20` (máximo 3) y gana el primero con `content-type: image/jpeg` y **más de 8.000 bytes**. Una imagen real en ese bbox pesó siempre 19 KB o más; la negra, 3,3 KB.
3. `TIME` futuro o inexistente → también 200 y negro. Sin `TIME`, el WMS devuelve un paso **no documentado**. Hay que pasar siempre `TIME` explícito.
4. Error de capa o parámetro → **200 `text/xml`** (ServiceException). Hay que validar el `content-type` y nunca cachear algo que no sea `image/jpeg`.
5. `TIME=YYYY-MM-DD` (fecha sola) = las 00:00Z de ese día. No usarlo.

**Servir los bytes:**

- `getSatelliteFrame = unstable_cache(async (stamp) => { … return { b64, stamp, fetchedAt } }, ['gibs-frame','v1'], { revalidate: 86400 })`.
  - Lanza `SourceError('nasa-gibs', 'blank' | 'schema' | http_…)` en cualquier imagen mala, así no se cachea.
  - En base64 son unos 26–62 KB por entrada, lejos de cualquier límite de la Data Cache.
- La ruta `app/api/satelite/[stamp]/route.ts`:
  - `export const runtime = 'nodejs'`.
  - Valida `stamp` (con o sin `.jpg`) contra `^\d{8}T\d{4}Z$`, minutos múltiplo de 10 y `now − 24h ≤ t ≤ now`. Si no cumple → 404 sin cuerpo.
  - Llama `getSatelliteFrame(stamp)` y responde con `new Response(Buffer.from(b64,'base64'), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } })`.
  - Si falla → 404 o 502 con `Cache-Control: no-store`.
  - Vercel cachea las respuestas de Functions con `s-maxage` en su CDN y consume `s-maxage` antes de mandarle la respuesta al cliente [CITED: vercel.com/docs/caching/cache-control-headers].
- La página guarda solo `{ stamp, timeISO }` (de `getSatelliteLatest`, con TTL 600 + `readThrough`) y emite `<img src={`/api/satelite/${stamp}.jpg`}>`.
  - Como la URL lleva el stamp, la página y la imagen nunca se desincronizan, y la CDN guarda cada paso para siempre.
  - Si `getSatelliteLatest` no tiene ningún paso bueno, la página no emite `<img>` y muestra el estado "Sin imagen (servidor)". Esto hace opcional la isla `onError` del UI-SPEC: se recomienda igual una isla chica, porque la ruta puede devolver 404 si la caché se purgó y GIBS está caído.
- **Hora de la imagen** = el `TIME` del paso (instante nominal de inicio del escaneo ABI), formateado con `formatHHmm`. "Vieja" (> 90 min, UI-SPEC) es esperable solo si GIBS se atrasa: la latencia normal medida fue de unos 30–40 min, más hasta 10 min de ISR.
- **Contornos de La Pampa:** no salen gratis. `Reference_Features_15m` vía WMS devolvió una PNG vacía (2 KB) en el bbox, y GIBS no tiene límites provinciales. **Omitirlos** (el UI-SPEC los deja como opcionales).

### Patrón 4: sol (ASTRO-01) [VERIFIED: node con suncalc instalado]

```ts
// Source: node_modules/suncalc/index.d.ts (2.1.1) + ejecución real
import { getTimes } from 'suncalc'
const UTC_OFFSET_MIN = -180 // minutos, positivo al este: ART = −180 (ya usado en lib/sky/astro.ts)
const t = getTimes(now, LAT, LON, 0, UTC_OFFSET_MIN)                       // día civil ART que contiene `now`
const y = getTimes(new Date(now.getTime() - 86_400_000), LAT, LON, 0, UTC_OFFSET_MIN)
// 2026-10-25 → sunrise 06:20:23, sunset 19:42:10 (Open-Meteo: 06:20 / 19:42)
// duración hoy 801,78 min, ayer 799,62 → delta 2,16 → "2 min más que ayer"
```

- La duración es `sunset − sunrise` y se formatea `{h} h {mm} min`.
- **El delta va redondeado sobre la diferencia en minutos con decimales** (`Math.round(hoy − ayer)`), no sobre la resta de dos valores ya redondeados.
- `sunrise`/`sunset` son `Date | null` en el tipo. A −36° nunca son null, pero hay que tiparlo con guard.
- Formatear siempre con `formatHHmm` (h23). Con `toLocaleString('es-AR')` sin `hourCycle`, la puesta salió **"07:42:10"** en este runtime.
- La regla del día usa la posición `minutos desde 00:00 ART / 1440`.

### Patrón 5: luna (ASTRO-02) [VERIFIED: node con suncalc instalado]

- `getMoonIllumination(now)` devolvió `{ fraction: 0.9940, phase: 0.4782, angle: -83.8, waxing: true }`. Con la tabla del UI-SPEC: "Luna llena", "Iluminada al 99 %".
- **Lado iluminado en el hemisferio sur:** creciente (`waxing === true`, equivale a `phase < 0.5`) → **izquierda**; menguante → derecha. Conviene usar `waxing` del tipo en vez de recomparar `phase`.
- `moonPath(fraction, waxing)`:
  - Medio disco del lado iluminado (arco de radio 31) más media elipse del terminador con `rx = 31·|1 − 2·fraction|`.
  - Si `fraction < 0.5`, la elipse recorta hacia el lado iluminado; si `fraction > 0.5`, suma.
  - En SVG: `M 32 1 A 31 31 0 0 {sweepLit} 32 63 A {rx} 31 0 0 {sweepTerm} 32 1 Z`, con los `sweep` dependientes del lado y de `fraction ≷ 0.5`. Se testea con los casos del UI-SPEC: cuarto creciente iluminado a la izquierda, extremos nueva/llena.
- **Salida y puesta de la luna: gratis.** `getMoonTimes(now, LAT, LON, -180)` → el 25/10 da `rise 07:29`, `set 05:37`, sin `alwaysUp`/`alwaysDown`. Los campos son opcionales (`rise?`, `set?`) y se omite la parte que falte, como dice el UI-SPEC.
- **Próxima luna llena: gratis.** No hay API, pero se barre `getMoonIllumination` cada 1 h hasta 31 días buscando el cruce `phase < 0.5 → ≥ 0.5`. Son 744 llamadas en **7,3 ms** (medido). El 25/10/2026 da el 26/10 a las ~02:00 ART. Para más precisión, primero pasos de 6 h y después bisección; no hace falta para mostrar el día.
- **Regla:** se omite la línea "Llena el …" cuando el nombre actual ya es "Luna llena" (ventana ±0,0339). Si no, hoy mismo diría "Luna llena · Llena el lunes 26". El UI-SPEC pide omitir solo "si es hoy"; esta regla lo extiende de forma consistente, y conviene documentarla.
- La luna se calcula para el instante del render ISR (hasta 10 min de desfase), lo que es irrelevante para la fase.

### Anti-patrones a evitar
- **Pedir el GetCapabilities completo en runtime:** son 5,8 MB. Usar DescribeDomains.
- **Llamar al WMS sin `TIME`:** el paso que devuelve no está documentado.
- **Cachear la respuesta del WMS sin validarla:** errores y huecos vuelven como 200 (XML o JPEG negro).
- **Usar `best_match` del archivo para el año en curso:** es IFS, no ERA5, y no es coherente con la normal.
- **Tomar el `daily.precipitation_sum` de hoy del forecast o del archivo IFS:** incluye horas futuras pronosticadas.
- **Leer `request.nextUrl.searchParams` en `/cielo` o meter query params:** la página dejaría de ser ISR (lo dice el comentario de `/pronostico`).
- **Llamar `fetch…Raw()` directo desde el render:** volvería dinámica la página (comentario en `openMeteoForecast.ts`). Siempre a través de `unstable_cache`.
- **`new Date('2026-10-25')` para iterar días:** usar `addDaysToKey`, `localDateKey` y `weekdayIndex` de `lib/time.ts`.

## Don't Hand-Roll

| Problema | No construir | Usar | Por qué |
|----------|--------------|------|---------|
| Recorte y reproyección de la imagen satelital | Componer teselas con canvas o `sharp` | WMS GetMap de GIBS con BBOX | Una request, un JPEG, sin dependencias |
| Último paso disponible | Parsear el GetCapabilities | DescribeDomains con ventana corta | 380 B contra 5,8 MB |
| Efemérides sol/luna | Fórmulas propias | suncalc 2.1.1 (`getTimes`, `getMoonTimes`, `getMoonIllumination`) | Ya instalado y verificado contra Open-Meteo |
| Climatología | Promedios pedidos en runtime | JSON commiteado | Inmutable; 783 calls por cálculo |
| Formateo de horas y fechas ART | `toLocaleString` | `formatHHmm`, `localDateKey`, `addDaysToKey`, `weekdayLong` de `lib/time.ts` | ICU varía entre runtimes; quirk de 12 h verificado |
| Caché con fallback al último bueno | Lógica ad hoc | `unstable_cache` + `readThrough` existentes | Patrón probado en las fases 1–3 |

## Runtime State Inventory

No aplica: es una fase de features nuevas, no un rename ni una migración. El único "estado" nuevo es la Data Cache (`unstable_cache`, claves `['open-meteo-archive','v1']`, `['open-meteo-recent-rain','v1']`, `['gibs-latest','v1']`, `['gibs-frame','v1']`) y la CDN por stamp. Se versionan con el sufijo `v1`: si cambia el schema o el bbox, hay que subir a `v2` (el bbox también debería ir en la clave de la frame, o al menos `v2` cuando cambie).

## Common Pitfalls

### Pitfall 1: el JPEG negro "válido" de GIBS
**Qué pasa:** DescribeDomains lista un paso que el WMS todavía no tiene. El WMS responde 200 `image/jpeg` de 3321 bytes, todo negro, y si se cachea queda una caja negra con hora "reciente".
**Cómo evitarlo:** umbral de bytes (> 8.000), candidatos T, T−10 y T−20, y `throw` dentro de la función cacheada para que no se guarde.
**Señal:** imagen negra en `/cielo`. Test con fixture de 3321 bytes.

### Pitfall 2: errores WMS como 200 XML
**Cómo evitarlo:** chequear que `content-type` empiece con `image/jpeg` antes de leer el body.

### Pitfall 3: costura con días duplicados o huecos
**Qué pasa:** ERA5 da `null` para el día local parcial (19/10). Si se trata como 0, se pierde lluvia; si se suman ERA5 e IFS el mismo día, se duplica.
**Cómo evitarlo:** prioridad estricta ERA5 no-null > recent > corte, con un solo valor por fecha. Tests de frontera: último día ERA5, primer día recent, hoy parcial, hueco.

### Pitfall 4: hoy incluye pronóstico
**Qué pasa:** `daily.precipitation_sum[today]` del forecast y del archivo IFS incluye las 24 h (las futuras son pronóstico).
**Cómo evitarlo:** hoy = suma horaria con `HH ≤ hora actual ART`.

### Pitfall 5: `end_date` en el futuro
**Qué pasa:** el archivo devuelve error si `end_date` es mayor que hoy.
**Cómo evitarlo:** `end_date = localDateKey(now)`.

### Pitfall 6: semana que cruza el año
**Qué pasa:** el lunes de la semana cae en diciembre del año anterior y la serie arranca el 1 de enero.
**Cómo evitarlo:** `seriesStart = min(lunes, 1 de enero) − margen`. Test con `now = 2027-01-01`.

### Pitfall 7: normal prorrateada "a hoy" con datos atrasados
**Cómo evitarlo:** prorratear hasta `dataUntil`, con hoy ponderado por la fracción horaria.

### Pitfall 8: 29 de febrero
**Cómo evitarlo:** la climatología tiene 365 entradas; el 29/02 usa la del 28/02. Test con `now = 2028-02-29`.

### Pitfall 9: ISR, hora del render y desfase de la página
**Qué pasa:** la hora "ahora" de la regla del día y la luna corresponden al render ISR (hasta 600 s). Es aceptable. **No** usar `Date.now()` dentro de funciones cacheadas sin pasarlo como argumento: hay que respetar el patrón puro con `nowMs`.

### Pitfall 10: el nombre de la capa en CLAUDE.md
**Qué pasa:** `…_v0_NRT_ZENJPEG` no existe; usarlo da error XML.
**Cómo evitarlo:** constante `GIBS_LAYER = 'GOES-East_ABI_Band13_Clean_Infrared'` en `lib/config.ts`. Conviene sumar una nota para corregir CLAUDE.md (fuera del alcance del código; el planner puede incluir la edición como tarea de docs).

### Pitfall 11: `SourceId` cerrado
**Qué pasa:** `SourceError` exige `SourceId = 'open-meteo' | 'met-norway'`.
**Cómo evitarlo:** extender el tipo con `'open-meteo-archive' | 'nasa-gibs'`. Se verificó que no hay `Record<SourceId,…>` ni `switch` exhaustivos que se rompan (grep). Hay que revisar si `/api/health` o el snapshot listan fuentes y que las nuevas **no** entren en el `SourceStatus` del snapshot de Ahora.

### Pitfall 12: caché de CloudFront en DescribeDomains
**Qué pasa:** la respuesta trae `max-age=1800`. Una URL fija (por ejemplo `…/all/--2099….xml`) queda congelada hasta 30 min.
**Cómo evitarlo:** el `end` de la ventana va redondeado al bucket de 10 min actual.

## Code Examples

### DescribeDomains → último paso (puro, testeable)
```ts
// Source: respuesta real de GIBS 2026-10-25
// <Domain>2026-10-25T11:00:00Z/2026-10-25T13:30:00Z/PT10M</Domain>
export function latestSlotFromDomains(xml: string): string | null {
  const m = /<Domain>([^<]{1,20000})<\/Domain>/.exec(xml)
  if (!m) return null
  const last = m[1].split(',').at(-1)?.trim() ?? ''
  const end = last.split('/')[1] ?? last.split('/')[0]
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/.test(end) ? end : null
}
```

### URL WMS
```ts
// Source: request real verificada (200 image/jpeg, 720x720, 19–46 KB)
export const GIBS_BBOX_3857 = [-7645928, -4828193, -6654173, -3836438] as const // 800 km, centro Winifreda
export const gibsWmsUrl = (timeIso: string) =>
  `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?${new URLSearchParams({
    SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0',
    LAYERS: 'GOES-East_ABI_Band13_Clean_Infrared', STYLES: '',
    CRS: 'EPSG:3857', BBOX: GIBS_BBOX_3857.join(','),
    WIDTH: '720', HEIGHT: '720', FORMAT: 'image/jpeg', TIME: timeIso,
  })}`
export const BLANK_MAX_BYTES = 8_000 // negro 720² = 3.321 B; imágenes reales ≥ 19.651 B
```
`URLSearchParams` codifica `:` y `,`. Hay que verificar en la implementación que GIBS acepte `TIME` y `BBOX` codificados; en las pruebas con curl se mandaron sin codificar. Si rechaza la versión codificada, armar la query a mano para esos dos parámetros. [ASSUMED: que acepte percent-encoding; es lo estándar en servidores OGC]

### Ruta binaria
```ts
// app/api/satelite/[stamp]/route.ts — Source: patrón de Next 16 route.ts + docs de Vercel Cache-Control
export const runtime = 'nodejs'
export async function GET(_req: Request, { params }: RouteContext<'/api/satelite/[stamp]'>) {
  const { stamp } = await params
  const iso = parseStamp(stamp.replace(/\.jpg$/, ''), Date.now()) // null si no cumple el formato, la grilla o la ventana de 24 h
  if (!iso) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  try {
    const frame = await getSatelliteFrame(stamp.replace(/\.jpg$/, ''))
    return new Response(Buffer.from(frame.data.b64, 'base64'), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response(null, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
```

### Comparación de lluvia
Implementar exactamente la tabla "Texto comparativo" del UI-SPEC (constantes con nombre: `EARLY_NORMAL_MM = 2`, `NOTHING_MM = 0.5`, `NEAR_BAND = 0.1`, `round5`).

## State of the Art

| Antes | Ahora | Cuándo | Impacto |
|-------|-------|--------|---------|
| `GOES-East_ABI_Band13_Clean_Infrared_v0_NRT_ZENJPEG` (citado en CLAUDE.md) | `GOES-East_ABI_Band13_Clean_Infrared` (PNG, Level6, colormap con realce) | Verificado el 2026-10-25 | Corregir la constante y CLAUDE.md |
| Paleta asumida en grises | Gris + realce de color por debajo de unos −20 °C | Colormap v1.3 | Pie "con escala de color" |
| ERA5 "5 días de demora" (docs) | 7 días observados para el día local completo | 2026-10-25 | `past_days=14` da margen |
| Archivo `best_match` = ERA5 | `best_match` = IFS HRES + ERA5 + ERA5-Land; para fechas recientes, IFS | Docs actuales de Open-Meteo | Pedir `models=era5` explícito |
| suncalc 1.x (sin offset civil ni tipos) | suncalc 2.1.1: `utcOffset` en `getTimes` y `getMoonTimes`, `waxing`, tipos propios | 2026 | API más simple para el día civil ART |

## Puntos abiertos del UI-SPEC: resueltos

| Punto | Resolución | Fuente |
|-------|------------|--------|
| Encuadre y lado en km | 800 km de lado, centrado en Winifreda, BBOX 3857 `-7645928,-4828193,-6654173,-3836438`, 720×720. Pie: `El cuadro abarca unos 800 km de lado.` Marcador al 50 %/50 % | Requests reales |
| Capa gris o coloreada | **Coloreada** (gris + realce frío). Pie: `Los colores fuertes marcan topes de nube muy fríos, típicos de las tormentas.` | Colormap + imagen 00Z |
| URL vigente del radar SMN | `https://www.smn.gob.ar/radar` (200, título "Imagenes Radar", lista "Anguil (La Pampa)"). No hay deep link a Anguil (filtro JS `filter('ANG_240',2)`) | curl con UA de iPhone |
| Umbral de "día con lluvia" | **≥ 1,0 mm diario** (`RAIN_DAY_MM = 1`). Es la convención habitual de "día de lluvia" (índice R1mm de ETCCDI) [ASSUMED como convención]. Con datos: ERA5 da 123 días/año con ≥ 0,1 mm (llovizna espuria) contra 78 con ≥ 1 mm | Climatología bajada |
| Salida/puesta de la luna y próxima llena | **Ambas gratis**: `getMoonTimes(…, -180)` y un barrido horario de `phase` (7 ms). Se incluyen. Se omite "Llena el…" mientras el nombre sea "Luna llena" | suncalc 2.1.1 ejecutado |
| Cadencia de caché | Archivo ERA5 6 h · recent 30 min · último paso GIBS 10 min · frame por stamp 1 día en Data Cache + CDN inmutable · página ISR 600 s | Diseño |
| `sharp` | **No hace falta** (WMS). Sin dependencias nuevas | — |
| OpenFreeMap ToS | No aplica: no hay basemap | — |

## Assumptions Log

| # | Afirmación | Sección | Riesgo si es falsa |
|---|------------|---------|--------------------|
| A1 | GIBS WMS acepta `TIME` y `BBOX` con percent-encoding (`%3A`, `%2C`) | Code Examples | Bajo: se arma la query a mano |
| A2 | El umbral de 8.000 bytes separa siempre el JPEG en blanco de uno real (con 720², lo más chico medido fue 19,6 KB) | Patrón 3 | Medio: un cielo totalmente uniforme podría bajar del umbral. Mitigación alternativa: comparar con el tamaño exacto de 3321 B ± 10 %, o pedir a la vez un PNG de 8×8 |
| A3 | ≥ 1 mm es la convención ETCCDI de "día con lluvia" | Puntos abiertos | Bajo: el valor lo pidió CONTEXT de todos modos |
| A4 | La latencia de ERA5 se mantiene en unos 5–8 días (`past_days=14` alcanza) | Patrón 1 | Bajo: si no, aparece el Notice de datos atrasados (ya diseñado) |
| A5 | La Data Cache de Vercel guarda entradas de `unstable_cache` de ~60 KB sin problema | Patrón 3 | Bajo: muy por debajo del límite de 2 MB conocido para fetch cache |
| A6 | La hora `TIME` del paso es el inicio nominal del escaneo (el full disk dura unos 10 min) | Patrón 3 | Ninguno práctico |

## Open Questions (RESOLVED)

1. **¿La copy RAIN-03 sigue siendo exacta cuando los últimos días son IFS?** — RESUELTA. Se mantiene "Estimado por reanálisis, no pluviómetro". Los ~7 días finales son análisis/pronóstico del mismo centro (ECMWF), igual de "no pluviómetro". El UI-SPEC está aprobado y no hay que cambiar copy. Si el planner quiere, `source` por día queda en el modelo para una futura aclaración.
2. **¿Suavizado de 15 o de 31 días?** — RESUELTA: 31 días circular (se documenta en el JSON). La diferencia es menor de 1 mm en la semana y de 2,5 mm en el año.
3. **¿Margen de 90 días antes del 1 de enero para "Última lluvia"?** — RESOLVED: se incluye el margen de 90 días (recomendado). Si el planner lo saca, la copy del UI-SPEC para "ninguna" ya cubre el caso.
4. **¿Corregir CLAUDE.md (nombre de capa GIBS)?** — RESOLVED: una tarea de docs de esta fase corrige el nombre de la capa en CLAUDE.md. No bloquea.

## Environment Availability

| Dependencia | Requerida por | Disponible | Versión | Fallback |
|-------------|---------------|------------|---------|----------|
| Node.js | build, scripts, tests | ✓ | 24.18.0 | — |
| Vitest | tests | ✓ | 5.0.5 | — |
| suncalc | astros | ✓ | 2.1.1 | — |
| archive-api.open-meteo.com | lluvia, script de climatología | ✓ (200) | — | Estado "Sin datos" del bloque |
| api.open-meteo.com (`past_days`) | hueco ERA5 | ✓ (200) | — | Notice de datos atrasados |
| gibs.earthdata.nasa.gov (WMS + WMTS domains) | satélite | ✓ (200) | — | Estado "Sin imagen" + link SMN |
| www.smn.gob.ar/radar | link externo | ✓ (200 con UA de navegador) | — | — (solo es un link) |

**Faltantes que bloquean:** ninguno.

## Validation Architecture

### Test Framework
| Propiedad | Valor |
|-----------|-------|
| Framework | Vitest 5.0.5 (`environment: 'node'`, `process.env.TZ='UTC'`) |
| Config | `vitest.config.ts` (alias `@`, `server-only` → `test/empty.ts`) |
| Comando rápido | `npx vitest run lib/rain lib/sky lib/satellite lib/sources` |
| Suite completa | `npm test && npm run typecheck && npm run lint` |

### Mapa requisitos → tests
| Req | Comportamiento | Tipo | Comando | ¿Existe? |
|-----|----------------|------|---------|----------|
| RAIN-01 | Costura ERA5/recent: prioridad, hueco → `dataUntil`, hoy parcial con horas ≤ ahora | unit | `npx vitest run lib/rain/stitch.test.ts` | ❌ Wave 0 |
| RAIN-01 | Inicio de semana (lunes ART), mes y año. Semana que cruza el año (`2027-01-01`). Acumulados | unit | `npx vitest run lib/rain/periods.test.ts` | ❌ Wave 0 |
| RAIN-02 | Normal prorrateada hasta `dataUntil`, hoy por fracción, 29/02 → 28/02. Suma de climatología ≈ 702 ± 1, longitud 365 | unit | `npx vitest run lib/rain/normal.test.ts` | ❌ Wave 0 |
| RAIN-02 | `compareRain`: cada fila de la tabla del UI-SPEC y bordes (0,9, 1,1, 2, 3, normal < 2) | unit | `npx vitest run lib/rain/compare.test.ts` | ❌ Wave 0 |
| RAIN-01/D-04 | `lastRain` con umbral 1 mm: hoy, ayer, 2–14 días, > 14 días, ninguna | unit | `npx vitest run lib/rain/lastRain.test.ts` | ❌ Wave 0 |
| RAIN-01 | Schemas zod del archivo y de recent (fixtures reales; arrays de distinto largo → `schema`) | unit | `npx vitest run lib/sources/openMeteoArchive.test.ts lib/sources/openMeteoRecentRain.test.ts` | ❌ Wave 0 |
| RAIN-03 | La aclaración aparece siempre que hay números | manual o `/dev/estados` | revisión visual | — |
| SAT-01 | `latestSlotFromDomains` (rango simple, lista con comas, XML basura → null) | unit | `npx vitest run lib/sources/gibs.test.ts` | ❌ Wave 0 |
| SAT-01 | Selección de candidato: negro (3321 B) → T−10; XML 200 → error; los tres malos → null | unit (fetch mockeado) | `npx vitest run lib/sources/gibs.test.ts` | ❌ Wave 0 |
| SAT-01 | `parseStamp`: formato, grilla de 10 min, ventana de 24 h, futuro → null. `markerPosition` = (0,5, 0,5). BBOX con lado 800 km ± 1 % | unit | `npx vitest run lib/satellite/frame.test.ts` | ❌ Wave 0 |
| SAT-01 | La ruta devuelve `image/jpeg` + `Cache-Control` inmutable; stamp inválido → 404 | smoke | `curl -sI http://localhost:3000/api/satelite/<stamp>.jpg` tras `npm run build && npm start` | manual |
| SAT-02 | Link con `href="https://www.smn.gob.ar/radar"`, `target=_blank`, `rel="noopener noreferrer"` | unit/smoke | grep en el HTML de `/cielo` | manual |
| ASTRO-01 | `sunDay(2026-10-25T14:00Z)` → 06:20 / 19:42, 13 h 22 min, "+2 min". Diciembre/junio. "igual que ayer" cerca del solsticio | unit | `npx vitest run lib/sky/sun.test.ts` | ❌ Wave 0 |
| ASTRO-02 | `moonPath`: creciente iluminada a la izquierda, menguante a la derecha, nueva = sin iluminación, llena = disco | unit | `npx vitest run lib/sky/moon.test.ts` | ❌ Wave 0 |
| ASTRO-02 | `moonPhaseName` en los bordes de la tabla. `nextFullMoon(2026-10-25)` = 26/10 | unit | `npx vitest run lib/sky/moon.test.ts` | ❌ Wave 0 |
| ASTRO-02 | Cuarto creciente visto iluminado a la izquierda | manual (`/dev/estados`) | revisión visual | — |

### Muestreo
- **Por commit de tarea:** `npx vitest run <archivos tocados>`.
- **Por wave:** `npm test && npm run typecheck`.
- **Gate de fase:** suite completa en verde + `npm run build` (comprueba que `/cielo` siga siendo ISR, no dinámica) antes de `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Fixtures reales recortados en `lib/sources/__fixtures__/`. Se capturan con las URLs de este documento:
  - `open-meteo-archive-era5.json`: unos 30 días con `null` al final.
  - `open-meteo-recent-rain.json`: `past_days=14` horario.
  - `gibs-domains.xml`
  - `gibs-blank.jpg`: 3321 B. Se genera con `TIME` futuro.
  - `gibs-frame.jpg`: ≤ 50 KB, también sirve para `/dev/estados`.
- [ ] `lib/rain/climatology-1991-2020.json` generado por `scripts/climatology.mjs` antes de los tests de `normal`.
- [ ] Tests nuevos listados arriba. No hace falta instalar framework.

## Security Domain

### Categorías ASVS aplicables (nivel 1)

| Categoría ASVS | Aplica | Control estándar |
|----------------|--------|------------------|
| V2 Authentication | no | Sin auth en esta fase |
| V3 Session Management | no | — |
| V4 Access Control | no | Contenido público |
| V5 Input Validation | **sí** | `[stamp]` de la ruta validado con regex, grilla de 10 min y ventana de 24 h (allowlist estricta). Respuestas upstream validadas con zod (Open-Meteo) y con content-type + tamaño (GIBS) |
| V6 Cryptography | no | — |
| V7 Error Handling/Logging | sí | Solo códigos gruesos (`SourceError.code`), nunca texto upstream ni stacks (patrón existente). La ruta responde 404/502 sin cuerpo |
| V12 Files/Resources | sí | Content-type fijo `image/jpeg` + `nosniff`. Cota de tamaño de la frame (rechazar > 1 MB) |
| V14 Config | sí | Sin secretos nuevos. UA identificatorio existente (`USER_AGENT`) también para GIBS |

### Amenazas conocidas para este stack

| Patrón | STRIDE | Mitigación |
|--------|--------|------------|
| Usar `/api/satelite/[stamp]` como proxy abierto o para quemar la cuota de GIBS | DoS / Elevation | Host, capa y bbox fijos en el servidor. El parámetro solo elige `TIME` dentro de 144 valores posibles (24 h × 6). Stamp inválido → 404 sin fetch. Cada stamp válido toca GIBS una vez (Data Cache + CDN) |
| SSRF por URL construida con input | Tampering | El input nunca entra a la URL salvo como `TIME` ya normalizado desde el parse (no se reinyecta el string crudo) |
| Envenenar la caché con respuesta upstream mala (XML o negro) | Tampering | `throw` dentro de `unstable_cache` ante content-type o tamaño inválido; no se guarda |
| Content sniffing de la respuesta binaria | Spoofing | `Content-Type: image/jpeg` + `X-Content-Type-Options: nosniff` |
| Reverse tabnabbing en el link al SMN | Spoofing | `rel="noopener noreferrer"` |
| Agotar la cuota de Open-Meteo | DoS | `unstable_cache` + `readThrough` con TTL de 6 h y 30 min. Climatología estática |
| Filtrar errores upstream al cliente | Info disclosure | Patrón `SourceError` existente: solo códigos |

## Sources

### Primarias (HIGH)
- GIBS WMTS GetCapabilities EPSG:3857 y EPSG:4326 (`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities`), descargado el 2026-10-25: identificador, formato, TileMatrixSet, dimensión Time, plantillas de DescribeDomains, links del colormap.
- GIBS colormap `https://gibs.earthdata.nasa.gov/colormaps/v1.3/Clean_Longwave_Infrared_Window_Band.xml` (239 entradas).
- GIBS WMS GetMap y DescribeDomains: requests reales (JPEG 19,6–46 KB, JPEG negro de 3321 B, error XML con 200, `Cache-Control: max-age=1800` en domains).
- Open-Meteo archive (`era5`, `era5_seamless`, `era5_land`, `ecmwf_ifs`, `best_match`, `era5_ensemble`) y forecast `past_days`: requests reales para −36,23/−64,23; climatología 1991–2020 completa.
- https://open-meteo.com/en/docs/historical-weather-api: latencias (ERA5 "Daily with 5 days delay", IFS "Every 6 hours with no delay"), composición de Best Match.
- https://open-meteo.com/en/pricing: límites del plan free y cómputo fraccional (> 2 semanas o > 10 variables).
- `node_modules/suncalc/index.d.ts` 2.1.1 + ejecución real en Node 24.
- Context7 `/vercel/next.js/v16.2.9`: route handlers con segmentos dinámicos, `generateStaticParams` y `revalidate`.
- https://vercel.com/docs/caching/cache-control-headers (actualizado el 2026-09-14): `s-maxage` en respuestas de Functions, prioridad de `CDN-Cache-Control`.
- `https://www.smn.gob.ar/radar`: 200, HTML con la lista de radares (incluye Anguil).

### Secundarias (MEDIUM)
- NASA Earthdata data use policy / pedido de reconocimiento de GIBS (búsqueda web): https://www.earthdata.nasa.gov/earth-observation-data/data-use-policy, https://www.earthdata.nasa.gov/gibs. La atribución corta "GOES-East, NASA GIBS." del UI-SPEC alcanza para uso personal; conviene revisar la redacción exacta en la página de GIBS si se quiere el texto largo.

### Terciarias (LOW)
- Convención ETCCDI R1mm para "día con lluvia" (conocimiento previo, no verificado en esta sesión).

## Metadata

**Desglose de confianza:**
- Stack: HIGH. No hay dependencias nuevas y todo lo existente está verificado en el repo.
- Satélite: HIGH en capa, paleta, bbox, tamaños y pitfall del negro (reproducido dos veces). MEDIUM en el umbral exacto de 8 KB.
- Lluvia: HIGH en latencias, costura y climatología (medidas). MEDIUM en la estabilidad de la latencia de ERA5 en el tiempo.
- Astros: HIGH (ejecutado y comparado contra Open-Meteo).
- Pitfalls: HIGH (casi todos observados en vivo).

**Fecha del research:** 2026-10-25
**Válido hasta:** unos 30 días. GIBS renombra capas sin aviso (ya pasó con `ZENJPEG`), así que conviene revalidar el identificador si la ejecución se demora.
