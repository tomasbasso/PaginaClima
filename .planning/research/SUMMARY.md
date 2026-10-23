# Resumen de la investigación del proyecto

**Proyecto:** Clima Winifreda · **Dominio:** PWA del clima de una sola localidad (Winifreda, La Pampa, -36.23/-64.23) con cielo generativo, multi-modelo y Web Push · **Investigado:** 2026-10-23 · **Confianza:** MEDIA-ALTA

Detalle en: [STACK.md](STACK.md) · [FEATURES.md](FEATURES.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [PITFALLS.md](PITFALLS.md)

## Resumen ejecutivo

La arquitectura correcta es chica: el navegador nunca le habla a las APIs del clima. Todo pasa por una capa de datos en el servidor (un adapter por fuente validado con Zod, normalizers y un único `WeatherSnapshot` como contrato) con caché por TTL. Ese snapshot lo consumen la página (RSC con ISR), `/api/weather`, el cielo y el motor de alertas. Con coordenadas fijas hay una sola clave de caché por fuente, así que la carga sobre las APIs es chica y constante. El diferencial son dos cosas que no hay que diluir: el **cielo vivo** (WebGL2 a mano, guiado por la elevación solar real, con horizonte pampeano) y la **honestidad sobre la incertidumbre** (los modelos que opinan, la probabilidad de lluvia desde ensembles y la lluvia acumulada contra la normal).

Stack: Next.js 16.4.3 con caché clásica (`cacheComponents` apagado, `fetch` con `next.revalidate`), TypeScript 5 (no 7), Tailwind 4, Recharts 3, `suncalc`, Supabase solo del lado del servidor y GitHub Actions como cron horario. Service worker escrito a mano (~80 líneas).

### Hallazgos transversales que cambian el plan

1. **RainViewer no tiene cobertura en Argentina.** Se midió decodificando el coverage mask: 0/65536 píxeles sobre Winifreda, Córdoba y Mar del Plata; los controles (Kansas, São Paulo) sí dan cobertura. Además, desde 01/01/2026: zoom máximo 7, sin nowcast y 100 req/IP/min. **Decisión del dueño:** reemplazarlo por satélite IR GOES-East (NASA GIBS, banda 13) más un link al radar del SMN.
2. **MET Norway usa ECMWF fuera de la región nórdica.** No es un modelo independiente. **Decisión:** los modelos que votan la coincidencia son ECMWF IFS, GFS, ICON y GEM; MET Norway se muestra aparte, rotulado "basado en ECMWF", y no vota.
3. **ECMWF IFS no detecta tormentas** (según la doc de Open-Meteo). Ni el cielo ni la alerta de tormenta pueden depender del `weather_code` de un solo modelo: hay que usar CAPE, probabilidad y los códigos de ICON y GFS.
4. **ERA5 llega con ~5 días de atraso y subestima la lluvia convectiva.** Hay que coser Historical con el `past_days` de Forecast, comparar contra la normal prorrateada a la misma fecha y rotular el dato como "estimado, no pluviómetro". Las normales 1991–2020 se calculan una vez y se guardan como JSON estático.
5. **Riesgos de plataforma:**
   - Open-Meteo limita por IP y las de Vercel son compartidas. Se mitiga con TTLs largos, un solo request multi-modelo y el último dato bueno persistido.
   - GitHub Actions apaga los `schedule` a los 60 días sin actividad en repos públicos. Se mitiga con `workflow_dispatch` y un cron externo redundante.
   - Supabase free se pausa a los 7 días. El cron horario la mantiene viva, con un heartbeat.
   - En Vercel Hobby los logs duran 1 h y el cron nativo corre una vez por día.

## Hallazgos clave

**Stack:**
- Next 16.4.3 + React 19.3; TypeScript ^5 (5.9.3); Tailwind 4.3.3 con `@tailwindcss/turbopack`.
- Runtime Node para `web-push` 3.6.7.
- Open-Meteo Forecast: `ecmwf_ifs` (HRES 9 km), `gfs_seamless`, `icon_seamless` y GEM, con `timezone=America/Argentina/Buenos_Aires`. Ensemble agregado en el servidor. Historical.
- MET Norway 2.0: User-Agent propio, 4 decimales, respetar `Expires` (~30 min).
- `suncalc` 2.1.1 (incluye fase lunar); Recharts 3.10.1.
- Cielo: WebGL2 a mano u `ogl`, en un solo canvas.
- MapLibre + OpenFreeMap + GIBS con carga diferida; zod 4; supabase-js 2.118; Vitest.
- **Evitar:** next-pwa, TypeScript 7, `cacheComponents`, fetch desde el cliente, three.js/Pixi y RainViewer.

**Features:**
- **Table stakes:**
  - Ahora completo con "actualizado hace X", aclarando que es dato de modelo y no observación.
  - 48 h y pronóstico diario con probabilidad y mm.
  - Sol, en castellano rioplatense.
  - PWA instalable con el último dato disponible offline.
  - Contraste y respeto de `prefers-reduced-motion`.
- **Diferenciadores:**
  - Cielo vivo + horizonte pampeano.
  - Titular editorial por reglas.
  - Meteograma legible en 390 px.
  - Probabilidad real de ensemble con abanico p10–p90.
  - Semáforo de coincidencia entre modelos.
  - Lluvia acumulada contra la normal.
  - Sol y luna.
- **Anti-features:** buscador, nowcast de "llueve en X minutos", mapa tipo Windy, widgets, LLM, cuentas de usuario, pronóstico a 30 días o más.

**Arquitectura:**
- `getWeatherSnapshot()` con `Promise.allSettled` y `sources[].status`. Los RSC llaman al agregador directo, no a su propia API.
- `deriveSkyState` y las reglas de alerta son funciones puras y testeables. La posición del sol se calcula en el cliente.
- Service worker: HTML network-first, `/api/weather` stale-while-revalidate, assets cache-first, sin cachear teselas.
- Cron: POST con Bearer, idempotente, dedupe con `INSERT ... ON CONFLICT DO NOTHING`.
- TTLs: Forecast 600–900 s, Ensemble 3–6 h, Archive 6–24 h, MET 1800 s.
- Deploy en la región `gru1` desde el primer día.

**Pitfalls principales:**
1. Radar sin cobertura.
2. ECMWF votando doble.
3. Probabilidad de ensemble mal agregada: hay que calcularla por miembro sobre la suma diaria local ≥ 1 mm y sacar del denominador al modelo que ya terminó su horizonte (ICON 7,5 d, GFS 10 d, ECMWF 15 d).
4. Días cortados por UTC en vez de hora argentina: un único `time.ts` y tests en el borde de las 03:00Z.
5. Caché que no cachea o que cachea errores.
6. 429 de Open-Meteo por IP compartida.
7. Cron y Supabase que se apagan solos.
8. Push en iOS:
   - solo funciona con la app instalada;
   - necesita un gesto del usuario;
   - hay que usar `waitUntil(showNotification)`;
   - VAPID con `mailto:`;
   - una respuesta 404/410 borra la suscripción;
   - alertas con histéresis.

## Implicancias para el roadmap

1. **Fundaciones, contrato de datos y caché:** scaffold, `time.ts`, adapter de Forecast, snapshot con TTLs, `/api/weather`, sección Ahora, último dato bueno y cliente de MET. Deploy desde el día 1.
2. **Pronóstico núcleo:** meteograma de 48 h, diario y titular editorial.
3. **Cielo vivo e identidad visual:** shader, horizonte, fallback CSS, `/dev/sky` y presupuesto de rendimiento en un iPhone real.
4. **Los modelos opinan y probabilidad real a 7–14 días.**
5. **Lluvia acumulada, satélite GOES IR, sol y luna.**
6. **PWA instalable y offline.**
7. **Web Push, alertas y cron.**

**Para investigar en su fase:**
- **F3:** WebGL2 contra Canvas 2D en Safari standalone.
- **F4:** IDs de modelos y disponibilidad de GEM en Sudamérica.
- **F5:** GetCapabilities de GIBS y ToS de OpenFreeMap.
- **F7:** Declarative Web Push y feed CAP del SMN.

**Estándar, sin investigación extra:** F1, F2 y F6.

## Confianza

| Área | Confianza | Notas |
|---|---|---|
| Stack | ALTA en lo central / MEDIA en cielo y push de iOS | Versiones y APIs verificadas con requests reales |
| Features | MEDIA-ALTA | Competidores evaluados por reseñas |
| Arquitectura | MEDIA-ALTA | Docs oficiales de Next, Vercel, MET y Actions |
| Pitfalls | MEDIA-ALTA | Límites tomados de docs oficiales; push de iOS en parte de fuentes comunitarias |

**Gaps:**
- Capa exacta de GIBS.
- Disponibilidad de GEM; si no está, votan 3 modelos.
- Repo público o privado: decidir antes de la fase 7.
- Feed CAP del SMN sin confirmar.
- ERA5 contra pluviómetro local: se comunica en la UI.
