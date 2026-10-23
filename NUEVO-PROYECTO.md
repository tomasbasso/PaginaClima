# Clima Winifreda
Tipo: propio (uso personal + portfolio, no comercial)
Etapa actual: 4. Construir — Fase 1 (siguiente: /gsd-discuss-phase 1)
Repo: https://github.com/tomasbasso/PaginaClima (remote origin, sin push todavía)

## Decisiones
- 2026-10-23 GO. Diferencial: diseño único ("cielo vivo"), no otra app de clima aburrida.
- 2026-10-23 Solo Winifreda, La Pampa (coordenadas fijas). Sin buscador ni favoritos → sin Geocoding ni localStorage de localidades.
- 2026-10-23 Alcance completo, 7 secciones: Ahora · 48 h por hora (meteograma) · 7–14 días con probabilidad (Ensemble) · Los modelos opinan (ECMWF/GFS/ICON/MET Norway + coincidencia) · Lluvia acumulada vs promedio histórico · Radar (RainViewer) · Sol y luna.
- 2026-10-23 Diseño: cielo vivo generativo/animado según hora real y estado del tiempo + tipografía editorial grande + silueta del horizonte pampeano.
- 2026-10-23 Notificaciones Web Push (helada, tormenta, viento) como ÚLTIMA fase.
- 2026-10-23 Hosting: código en GitHub, deploy en Vercel Hobby (gratis, uso no comercial). Se descartó GitHub Pages (sin servidor: perdía caché, MET Norway y push) y el VPS con Coolify (es de un cliente).
- 2026-10-23 Cron cada hora con GitHub Actions llamando a una ruta de la app (el cron de Vercel Hobby es 1 vez/día). Suscripciones push en Supabase (plan gratis).
- 2026-10-23 Stack: Next.js + TypeScript, Tailwind, Recharts, PWA, Route Handlers con revalidate, Open-Meteo (Forecast, Ensemble, Historical), MET Norway, RainViewer. Plan gratis de Open-Meteo OK por ser no comercial.
- 2026-10-23 Diseño: sistema "Pampa Cielo Editorial" (Stitch 7105606539074745910). Playfair Display + Plus Jakarta Sans, 0px de radio, sin tarjetas, líneas crema, zona oscura bajo el horizonte para contraste, barra Ahora/Pronóstico/Modelos/Cielo, sin buscador.

## Etapas
- [x] 1. Validar: GO — proyecto propio, diferencial en el diseño, todo gratis en Vercel + Actions + Supabase.
- [x] 2. Definir y planificar: roadmap GSD de 7 fases (37 requisitos) aprobado. Ver .planning/
- 2026-10-23 Investigación: RainViewer sin cobertura en Argentina → satélite IR GOES + link SMN. MET Norway no vota (usa ECMWF). Modelos: ECMWF, GFS, ICON, GEM. Helada ≤ 2 °C. Offline sí.
- [x] 3. Identidad y diseño: 3 pantallas en Stitch (tarde, atardecer, tormenta) en design/stitch/ + contrato UI de Fase 1 aprobado (.planning/phases/01-fundaciones-y-ahora/01-UI-SPEC.md). Marca = solo ícono PWA, sin brandkit.
- [ ] 4. Construir (fases de GSD)
- [ ] 5. Verificar
- [ ] 6. Publicar
- [ ] 7. Lanzar y vender
- [ ] 8. Mantener
