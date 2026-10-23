# Pitfalls Research

**Domain:** Web/PWA del clima de una sola localidad (Winifreda, La Pampa) — Next.js en Vercel Hobby, Open-Meteo (Forecast multi-modelo, Ensemble, Historical), MET Norway, RainViewer, cielo generativo animado, PWA en iOS y Web Push disparado por GitHub Actions
**Researched:** 2026-10-23
**Confidence:** MEDIUM-HIGH (límites de servicios verificados en docs oficiales; comportamiento de iOS/push en parte con fuentes comunitarias)

> Nombres de fases usados abajo (sugeridos, el roadmap puede renombrarlos):
> **F1 Capa de datos y caché** · **F2 Ahora / 48 h / diario** · **F3 Modelos y ensemble** · **F4 Lluvia acumulada** · **F5 Radar** · **F6 Cielo vivo** · **F7 PWA iOS/Android** · **F8 Alertas push + cron**

---

## Critical Pitfalls

### Pitfall 1: RainViewer ya no es lo que dicen los tutoriales (y puede no tener datos de Winifreda)

**What goes wrong:**
Se construye el radar siguiendo ejemplos viejos (nowcast a futuro, zoom 10+, esquemas de color a elección, satélite) y nada de eso existe más en el plan gratis. Además, la cobertura de radares argentinos en RainViewer es irregular: hay reportes de usuarios de que los datos de Argentina "desaparecieron" por períodos.

**Why it happens:**
RainViewer recortó su API pública. Según su Transition FAQ oficial, desde el **1 de enero de 2026**: zoom máximo **7**, un solo esquema de color (**Universal Blue**), **nowcast discontinuado**, satélite discontinuado, rate limit de **100 requests por IP por minuto**. Lo que queda son tiles del radar pasado: unas 2 h en pasos de 10 min. El uso permitido es personal o educativo. La mayoría de los tutoriales, librerías y respuestas de LLM son anteriores a esto.

**How to avoid:**
- Antes de diseñar la pantalla de radar, hacé un spike: pedí `weather-maps.json` y renderizá los tiles z≤7 sobre Winifreda en distintos días con lluvia. Confirmá que aparecen ecos de los radares de SINARAME cercanos (INTA Anguil, Alejandro Roca y otros).
- Diseñá para zoom 7 (un tile cubre unos 300 km). Para no ver pixelado, usá `maxNativeZoom: 7` en Leaflet/MapLibre y dejá que el mapa escale por encima. No pidas tiles z>7.
- Mostrá solo el "pasado" (loop de las últimas ~2 h). Nada de "lluvia en los próximos 30 min" basado en RainViewer.
- 100 req/min es por IP. El cliente pide los tiles directo desde el iPhone, así que no hace falta proxy. No los proxies por Vercel: compartirías IP y gastarías transferencia.
- Atribución visible a RainViewer con link.
- Tené un plan B: si no hay frames o la cobertura es mala, ocultá el módulo con un mensaje claro, o linkeá al radar del SMN. Que el radar no bloquee nada.

**Warning signs:** Tiles transparentes en días de tormenta conocidos; 429 en la consola; el código pide `/nowcast` o `color=2..8`.

**Phase to address:** F5 (con un spike de cobertura temprano, idealmente en F1, porque condiciona si el radar sigue en scope).

---

### Pitfall 2: "Los modelos opinan" contando dos veces al ECMWF

**What goes wrong:**
El indicador de coincidencia muestra "4 de 4 modelos coinciden", pero MET Norway, fuera de la región nórdica/ártica, **usa datos de ECMWF** (la doc de su data model habla de ECMWF ~9 km y su ensemble de 51 miembros para el mediano plazo). ECMWF vota dos veces y el "consenso" es engañoso.

**Why it happens:**
Se trata a MET Norway como un modelo independiente porque es otro proveedor. La API de Locationforecast cubre todo el globo, pero su prioridad es Escandinavia.

**How to avoid:**
- En la UI, presentá MET Norway como "MET Norway (post-proceso sobre ECMWF)" o directamente como fuente de "otra lectura" de ECMWF. En el cálculo de coincidencia, contalo junto a ECMWF y no como voto separado. Otra opción: reemplazar ese voto por un modelo realmente distinto que ya da Open-Meteo (GEM de Canadá, UKMO, ICON). Eso además sale gratis en la misma request.
- El indicador de coincidencia se calcula sobre variables comparables (temperatura máx/mín, lluvia diaria ≥1 mm sí/no, viento máx) con tolerancias explícitas (por ejemplo ±2 °C). No se calcula sobre `weather_code`.

**Warning signs:** ECMWF y MET Norway casi idénticos todos los días; el "acuerdo" sube artificialmente.

**Phase to address:** F3.

---

### Pitfall 3: Probabilidad de lluvia mal calculada desde el ensemble

**What goes wrong:**
Se promedian los miembros y después se aplica un umbral, o se usa el `precipitation_probability` horario (>0,1 mm en la hora previa) como si fuera "probabilidad de que llueva hoy". Resultado: probabilidades infladas (llovizna de 0,1 mm cuenta como lluvia) o desinfladas (el promedio diluye la señal). El día 8–14 aparece vacío o con saltos.

