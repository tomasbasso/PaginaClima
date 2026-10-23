# Investigación de features

**Dominio:** web/PWA del clima para una sola localidad (Winifreda, La Pampa), con diseño "cielo vivo" y comparación de modelos
**Fecha:** 2026-10-23
**Confianza:** MEDIA-ALTA. Las capacidades de las fuentes de datos (Open-Meteo, MET Norway, RainViewer, Web Push en iOS) están verificadas con documentación oficial. El análisis de competidores sale de reseñas y fichas del App Store (MEDIA) y de conocimiento previo de los productos (BAJA-MEDIA, marcado donde corresponde).

---

## Resumen para quien arma los requerimientos

1. **Lo básico de cualquier app del clima** (temperatura actual, por hora, por día, probabilidad de lluvia, viento, sol) es table stakes. Nadie te felicita por tenerlo, pero si falta o tarda en cargar, la app no sirve. Tiene que estar visible sin scrollear y responder en menos de 1 s desde la caché.
2. **El diferencial real son dos cosas** y conviene no diluirlo: (a) el cielo vivo con tipografía editorial (el terreno de Carrot, (Not Boring) Weather y los fondos animados de Apple Weather) y (b) **la honestidad sobre la incertidumbre**: modelos que opinan, una probabilidad de lluvia sacada del ensemble y la lluvia acumulada contra el promedio. Esto último es lo que Meteoblue y Windy le dan a los nerds, pero con una lectura de un vistazo.
3. **Tres hallazgos que cambian el plan:**
   - **MET Norway NO es un modelo independiente en Argentina.** Fuera de la región nórdica/ártica, `locationforecast` usa el ensemble de ECMWF (~9 km, 2–10 días). Si se lo pone "lado a lado" con ECMWF, el indicador de coincidencia va a tener un sesgo a favor del acuerdo. Hay que reemplazarlo (por ejemplo por GEM, UKMO o ECMWF AIFS vía Open-Meteo) o mostrarlo como "MET Norway (basado en ECMWF)" y que no cuente doble en el acuerdo. **[ALTA — docs oficiales de MET Norway]**
   - **RainViewer recortó el plan gratis (desde 01/01/2026):** zoom máximo 7, sin nowcast (no hay radar a futuro), sin satélite IR, un solo esquema de color (Universal Blue) y 100 req/min por IP. El radar sirve para "¿viene algo del oeste?", no para el detalle a nivel pueblo ni para "llueve en 12 minutos". **[ALTA — FAQ de transición de RainViewer]**
   - **Open-Meteo ya trae `precipitation_probability`** en la Forecast API: se calcula con ensembles (~0,25°, 30 miembros) como la probabilidad de más de 0,1 mm en la hora anterior. Para 7–14 días con rangos (p10/p90) y probabilidad por umbral (>1 mm, >10 mm), sí conviene la Ensemble API (ECMWF IFS 0,25°: 51 miembros, 15 días; GFS 0,25°: 31 miembros, 10 días). **[ALTA — docs de Open-Meteo]**

---

## Panorama de features

### Table stakes (lo que el usuario da por hecho)

Si falta alguno, la app se siente incompleta o "de juguete". Ojo: en este proyecto el usuario principal es el dueño, pero como pieza de portfolio también la va a abrir gente que viene de Apple Weather.

