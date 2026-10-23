# Requirements: Clima Winifreda

**Defined:** 2026-10-23
**Core Value:** Abrirla y entender de un vistazo qué tiempo hace y va a hacer en Winifreda, con una experiencia visual que no se parece a ninguna otra app del clima.

## v1 Requirements

### Datos y caché (DATA)

- [x] **DATA-01**: El usuario ve datos que nunca tienen más de 15 minutos de antigüedad respecto de la última corrida disponible, sin que cada visita le pegue a las APIs externas (caché en servidor por fuente)
- [ ] **DATA-02**: El usuario ve "actualizado hace X min" en la pantalla principal
- [ ] **DATA-03**: Si una fuente falla, el usuario sigue viendo el resto de las secciones y la sección afectada muestra el último dato bueno o un aviso
- [x] **DATA-04**: Todos los días y horas se muestran en hora argentina (America/Argentina/Buenos_Aires), sin días cortados por UTC

### Ahora (NOW)

- [x] **NOW-01**: El usuario ve temperatura actual, sensación térmica, humedad, presión y viento (velocidad, ráfaga y dirección)
- [x] **NOW-02**: El usuario ve el estado del tiempo descrito en castellano rioplatense
- [ ] **NOW-03**: El usuario ve un titular editorial generado por reglas que resume el día (ej. "Mañana fresca, lluvia a la tarde")

### Pronóstico (FCST)

- [ ] **FCST-01**: El usuario ve un meteograma de las próximas 48 h con temperatura, lluvia (mm) y viento, legible en un iPhone de 390 px
- [ ] **FCST-02**: El usuario ve el pronóstico diario de 7 a 14 días con máxima, mínima, estado y lluvia esperada
- [ ] **FCST-03**: El usuario ve la probabilidad de lluvia de cada día calculada desde los miembros del ensemble (≥ 1 mm en el día local)
- [ ] **FCST-04**: El usuario ve el rango de incertidumbre (p10–p90) de temperatura y lluvia en los días lejanos

### Los modelos opinan (MODL)

- [ ] **MODL-01**: El usuario ve el pronóstico de ECMWF, GFS, ICON y GEM lado a lado para los próximos días
- [ ] **MODL-02**: El usuario ve un semáforo de coincidencia entre modelos (coinciden / dudan / no se ponen de acuerdo) calculado solo con modelos independientes
- [ ] **MODL-03**: El usuario ve el pronóstico de MET Norway como segunda opinión, rotulado "basado en ECMWF" y fuera del cálculo de coincidencia

### Lluvia acumulada (RAIN)

- [ ] **RAIN-01**: El usuario ve la lluvia acumulada de la semana, el mes y el año
- [ ] **RAIN-02**: El usuario compara cada acumulado contra el promedio histórico 1991–2020 prorrateado a la misma fecha
- [ ] **RAIN-03**: El usuario ve aclarado que el acumulado es estimado por reanálisis, no medido por pluviómetro

### Satélite (SAT)

- [ ] **SAT-01**: El usuario ve la imagen satelital infrarroja reciente (GOES-East) centrada en Winifreda para ver la nubosidad y tormentas que se acercan
- [ ] **SAT-02**: El usuario puede abrir el radar del SMN con un link externo

### Sol y luna (ASTRO)

- [ ] **ASTRO-01**: El usuario ve la hora de salida y puesta del sol y la duración del día
- [ ] **ASTRO-02**: El usuario ve la fase lunar actual (dibujada para el hemisferio sur)

### Cielo vivo (SKY)

- [ ] **SKY-01**: El usuario ve un fondo animado generativo que refleja la posición real del sol (noche, amanecer, día, atardecer)
- [ ] **SKY-02**: El fondo cambia según el estado del tiempo (despejado, nublado, lluvia, tormenta, niebla, noche estrellada)
- [ ] **SKY-03**: El usuario ve la silueta del horizonte pampeano en la parte inferior
- [ ] **SKY-04**: El texto se lee con buen contraste sobre cualquier estado del cielo
- [ ] **SKY-05**: El usuario con "reducir movimiento" activado ve una versión estática del cielo
- [ ] **SKY-06**: La animación corre fluida en un iPhone real sin calentar el teléfono (30 fps máx., pausa en segundo plano, fallback si no hay WebGL)

### PWA (PWA)