**Why it happens:**
- La doc de Open-Meteo aclara que `precipitation_probability` del Forecast API sale de ensembles y es la probabilidad de **>0,1 mm en la hora previa**. Eso no es probabilidad diaria.
- Los ensembles tienen largos y resoluciones distintas: ICON-EPS global **7,5 días** (40 miembros), GFS Ensemble 0,25° **10 días** (31, 3-horario), ECMWF IFS 0,25° ENS **15 días** (51, 3-horario y después 6-horario), GFS 0,5° 35 días. Para 14 días solo quedan ECMWF ENS y GEFS 0,5°.
- Un request de ensemble pesa varias "calls": la doc muestra un ejemplo de 1 variable y 7 días que cuenta como **4,0 calls**.

**How to avoid:**
- Probabilidad diaria = fracción de miembros cuya **suma diaria (en hora local)** supera un umbral con sentido agronómico (≥1 mm; opcional ≥10 mm como "lluvia importante"). Se calcula miembro por miembro y recién después se cuenta.
- Si combinás ensembles de varios modelos, pesá por modelo (por ejemplo, cada modelo vale 1/N), no por cantidad de miembros: si no, los 51 de ECMWF aplastan al resto. Documentá la decisión.
- Cuando un modelo termina su horizonte, sacalo del denominador. Mostrá en la UI qué modelos aportan a cada día.
- Pedí solo `precipitation` (y quizá `temperature_2m`) al Ensemble API, 1 vez cada 3–6 h (los ensembles corren cada 6–12 h), y cacheá el resultado ya agregado, no los miembros crudos.

**Warning signs:** Días con 100 % de probabilidad y 0,3 mm; probabilidades que cambian de golpe en el día 8 (corte de ICON) o en el 11 (corte de GFS 0,25).

**Phase to address:** F3 (lógica pura y testeable con fixtures JSON).

---

### Pitfall 4: Días "corridos" por mezclar UTC con hora argentina

**What goes wrong:**
La lluvia "de hoy" incluye la de 21:00–23:59 de ayer. El meteograma arranca 3 h corrido. Hay hydration mismatch en React porque el servidor (Vercel, UTC) y el iPhone formatean distinto. "Mañana" cambia a las 21:00.

**Why it happens:**
- Open-Meteo devuelve GMT por defecto. `timezone` es obligatorio para variables diarias y devuelve horas locales **sin offset** (ISO "naive").
- Las funciones de Vercel corren en UTC. `new Date("2026-10-23T14:00")` se interpreta en la zona del runtime.
- Argentina es UTC−3 fijo, sin horario de verano desde 2009. Mucha gente "fija" −3 a mano en distintos lugares, y si algún día vuelve el DST se rompe todo.

**How to avoid:**
- Un único módulo `time.ts` como fuente de verdad: pedí a Open-Meteo `timezone=America/Argentina/Buenos_Aires` **y** `timeformat=unixtime` (la doc lo recomienda para evitar ambigüedades). Toda agregación diaria se hace con `Intl.DateTimeFormat(..., { timeZone: 'America/Argentina/Buenos_Aires' })` o Temporal/date-fns-tz, nunca con `getDate()`.
- MET Norway devuelve UTC (`...Z`): convertilo antes de agrupar por día.
- Renderizá fechas y horas en el servidor con zona explícita, o pasá timestamps y formateá en el cliente con zona explícita. Nunca uses la zona implícita de ninguno de los dos.
- Tests con instantes frontera: 02:59Z y 03:00Z.

**Warning signs:** Sumas diarias que no cierran con las horarias; warnings de hydration; diferencias entre local (dev en Argentina) y producción (UTC). Que funcione bien en tu notebook es justamente la trampa.

**Phase to address:** F1.

---

### Pitfall 5: "Lluvia del mes" vacía los últimos 5 días (o presentada como si fuera un pluviómetro)

**What goes wrong:**
Se usa el Historical API (ERA5) para "semana/mes/año" y los últimos ~5 días faltan o vienen `null`. Con la semana y el mes en curso, la cifra queda baja justo después de una tormenta. El otro error: se compara el mes **en curso** contra el promedio del mes **completo** ("llevás 20 mm de 90 mm promedio" el día 5 parece sequía).

**Why it happens:**
- Según la doc, ERA5 y ERA5-Land se actualizan diario con unos **5 días de atraso**. "IFS Assimilation Long-Window" va con 2 días. ERA5 es de ~25 km, y ERA5-Land no tiene precipitación propia (usa la de ERA5).
- Un reanálisis de 25 km suaviza las tormentas convectivas pampeanas. El productor de Winifreda que tiene su pluviómetro va a ver diferencias de decenas de mm.

**How to avoid:**
- Cosé las fuentes: Historical (ERA5) hasta `hoy − 6 días` + Forecast API con `past_days` (hasta 92) para el tramo reciente + lo que va de hoy. Marcá en el dato qué tramo es "reanálisis" y cuál "modelo".
- Comparación justa: acumulado a la fecha contra el **normal acumulado a la misma fecha** (prorrateado por día). Para el año, enero-a-hoy contra el normal enero-a-hoy.
- Normales: calculá 1991–2020 **una sola vez** (script offline o build) y guardalas como JSON estático en el repo. Pedir 30 años diarios en cada request pesa decenas de "calls" y no cambia nunca.
- Copy honesto: "Lluvia estimada (modelo/reanálisis), no medida". Si querés, dejá un "Cargá tu pluviómetro" para más adelante.
- Ojo con sumar `precipitation` horaria vs `precipitation_sum` diaria: sale lo mismo solo si la agregación es por día local (Pitfall 4).