| Feature | Por qué se espera | Complejidad | Notas |
|---------|-------------------|-------------|-------|
| **Ahora: temperatura grande + estado (texto e ícono/ilustración)** | Es lo primero que mira cualquiera; Apple, Yr, Carrot y SMN arrancan así | BAJA | En Open-Meteo, `current` es salida de modelo (interpolada cada 15 min), **no una observación**. Conviene decirlo ("estimado por modelo, actualizado hh:mm") |
| **Sensación térmica, viento (velocidad + ráfaga + dirección), humedad, presión** | Datos estándar del bloque "detalles" de Apple Weather, SMN y Meteored | BAJA | Ráfaga y dirección en texto rioplatense ("del norte", "sudoeste"). La presión con tendencia (sube/baja en 3 h) le suma mucho y cuesta poco |
| **Máx/mín de hoy** | Apple, Yr y SMN la muestran pegada a la temperatura actual | BAJA | Sale del `daily` |
| **Pronóstico por hora (al menos 24–48 h)** | Universal | MEDIA | El proyecto lo resuelve con un meteograma; tiene que poder leerse en el celu sin pinch-zoom (scroll horizontal o 48 h comprimidas) |
| **Pronóstico diario (7+ días) con máx/mín y probabilidad de lluvia** | Universal; Apple muestra 10 días, Yr 9–10, Meteored 14 | MEDIA | La barra de rango de temperatura estilo Apple (mín–máx sobre una escala de la semana) ya es un patrón que la gente reconoce |
| **Probabilidad de lluvia + milímetros** | En una zona agropecuaria pesa más el "cuánto" que el "si" | BAJA (prob. de Forecast API) / MEDIA (ensemble) | Mostrar los dos: "70 % · 5–15 mm" |
| **Salida y puesta del sol** | Apple, Yr y Carrot lo traen | BAJA | Open-Meteo `daily.sunrise/sunset`, o calcularlo local con SunCalc |
| **Hora de actualización / frescura del dato** | Si no, no se sabe si el dato está viejo (sobre todo en una PWA con caché) | BAJA | "Actualizado hace 12 min". Crítico porque hay caché de servidor y de service worker |
| **Carga rápida + funciona offline con el último dato** | Las apps nativas abren al instante; una PWA lenta se nota enseguida | MEDIA | Service worker con stale-while-revalidate del JSON. Sin esto, abrirla desde la pantalla de inicio sin señal (cosa común en el campo) muestra un error |
| **Instalable (ícono, splash, standalone)** | Es la promesa del proyecto | BAJA-MEDIA | Manifest + `apple-touch-icon` + meta tags de iOS. iOS no muestra un prompt de instalación: hace falta una pantallita "Compartir → Agregar a inicio" |
| **Unidades y lenguaje locales** | °C, km/h, mm, hPa, "chaparrones", "lloviznas" | BAJA | Mapear los códigos WMO a un castellano rioplatense propio, no traducido literal |
| **Accesibilidad básica: contraste legible sobre el fondo animado** | Con un fondo dinámico, el texto blanco sobre un cielo de amanecer claro se pierde | MEDIA | Scrim/gradiente adaptativo y respetar `prefers-reduced-motion`. Apple Weather lo resuelve oscureciendo el fondo detrás de las tarjetas |

### Diferenciadores (ventaja competitiva)

Alineados con el Core Value: "entender de un vistazo" + "no se parece a ninguna otra app".

