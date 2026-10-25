# Roadmap: Clima Winifreda

## Overview

El camino arranca con una página real publicada en Vercel desde el día uno: la capa de datos en el servidor (adapters, `WeatherSnapshot`, caché por TTL, hora argentina) y la sección Ahora. Sobre esa base se suma el pronóstico núcleo (meteograma de 48 h, diario y titular editorial), después el diferencial visual (cielo vivo con horizonte pampeano, probado en un iPhone real), y luego la honestidad sobre la incertidumbre dentro del Pronóstico (probabilidad real de lluvia desde ensembles, rango en los días lejanos y semáforo de coincidencia entre modelos). Se completa el contenido con lluvia acumulada, satélite IR y sol/luna, se vuelve instalable y offline como PWA, y se cierra con alertas Web Push revisadas cada hora. Cada fase es un corte vertical: termina con algo visible y desplegado.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Fundaciones y Ahora** - Capa de datos con caché, hora argentina, sección Ahora y deploy automático a Vercel (completed 2026-10-23)
- [x] **Phase 2: Pronóstico núcleo** - Meteograma de 48 h, pronóstico diario de 7–14 días y titular editorial (completed 2026-10-24)
- [x] **Phase 3: Cielo vivo** - Fondo generativo según sol y tiempo, horizonte pampeano, accesible y fluido en iPhone
 (completed 2026-10-25)
- [ ] **Phase 4: Pronóstico con confianza** - Probabilidad real de lluvia desde el ensemble, rango p10–p90 en días lejanos y semáforo de coincidencia por día, todo dentro del Pronóstico (sin pestaña Modelos)
- [ ] **Phase 5: Lluvia, satélite y astros** - Lluvia acumulada contra la normal, satélite IR GOES-East, link al radar del SMN, sol y luna
- [ ] **Phase 6: PWA instalable y offline** - Instalación en iPhone y Android con instrucciones, y último pronóstico disponible sin señal
- [ ] **Phase 7: Alertas Web Push** - Avisos de helada, tormenta y viento fuerte revisados cada hora, sin repetidos

## Phase Details

### Phase 1: Fundaciones y Ahora
**Goal**: El usuario abre la URL pública en Vercel y ve el tiempo actual de Winifreda, servido desde la caché del servidor, en hora argentina y con su antigüedad visible
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, NOW-01, NOW-02, OPS-01
**Success Criteria** (what must be TRUE):
  1. Al abrir la URL pública (Vercel, región São Paulo) el usuario ve temperatura, sensación térmica, humedad, presión y viento (velocidad, ráfaga y dirección), con el estado del tiempo en castellano rioplatense
  2. El usuario ve "actualizado hace X min", y recargar varias veces seguidas no genera requests nuevos a Open-Meteo/MET Norway (se sirven desde la caché del servidor, con datos de no más de 15 min respecto de la última corrida)
  3. Si una fuente externa falla (simulada), la página sigue cargando y la sección afectada muestra el último dato bueno o un aviso, en vez de romperse
  4. Fechas y horas se muestran en hora argentina; a las 21–24 h locales (borde 00–03Z) el "hoy" no salta al día siguiente
  5. Un push a `main` en GitHub publica automáticamente la nueva versión en Vercel
**Plans**: 7 plans
Plans (olas: 1 → 01; 2 → 02, 03; 3 → 04; 4 → 05; 5 → 06; 6 → 07):
- [x] 01-01-PLAN.md — Walking skeleton: scaffold Next 16.4.3, Vitest, Open-Meteo vía unstable_cache, snapshot, página ISR y /api/weather
- [x] 01-02-PLAN.md — Deploy: push a main (con aprobación), vinculación con Vercel (gru1) y smoke en producción
- [x] 01-03-PLAN.md — Pantalla Ahora completa: hora argentina, viento, WMO rioplatense, temperatura, horizonte pampeano
- [x] 01-04-PLAN.md — Cielo por hora y tiempo (data-sky, SkyBackdrop con crossfade) y barra de pestañas
- [x] 01-05-PLAN.md — Frescura "actualizado hace X min", aviso de dato viejo, crédito Open-Meteo y MET Norway cacheado
- [x] 01-06-PLAN.md — Fallas: refresco read-through, estado por fuente según resultado real, WEATHER_FAULT, Fuente caída / Sin datos / Cargando / error.tsx
- [x] 01-07-PLAN.md — /dev/estados y verificación final en producción tras el push
**UI hint**: yes