**Warning signs:** Semana actual en 0 mm después de un temporal; el % del mes siempre bajo los primeros días; valores `null` al final de la serie.

**Phase to address:** F4.

---

### Pitfall 6: Rate limit de Open-Meteo por IP compartida de Vercel

**What goes wrong:**
Aparecen 429 "Daily API request limit exceeded" aunque la app haga pocas requests.

**Why it happens:**
El plan gratis tiene límites de 600/min, 5.000/h, 10.000/día y 300.000/mes **por IP y por aplicación**. Los términos mismos advierten que en hosting compartido el límite se puede alcanzar antes. Las funciones de Vercel salen por IPs compartidas con miles de otras apps. Además, las requests "grandes" (más de 10 variables o más de 2 semanas) cuentan fraccionado como varias calls, y los ensembles pesan más.

**How to avoid:**
- Todo pasa por caché del servidor con TTL acorde a la frecuencia real de actualización: "ahora" 10–15 min, horario/diario 30–60 min, ensemble 3–6 h, histórico 12–24 h, normales estáticas.
- **Persistí el último dato bueno** (Supabase, que igual vas a tener, o Vercel Blob) y servilo con su timestamp si Open-Meteo falla. Nunca una pantalla vacía.
- Agrupá: una sola request multi-modelo (`models=ecmwf_ifs025,gfs_seamless,icon_seamless,...`) en vez de una por modelo. Pedí solo las variables que usás.
- Header `User-Agent` propio, y la atribución CC BY 4.0 visible ("Weather data by Open-Meteo.com").
- Si se vuelve crónico: el cron (F8) puede precalentar la caché, y como último recurso se evalúa la API key paga. Fuera de scope por costo.

**Warning signs:** 429 intermitentes en logs sin picos de tráfico propio; errores solo en producción y nunca en local.

**Phase to address:** F1.

---

### Pitfall 7: Caché de Next.js que no cachea (o que cachea un error)

**What goes wrong:**
(a) Cada visita le pega a las APIs porque en Next 15/16 los `GET` de Route Handlers y `fetch` **no se cachean por defecto**. Se violan los ToS de MET Norway y se quema el límite de Open-Meteo. (b) Se cachea por horas una respuesta de error o un JSON vacío. (c) Se mezclan `export const revalidate` con `cacheComponents`/`"use cache"`, que no conviven: con Cache Components activado, `dynamic`, `revalidate` y `fetchCache` se reemplazan por `"use cache"` + `cacheLife`.

**Why it happens:**
Los tutoriales de Next 13/14 asumen caché por defecto. ISR es stale-while-revalidate: el primer visitante después de mucho tiempo ve un dato viejo, y si la regeneración devuelve "éxito" con datos basura, eso queda cacheado.

**How to avoid:**
- Elegí **un** modelo de caché y documentalo en F1. Con Next 16, o `cacheComponents: true` + `"use cache"` + `cacheLife` en funciones de datos (`getForecast()`, etc.), o el modelo clásico con `fetch(..., { next: { revalidate } })`. No los mezcles.
- En las funciones cacheadas, si el upstream falla, **lanzá** (throw). No devuelvas `{}`. Así Next conserva la versión anterior, y el fallback con "último dato bueno" se resuelve fuera de la función cacheada.
- Todo payload lleva `fetchedAt`, y la UI muestra "Actualizado hace X min". Si supera 2× el TTL, aviso visual.
- Verificá en producción (no en `next dev`, que no cachea igual) con logs que cuenten requests salientes por hora.
- No hagas fetch de clima en build time: si la API falla, falla el deploy.

**Warning signs:** Logs de Vercel con un fetch a api.met.no por cada visita; `x-vercel-cache: MISS` siempre; datos "congelados" desde la última caída.

**Phase to address:** F1.

---

### Pitfall 8: MET Norway devuelve 403/429 por User-Agent, decimales o falta de caché condicional

**What goes wrong:**
403 Forbidden en producción, o throttling 429.

**Why it happens (ToS oficiales):**
- User-Agent identificatorio obligatorio (app/dominio + contacto). Los genéricos (`okhttp`, `Java`, el default de `undici`/node-fetch) dan 403.
- Lat/lon con **máximo 4 decimales**: con 5 o más, los productos nuevos responden 403.
- Hay que respetar `Expires` y usar `If-Modified-Since` con el `Last-Modified` previo. Nada de HEAD+GET. Repartí las requests en el tiempo con offset aleatorio y no pidas en punto (en la hora exacta).
- No se puede usar "Yr" en el nombre ni el logo de Yr. Atribución CC BY 4.0.