| Feature | Propuesta de valor | Complejidad | Notas |
|---------|--------------------|-------------|-------|
| **Cielo vivo generativo** (hora solar real + condición: amanecer, siesta, tormenta, noche estrellada, niebla) **+ horizonte pampeano** | Es EL diferencial. Apple anima fondos genéricos; (Not Boring) usa 3D con un motor de juego; acá la identidad es local (horizonte de llanura, caldén, molino, silo) | ALTA | Canvas 2D o WebGL ligero. Tiene que **interpolar por elevación solar** (no por hora fija) para que el amanecer coincida con el de Winifreda en cada estación. Presupuesto de batería/CPU: pausar cuando la pestaña está oculta y bajar FPS. Con `prefers-reduced-motion`, versión estática |
| **Tipografía editorial grande** (titular tipo diario: "Siesta pesada, 34°. Tormenta a la tarde.") | Carrot y (Not Boring) demuestran que la personalidad vende; un "titular" generado por reglas da la lectura de un vistazo | MEDIA | Generar frases con reglas (no LLM). Es el puente entre los datos y la emoción. Variable fonts para no pesar demasiado |
| **"Los modelos opinan" + indicador de coincidencia** | Meteoblue (MultiModel + "predictability") y Windy (puntos de color de predictabilidad) lo tienen, pero para expertos. Hacerlo legible ("Los 4 modelos coinciden: llueve el jueves" / "No se ponen de acuerdo") es raro en apps de consumo | MEDIA-ALTA | Ver hallazgo: **MET Norway ≈ ECMWF en Argentina**. Recomiendo ECMWF IFS, GFS, ICON y GEM (o UKMO) como los 4 "independientes", con MET Norway opcional y aclarado. Coincidencia = dispersión normalizada (temperatura: desvío entre modelos; lluvia: cuántos modelos superan 1 mm) → semáforo de 3 niveles, no un número con decimales |
| **Probabilidad de lluvia "real" desde el ensemble (7–14 días)** | Las apps genéricas muestran un % opaco. Acá: "De 51 escenarios de ECMWF, 34 traen lluvia el sábado" y un rango de mm | MEDIA | Ensemble API: contar miembros por umbral (>1 mm y >10 mm). Mostrar el rango p10–p90 de temperatura como banda (abanico) en los días lejanos, que se ensancha con el tiempo: así la incertidumbre se ve sin explicarla. Más allá de ~10 días, mostrar solo tendencia |
| **Meteograma de 48 h** (temperatura + lluvia + viento en un solo gráfico) | Es el sello de Meteoblue y Yr; casi ninguna app "linda" lo tiene bien hecho en el celu | MEDIA-ALTA | Recharts alcanza (ComposedChart: línea de temperatura, barras de mm, flechas o barbas de viento como capa custom). Sombrear la noche según sunrise/sunset. Lo difícil es la legibilidad en 390 px, no los datos |
| **Lluvia acumulada vs promedio histórico** (semana/mes/año/campaña) | Muy valioso en zona agropecuaria y raro en apps de consumo (Apple trae "promedios" mensuales, pero no tu acumulado contra la normal en una barra) | MEDIA | Normal climatológica 1991–2020 con Open-Meteo Historical (ERA5/ERA5-Land): calcularla **una vez** y guardarla como JSON estático, no pedirla en cada visita. Ojo: ERA5 subestima los chaparrones convectivos; aclarar "estimado por reanálisis, no pluviómetro" |
| **Sol y luna con datos útiles** | Fase lunar e iluminación, hora dorada, duración del día y cuánto cambió respecto de ayer ("+2 min de luz") | BAJA | SunCalc local, sin API. La fase lunar alimenta al cielo vivo (luna visible en la noche estrellada con la fase correcta): sinergia barata |
| **Alertas Web Push específicas del lugar** (helada, tormenta, viento fuerte) | Las apps genéricas mandan avisos regionales; acá se calibran los umbrales para Winifreda | ALTA | Solo en una PWA instalada con iOS 16.4+, con permiso pedido desde un gesto del usuario. Helada: avisar con tiempo (la tarde anterior) cuando la mínima pronosticada sea ≤ 0 °C o ≤ 3 °C con cielo despejado y calma (la helada agronómica pega con 2–3 °C a 1,5 m). Antirrebote: no repetir el mismo aviso para el mismo evento |
| **Lenguaje con "tonada" propia** (no traducción) | Carrot demuestra que el tono es un diferencial enorme y barato | BAJA | Diccionario de estados y frases rioplatenses ("se viene el pampero", "siesta bravísima"). Sin insultos: mantener el registro de portfolio |
| **Datos agro opcionales** (temperatura del suelo, evapotranspiración ET0, ventana de pulverización por viento) | El público de Winifreda es agropecuario; Meteoblue y apps agro lo cobran | MEDIA | Open-Meteo trae `soil_temperature_0cm` y `et0_fao_evapotranspiration`. **Recomendación: v2**, solo si el dueño lo usa |

### Anti-features (lo que NO hay que construir)