- [ ] **PWA-01**: El usuario puede instalar la app en la pantalla de inicio del iPhone (Safari) y de Android, con ícono y pantalla completa
- [ ] **PWA-02**: El usuario de iPhone ve instrucciones de cómo instalarla si todavía no lo hizo
- [ ] **PWA-03**: Sin señal, el usuario abre la app y ve el último pronóstico guardado con la hora en que se descargó

### Alertas (ALRT)

- [ ] **ALRT-01**: El usuario puede activar notificaciones con un botón (en iPhone, solo con la app instalada)
- [ ] **ALRT-02**: El usuario recibe un aviso de helada cuando se pronostica mínima ≤ 2 °C
- [ ] **ALRT-03**: El usuario recibe un aviso de tormenta (basado en CAPE, probabilidad y modelos que sí detectan convección)
- [ ] **ALRT-04**: El usuario recibe un aviso de viento fuerte cuando se pronostican ráfagas por encima del umbral
- [ ] **ALRT-05**: El usuario no recibe el mismo aviso repetido para el mismo evento
- [ ] **ALRT-06**: Las alertas se revisan cada hora aunque nadie abra la app (GitHub Actions + respaldo)

### Deploy (OPS)

- [ ] **OPS-01**: Cada push a `main` en GitHub se publica solo en Vercel (región São Paulo)

## v2 Requirements

- **AGRO-01**: Datos agro: evapotranspiración, temperatura del suelo, ventana para fumigar (Delta T)
- **AGRO-02**: Alertas oficiales del SMN (feed CAP), si existe un feed público
- **SKY-07**: Cielo v2: estaciones del año, eventos (luna llena, eclipses)
- **PWA-04**: Badge en el ícono con la temperatura

## Out of Scope

| Feature | Reason |
|---------|--------|
| Otras localidades / buscador / favoritos | La app es solo de Winifreda |
| Radar de lluvia (RainViewer) | Sin cobertura en Argentina; reemplazado por satélite IR + link al SMN |
| "Llueve en X minutos" (nowcast) | No hay datos minuto a minuto confiables para la zona; sería precisión falsa |
| Mapa de capas tipo Windy | Fuera del foco; pesado en iPhone |
| Widgets de pantalla de inicio | Imposibles desde una PWA en iOS |
| Usuarios / login | Uso personal |
| Pronóstico a más de 14 días | Sin habilidad predictiva real |
| Monetización | Open-Meteo gratis es solo no comercial |
| Spaghetti plots de ensembles | Ilegibles en el teléfono; se usa el abanico p10–p90 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Complete |
| NOW-01 | Phase 1 | Complete |
| NOW-02 | Phase 1 | Complete |
| NOW-03 | Phase 2 | Pending |
| FCST-01 | Phase 2 | Pending |
| FCST-02 | Phase 2 | Pending |
| FCST-03 | Phase 4 | Pending |
| FCST-04 | Phase 4 | Pending |
| MODL-01 | Phase 4 | Pending |
| MODL-02 | Phase 4 | Pending |
| MODL-03 | Phase 4 | Pending |
| RAIN-01 | Phase 5 | Pending |
| RAIN-02 | Phase 5 | Pending |
| RAIN-03 | Phase 5 | Pending |
| SAT-01 | Phase 5 | Pending |
| SAT-02 | Phase 5 | Pending |
| ASTRO-01 | Phase 5 | Pending |
| ASTRO-02 | Phase 5 | Pending |
| SKY-01 | Phase 3 | Pending |
| SKY-02 | Phase 3 | Pending |
| SKY-03 | Phase 3 | Pending |
| SKY-04 | Phase 3 | Pending |
| SKY-05 | Phase 3 | Pending |
| SKY-06 | Phase 3 | Pending |
| PWA-01 | Phase 6 | Pending |
| PWA-02 | Phase 6 | Pending |
| PWA-03 | Phase 6 | Pending |
| ALRT-01 | Phase 7 | Pending |
| ALRT-02 | Phase 7 | Pending |
| ALRT-03 | Phase 7 | Pending |
| ALRT-04 | Phase 7 | Pending |
| ALRT-05 | Phase 7 | Pending |
| ALRT-06 | Phase 7 | Pending |
| OPS-01 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-23*
*Last updated: 2026-10-23 after roadmap creation (traceability)*