**How to avoid:**
- Constante única `WINIFREDA = { lat: -36.2263, lon: -64.2339, altitude: <m> }`, con 4 decimales y `altitude` explícita (la doc la recomienda para la temperatura).
- Cliente MET dedicado que guarda `Expires` y `Last-Modified` (en Supabase o en la caché) y usa el TTL que dice `Expires`, no uno inventado.
- Nunca llamar a api.met.no desde el navegador (CORS preflight no soportado, y viola el espíritu del ToS).

**Warning signs:** 403 apenas se despliega; respuestas 304 que nunca aparecen (señal de que no mandás `If-Modified-Since`).

**Phase to address:** F1 (cliente) / F3 (uso en comparación).

---

### Pitfall 9: El cron de alertas se apaga solo a los 60 días (o llega tarde)

**What goes wrong:**
Las alertas de helada funcionan en el otoño y en pleno invierno dejan de llegar sin aviso. O una alerta de "helada esta noche" llega 40 minutos tarde, o no llega.

**Why it happens (docs de GitHub):**
- En repos **públicos**, los workflows `schedule` se **desactivan automáticamente tras 60 días sin actividad en el repo**. Un proyecto personal "terminado" llega a esa situación seguro.
- Los schedules se demoran con carga alta, sobre todo en punto, y **algunos jobs se pueden descartar**. Solo corren desde la rama default.
- El cron de Vercel Hobby es 1 vez por día con precisión de ±59 min (verificado), así que no sirve para alertas horarias.
- Los runtime logs de Vercel Hobby duran **1 hora**: si el cron falla de madrugada, a la mañana no queda rastro.

**How to avoid:**
- Programá en minutos "raros" (`17 * * * *`), no `0 * * * *`.
- Usá un disparador redundante: GitHub Actions + un cron externo gratuito (por ejemplo, cron-job.org) llamando a la misma ruta. La ruta tiene que ser **idempotente**, así que dos disparos no deben mandar dos notificaciones (ver Pitfall 11).
- Para evitar el auto-disable: repo privado (los minutos gratis alcanzan: unas 720 ejecuciones de ~1 min por mes, verificá la cuota vigente de tu cuenta) o un workflow de keepalive. La redundancia con el cron externo también lo cubre.
- Heartbeat: cada corrida escribe `last_run_at` en Supabase. La app muestra "último chequeo de alertas: hace X" en una página de estado, y si pasan más de 3 h sin corrida, se ve.
- La ruta protegida exige un secreto en header (`Authorization: Bearer ...`), no en la query string. Debe responder rápido: límite de 300 s en Hobby.

**Warning signs:** Pestaña Actions con el banner "This scheduled workflow is disabled"; huecos en `last_run_at`.

**Phase to address:** F8.

---

### Pitfall 10: Web Push en iOS que "funciona en Android" y en iPhone no (o se desuscribe solo)

**What goes wrong:**
El botón "Activar alertas" no hace nada en Safari, las notificaciones dejan de llegar a los días, o Apple responde 403 `BadJwtToken`.

**Why it happens:**
- iOS solo permite Web Push en una PWA **instalada en pantalla de inicio** (16.4+), y `Notification.requestPermission()`/`subscribe()` exigen un **gesto del usuario**. En Safari normal, `PushManager` no está disponible.
- Apple revoca la suscripción si un push **no muestra notificación visible**: hay reportes de que pasa tras ~3 casos. La causa típica es no envolver `showNotification()` en `event.waitUntil()`, o mandar pushes "silenciosos".
- Apple rechaza el JWT VAPID si `sub` no es un `mailto:`/URL válido: con espacios, `<>` o `localhost` da `BadJwtToken`.
- Rotar las claves VAPID invalida todas las suscripciones.
- Borrar y reinstalar la PWA genera otro endpoint, y el viejo queda muerto.

**How to avoid:**
- Detectá el modo standalone (`matchMedia('(display-mode: standalone)')` / `navigator.standalone`). Si no está instalada en iOS, mostrá instrucciones de "Compartir → Agregar a inicio" en vez del botón de push.
- En el service worker: `self.addEventListener('push', e => e.waitUntil(self.registration.showNotification(...)))`, siempre, sin excepciones, aunque el payload venga mal.
- `VAPID_SUBJECT=mailto:tu@dominio.real`. Las claves VAPID se generan una vez y viven en env vars de Vercel. Nunca se regeneran.
- En el envío: respuestas **404/410** → borrar la suscripción de Supabase. 403 → revisar el JWT. Usá `TTL` acorde (una alerta de helada vence al amanecer) y `urgency: high` para tormenta.
- Hacé upsert de la suscripción por endpoint cada vez que se abre la PWA (re-`getSubscription()`), para sobrevivir a cambios de endpoint.

**Warning signs:** Suscripciones que se acumulan sin bajas; envíos "201 OK" que nunca aparecen; `BadJwtToken` en logs.

**Phase to address:** F7 (instalación, SW) y F8 (envío, limpieza).

---

### Pitfall 11: Alertas spam o que "rebotan" entre corridas de modelo

**What goes wrong:**
Cada hora llega "Posible helada esta noche". O llega, después "se cancela" y después vuelve, porque el pronóstico de −0,5 °C oscila entre −0,3 y 0,2 entre corridas. Con dos disparadores de cron llegan duplicadas.