| Feature | Por qué tienta | Por qué es un problema | Alternativa |
|---------|----------------|------------------------|-------------|
| **Buscador / otras localidades / favoritos** | "Toda app del clima lo tiene" | Ya está fuera de alcance; abre geocoding, caché por coordenada, cuotas de API y rompe el horizonte pampeano (que es específico del lugar) | Coordenadas fijas. Si alguien la quiere para otro pueblo, que haga fork |
| **Nowcast "llueve en X minutos"** (estilo Dark Sky/Apple) | Es la feature más amada de Dark Sky | En Argentina no hay minutely nativo: Open-Meteo interpola desde datos horarios fuera de Europa Central/Norteamérica y RainViewer cortó el nowcast gratis en 2026. Sería una precisión falsa | Mostrar "próximas 3 h" por hora + radar pasado (última ~1 h) |
| **Mapa de capas estilo Windy** (viento animado, isobaras, CAPE, nubes) | Se ve espectacular en el portfolio | Es otro producto entero: tiles de modelo, rendimiento en el celu, licencias. Compite con el cielo vivo por la atención y la batería | Radar RainViewer con zoom ≤ 7 centrado en Winifreda, más un link "Ver en Windy" |
| **Radar con zoom de calle** | "Quiero ver si llueve en mi chacra" | Con el plan gratis el zoom máximo es 7 (~1 km/px): al hacer zoom de más se ve pixelado o vacío | Fijar el zoom en 6–7 con un marcador del pueblo; aclarar la cobertura |
| **Avisos oficiales del SMN integrados** | Parecería lo "serio" | No encontré una API pública documentada del Sistema de Alerta Temprana del SMN (sin verificar si existe CAP/RSS; confianza BAJA). Scrapear es frágil | Alertas propias por umbral + link a smn.gob.ar/alertas. Investigar un feed CAP del SMN en la fase de push |
| **Explicar la incertidumbre con estadística cruda** (desvío estándar, spaghetti plots de 51 miembros) | Es "lo correcto" para un meteorólogo | Rompe el "de un vistazo". El spaghetti de 51 líneas en 390 px es ilegible | Abanico p10–p90 + semáforo de coincidencia + una frase. El detalle crudo, como mucho, detrás de un "ver más" |
| **Widgets de pantalla de inicio / complicaciones del Watch** | Carrot los tiene "best-in-class" | Imposible desde una PWA en iOS | No prometerlo. El badge del ícono (Badging API, iOS 16.4+) es lo único posible, y es opcional |
| **Personalidad sarcástica/IA generativa (tipo Carrot)** | Es divertido | Un LLM agrega costo, latencia y riesgo de decir pavadas sobre un pronóstico; el humor ácido envejece rápido en un portfolio | Frases por reglas, con un tono cálido y local |
| **Cuentas, sync, configuración extensa** | "Personalización" | Uso personal, sin login (fuera de alcance). Cada toggle es una superficie de bugs | Configuración mínima guardada en el dispositivo: umbrales de alertas y nada más |
| **Calidad del aire, polen, UV detallado, mareas, huracanes** | Apple y Meteored lo traen | Poco relevante en Winifreda; los datos de calidad del aire en el interior de La Pampa son modelados y pobres | Como mucho, el índice UV máximo del día en una línea (en verano importa) |
| **Pronóstico a 30+ días** | GFS 0,5° llega a 35 días | Sin habilidad útil a escala local; contradice el mensaje de "honestidad" | Cortar en 14 días y desvanecer visualmente los días 10–14 |
| **Animaciones pesadas con WebGL/3D sin presupuesto** | "Más wow" | Batería, calor y jank en iPhones viejos; Safari en standalone tiene sus mañas con WebGL | Canvas 2D primero; WebGL solo si se mide que rinde. Presupuesto: 60 fps en un iPhone de 3 años o menos con <5 % de CPU en reposo |

---

## Dependencias entre features