### Phase 2: Pronóstico núcleo
**Goal**: El usuario entiende de un vistazo qué va a pasar en las próximas 48 h y en los próximos días, con un titular que resume el día
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: FCST-01, FCST-02, NOW-03
**Success Criteria** (what must be TRUE):
  1. En un iPhone de 390 px el usuario lee un meteograma de 48 h con temperatura, lluvia en mm y viento, sin scroll horizontal forzado ni etiquetas encimadas
  2. El usuario ve el pronóstico diario de 7 a 14 días con máxima, mínima, estado del tiempo y lluvia esperada por día (días locales argentinos)
  3. El usuario ve arriba de todo un titular editorial en rioplatense que resume el día (ej. "Mañana fresca, lluvia a la tarde") y que cambia cuando cambia el pronóstico
**Plans**: 5 plans
Plans (olas: 1 → 01; 2 → 02; 3 → 03; 4 → 04; 5 → 05):
- [x] 02-01-PLAN.md — Titular editorial en Ahora: helpers de hora/día TZ-proof, buildHeadline con tests, rol Headline 32 px y presupuesto de la primera pantalla
- [x] 02-02-PLAN.md — Refactor de Hero (caja del cielo, slot below, variante compact) y pronóstico diario 7/14 días en /pronostico con la pestaña habilitada
- [x] 02-03-PLAN.md — Meteograma 1: verificación e instalación de d3, geometría pura testeada y SVG de temperatura/lluvia/ejes debajo del horizonte
- [x] 02-04-PLAN.md — Meteograma 2: fila de viento cada 3 h, ráfagas fuertes, lectura fija y scrubber táctil/teclado
- [x] 02-05-PLAN.md — /dev/estados de la fase 2, gate completo con chequeos a 390×844 y smoke en producción tras el push
**UI hint**: yes

### Phase 3: Cielo vivo
**Goal**: La app se ve como ninguna otra: el fondo es un cielo generativo que sigue al sol real y al tiempo de Winifreda, con el horizonte pampeano, legible y liviano en un iPhone real
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SKY-01, SKY-02, SKY-03, SKY-04, SKY-05, SKY-06
**Success Criteria** (what must be TRUE):
  1. El fondo cambia según la posición real del sol (noche, amanecer, día, atardecer) y según el estado del tiempo (despejado, nublado, lluvia, tormenta, niebla, noche estrellada), y en `/dev/sky` se pueden forzar todos los estados para revisarlos
  2. El usuario ve la silueta del horizonte pampeano abajo, y todo el texto (Ahora, titular, meteograma) se lee con buen contraste sobre cualquier estado del cielo
  3. Con "reducir movimiento" activado el usuario ve un cielo estático; sin WebGL ve un fallback que igual representa la hora y el tiempo
  4. En un iPhone real la animación corre fluida (tope 30 fps), se pausa al pasar a segundo plano y el teléfono no se calienta en un uso de varios minutos
**Plans**: 8 plans
Plans (olas: 1 → 01; 2 → 02, 03; 3 → 04, 05; 4 → 06; 5 → 07; 6 → 08):
- [x] 03-01-PLAN.md — Cielo WebGL continuo según el sol: paleta pura con tests de contraste, renderer + shader sin dependencias, montado en SkyBackdrop sobre el fallback
- [x] 03-02-PLAN.md — El clima real llega al cielo: SkyState con intensidad/viento/cobertura, molino que gira con el viento, fallback CSS con capa de clima
- [x] 03-03-PLAN.md — El cielo cobra vida: loop de 30 fps con pausas, reducir movimiento, gobernador, sol/luna/estrellas
- [x] 03-04-PLAN.md — Nubes, niebla y lluvia procedurales moduladas por el dato real
- [x] 03-05-PLAN.md — /dev/sky: forzar estados, 3 cuadros, presets y lectura de FPS/MS/calidad
- [x] 03-06-PLAN.md — Relámpagos con límites de fotosensibilidad, contraluz de la silueta y FORZAR RELÁMPAGO
- [x] 03-07-PLAN.md — Gate, revisión de escritorio, push a main con smoke de producción y preview para el iPhone
- [x] 03-08-PLAN.md — Checkpoint en iPhone real y decisión de resolución (0,5×/0,75×) y umbrales del gobernador
**UI hint**: yes
**Research**: sí — WebGL2 contra Canvas 2D en Safari standalone, presupuesto de rendimiento en iPhone

### Phase 4: Pronóstico con confianza
**Goal**: El usuario sabe cuánta confianza tenerle al pronóstico sin salir del Pronóstico: una probabilidad de lluvia real, el rango de incertidumbre en los días lejanos y un semáforo que dice si los modelos coinciden
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: FCST-03, FCST-04, MODL-02
**Success Criteria** (what must be TRUE):
  1. Cada día del pronóstico diario muestra la probabilidad de lluvia calculada desde los miembros del ensemble (≥ 1 mm en el día local)
  2. Los días lejanos muestran el rango p10–p90 de temperatura y lluvia
  3. Cada día del Pronóstico muestra un semáforo (coinciden / dudan / no se ponen de acuerdo) calculado con los modelos independientes (ECMWF, GFS, ICON y GEM si cubre la zona), sin mostrar los modelos por separado
  4. La barra de pestañas ya no tiene el botón Modelos (la pestaña se eliminó del alcance el 2026-10-25)