**Why it happens:**
Se evalúa una condición sin estado: "si mín < 0 → enviar".

**How to avoid:**
- Tabla `alerts_sent(type, event_date_local, severity, sent_at)` con **clave única** `(type, event_date_local)` en Supabase. El envío se hace con `INSERT ... ON CONFLICT DO NOTHING` y se manda solo si insertó. Eso da idempotencia real ante dobles disparos.
- Histéresis: disparar helada con mín ≤ 0 °C (o ≤ 2 °C a 2 m para "helada agronómica", decidir el criterio), y no "cancelar" salvo que suba más de 2 °C sobre el umbral. Escalar severidad sí (helada → helada fuerte ≤ −3 °C), y reenviar solo si sube de nivel.
- Ventana de decisión: helada evaluada a partir de las 15–18 h locales para esa noche; viento con racha ≥ X km/h en próximas 12 h. Para tormenta, ojo: según la doc de Open-Meteo, **IFS no detecta tormentas** (poca info de estabilidad). Usá CAPE + probabilidad, o códigos de ICON/GFS.
- Horario silencioso (salvo severidad alta) y como máximo N notificaciones por día.

**Warning signs:** Más de 2 notificaciones del mismo tipo por día en las pruebas; duplicados con el mismo minuto.

**Phase to address:** F8.

---

### Pitfall 12: El "cielo vivo" funde la batería y calienta el iPhone

**What goes wrong:**
Canvas/WebGL a pantalla completa a 60–120 fps con `devicePixelRatio` 3: la app se siente premium 30 segundos y después el teléfono está caliente, el scroll del meteograma tartamudea y iOS en Modo Ahorro baja `requestAnimationFrame` a 30 fps, con saltos visibles.

**Why it happens:**
Se desarrolla en desktop con GPU dedicada. Partículas (lluvia, estrellas) con N alto, blur de CSS (`backdrop-filter`) encima de un canvas animado y renderizado a resolución nativa completa.

**How to avoid:**
- Presupuesto fijo: render del fondo a 0,5–1× DPR (el cielo es difuso y no necesita resolución retina), con tope de fps (por ejemplo 30) y animación basada en tiempo (delta), no en frames.
- Pausar con `visibilitychange` y cuando el fondo no está en viewport (IntersectionObserver).
- `prefers-reduced-motion: reduce` → cielo estático (un frame renderizado según hora y condición). También es el fallback si WebGL falla.
- Separar capas: gradiente del cielo en CSS o shader barato; partículas solo en estados que lo justifiquen (tormenta, lluvia, estrellas) y con cantidad acotada.
- Medí en un iPhone real con Safari Web Inspector (Timeline). El simulador y el desktop no sirven para esto.
- El estado visual sale de datos ya calculados (hora local, sol arriba/abajo con suncalc, condición normalizada). No dependas de `weather_code` crudo de un solo modelo (ver tormentas en IFS, Pitfall 11).

**Warning signs:** Frame time > 16 ms en Timeline; el iPhone tibio a los 2 min; Lighthouse "Total Blocking Time" alto en mobile.

**Phase to address:** F6 (con un presupuesto de performance como criterio de aceptación).

---

### Pitfall 13: Service worker que deja la PWA "congelada" en una versión vieja o con datos viejos

**What goes wrong:**
Después de un deploy, el iPhone sigue mostrando la UI anterior por días. O, peor, el SW cachea las respuestas de `/api/forecast` y muestra el pronóstico de ayer como si fuera actual cuando hay mala señal en el campo.

**Why it happens:**
En standalone iOS no hay botón de recargar. El SW nuevo queda en `waiting` hasta que se cierran todas las instancias. Las estrategias "cache-first" genéricas se aplican también a la API.

**How to avoid:**
- Usá una librería mantenida (Serwist, que reemplazó a `next-pwa`, ya abandonado) o un SW mínimo propio. Assets con hash → cache-first; **API de clima → network-first** con fallback a caché **marcado como "sin conexión, datos de hace X h"**.
- Flujo de update: detectar `waiting` → `skipWaiting` + `clients.claim` o un toast "Nueva versión, tocá para actualizar".
- Versioná el nombre de caché y limpiá cachés viejas en `activate`.

**Warning signs:** Cambios desplegados que no se ven en el iPhone instalado; hora de "actualizado" vieja sin aviso.