```
Capa de datos en servidor (Route Handlers + revalidate, normalización de unidades/zona horaria)
    ├──requiere──> Ahora
    ├──requiere──> Meteograma 48 h
    ├──requiere──> 7–14 días ──requiere──> Ensemble API (probabilidad, abanico p10–p90)
    ├──requiere──> Los modelos opinan ──requiere──> elegir un set de modelos independientes (no ECMWF + MET Norway como si fueran dos)
    │                                └──alimenta──> Indicador de coincidencia ──alimenta──> Titular editorial ("no se ponen de acuerdo")
    ├──requiere──> Lluvia acumulada ──requiere──> Normal histórica precalculada (JSON estático, una vez)
    └──requiere──> Motor de alertas (umbrales) ──requiere──> Web Push

Sol y luna (SunCalc local, sin API)
    └──alimenta──> Cielo vivo (elevación solar → paleta; fase lunar → luna visible)

Código WMO del estado actual + nubosidad + visibilidad + precipitación
    └──alimenta──> Cielo vivo (escena: despejado / nublado / tormenta / niebla)

Cielo vivo ──requiere──> Sistema de contraste/scrim ──requiere──> Tipografía editorial legible

PWA instalable (manifest + service worker)
    ├──requiere──> Offline con el último dato
    └──requiere──> Web Push (iOS: SOLO instalada, 16.4+)
                       └──requiere──> Supabase (suscripciones) + GitHub Actions (cron horario) + ruta protegida

Radar (RainViewer) ── independiente; solo necesita un mapa base (Leaflet/MapLibre)

Animación del cielo vivo ──compite con──> Radar animado y meteograma (CPU/batería en la misma pantalla)
```

### Notas de dependencias

- **La capa de datos va primero:** todas las secciones salen de la misma caché de servidor. Si cada sección le pega por su cuenta a Open-Meteo, se rompe la restricción de "no pegarle a las APIs en cada visita".
- **Cielo vivo requiere sol/luna + estado actual:** sin la elevación solar, el cielo se desfasa (en Winifreda el amanecer va de ~6:00 en diciembre a ~8:10 en junio; los valores son aproximados y conviene verificarlos con SunCalc).
- **El indicador de coincidencia requiere decidir antes qué modelos son independientes:** si se agrega MET Norway como "4.º modelo", ECMWF vota dos veces.
- **El titular editorial se apoya en todo lo demás:** conviene hacerlo después de "Ahora" y la coincidencia, porque su gracia es resumir ("Fresco y seguro: los modelos coinciden").
- **Web Push requiere PWA instalada + backend de suscripciones + cron:** es lo más acoplado y con más partes móviles; tiene sentido que vaya al final, como dice PROJECT.md.
- **Cielo vivo y radar animado compiten por la CPU:** el radar va en su propia vista/ruta y el cielo se pausa mientras está visible.

---

## Definición del MVP

### Lanzar con (v1)

- [ ] **Capa de datos con caché** (Forecast multi-modelo + Ensemble en una sola pasada cacheada): todo depende de esto
- [ ] **Ahora** con temperatura, sensación, viento/ráfaga/dirección, humedad, presión con tendencia, máx/mín y "actualizado hace X": table stakes
- [ ] **Cielo vivo v1**: gradiente por elevación solar + 4–5 escenas (despejado día/noche, nublado, lluvia/tormenta, niebla) + horizonte pampeano estático: es el diferencial, y sin él es "otra app aburrida"
- [ ] **Titular editorial por reglas**: barato y le da identidad
- [ ] **Meteograma 48 h**: es un pedido explícito y el corazón del "va a hacer"
- [ ] **7–14 días con probabilidad del ensemble y abanico de incertidumbre**: es un diferencial de contenido
- [ ] **Sol y luna**: costo bajísimo y alimenta al cielo
- [ ] **PWA instalable + offline del último dato**: es la forma de uso real (iPhone)

### Agregar después de validar (v1.x)