**Plans**: TBD
**UI hint**: yes
**Research**: sí — IDs de modelos en Open-Meteo, disponibilidad de GEM en Sudamérica, horizontes por modelo del ensemble, umbrales del semáforo

### Phase 5: Lluvia, satélite y astros
**Goal**: El usuario completa el panorama: cuánto llovió contra lo normal, qué nubosidad se acerca y cuándo sale y se pone el sol, con la fase de la luna
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: RAIN-01, RAIN-02, RAIN-03, SAT-01, SAT-02, ASTRO-01, ASTRO-02
**Success Criteria** (what must be TRUE):
  1. El usuario ve la lluvia acumulada de la semana, el mes y el año, cada una comparada contra el promedio 1991–2020 prorrateado a la misma fecha, con la aclaración "estimado por reanálisis, no pluviómetro"
  2. El usuario ve una imagen satelital infrarroja reciente de GOES-East centrada en Winifreda (carga diferida, sin trabar la pantalla principal) y puede abrir el radar del SMN con un link externo
  3. El usuario ve la hora de salida y puesta del sol y la duración del día, y la fase lunar actual dibujada como se ve desde el hemisferio sur
**Plans**: 5 plans
Plans (olas: 1 → 01; 2 → 02; 3 → 03; 4 → 04; 5 → 05):
- [x] 05-01-PLAN.md — /cielo habilitada con Sol y luna: sunDay y moon.ts con tests, disco lunar del hemisferio sur, pestaña Cielo
- [ ] 05-02-PLAN.md — Lluvia acumulada observada: adapters ERA5 + past_days, costura y períodos de calendario, bloque con aclaración y estados
- [ ] 05-03-PLAN.md — Lluvia contra lo normal: climatología 1991–2020 commiteada, normal prorrateada, comparación, barra y última lluvia
- [ ] 05-04-PLAN.md — Satélite IR GOES-East: geometría y stamps, adapter GIBS con fallback, ruta /api/satelite/[stamp], bloque y link al SMN, CLAUDE.md corregido
- [ ] 05-05-PLAN.md — /dev/estados de la fase 5, gate con revisión visual, push a main y smoke de producción
**UI hint**: yes
**Research**: sí — capa exacta y GetCapabilities de NASA GIBS, ToS de OpenFreeMap, costura ERA5 + `past_days`

### Phase 6: PWA instalable y offline
**Goal**: El usuario tiene la app en la pantalla de inicio de su iPhone y la puede abrir en el campo sin señal
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: PWA-01, PWA-02, PWA-03
**Success Criteria** (what must be TRUE):
  1. El usuario instala la app desde Safari en iPhone y desde Chrome en Android, y la abre a pantalla completa con su propio ícono
  2. Un usuario de iPhone que todavía no la instaló ve instrucciones claras de cómo hacerlo (y no las ve si ya la abre instalada)
  3. En modo avión, el usuario abre la app instalada y ve el último pronóstico guardado con la hora en que se descargó
**Plans**: TBD
**UI hint**: yes

### Phase 7: Alertas Web Push
**Goal**: El usuario se entera a tiempo de heladas, tormentas y viento fuerte en Winifreda sin tener que abrir la app
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05, ALRT-06
**Success Criteria** (what must be TRUE):
  1. El usuario activa las notificaciones con un botón (en iPhone, solo desde la app instalada, con explicación si no lo está) y recibe una notificación de prueba
  2. El usuario recibe un aviso de helada cuando se pronostica mínima ≤ 2 °C, de tormenta cuando CAPE, probabilidad y modelos convectivos lo indican, y de viento fuerte cuando las ráfagas superan el umbral
  3. Para un mismo evento el usuario recibe un solo aviso, aunque el chequeo corra varias veces
  4. Las alertas se revisan cada hora sin que nadie abra la app (GitHub Actions llamando a la ruta protegida, con respaldo), y Supabase no se pausa por inactividad
**Plans**: TBD
**UI hint**: yes
**Research**: sí — Declarative Web Push en iOS, feed CAP del SMN, repo público o privado (vencimiento de `schedule` en Actions)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundaciones y Ahora | 7/7 | Complete   | 2026-10-23 |
| 2. Pronóstico núcleo | 5/5 | Complete    | 2026-10-24 |
| 3. Cielo vivo | 8/8 | Complete    | 2026-10-25 |
| 4. Pronóstico con confianza | 0/TBD | Not started | - |
| 5. Lluvia, satélite y astros | 1/5 | In Progress|  |
| 6. PWA instalable y offline | 0/TBD | Not started | - |
| 7. Alertas Web Push | 0/TBD | Not started | - |