**Phase to address:** F7.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Llamar a Open-Meteo desde el cliente directamente | Cero backend en el MVP | Cada visita es una call; IP del usuario; sin "último dato bueno"; inconsistente con MET | Solo en un spike descartable |
| Hardcodear UTC−3 en vez de usar la zona IANA | Rápido | Se rompe si Argentina vuelve al DST; repartido en mil lugares | Nunca. Usar `America/Argentina/Buenos_Aires` en un único módulo |
| Pedir normales climáticas en runtime | No hay que escribir un script | Requests pesadísimas (30 años) en cada revalidación | Nunca. JSON estático generado una vez |
| Usar `weather_code` de `best_match` para el cielo y los íconos | Simple | Inconsistente entre modelos; IFS no marca tormenta | MVP de F2, pero F6 necesita una condición normalizada propia |
| `precipitation_probability` del Forecast API como probabilidad diaria | Ya viene calculado | Es horario y con >0,1 mm: confunde | Para el meteograma horario sí; para el diario, no |
| Sin tabla de alertas enviadas ("total es uso personal") | Menos código | Spam y duplicados con dos crons | Nunca, si hay push |
| Sin `fetchedAt` en los payloads | Menos campos | Imposible detectar datos congelados | Nunca |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Open-Meteo Forecast | No mandar `timezone` con variables diarias; asumir modelos regionales para Argentina | `timezone` + `timeformat=unixtime`. Para Argentina no hay modelo regional listado: `best_match` cae en globales (ICON, GFS, IFS). Pedí modelos explícitos |
| Open-Meteo multi-modelo | Asumir que todas las series tienen el mismo largo | ICON termina a ~7,5 días y GFS/IFS a 15–16: manejar `null` en charts y en el indicador de coincidencia. Las claves vienen sufijadas por modelo (por ejemplo `temperature_2m_ecmwf_ifs025`) |
| Open-Meteo ECMWF | Usar `ecmwf_ifs025` creyendo que es el "mejor ECMWF" | Hoy existe IFS HRES 9 km (horario hasta 90 h, sin demora extra); IFS 0,25 open-data es 3-horario y con 2 h de demora. Verificá cuál expone `models=` y elegí a conciencia |
| Open-Meteo Ensemble | Pedir muchas variables × todos los modelos cada hora | Solo precipitación (y temperatura), cada 3–6 h, agregado y cacheado |
| Open-Meteo Historical | Usar ERA5 hasta hoy | ERA5 tiene ~5 días de atraso: completar con Forecast `past_days` |
| MET Norway | UA genérico, 5 decimales, ignorar `Expires` | UA `ClimaWinifreda/1.0 (mail o url)`, 4 decimales, `altitude`, `If-Modified-Since` |
| MET Norway | Contarlo como modelo independiente | Fuera de Escandinavia es ECMWF: no duplicar el voto |
| RainViewer | Zoom > 7, nowcast, colores, proxy por servidor | z ≤ 7 con `maxNativeZoom`, solo pasado, Universal Blue, tiles directos desde el cliente, atribución |
| Web Push (Apple) | `sub` inválido; push sin notificación | `mailto:` limpio; `waitUntil(showNotification)` siempre |
| Supabase free | Asumir que siempre está arriba | Se pausa con baja actividad en 7 días. El cron horario que escribe el heartbeat lo mantiene vivo; si el cron muere, también se pausa la DB |
| Vercel Hobby | Debuggear el cron con logs del día anterior | Los runtime logs duran 1 h: persistir errores en Supabase |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Canvas a DPR completo y fps sin tope | Calor, batería, jank en scroll | DPR 0,5–1, 30 fps, pausa en hidden, reduced-motion | Desde el primer iPhone, no depende de usuarios |
| Recharts con 336 puntos (14 días horarios) × 5 modelos en mobile | Render lento, tooltip trabado | Diario para 7–14 d; horario solo 48 h; memoizar datos | Ya con 1 usuario en iPhone viejo |
| Payload JSON crudo de varios modelos al cliente | LCP alto con 4G rural | El servidor normaliza y recorta a lo que se dibuja | Conexión rural de Winifreda |
| Fuentes editoriales grandes sin subset | FOUT, CLS, LCP alto | `next/font` con subset latin y `display: swap`; 1–2 pesos | Siempre en mobile |
| Transferencia de Vercel por tiles de radar proxied | Consumo del cupo Hobby | Tiles directo de RainViewer | Con tráfico de portfolio |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Ruta de cron sin autenticación o con secreto en query string | Cualquiera dispara envíos masivos de push | `Authorization: Bearer ${CRON_SECRET}` comparado en tiempo constante; solo POST; secreto en GitHub Secrets y en las env de Vercel |
| Clave privada VAPID o service role de Supabase con prefijo `NEXT_PUBLIC_` | Cualquiera manda pushes o lee y borra la tabla | Solo la VAPID **pública** va al cliente; el resto, server-only (`import 'server-only'`) |
| Endpoint de suscripción sin validación | Basura o spam en la tabla de Supabase | Validar forma (endpoint https de push conocido, keys p256dh/auth), rate-limit simple, RLS activada |
| RLS desactivada en Supabase "porque no hay usuarios" | La anon key pública permite leer endpoints de push | RLS on; el insert pasa por un Route Handler con service role |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Fase lunar con emoji o ícono del hemisferio norte | En Winifreda la luna creciente se ve iluminada del lado **izquierdo**: el ícono queda "al revés" | Dibujar la luna espejada para el hemisferio sur (es un buen detalle de diseño local) |
| Mostrar "presión" de superficie (~990 hPa) en vez de la de nivel del mar | No coincide con SMN ni con la radio | Usar `pressure_msl` y aclararlo |
| `apparent_temperature` presentada como "sensación térmica del SMN" | Difiere de lo que dice el SMN (fórmula distinta) | Etiquetar "sensación térmica (estimada)", o calcular wind chill / índice de calor como SMN si importa |
| Datos sin hora de actualización | El usuario no sabe si el dato es viejo | "Actualizado hace X min" siempre visible, y aviso si está desactualizado |
| Probabilidad sin umbral explicado | "70 %" de qué: ¿llovizna o 20 mm? | "70 % de ≥1 mm" con tooltip; separar "probable" de "importante" |
| Lluvia estimada presentada como medida | Pérdida de credibilidad frente al pluviómetro local | "Estimado por modelo/reanálisis" |
| Botón "Activar alertas" en Safari no instalado | Tap sin efecto, frustración | Detectar standalone y mostrar guía de instalación |
| Contraste bajo de tipografía sobre cielo animado | Ilegible al sol, de día, en el campo | Overlay o scrim por estado de cielo; probar a pleno sol; WCAG AA mínimo |
| `100vh` y safe areas ignoradas en standalone | Contenido bajo el notch o la home bar | `viewport-fit=cover`, `env(safe-area-inset-*)`, `dvh`/`svh`, `apple-mobile-web-app-status-bar-style` decidido a conciencia |

