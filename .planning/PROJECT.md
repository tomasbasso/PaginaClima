# Clima Winifreda

## What This Is

Una web/PWA del clima exclusivamente para Winifreda, La Pampa (Argentina), con un diseño único: un "cielo vivo" generativo que cambia con la hora real y el estado del tiempo, tipografía editorial grande y la silueta del horizonte pampeano. Proyecto propio, para uso personal y portfolio, que se instala en el iPhone desde Safari. No pretende ser otra app de clima aburrida: muestra el pronóstico comparando varios modelos y con probabilidad real de lluvia.

## Core Value

Abrirla y entender de un vistazo qué tiempo hace y va a hacer en Winifreda, con una experiencia visual que no se parece a ninguna otra app del clima.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Ahora**: temperatura, sensación térmica, viento, humedad y presión actuales
- [ ] **48 h por hora**: meteograma con temperatura, lluvia y viento
- [ ] **7–14 días**: pronóstico diario con probabilidad de lluvia real (Open-Meteo Ensemble)
- [ ] **Pronóstico con confianza**: dentro del Pronóstico, un semáforo por día con la coincidencia de ECMWF, GFS, ICON y GEM, más el rango p10–p90 en los días lejanos (sin pestaña Modelos)
- [ ] **Lluvia acumulada**: semana / mes / año contra el promedio histórico (Open-Meteo Historical)
- [ ] **Satélite IR** (GOES-East vía NASA GIBS) + link al radar del SMN — reemplaza a RainViewer, que no cubre Argentina
- [ ] **Modo offline**: muestra el último pronóstico guardado sin señal
- [ ] **Sol y luna**: salida/puesta del sol, fase lunar
- [ ] **Cielo vivo**: fondo generativo/animado según hora real y condición (amanecer, siesta, tormenta, noche estrellada, niebla) + horizonte pampeano
- [ ] **PWA instalable** en iPhone (Safari) y Android
- [ ] **Notificaciones Web Push** de helada, tormenta y viento fuerte (última fase)

### Out of Scope

- Otras localidades / buscador / favoritos — la app es solo de Winifreda (coordenadas fijas); sin Geocoding ni localStorage de localidades
- App nativa en App Store — se evita la cuenta de Apple Developer; PWA alcanza
- Usuarios/login — no hacen falta para uso personal
- Monetización (publicidad, sponsors) — el plan gratis de Open-Meteo es solo no comercial
- GitHub Pages como hosting — sin servidor se pierden caché, MET Norway (User-Agent) y push
- VPS con Coolify — es de un cliente, no se usa para proyectos propios
- Pestaña Modelos (cada modelo lado a lado, MET Norway como segunda opinión) — decisión del 2026-10-25: a la mayoría no le interesa; la confianza se muestra dentro del Pronóstico

## Context

- Winifreda: localidad de ~3000 habitantes en el noreste de La Pampa (aprox. -36.23, -64.23). Zona agropecuaria.
- El dueño es desarrollador freelance argentino, domina Next.js + TypeScript + Supabase + Vercel.
- Fuentes de datos gratuitas y sin API key: Open-Meteo (Forecast con multi-modelo, Ensemble, Historical), MET Norway (api.met.no, exige User-Agent identificatorio y caché), RainViewer (tiles de radar).
- iOS solo permite Web Push si la PWA está instalada (iOS 16.4+).
- Idioma: castellano rioplatense. Unidades: °C, km/h, mm, hPa. Zona horaria America/Argentina/Buenos_Aires.

## Constraints

- **Costo**: todo gratis — Vercel Hobby, GitHub Actions, Supabase free
- **Uso**: no comercial — condición del plan gratis de Open-Meteo y de Vercel Hobby
- **Tech stack**: Next.js + TypeScript, Tailwind, Recharts, Route Handlers con `revalidate` como caché
- **Cron**: Vercel Hobby solo permite cron diario → el chequeo horario de alertas lo dispara GitHub Actions llamando a una ruta protegida de la app
- **APIs externas**: no pegarle a las APIs en cada visita (MET Norway lo exige); todo pasa por la caché del servidor
- **Mobile first**: el uso principal es el iPhone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Solo Winifreda, coordenadas fijas | Foco y simplicidad; sin buscador | — Pending |
| Diseño "cielo vivo" generativo + tipografía editorial + horizonte pampeano | Es el diferencial del proyecto | — Pending |
| Comparar modelos (ECMWF/GFS/ICON/MET Norway) con indicador de coincidencia | Diferencial de contenido frente a apps genéricas | Revisada 2026-10-25: queda solo el indicador (semáforo) dentro del Pronóstico, sin comparación lado a lado |
| Hosting en Vercel Hobby, código en GitHub | Gratis, deploy automático, soporta servidor | — Pending |
| GitHub Actions como cron horario | El cron de Vercel Hobby es diario | — Pending |
| Supabase free para suscripciones push | Sin servidor propio para guardar estado | — Pending |
| Push como última fase | No bloquea nada y suma complejidad | — Pending |
| Satélite IR GOES-East en vez de RainViewer | RainViewer tiene 0 cobertura sobre Argentina (medido) | — Pending |
| MET Norway no vota en la coincidencia | Fuera de Escandinavia usa datos de ECMWF (contaría doble) | — Pending |
| Sin pestaña Modelos; la confianza va dentro del Pronóstico | La comparación de modelos interesa a pocos; la probabilidad real, el rango y el semáforo le sirven a cualquiera | 2026-10-25 |
| Helada agronómica: mínima ≤ 2 °C | A 2 °C en abrigo ya hiela a ras del suelo | — Pending |
| Modo offline con último dato | En el campo se corta la señal seguido | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-23 after initialization*