- [ ] **Los modelos opinan + indicador de coincidencia**: se agrega cuando la capa de datos esté estable y se haya decidido el set de modelos
- [ ] **Lluvia acumulada vs promedio**: requiere precalcular la normal; se agrega cuando el dueño quiera comparar campañas
- [ ] **Radar RainViewer**: es independiente; se suma cuando el resto esté pulido (con las limitaciones del plan gratis)
- [ ] **Cielo vivo v2**: estrellas con parallax, luna en su fase, relámpagos sincronizados con la probabilidad de tormenta, viento que mueve el pasto del horizonte

### Consideración futura (v2+)

- [ ] **Web Push (helada, tormenta, viento)**: es la feature más acoplada (Supabase + Actions + iOS instalada); va al final, como ya está decidido
- [ ] **Datos agro** (suelo, ET0, ventana de pulverización): solo si hay uso real
- [ ] **Feed oficial de alertas SMN**: solo si se confirma una fuente estable (CAP/RSS)

---

## Matriz de priorización

| Feature | Valor para el usuario | Costo de implementación | Prioridad |
|---------|----------------------|-------------------------|-----------|
| Capa de datos cacheada | ALTO (habilitante) | MEDIO | P1 |
| Ahora + detalles | ALTO | BAJO | P1 |
| Cielo vivo v1 + horizonte | ALTO (diferencial) | ALTO | P1 |
| Titular editorial | MEDIO-ALTO | BAJO | P1 |
| Meteograma 48 h | ALTO | MEDIO | P1 |
| 7–14 días + ensemble | ALTO | MEDIO | P1 |
| Sol y luna | MEDIO | BAJO | P1 |
| PWA instalable + offline | ALTO | MEDIO | P1 |
| Los modelos opinan + coincidencia | ALTO (diferencial) | MEDIO-ALTO | P2 |
| Lluvia acumulada vs normal | ALTO (zona agro) | MEDIO | P2 |
| Radar | MEDIO (limitado por el plan gratis) | MEDIO | P2 |
| Cielo vivo v2 | MEDIO | ALTO | P2 |
| Web Push alertas | ALTO (helada) | ALTO | P3 (última fase) |
| Datos agro | MEDIO | MEDIO | P3 |
| Badge del ícono | BAJO | BAJO | P3 |

**Clave:** P1 = para el lanzamiento · P2 = apenas se pueda · P3 = futuro

---

## Análisis de competidores

| Feature | Apple Weather | Carrot | (Not Boring) Weather | Meteoblue / Windy | Yr | SMN / Meteored | **Clima Winifreda** |
|---------|---------------|--------|----------------------|-------------------|----|----------------|---------------------|
| Estética | Fondos animados por condición, genéricos | Personalidad (5 niveles de sarcasmo), Interface Maker | 3D en motor de juego, temperatura gigante, slider para recorrer el día | Utilitaria, densa | Limpia, nórdica | Portal con mucha publicidad (Meteored) | Cielo generativo por elevación solar + horizonte pampeano + tipografía editorial |
| Por hora | Lista y gráfico | Lista/gráfico configurable | Slider | Meteograma (el sello) | Meteograma/tabla | Tabla | Meteograma 48 h táctil |
| Incertidumbre | Solo un % de lluvia | Elegir la fuente de datos (de a una) | No | MultiModel + "predictability"; Windy: puntos de colores | Rango de mm (mín–máx) en las barras | No | Abanico del ensemble + semáforo de coincidencia + frase |
| Comparación de modelos | No | Cambiar de proveedor, sin comparar | No | Sí (expertos) | No | No | Sí, de un vistazo |
| Lluvia vs normal | "Promedios"/tendencias históricas | No (MEDIA) | No | Climate/history (pago en parte) | Estadística de estaciones (Noruega) | No | Acumulado semana/mes/año vs normal 1991–2020 |
| Radar | Mapas de precipitación | Radar + capas pagas | Básico | Windy: todas las capas | Radar nórdico | Radar SMN (imágenes) | RainViewer zoom ≤ 7, sin futuro |
| Alertas | Lluvia en la próxima hora (algunos países) + oficiales | Notificaciones (pago) | No (BAJA) | Windy: alertas pagas | Avisos de MET (Noruega) | Alertas oficiales SAT | Push propias calibradas: helada, tormenta, viento |
| Modelo de negocio | Gratis con iOS | Suscripción | Suscripción + skins | Freemium | Gratis | Publicidad | Sin monetización (no comercial) |