## "Looks Done But Isn't" Checklist

- [ ] **Capa de datos:** verificar en producción que las requests salientes a cada API son ≤ 1 por TTL (contarlas en logs persistidos), no 1 por visita.
- [ ] **Fallback:** cortar la red al upstream (forzar error) y comprobar que se sirve el último dato bueno con su timestamp.
- [ ] **Zona horaria:** suma de `precipitation` horaria del día local == `precipitation_sum` diaria, con el server en UTC.
- [ ] **Multi-modelo:** días 8–14 con ICON ausente se renderizan sin romper charts ni el indicador.
- [ ] **Ensemble:** probabilidad diaria testeada con fixture (miembros conocidos → % esperado); denominador correcto cuando un modelo termina.
- [ ] **Lluvia acumulada:** la semana actual no da 0 en días recientes; el mes en curso se compara con el normal prorrateado.
- [ ] **MET Norway:** UA identificatorio, 4 decimales, aparecen respuestas 304.
- [ ] **Radar:** probado en un día de lluvia real sobre La Pampa, a z ≤ 7, con atribución.
- [ ] **Cielo vivo:** probado en iPhone físico en Modo Ahorro y con "Reducir movimiento" activado; se pausa en background.
- [ ] **PWA iOS:** íconos `apple-touch-icon`, splash, safe areas, actualización del SW tras deploy comprobada en el iPhone instalado.
- [ ] **Push:** llega con la PWA cerrada; 410 borra la suscripción; doble disparo del cron no duplica; `sub` VAPID válido para Apple.
- [ ] **Cron:** heartbeat visible; el workflow no está programado en `:00`; existe un plan contra el auto-disable a 60 días.
- [ ] **Atribuciones:** Open-Meteo (CC BY 4.0), MET Norway (CC BY 4.0, sin "Yr"), RainViewer.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RainViewer sin cobertura o sin servicio | LOW | Ocultar el módulo detrás de un flag; link al radar del SMN; evaluar alternativa (por ejemplo, LibreWXR autohosteado no aplica sin servidor: descartado) |
| 429 de Open-Meteo | LOW-MEDIUM | Subir TTLs, servir el último dato bueno, reducir variables; precalentar desde el cron |
| 403 de MET Norway | LOW | Corregir UA/decimales; mientras tanto, la comparación sigue sin MET |
| Workflow de GitHub desactivado | LOW | Re-enable manual; agregar cron externo redundante + heartbeat |
| Supabase pausado | LOW-MEDIUM | Restaurar desde el dashboard; el heartbeat del cron previene que se repita |
| Claves VAPID perdidas o rotadas | MEDIUM | Todas las suscripciones quedan inválidas: limpiar la tabla y pedir re-suscripción en la próxima apertura de la PWA |
| Días corridos por zona horaria | MEDIUM-HIGH si está disperso | Centralizar en `time.ts` y re-testear todas las agregaciones (por eso va en F1) |
| SW que sirve versión vieja | MEDIUM | Publicar un SW con `skipWaiting` + limpieza de cachés; en casos extremos, pedir reinstalar la PWA |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RainViewer recortado / cobertura AR | Spike en F1, implementación en F5 | Captura de tiles z7 con ecos sobre La Pampa |
| MET Norway ≠ modelo independiente | F3 | Indicador de coincidencia documentado; ECMWF no vota doble |
| Probabilidad de ensemble mal agregada | F3 | Tests unitarios con fixtures |
| UTC vs hora local | F1 | Tests de frontera 02:59Z/03:00Z; server en UTC |
| Lluvia acumulada con lag de ERA5 / normales | F4 | Serie cosida sin huecos; normales en JSON estático |
| Rate limit Open-Meteo por IP compartida | F1 | Conteo de calls/día en logs; fallback probado |
| Caché de Next.js (default sin caché, cachear errores) | F1 | `x-vercel-cache` HIT; upstream caído → dato viejo + aviso |
| ToS MET Norway (UA, 4 decimales, Expires) | F1 | Respuestas 304 observadas |
| Cron desactivado / demorado / logs de 1 h | F8 | Heartbeat + doble disparador |
| Push iOS (standalone, waitUntil, VAPID sub, 410) | F7 + F8 | Push recibido en el iPhone con la app cerrada durante 1 semana |
| Spam / duplicados de alertas | F8 | Clave única en `alerts_sent`; doble disparo → 1 envío |
| Batería / animación | F6 | Timeline en iPhone real; reduced-motion |
| SW con versión o datos viejos | F7 | Deploy → el iPhone instalado se actualiza en ≤ 1 apertura |
| Supabase pausado por inactividad | F8 | Heartbeat escribe en la DB en cada corrida |