**Lectura:** el hueco libre es **"precisión honesta de nerd" × "belleza de app de diseño"**. Meteoblue tiene lo primero y es feo en el celu; Carrot y (Not Boring) tienen lo segundo y usan una sola fuente. Nadie lo hace para un pueblo específico con identidad visual local.

---

## Implicancias para el roadmap

- **Fase de datos antes que la de UI:** definir el contrato JSON normalizado (current, hourly 48 h, daily 14 d, models[], ensemble stats, sun/moon) para que las fases de UI no dependan de las APIs.
- **El cielo vivo merece su propia fase** y probablemente un spike de investigación de rendimiento (Canvas vs WebGL en Safari standalone).
- **La fase de modelos necesita una decisión explícita** sobre el set de modelos (flag: MET Norway ≈ ECMWF).
- **La fase de push necesita investigarse aparte:** suscripciones en iOS, expiración de endpoints, VAPID, antirrebote de alertas y una posible fuente CAP del SMN.

---

## Fuentes

- Open-Meteo Ensemble API (modelos, miembros, horizontes; retención de miembros): https://open-meteo.com/en/docs/ensemble-api [ALTA]
- Open-Meteo Forecast API (modelos, `precipitation_probability` desde ensembles, minutely_15 interpolado fuera de EU/NA): https://open-meteo.com/en/docs [ALTA]
- MET Norway Locationforecast, data model (ECMWF ensemble fuera de la región nórdica): https://docs.api.met.no/doc/locationforecast/datamodel [ALTA]
- RainViewer API y FAQ de transición (zoom 7, sin nowcast ni IR, Universal Blue, 100 req/min desde 01/01/2026): https://rainviewer.com/api.html , https://rainviewer.com/api/transition-faq.html [ALTA]
- RainViewer, radares de Argentina: https://rainviewer.com/radars/argentina.html [MEDIA; la cobertura exacta sobre Winifreda no está verificada]
- Meteoblue MultiModel y predictabilidad: https://content.meteoblue.com/en/private-customers/website-help/forecast/multimodel/ , https://business.meteoblue.com/articles/how-do-multiple-weather-models-become-one-forecast [MEDIA]
- Windy, predictabilidad con puntos de color: https://www.windy.com/articles/43904 [MEDIA]
- Apple Weather (next-hour, promedios/tendencias): https://support.apple.com/en-ng/102594 , https://tomsguide.com/phones/iphones/how-to-set-up-rain-alerts-in-apples-weather-app [MEDIA]
- CARROT Weather (personalidades, widgets, capas pagas): https://apps.apple.com/us/app/carrot-weather-alerts-radar/id961390574 , https://www.tapsmart.com/reviews/carrot-weather-5-review/ , https://www.stuff.tv/app-reviews/carrot-weather/review [MEDIA]
- (Not Boring) Weather (3D, slider, suscripción, datos de OpenWeather): https://www.tapsmart.com/apps/not-boring-weather-fun-alternative-weather-watchers/ , https://screensdesign.com/showcase/not-boring-weather [MEDIA]
- Web Push en iOS (solo instalada, 16.4+, Badging API): https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications , https://developer.apple.com/forums/thread/732594 [MEDIA-ALTA]
- SMN Sistema de Alerta Temprana (no se encontró una API pública): https://www.cadena3.com/noticia/sociedad/como-funciona-el-nuevo-sistema-de-alerta-temprana-del-servicio-meteorologico_434373 [BAJA respecto de la API]
- Yr, SMN y Meteored: conocimiento previo de los productos, sin verificar en esta sesión [BAJA-MEDIA]

---
*Investigación de features para: web/PWA del clima de una sola localidad con diseño generativo*
*Fecha: 2026-10-23*