## Sources

- Open-Meteo Terms (límites 600/min, 5.000/h, 10.000/día, 300.000/mes; por IP; aviso sobre hosting compartido; CC BY 4.0): https://open-meteo.com/en/terms — HIGH
- Open-Meteo Pricing (conteo fraccionado: >10 variables o >2 semanas): https://open-meteo.com/en/pricing — HIGH
- Open-Meteo Forecast docs (best_match con backbone ICON/GFS/IFS, sin modelos regionales para Sudamérica; `timezone`, `timeformat=unixtime`; `past_days` hasta 92; `precipitation_probability` = ensemble, >0,1 mm/h; 15-min nativo solo Europa/Norteamérica): https://open-meteo.com/en/docs — HIGH
- Open-Meteo ECMWF docs (IFS HRES 9 km vs IFS 0,25 open-data con 2 h de demora; "thunderstorm detection is not possible"): https://open-meteo.com/en/docs/ecmwf-api — HIGH
- Open-Meteo Ensemble docs (horizontes y miembros por modelo; ejemplo de 4,0 calls): https://open-meteo.com/en/docs/ensemble-api — HIGH
- Open-Meteo Historical docs (ERA5/ERA5-Land ~5 días de atraso; usar `past_days` para lo reciente): https://open-meteo.com/en/docs/historical-weather-api — HIGH
- Discusión IP compartida / 429: https://github.com/open-meteo/open-meteo/discussions/853 , https://github.com/open-meteo/open-meteo/issues/438 — MEDIUM
- MET Norway Terms of Service (UA, 4 decimales → 403, Expires/If-Modified-Since, 20 req/s, 429, sin "Yr", CC BY 4.0): https://api.met.no/doc/TermsOfService — HIGH
- MET Norway Locationforecast doc y data model (altitude recomendado; ECMWF fuera de la región nórdica): https://api.met.no/weatherapi/locationforecast/2.0/documentation , https://docs.api.met.no/doc/locationforecast/datamodel — HIGH/MEDIUM
- RainViewer API Transition FAQ (desde 2026-01-01: zoom 7, solo Universal Blue, sin nowcast, 100 req/IP/min): https://www.rainviewer.com/api/transition-faq.html — HIGH
- RainViewer API (uso personal/educativo, sin garantía de datos, atribución): https://www.rainviewer.com/api.html — HIGH
- Reporte de datos de Argentina escasos en RainViewer: https://forum.flowx.io/t/radar-data-from-argentina-almost-inexistent/1468 — LOW (sin fecha)
- Radares SINARAME que cubren La Pampa (Alejandro Roca, INTA Anguil): https://www.ellitoral.com/informacion-general/nuevo-radar-meteorologico-cubre-sur-cordoba-zonas-santafe-sanluis-lapampa-vigilancia-smn_0_ep7oVbXGs0.html — MEDIUM
- Vercel Cron usage (Hobby: 1/día, precisión ±59 min): https://vercel.com/docs/cron-jobs/usage-and-pricing — HIGH
- Vercel Limits (Hobby: funciones 300 s; runtime logs 1 h): https://vercel.com/docs/limits — HIGH
- GitHub Actions `schedule` (mínimo 5 min, demoras y jobs descartados en carga alta, auto-disable a 60 días en repos públicos, solo rama default): https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows — HIGH
- Next.js 16.2 docs vía Context7 (Route Handlers sin caché por defecto; `revalidate`; Cache Components reemplaza `dynamic`/`revalidate`/`fetchCache`): /vercel/next.js/v16.2.9 — HIGH
- Supabase Project Pausing (free: pausa por baja actividad en 7 días): https://supabase.com/docs/guides/platform/free-project-pausing — HIGH
- Apple, Sending web push notifications (causas de BadJwtToken): https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers — HIGH
- Suscripciones iOS revocadas sin notificación visible / `waitUntil`: https://dev.to/progressier/how-to-fix-ios-push-subscriptions-being-terminated-after-3-notifications-39a7 , https://github.com/firebase/firebase-js-sdk/issues/8010 , https://bugs.webkit.org/show_bug.cgi?id=273063 — MEDIUM
- VAPID `sub` localhost rechazado por Apple: https://newreleases.io/project/github/ulsklyc/yuvomi/release/v1.66.2 — MEDIUM
- Conocimiento de entrenamiento, no re-verificado en esta sesión (LOW-MEDIUM): throttling de rAF en Modo Ahorro de iOS; Serwist como sucesor de next-pwa; luna espejada en el hemisferio sur (hecho astronómico, HIGH); Argentina sin DST desde 2009 (HIGH).

---
*Pitfalls research for: web/PWA del clima de una sola localidad (Winifreda, La Pampa)*
*Researched: 2026-10-23*
