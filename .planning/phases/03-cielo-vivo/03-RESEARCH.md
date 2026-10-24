# Fase 3: Cielo vivo - Investigación

**Investigado:** 2026-10-24
**Dominio:** render generativo en el navegador (WebGL en Safari iOS / PWA standalone), presupuesto de GPU/batería en iPhone, contraste sobre fondo animado
**Confianza:** MEDIUM-HIGH (la arquitectura y la matemática de color son HIGH; los números exactos de Safari iOS son MEDIUM porque salen de bugs de WebKit y fuentes comunitarias, y se confirman en el checkpoint con el iPhone real)

## Summary

El cielo es un **fragment shader de pantalla completa con 1 draw call**, escrito a mano sobre WebGL, **sin dependencias nuevas**. Se pide un contexto `webgl2` y, si falla, `webgl`. Los shaders se escriben en **GLSL ES 1.00**, que compila en los dos contextos, así no hace falta una segunda versión. WebGL2 está activo por defecto en Safari iOS desde la 15 [CITED: khronos.org/blog/webgl-2-achieves-pervasive-support-from-all-major-web-browsers], y la PWA ya exige iOS ≥ 16.4 por Web Push, así que el fallback CSS queda para casos raros: contexto perdido, chunk que no cargó, navegadores viejos o el gobernador de calidad. `ogl` (1.0.11) no hace falta para un único quad: suma peso y una dependencia a cambio de unas 60 líneas de boilerplate. Canvas 2D queda descartado. Nubes por ruido, bruma y gradiente continuo son campos por píxel, y en 2D eso implica sprites pre-renderizados y `createLinearGradient` en cada frame, que en la CPU del iPhone sale más caro y se ve menos orgánico (coincide con `CLAUDE.md` §"Cielo vivo generativo").

La decisión de arquitectura más importante es **separar en CPU todo lo que tiene que ser verificable**. La paleta S1…S5 (`skyPalette`, mezcla en RGB lineal), la intensidad, la cobertura, la envolvente del relámpago, el limitador de fps, el gobernador de calidad, la posición de sol y luna, y el período del molino son **funciones puras de `lib/sky/`, testeadas con Vitest**, y le llegan al shader como uniforms. El shader solo compone: interpola el gradiente con esos 5 colores, suma ruido de nubes, lluvia y estrellas procedurales, aplica el **clamp final de luminancia** en la zona de contenido y codifica a sRGB. Así, el test de C-1/C-2 del UI-SPEC prueba exactamente los colores que dibuja la GPU, sin una copia en JS que se desincronice del GLSL.

Hay trampas concretas de iOS que el plan tiene que cubrir de entrada. (1) En las GPU de Apple, `mediump` es float de 16 bits: el tiempo y los offsets de deriva tienen que ir en `highp` y llegar ya acotados desde la CPU. (2) iOS en Modo Ahorro limita `requestAnimationFrame` a 30 fps, y en ProMotion Safari entrega 60 por defecto: el limitador necesita tolerancia o va a saltar a 20 fps. (3) Safari pierde contextos WebGL al pasar a segundo plano y tiene un tope de unos 16 contextos activos por página. Por eso `/dev/estados`, que monta más de 15 `SkyBackdrop`, **no puede crear un canvas por cuadro**. (4) El canvas se crea **imperativamente dentro del efecto**, para que el doble montaje de Strict Mode y los remontajes entre `loading.tsx` y la página no reutilicen un contexto ya perdido.

**Recomendación principal:** shader WebGL hecho a mano (GLSL ES 1.00, `webgl2` con caída a `webgl`, triángulo de pantalla completa, sin dependencias) en un módulo que no es React y se carga con `import()` desde `SkyBackdrop`. Todos los parámetros se calculan en `lib/sky/*` con funciones puras testeadas, el loop corre a 30 fps con tolerancia, y hay pausa por visibilidad, por `pagehide` y por IntersectionObserver. El fallback CSS existente se mantiene siempre montado debajo.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

> El usuario no eligió áreas para discutir ("sin preferencia"), igual que en la fase 1. Todas las decisiones de abajo son defaults recomendados por Claude y el usuario puede corregirlas antes de `/gsd-plan-phase 3`. Lo ya bloqueado en `01-UI-SPEC.md` ("Contrato con la fase 3") no se rediscute.

#### Contrato que se mantiene (de las fases 1 y 2)
- **D-01:** El punto de reemplazo único es `<SkyBackdrop state={SkyState} />` (`components/client/SkyBackdrop.tsx`). `SkyState = { phase, weather, sunAltitude }` no cambia de forma. Si hace falta información extra (intensidad, viento), se agrega como campo opcional sin romper a los llamadores actuales.
- **D-02:** Los 6 tokens `data-sky` y sus gradientes CSS de `app/globals.css` quedan como **fallback** (sin WebGL, reducir movimiento, antes de que cargue el canvas) y siguen manejando `--accent` y la barra de pestañas. El canvas se monta **encima** del gradiente CSS y aparece con un fundido cuando dibujó el primer frame, así no hay flash ni salto en el primer paint ni en la hidratación.
- **D-03:** Regla estructural de contraste (SKY-04): la zona de contenido (de arriba hasta la banda del horizonte) se mantiene oscura (rango S1→S3 de cada token). Los tonos claros (S4/S5, el sol bajo, el brillo del amanecer) viven solo en la banda del horizonte. El shader respeta esa división en todos los estados.

#### Estilo del cielo (a criterio de Claude)
- **D-04:** El estilo es **atmosférico y pictórico, no fotorrealista ni caricaturesco**: campos continuos (gradiente que depende de `sunAltitude`, nubes por ruido, bruma, grano fino) que combinan con la tipografía editorial y la silueta plana. Nada de íconos ni objetos tipo clipart.
- **D-05:** El **sol** se insinúa como un resplandor cerca del horizonte en amanecer y atardecer, sin disco dibujado de día (quedaría detrás del texto). De noche despejada hay **estrellas** que titilan apenas, y la luna se insinúa como un resplandor si está sobre el horizonte (la fase dibujada es de la fase 5).
- **D-06:** La transición entre fases solares es **continua**, guiada por `sunAltitude` real, no por saltos entre 4 fases. Las fases discretas solo se usan para los tokens del fallback y del acento.

#### Cuánto se mueve (a criterio de Claude)
- **D-07:** El movimiento es **lento y contemplativo**: nubes que derivan, titileo de estrellas, lluvia en trazos finos y semitransparentes. No compite con la lectura del texto. Relámpagos solo en tormenta, como destello de fondo poco frecuente (cada varios segundos, aleatorio). El destello es suave: sin flashes de pantalla completa de alto contraste, por fotosensibilidad.
- **D-08:** La **intensidad sigue el dato real** cuando existe: la severidad del código WMO (llovizna/lluvia débil/fuerte), `precipMm` y `windKmh` modulan la densidad de lluvia y la velocidad de deriva de las nubes. Si falta el dato, se usan valores medios por estado. Si sumar `cloud_cover` a la llamada de `current` de Open-Meteo sale gratis (es el mismo request), se puede agregar para la densidad de nubes. Es decisión del planner.
- **D-09:** Rendimiento (SKY-06): tope de **30 fps**, pausa con `visibilitychange` (pestaña oculta o app en segundo plano) y también cuando el cielo sale de pantalla (IntersectionObserver, por ejemplo al scrollear al meteograma). DPR del canvas limitado (render a resolución reducida y escalado, porque el cielo es borroso). Con "reducir movimiento" se dibuja **un solo frame estático** del mismo cielo (si hay WebGL) en vez de animarlo, y si no hay WebGL se ve el gradiente CSS.

#### Dónde vive el cielo (a criterio de Claude)
- **D-10:** El cielo sigue **solo en la caja del Hero**, como en la fase 2. El meteograma y el diario siguen sobre `bg-ground` oscuro, que es lo que garantiza su contraste. El cielo no pasa a ser un fondo fijo de toda la app.
- **D-11:** La banda compacta de `/pronostico` (Hero `compact`) usa el **mismo componente**, con el mismo estado. El tope de fps y la pausa aplican igual.

#### Horizonte pampeano (a criterio de Claude)
- **D-12:** La silueta `components/PampaHorizon.tsx` sigue siendo **SVG plano** (no se pasa al shader), así queda nítida a cualquier DPR. El canvas va detrás.
- **D-13:** Reacciones mínimas y baratas: el **rotor del molino gira** con una velocidad proporcional al viento actual (CSS/SVG, quieto con viento calmo o sin dato, quieto con reducir movimiento), y los **relámpagos aclaran apenas el cielo detrás** de la silueta (contraluz). La niebla es parte del cielo (bruma baja detrás de la silueta), no una capa delante del texto.

#### Herramienta de revisión
- **D-14:** `/dev/sky` (nueva, `notFound()` en producción como `/dev/estados`) permite forzar fase solar o `sunAltitude`, clima, intensidad y viento, y ver lado a lado el canvas, el frame estático (reducir movimiento) y el fallback CSS. Es lo que se usa para revisar cada estado del criterio 1 del roadmap.

### Claude's Discretion
- Las cuatro áreas presentadas (estilo, cuánto se mueve, dónde vive, horizonte que reacciona): el usuario no tuvo preferencia y quedan con los defaults de arriba.
- Técnica de render (WebGL2 a mano, `ogl` o Canvas 2D): la decide la **investigación** de esta fase (WebGL2 contra Canvas 2D en Safari standalone y presupuesto en iPhone), dentro de lo que dice `CLAUDE.md` (no three.js/R3F/Pixi).
- Paleta exacta del shader, siempre que respete D-03 y converja con los tokens del fallback.
- Si se suma `cloud_cover` al snapshot (D-08).
- Cómo se mide "no se calienta" en la verificación: checkpoint humano en un iPhone real con varios minutos de uso, más una medición de frame time en el navegador.

### Deferred Ideas (OUT OF SCOPE)
- Estaciones del año, luna llena o eclipses en el cielo: SKY-07 (v2).
- Disco y fase lunar dibujados con datos: fase 5 (ASTRO-02).
- Cielo como fondo fijo de toda la app (detrás del meteograma): descartado por contraste, se puede reconsiderar después del MVP.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKY-01 | Fondo animado generativo que refleja la posición real del sol | Shader continuo guiado por `sunAltitude` (suncalc 2.1.1, grados) y por la paleta pura `skyPalette` con anclas −12°/0°/+15°. Resplandor posicionado por azimut (suncalc: grados, horario desde el norte, verificado). §Patrón 2, §Patrón 3 |
| SKY-02 | El fondo cambia según el estado del tiempo | `skyParams()` puro: intensidad por WMO/`precipMm`, cobertura por código, deriva por viento. Capas procedurales en el mismo shader (nubes fbm, lluvia por celdas con hash, estrellas, niebla, relámpago como uniform). Interpolación de 2000 ms en CPU. §Patrón 4 |
| SKY-03 | Silueta del horizonte pampeano abajo | `PampaHorizon` sigue SVG. El rotor del molino se separa en un `<g>` propio animado con Web Animations (`updatePlaybackRate`). §Patrón 6 |
| SKY-04 | Texto legible sobre cualquier estado | Mezcla en RGB lineal (la luminancia de la mezcla queda acotada por linealidad), test de barrido de `skyPalette`, clamp final de luminancia en el shader solo en la zona de contenido, alto de la banda medido del DOM. §Patrón 3, Pitfalls 6–8 |
| SKY-05 | Cielo estático con "reducir movimiento" + fallback sin WebGL | `matchMedia` en vivo → un solo `draw()` sin loop. Capa de clima del fallback CSS con `data-sky-weather`. Captura de error en creación de contexto, `import()` y `webglcontextlost`. §Patrón 5 |
| SKY-06 | Fluido en iPhone, 30 fps, pausa en segundo plano, fallback sin WebGL | Limitador de 30 fps con tolerancia, pausa por `visibilitychange`/`pagehide`/IntersectionObserver, buffer a 0,5× CSS, `powerPreference: 'low-power'`, cero allocations por frame, gobernador de calidad. Verificación con la lectura de `/dev/sky` + checkpoint humano. §Patrón 1, Pitfalls 1–5 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Stack fijo: Next.js 16.4.3 (App Router, Turbopack), React 19.3, TypeScript `^5` (no TS 7), Tailwind 4 configurado desde CSS (sin `tailwind.config.js`), suncalc 2.1.1 (no `@types/suncalc`).
- Cielo: "fragment shader con 1 draw call"; **WebGL2 a mano u `ogl`**. **Prohibido** three.js, R3F y Pixi.
- Mobile first: el iPhone es el uso principal.
- Todo gratis y no comercial; las APIs externas pasan por la caché del servidor y nunca se llaman desde el cliente. El cielo no puede hacer fetch propio: usa el `SkyState` que ya calcula el servidor.
- `motion` es opcional y **no** se usa para el cielo.
- Vitest para las funciones puras (estado del cielo incluido). La lógica pura va en `lib/` con el test al lado.
- Flujo GSD: los cambios pasan por comandos GSD. Memoria del usuario: push a main sin preguntar cuando todo está en verde.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Estado del cielo inicial (fase, clima, intensidad, viento) | Frontend Server (SSR/ISR) | — | `skyFromSnapshot` corre en el render ISR. Así el token `data-sky` y el fallback CSS ya vienen bien en el HTML |
| Altura y azimut continuos del sol/luna | Browser / Client | — | Se recalculan cada 60 s con suncalc en el cliente (ya está en el bundle por `SkyBackdrop`) |
| Paleta, intensidad, relámpagos, fps, gobernador | Browser (lógica pura en `lib/sky/`) | — | Funciones puras sin DOM, testeables en Node y ejecutadas en el cliente |
| Composición por píxel (gradiente, nubes, lluvia, estrellas, clamp) | Browser (GPU, WebGL) | — | Un fragment shader y un draw call |
| Fallback (sin WebGL, sin JS, antes del chunk) | CDN / Static (CSS en el HTML SSR) | Browser | `.sky-layer` + capa de clima por atributos `data-sky-*` |
| Molino | Browser (SVG + Web Animations) | Frontend Server (SVG estático) | El SVG viene del servidor; el giro lo agrega una isla cliente mínima |
| `/dev/sky` | Frontend Server (página dinámica, `notFound` en prod) | Browser (panel de controles) | Igual que `/dev/estados` |
| Datos de clima | API / Backend (ya existe) | — | Sin cambios. El cielo no consulta APIs |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WebGL (API del navegador) | WebGL2 con caída a WebGL1 | Render del cielo | Safari 15+ trae WebGL2 por defecto en iOS y macOS, sobre Metal [CITED: khronos.org blog]. Para un quad no se necesita nada de WebGL2: los shaders van en GLSL ES 1.00 y funcionan en los dos contextos [ASSUMED: compatibilidad estándar de WebGL2 con GLSL ES 1.00, ampliamente documentada] |
| suncalc | 2.1.1 (ya instalada) | Altura/azimut de sol y luna, iluminación lunar | `getPosition` devuelve **grados**, con azimut **horario desde el norte** (0 = N, 90 = E). `getMoonPosition` igual. `getMoonIllumination` da `fraction` 0–1 [CITED: github.com/mourner/suncalc README] |
| Web Animations API | nativa | Giro del rotor | `Animation.updatePlaybackRate()` cambia la velocidad sincronizando antes la posición, sin salto. Baseline desde marzo de 2020 [CITED: developer.mozilla.org/en-US/docs/Web/API/Animation/updatePlaybackRate] |
| IntersectionObserver, `visibilitychange`, `pagehide`, `matchMedia` | nativas | Pausas y reducir movimiento | Estándar, sin librería |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | ^5.0.5 (ya instalado) | Tests de `lib/sky/*` | Siempre. Entorno `node`: los tests solo cubren funciones puras |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WebGL a mano | `ogl` 1.0.11 (npm, última modificación 2025-01-27, sin `postinstall`, 423 KB desempaquetado) [VERIFIED: npm view] | Ahorra ~60 líneas (compilar shaders, buffer, uniforms), pero suma una dependencia y KB para un solo quad. Tiene sentido solo si el cielo pasara a varias pasadas con FBO. **No se usa** |
| WebGL | Canvas 2D | Más fácil de depurar, pero las nubes por ruido por píxel no son viables a 30 fps en la CPU. Habría que ir a sprites pre-renderizados, con look de recorte (choca con D-04). **No se usa** |
| Ruido en shader | Textura de ruido pre-generada | Ahorra ALU, pero suma subir una textura y manejarla en la pérdida de contexto. El ruido de valor con hash sin seno alcanza. **No se usa en el MVP**; queda como palanca del gobernador si hiciera falta |
| `cloud_cover` de Open-Meteo | Cobertura derivada del código WMO | El WMO de Open-Meteo para 0–3 ya sale de la nubosidad, así que derivarla da casi lo mismo y no toca schema, fixtures ni la clave de caché `['open-meteo','v1']`. **Recomendación: no agregar `cloud_cover` en esta fase** (D-08 lo deja al planner) |

**Instalación:** ninguna. La fase no agrega paquetes.

## Package Legitimacy Audit

La fase **no instala paquetes externos**. `ogl` se evaluó (versión, fecha, sin `postinstall`) [VERIFIED: npm view ogl] y se descartó por diseño, no por legitimidad. No se corrió slopcheck porque no hay instalaciones.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| ogl | npm | 1.0.11, modificado 2025-01 | no consultado | github.com/oframe/ogl | no corrido | No se instala (alternativa descartada) |

**Packages removed due to slopcheck [SLOP] verdict:** ninguno
**Packages flagged as suspicious [SUS]:** ninguno

## Architecture Patterns

### System Architecture Diagram

```
 ISR render (servidor)                                   Cliente (iPhone)
 ─────────────────────                                   ────────────────
 getWeatherSnapshot()
        │ NowData (weatherCode, precipMm, windKmh, windDirDeg)
        ▼
 skyFromSnapshot(snapshot, now) ──► SkyState {phase, weather, sunAltitude,
        │                              intensity?, windKmh?, windDirDeg?, cloudCover?}
        ▼
 <Hero sky> ──► <main data-sky=token>  ──► HTML con fallback CSS (.sky-layer + data-sky-weather)
                    │                              │  (primer paint, sin JS)
                    ▼                              ▼
             <SkyBackdrop state live>  ── hidratación ──► useLayoutEffect: acento/data-sky cada 60 s (sin cambios)
                    │
                    │ useEffect: ¿prefers-reduced-motion? ¿canvas habilitado?
                    ▼
             import('./sky/renderer')  ──(falla)──► se queda el fallback CSS
                    │
                    ▼
             createSkyRenderer(host)
               ├─ crea <canvas> imperativo → getContext('webgl2') ?? getContext('webgl') ──(null)──► fallback
               ├─ compila shader (GLSL ES 1.00) ──(error)──► fallback
               ├─ ResizeObserver(caja, banda) → buffer = CSS × 0,5 ; uBandTop/uHorizon en px de buffer
               └─ loop rAF (30 fps con tolerancia)
                    │  cada frame:  t (acotado) → paramsLerp(actual→objetivo)
                    │               lightningEnvelope(t) → uFlash
                    │               uniforms → gl.drawArrays(TRIANGLES, 0, 3)
                    │  pausa: visibilitychange | pagehide | IntersectionObserver(0) | gobernador nivel 3
                    ▼
             primer frame dibujado ──► canvas opacity 0→1 (600 ms) sobre el fallback
                    │
   cada 60 s / router.refresh(): nuevo SkyState ──► setTarget(skyParams(state, now)) (interpola 1,5–2 s)
   webglcontextlost ──► ocultar canvas (300 ms) ─► un intento en webglcontextrestored ─► si falla, fallback
```

### Recommended Project Structure

```
lib/sky/
├── state.ts              # (existe) SkyState + campos opcionales; skyFromSnapshot completa intensity/viento/cobertura
├── phase.ts              # (existe) getSolarPhase
├── palette.ts            # NUEVO skyPalette(sunAltitude, weather, morning, …) → S1..S5 (sRGB + lineal); srgb↔linear; luminance
├── params.ts             # NUEVO skyParams(state, now) → todo lo que el shader necesita (cobertura, intensidad, deriva, inclinación, estrellas, niebla, posición de resplandores)
├── lightning.ts          # NUEVO plan de pulsos determinista (seed) + envolvente(t); ≤ 2 pulsos/s
├── loop.ts               # NUEVO limitador de fps y gobernador de calidad (puros, reciben timestamps)
├── windmill.ts           # NUEVO periodo del rotor (clamp(36/km/h, 1,5, 12) s, null bajo 2 km/h)
├── devParams.ts          # NUEVO parseo y clamp de la query de /dev/sky
└── *.test.ts             # al lado de cada uno
components/client/
├── SkyBackdrop.tsx       # (existe) se extiende: data-sky-weather/night en el fallback + monta el renderer con import()
├── sky/renderer.ts       # NUEVO módulo no-React: contexto, programa, loop, pausas, resize, pérdida de contexto
├── sky/shader.ts         # NUEVO fuentes GLSL como strings (vertex: triángulo; fragment: capas)
└── WindmillRotor.tsx     # NUEVO isla cliente: WAAPI sobre el <g> del rotor (o se integra en PampaHorizon como client)
components/PampaHorizon.tsx  # rotor separado de la cola; recibe windKmh
app/dev/sky/page.tsx      # NUEVO server: notFound en prod, lee searchParams
app/dev/sky/SkyLab.tsx    # NUEVO client: controles, 3 cuadros, lectura de fps
app/globals.css           # capa de clima del fallback ([data-sky-weather], [data-sky-night])
```

### Pattern 1: Renderer como módulo imperativo con canvas creado en el efecto

**Qué:** `SkyBackdrop` sigue renderizando las dos capas CSS (fallback) y un `<div>` host vacío. En `useEffect` hace `import('./sky/renderer')`, crea el `<canvas>` con `document.createElement`, lo agrega al host y devuelve un `dispose()` que corta el loop, saca los listeners, llama a `WEBGL_lose_context.loseContext()` y quita el canvas.
**Por qué:** en dev (Strict Mode), React monta, desmonta y vuelve a montar el efecto. Si el canvas fuera un elemento JSX y el cleanup llamara a `loseContext()`, el segundo montaje obtendría **el mismo contexto ya perdido** (`getContext` devuelve siempre el mismo objeto por canvas). Con un canvas nuevo en cada montaje, los remontajes de `loading.tsx` → página y `/` ↔ `/pronostico` también quedan limpios y no se acumulan contextos (tope de unos 16 por página en WebKit [CITED: webkit.googlesource.com LayoutTests/webgl/max-active-contexts-oldest-context-lost; bug 156689]).
**Ejemplo:**
```ts
// components/client/SkyBackdrop.tsx (fragmento del efecto)
useEffect(() => {
  if (!canvasEnabled) return
  let disposed = false
  let handle: { dispose(): void; setState(s: SkyState): void } | null = null
  import('./sky/renderer')
    .then(({ createSkyRenderer }) => {
      if (disposed || !hostRef.current) return
      handle = createSkyRenderer(hostRef.current, {
        state: stateRef.current,
        mode, // 'animated' | 'static'
        onFirstFrame: () => setCanvasVisible(true),
        onFail: () => setCanvasVisible(false), // el fallback ya está debajo
      })
    })
    .catch(() => { /* ChunkLoadError u otro: se queda el fallback */ })
  return () => { disposed = true; handle?.dispose() }
}, [canvasEnabled, mode])
// Otro efecto: handle?.setState(state) cuando cambian state.weather/sunAltitude/intensity/windKmh
```

### Pattern 2: Contexto, triángulo de pantalla completa y loop a 30 fps

```ts
// components/client/sky/renderer.ts (esqueleto)
const ATTRS: WebGLContextAttributes = {
  alpha: false, antialias: false, depth: false, stencil: false,
  premultipliedAlpha: false, preserveDrawingBuffer: false,
  powerPreference: 'low-power', failIfMajorPerformanceCaveat: true,
}
const gl = (canvas.getContext('webgl2', ATTRS) ?? canvas.getContext('webgl', ATTRS)) as
  WebGL2RenderingContext | WebGLRenderingContext | null
if (!gl) return fail('no-webgl')

// Triángulo que cubre el viewport: 3 vértices, sin índices
const buf = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buf)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

// Loop: el tope de 30 fps necesita tolerancia (ver Pitfall 2)
const FRAME_MS = 1000 / 30
const SLACK_MS = 4
let raf = 0, lastDrawn = -Infinity, prevTs: number | null = null, simTime = startTimeFromClock()
function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  if (ts - lastDrawn < FRAME_MS - SLACK_MS) return
  const dt = prevTs === null ? 0 : Math.min(ts - prevTs, 100) // sin ráfaga ni salto al volver
  prevTs = ts; lastDrawn = ts
  simTime += dt / 1000
  draw(simTime) // setea uniforms (sin allocations) + gl.drawArrays(gl.TRIANGLES, 0, 3)
}
function pause() { cancelAnimationFrame(raf); raf = 0; prevTs = null }
function resume() { if (!raf && running()) raf = requestAnimationFrame(frame) }
```
Puntos fijos: `failIfMajorPerformanceCaveat: true` hace que una GPU por software devuelva `null`, y en ese caso conviene el fallback CSS [ASSUMED: semántica estándar del atributo]. Sin `preserveDrawingBuffer` el canvas igual **sigue mostrando** el último frame presentado mientras no se dibuje otro, así que el modo estático no necesita loop.

### Pattern 3: Color en RGB lineal, paleta en CPU, clamp en GPU

- `skyPalette()` devuelve S1…S5 en **lineal** (para el shader) y en sRGB (para tests y tolerancias). Se mezcla en lineal: la luminancia relativa es una combinación lineal de R, G y B, así que **L(mezcla) = mezcla de las L ≤ max(L)**. C-2 se cumple por construcción [VERIFIED: álgebra de la definición WCAG de luminancia relativa].
- El shader interpola S1→S2 (40 % de la zona de contenido)→S3 (borde de la banda)→S4 (60 % de la banda)→S5 (horizonte) en lineal, suma capas, **clampa** en la zona de contenido y recién al final codifica a sRGB (la salida de WebGL se muestra tal cual, sin conversión automática).
- El clamp escala el color sin cambiar el tono: `c *= min(1, LMAX / L)`, y se mezcla con `w = 1 − smoothstep(bandTop − 24px, bandTop, y)`, así no queda una línea en el borde de la banda.
- Estrellas y relámpago se suman **después** del clamp (excepciones C-4/C-5), cada uno con su propio tope.

```glsl
// GLSL ES 1.00 (compila en webgl y webgl2)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;        // px de buffer
uniform float uBandTop;   // px de buffer desde arriba (medido del DOM)
uniform float uHorizon;   // px de buffer desde arriba
uniform vec3 uS1, uS2, uS3, uS4, uS5; // RGB lineal, vienen de skyPalette()
const float LMAX = 0.075;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toSrgb(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}
// hash sin seno (Dave Hoskins): estable con coordenadas grandes, a diferencia de fract(sin(x)*43758)
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  float y = uRes.y - gl_FragCoord.y; // 0 = arriba (gl_FragCoord tiene el origen abajo)
  vec3 c = /* gradiente S1..S5 + resplandor + nubes + niebla + lluvia */ vec3(0.0);
  float L = lum(c);
  float wContent = 1.0 - smoothstep(uBandTop - 24.0 * uScale, uBandTop, y);
  c *= mix(1.0, min(1.0, LMAX / max(L, 1e-5)), wContent);
  c += /* estrellas (alfa ≤ 0,6) + relámpago (ΔL < 0,08) */ vec3(0.0);
  gl_FragColor = vec4(toSrgb(clamp(c, 0.0, 1.0)), 1.0);
}
```

### Pattern 4: Todo lo que se mueve se calcula acotado en la CPU

- **Tiempo:** `simTime` arranca en un valor que depende de la hora (UI-SPEC "Remontaje"), pero al shader le llegan **offsets ya envueltos**. Por ejemplo, `cloudOffsetX = (simTime * driftPxPerS) mod PERIOD` en px de buffer, con un ruido periódico en `PERIOD`, o directamente un `PERIOD` grande con `highp`. Así nunca entra en `highp` un número > ~10⁴ (ver Pitfall 3).
- **Lluvia procedural:** se rota el espacio por la inclinación (8° + hasta 12° según el viento), se divide en columnas de ancho fijo (en px CSS, convertido a buffer) y cada columna tiene un hash que decide si está activa (`hash < intensity`), su fase y su largo (12–24 px). `y' = y + offsetLluvia`, con `offsetLluvia` envuelto en CPU. Con 2 capas de profundidad (velocidades y alfas distintas) alcanza para "hasta 160 trazos". Sin geometría: sigue siendo 1 draw call.
- **Estrellas:** grilla de celdas en px CSS, una estrella por celda si `hash < densidad` (más densa arriba). El titileo es `1 ± 0,25·sin(2π·t/periodo + fase)`, con período por hash de 3–7 s y `t` envuelto en CPU (mod 420 s, múltiplo común razonable; el salto al envolver es invisible porque cada estrella tiene período distinto y el ±25 % es chico) [ASSUMED: aceptable visualmente; se revisa en `/dev/sky`].
- **Relámpago:** `lightning.ts` arma un plan de eventos con un PRNG con semilla (mulberry32), con intervalos de 8–16 s a intensidad 1 y de 12–24 s a 0,5, 1 o 2 pulsos con subida de 40 ms y caída exponencial de 300–500 ms. Al shader le llega solo `uFlash = vec3(x, amplitud, radio)`. El test barre ventanas de 1 s y comprueba que haya ≤ 2 pulsos y que la amplitud quede bajo el tope.
- **Interpolación de cambios:** `setState()` fija un objetivo. Cada frame se hace `lerp(actual, objetivo, ease(progreso))`, con 1500 ms para `sunAltitude` y 2000 ms para el clima. La paleta interpolada se recalcula en CPU (5 `vec3`, insignificante).

### Pattern 5: Reducir movimiento y fallback

- `const mq = matchMedia('(prefers-reduced-motion: reduce)')`: se lee al montar y se escucha `change`. Con `reduce` hay **un solo `draw()`** con `simTime` fijo (lluvia congelada, estrellas sin titileo, sin relámpagos) y otro solo cuando cambia el estado. Sin fundido de entrada.
- Fallback del clima en CSS: `SkyBackdrop` pone `data-sky-weather` y `data-sky-night` en las capas `.sky-layer`. `globals.css` agrega pseudo-elementos estáticos (lluvia diagonal con `repeating-linear-gradient`, niebla en la banda, estrellas fijas con `radial-gradient`). Esto también queda en el HTML SSR, así que cubre "sin JS" y "antes de hidratar".
- **Qué monta canvas:** solo `SkyBackdrop live` (Hero) y los cuadros explícitos de `/dev/sky`. Los cuadros de `/dev/estados` (no `live`) siguen solo con CSS. Recomendación: una prop `renderer?: 'auto' | 'static' | 'off'` con default `live ? 'auto' : 'off'`, sin cambiar los llamadores actuales.

### Pattern 6: Rotor del molino con Web Animations

```tsx
// Isla cliente (WindmillRotor). El <g> con translate (atributo) queda afuera; el que gira es un <g> interno,
// porque una transform CSS sobre el mismo <g> REEMPLAZA su atributo transform="translate(...)".
useEffect(() => {
  const el = rotorRef.current
  if (!el) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const anim = el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
                          { duration: 1000, iterations: Infinity })
  const apply = () => {
    const period = rotorPeriodS(windKmh) // null = quieto
    if (reduce.matches || period === null) { anim.pause(); if (reduce.matches) anim.currentTime = 0; return }
    anim.updatePlaybackRate(1 / period) // 1 vuelta = 1000 ms × período
    anim.play()
  }
  apply()
  reduce.addEventListener('change', apply)
  return () => { reduce.removeEventListener('change', apply); anim.cancel() }
}, [windKmh])
```
Pivote: `transform-box: fill-box; transform-origin: center` sobre el `<g>` interno que tiene solo las 12 aspas y el cubo (el bbox es simétrico, así que su centro es el cubo). El soporte de `transform-box` en Safari es [ASSUMED]. Alternativa robusta si falla: envolver el rotor en un `<svg x y overflow="visible">` anidado, con el origen en el cubo, y usar `transform-origin: 0 0`.

### Anti-Patterns to Avoid

- **Canvas en JSX + `loseContext()` en el cleanup:** se rompe con Strict Mode y con los remontajes (Pattern 1).
- **Un canvas por cada `SkyBackdrop`:** en `/dev/estados` se pasaría el tope de contextos de WebKit y se perderían los más viejos.
- **Paleta duplicada en GLSL y JS:** el test valida una y la GPU dibuja otra. La paleta se calcula una sola vez, en CPU.
- **Mezclar colores en sRGB o HSL en el shader:** rompe C-2 (la mezcla puede superar el tope).
- **`fract(sin(x) * 43758.5)` como hash con coordenadas o tiempo grandes:** en las GPU móviles da patrones y bandas. Usar hash sin seno.
- **Allocations por frame** (`new Float32Array`, objetos, closures en el loop): disparan GC y producen tirones. Reusar buffers y escalares.
- **`gl.finish()`/`readPixels` para medir:** bloquean el pipeline y calientan más.
- **Leer `--band-h` con `getComputedStyle`:** devuelve el texto `clamp(...)` sin resolver, porque las custom properties no registradas no se computan a px. Medir el elemento de la banda (Pitfall 7).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Posición de sol y luna, iluminación | Fórmulas astronómicas propias | suncalc 2.1.1 (`getPosition`, `getMoonPosition`, `getMoonIllumination`) | Ya está, en grados, con refracción |
| Rotación con velocidad variable sin saltos | Acumular ángulo en rAF y setear el atributo | WAAPI `updatePlaybackRate` | Corre en el compositor y no necesita loop JS propio |
| Conversión sRGB ↔ lineal | Gamma 2,2 aproximada | Fórmula exacta por tramos de sRGB (IEC 61966-2-1) en JS y GLSL | La tolerancia de ±12 por canal y el tope de L 0,075 son ajustados: la aproximación 2,2 se desvía cerca del negro |
| Motor 3D/escena | three.js / R3F / Pixi / `ogl` | Un programa WebGL de ~60 líneas | Prohibidos por `CLAUDE.md` (salvo `ogl`, que sobra) |
| Detección de "segundo plano" | Heurísticas de foco o blur | `visibilitychange` + `pagehide` | Estándar, funciona en standalone |

**Key insight:** lo difícil de esta fase no es el shader, sino que sea **verificable** (contraste, fotosensibilidad, fps) en un entorno sin GPU (Vitest en Node). Por eso todo número con límite duro sale de una función pura de `lib/sky/`.

## Common Pitfalls

### Pitfall 1: rAF distinto según el modo del iPhone
**What goes wrong:** el cielo va a 20 fps en un iPhone, o a 60 en otro.
**Why:** en Modo Ahorro, iOS limita rAF a 30 fps por diseño (un ingeniero de WebKit lo confirmó como intencional en el bug 215745) [CITED: bugs.webkit.org/show_bug.cgi?id=215745]. En pantallas ProMotion, Safari mantiene rAF cerca de 60 fps por defecto (feature flag "Prefer Page Rendering Updates near 60fps") [MEDIUM: varias fuentes comunitarias, sin doc de Apple].
**How to avoid:** limitador por timestamp con tolerancia (`FRAME_MS − 4`) y animación basada en `dt`, nunca en número de frames.
**Warning signs:** la lectura de `/dev/sky` marca ~20 fps en un iPhone sin carga.

### Pitfall 2: Saltos al volver de segundo plano
**What goes wrong:** al volver a la app, las nubes saltan o se ve una ráfaga.
**Why:** el `dt` del primer frame tras la pausa es de minutos.
**How to avoid:** `prevTs = null` al pausar y `dt` limitado a 100 ms. El gobernador **reinicia su ventana** al reanudar, así la pausa no cuenta como un frame lento.

### Pitfall 3: Precisión de float en las GPU de Apple
**What goes wrong:** con el tiempo, las nubes se escalonan, la lluvia se ve "pixelada en el tiempo" o aparecen bandas.
**Why:** en las GPU de Apple (A7 en adelante), `mediump` y `lowp` son float de 16 bits [CITED: bugzilla.mozilla.org/show_bug.cgi?id=1178956, comentario sobre GPUs de Apple]. Un tiempo de miles de segundos en fp16 pierde los decimales. En escritorio los calificadores no tienen efecto, así que **el bug no se ve en la PC de desarrollo**.
**How to avoid:** `precision highp float` (con el `#ifdef` de arriba), offsets envueltos en CPU y hash sin seno.
**Warning signs:** se ve bien en Chrome de escritorio y mal en el iPhone tras unos minutos.

### Pitfall 4: Pérdida de contexto al pasar a segundo plano
**What goes wrong:** al volver, el canvas queda negro o congelado.
**Why:** hay reportes de pérdida de contexto WebGL al pasar Safari iOS/iPadOS a segundo plano (WebKit bug 261331, iOS 17), incluso con WebGL mínimo [CITED: bugs.webkit.org/show_bug.cgi?id=261331; developer.apple.com/forums/thread/737042]. Para la PWA standalone no hay fuentes específicas [LOW].
**How to avoid:** `webglcontextlost` → `e.preventDefault()` (sin eso no hay `restored`), detener el loop y ocultar el canvas con un fundido de 300 ms. `webglcontextrestored` → recrear programa y buffer **un vez**, y si falla, fallback hasta recargar (UI-SPEC). Con el canvas oculto se ve el fallback, nunca negro.
**Warning signs:** en el checkpoint del iPhone, pasar a segundo plano 1–2 min, volver y ver el fallback en lugar del canvas: es aceptable (el contrato lo permite), pero se registra.

### Pitfall 5: Medir "frame time" que no mide la GPU
**What goes wrong:** el gobernador nunca baja de nivel aunque el iPhone sufra, o baja siempre.
**Why:** `performance.now()` alrededor de `drawArrays` mide solo el envío en la CPU (~0,1 ms). La GPU es asíncrona y Safari no expone `EXT_disjoint_timer_query` [ASSUMED]. Con el tope de 30 fps, el intervalo entre frames dibujados es ≈ 33 ms siempre, así que "promedio > 28 ms" (UI-SPEC) se cumpliría todo el tiempo si se mide el intervalo.
**How to avoid:** el gobernador mira **dos señales**: (a) el trabajo de CPU del frame > 28 ms, o (b) el intervalo entre frames dibujados > ~45 ms (por debajo de ~22 fps reales, señal de GPU saturada), sostenido 2 s y **después de 2 s de calentamiento** (compilación del shader, hidratación). Así se respeta el espíritu del UI-SPEC. El planner tiene que fijar los umbrales exactos en `lib/sky/loop.ts` con tests.
**Warning signs:** calidad 2 en la lectura de `/dev/sky` en escritorio.

### Pitfall 6: Trazos de 1 px a 0,5× de resolución
**What goes wrong:** la lluvia de 1 px CSS y las estrellas de ≤ 1,5 px quedan en 0,5–0,75 px de buffer: aliasing, parpadeo o que desaparezcan. Al escalar con CSS, se ven como manchas blandas de 2 px.
**Why:** el UI-SPEC fija el buffer en 0,5× CSS sin importar el DPR.
**How to avoid:** en el shader, el ancho mínimo de un trazo es 1 px de buffer y el alfa se compensa por cobertura (`alfa × anchoCSS×escala`), con `smoothstep` para el antialiasing. La escala va en **una sola constante**. Si en `/dev/sky` en el iPhone se ve empastado, se sube a 0,75 (el UI-SPEC lo permite). A 390×844 y 0,75× son ~185 k píxeles por frame, un costo chico para las GPU de iPhone [ASSUMED: estimación; se confirma con la lectura de fps].

### Pitfall 7: Alto de la banda leído mal
**What goes wrong:** el clamp de contraste se aplica en el lugar equivocado y la zona clara se mete detrás del texto, o la banda queda oscura.
**Why:** `--band-h` es `clamp(120px, calc(100svh − …), 240px)` en `:root`, 120 px en `compact` y 240 px en los cuadros de dev. `getComputedStyle().getPropertyValue('--band-h')` devuelve el texto sin resolver [ASSUMED: comportamiento estándar de custom properties no registradas].
**How to avoid:** `Hero` (y los cuadros de dev) marcan la banda con un atributo (`data-sky-band`). El renderer observa con `ResizeObserver` la caja y la banda, y calcula `bandTop = alto de la caja − alto de la banda` en px de buffer en cada resize. Nunca supone 844.

### Pitfall 8: Grano y relámpago que rompen el tope de luminancia
**What goes wrong:** el grano de ±1,5 % o un relámpago llevan la zona de contenido por encima de 0,075 / 0,10.
**How to avoid:** el grano se aplica **antes** del clamp (o el clamp usa un margen de 0,073). La amplitud del relámpago en la zona de contenido la acota `lightning.ts` (test) y el shader la multiplica por un `smoothstep` vertical que cae hacia arriba.

### Pitfall 9: `resolveSkyState` pierde los campos nuevos
**What goes wrong:** cada 60 s el cliente recalcula con `resolveSkyState(new Date(), weather)` y se pierden `intensity`, `windKmh` y `cloudCover`: la lluvia se apaga o el molino frena.
**How to avoid:** el recálculo del cliente conserva los campos opcionales (`{ ...state, ...getSolarPhase(now) }`). Test en `state.test.ts`. Además, `skyFromSnapshot` tiene que derivar `intensity` y `cloudCover` **del código WMO antes de tirarlo**: `SkyState` no lleva `weatherCode`, y el UI-SPEC distingue código 0–1 de 2 (estrellas a la mitad), 51 de 65, etc.

### Pitfall 10: WAAPI ignora el CSS de reducir movimiento
**What goes wrong:** el molino sigue girando con "reducir movimiento".
**Why:** el bloque global `animation: none !important` de `globals.css` solo afecta animaciones CSS, no `element.animate()` [ASSUMED: semántica de WAAPI vs. CSS animations].
**How to avoid:** chequear `matchMedia` en JS (Pattern 6).

### Pitfall 11: El chunk o el renderer fallan dentro de `error.tsx` / `global-error`
**What goes wrong:** un `ChunkLoadError` o una excepción del renderer rompe la página de error.
**How to avoid:** `import()` con `.catch`, `createSkyRenderer` envuelto en try/catch y ningún `throw` hacia React. El fallback ya está pintado.

### Pitfall 12: Sin Mac no hay Safari Web Inspector
**What goes wrong:** el plan pide "medir con Safari Web Inspector" y el dueño trabaja en Windows.
**Why:** el Web Inspector remoto del iPhone requiere Safari de macOS [ASSUMED].
**How to avoid:** la medición principal es la **lectura en pantalla de `/dev/sky`** (fps real entregado + ms de CPU + nivel de calidad), abierta en el iPhone desde un deploy **preview** de Vercel (`VERCEL_ENV=preview`, donde `/dev/*` existe) o desde `next dev -H 0.0.0.0` en la misma Wi-Fi. "No se calienta" se verifica a mano (varios minutos, tacto, y que no aparezca el aviso de temperatura). Para medir también en producción, sumar a la home un overlay de fps opcional con `?sky=debug` es una opción, a criterio del planner.

## Code Examples

### Posición horizontal del resplandor (convención verificada de suncalc 2.x)
```ts
// lib/sky/params.ts. suncalc 2.x: azimut en grados, horario desde el norte (0=N, 90=E, 180=S, 270=O)
// [CITED: github.com/mourner/suncalc]. Mirando al norte, el este queda a la derecha.
export function glowX(azimuthDeg: number): number {
  const x = 0.5 + 0.4 * Math.sin((azimuthDeg * Math.PI) / 180)
  return Math.min(0.9, Math.max(0.1, x))
}
// sale por el este (90°) → 0,9 (derecha); se pone por el oeste (270°) → 0,1 (izquierda)
```

### sRGB ↔ lineal y luminancia (JS, la misma fórmula que el GLSL)
```ts
// lib/sky/palette.ts
export const toLinear = (c8: number) => {
  const c = c8 / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
export const luminance = ([r, g, b]: readonly [number, number, number]) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b // r, g, b lineales
// Chequeo de referencia: S3 de 'dia' #284f75 → ≈ 0,073 (el tope de C-1)
```

### Pausas
```ts
const onVis = () => (document.visibilityState === 'hidden' ? pause() : resume())
document.addEventListener('visibilitychange', onVis)
window.addEventListener('pagehide', pause)
window.addEventListener('pageshow', resume) // bfcache
const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? resume() : pause() }, { threshold: 0 })
io.observe(host)
// resume() solo arranca si: visible && inView && mode === 'animated' && calidad < 3 && contexto vivo
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebGL1 en Safari iOS | WebGL2 por defecto, sobre Metal (ANGLE) | Safari 15 (2021) | Cualquier iPhone con la PWA (iOS ≥ 16.4) tiene WebGL2. El fallback CSS cubre lo excepcional |
| suncalc 1.x: radianes, azimut desde el sur hacia el oeste | suncalc 2.x: grados, azimut horario desde el norte | 2.0 (2026) | `phase.ts` ya lo usa en grados. **No** copiar fórmulas de tutoriales de la 1.x (sumar π, etc.) |
| `rAF` sin tope | Tope propio + respetar el tope de Modo Ahorro | — | — |

**Deprecated/outdated:**
- Tutoriales con `fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453)`: funciona en escritorio y da artefactos en móviles con argumentos grandes. Usar hash sin seno.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GLSL ES 1.00 compila en un contexto WebGL2 de Safari | Standard Stack | Bajo: habría que mantener dos variantes de shader |
| A2 | `failIfMajorPerformanceCaveat: true` no rechaza las GPU reales de iPhone | Pattern 2 | Medio: el cielo no se vería en el iPhone. Se detecta enseguida en `/dev/sky` ("NO TIENE WEBGL"); se saca el atributo |
| A3 | Safari no expone timer queries de GPU | Pitfall 5 | Bajo: solo cambia cómo se mide |
| A4 | `getComputedStyle` devuelve `--band-h` sin resolver | Pitfall 7 | Nulo: medir el elemento funciona igual |
| A5 | WAAPI no se ve afectado por `animation: none !important` | Pitfall 10 | Bajo: el chequeo con `matchMedia` cubre los dos casos |
| A6 | `transform-box: fill-box` en SVG funciona en Safari iOS | Pattern 6 | Bajo: hay una alternativa con `<svg>` anidado |
| A7 | El salto al envolver el tiempo del titileo (mod 420 s) es invisible | Pattern 4 | Bajo: se revisa en `/dev/sky` |
| A8 | Shader con fbm de 4 octavas × 2 capas + lluvia + estrellas a 0,5–0,75× entra en ≤ 8 ms en un iPhone de gama media | Pitfall 6 | Medio: el gobernador de calidad lo mitiga; se mide en el checkpoint |
| A9 | Remote Web Inspector requiere Mac | Pitfall 12 | Nulo para el plan: la medición principal es la lectura en pantalla |
| A10 | La pérdida de contexto al pasar a segundo plano también puede pasar en la PWA standalone | Pitfall 4 | Bajo: el manejo es el mismo |

## Open Questions (RESOLVED)

1. **¿0,5× o 0,75× de resolución por defecto?**
   - Qué sabemos: el UI-SPEC fija 0,5× y permite 0,75×. A 0,5× los trazos de 1 px y las estrellas quedan por debajo de 1 px de buffer.
   - Qué no está claro: si a 0,5× la lluvia y las estrellas se ven aceptables en el iPhone real.
   - Recomendación: constante única `BUFFER_SCALE = 0.5`, ancho mínimo de 1 px de buffer con alfa compensado, y decidir en el checkpoint con `/dev/sky`.
   - RESOLVED: `BUFFER_SCALE = 0.5` por defecto (plan 03-01); la decisión final 0,5×/0,75× se toma en el checkpoint del plan 03-08.

2. **Umbrales exactos del gobernador.**
   - Qué sabemos: el "28 ms" del UI-SPEC no se puede medir tal cual en GPU (Pitfall 5).
   - Recomendación: las dos señales de arriba, con umbrales como constantes testeadas, y anotar la interpretación en el SUMMARY del plan.
   - RESOLVED: gobernador de dos señales con umbrales como constantes (plan 03-03); se calibran en el checkpoint del plan 03-08.

3. **`cloud_cover`.**
   - Recomendación: no sumarlo en esta fase (Alternatives). Si en la revisión de `/dev/sky` el "algo nublado" no convence, se agrega en una fase posterior subiendo la clave de caché a `v2`.
   - RESOLVED: no se suma `cloud_cover` en esta fase; la cobertura se deriva del código WMO (plan 03-02).

4. **Overlay de fps en producción (`?sky=debug`).**
   - Recomendación: opcional. Con el preview de Vercel alcanza para el checkpoint.
   - RESOLVED: sin overlay en producción; la lectura de fps vive solo en `/dev/sky` (plan 03-05).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/test | ✓ | 24.18.0 | — |
| npm | scripts | ✓ | 11.16.0 | — |
| Vitest | tests puros | ✓ (devDependency) | ^5.0.5 | — |
| suncalc | sol/luna en cliente | ✓ (dependency) | ^2.1.1 | — |
| iPhone físico | checkpoint SKY-06 | humano | — | Ninguno: el roadmap lo exige |
| Mac con Safari (Web Inspector remoto) | medición fina | ✗ (el dueño usa Windows) | — | Lectura de fps/ms en `/dev/sky` vía deploy preview o dev en la LAN |
| Navegador con WebGL en la PC | desarrollo | ✓ (supuesto: Chrome/Edge) | — | — |

**Missing dependencies with no fallback:** ninguna que bloquee.
**Missing dependencies with fallback:** Safari Web Inspector → lectura en pantalla de `/dev/sky`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^5.0.5, entorno `node`, `TZ=UTC` |
| Config file | `vitest.config.ts` (existe; incluye `**/*.test.ts`) |
| Quick run command | `npx vitest run lib/sky` |
| Full suite command | `npm test && npm run typecheck && npm run lint && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKY-01 | Paleta continua: en −12°/0°/+15° (y ≤ −12°, ≥ +15°) converge a los tokens `noche`/`amanecer`/`atardecer`/`dia` a ±12 por canal; mañana vs. tarde según el mediodía solar | unit | `npx vitest run lib/sky/palette.test.ts` | ❌ Wave 0 |
| SKY-01 | `glowX(azimut)`: 90° → 0,9, 270° → 0,1, clamp; visibilidad del sol solo entre −8° y +12°; luna solo con altura > 0 | unit | `npx vitest run lib/sky/params.test.ts` | ❌ Wave 0 |
| SKY-02 | Intensidad por WMO (tabla UI-SPEC), `max(base, precipMm/6)`, defaults sin dato; cobertura por código; deriva `4 + 0,15·viento` con tope 12 px/s y sentido por componente E-O; inclinación de la lluvia con tope 20° | unit | `npx vitest run lib/sky/params.test.ts` | ❌ Wave 0 |
| SKY-02 | `skyFromSnapshot` llena `intensity`/`windKmh`/`windDirDeg`/`cloudCover`; el recálculo del cliente los conserva; los llamadores viejos siguen tipando | unit | `npx vitest run lib/sky/state.test.ts` | ✅ (extender) |
| SKY-02 | Relámpagos: intervalos 8–16 s (i=1) y 12–24 s (i=0,5), ≤ 2 pulsos en cualquier ventana de 1 s, envolvente 40 ms + caída 300–500 ms, ΔL < 0,08 y contenido ≤ 0,10; plan determinista con semilla | unit | `npx vitest run lib/sky/lightning.test.ts` | ❌ Wave 0 |
| SKY-03 | Período del rotor: null bajo 2 km/h o sin dato; 5 → 7,2 s; 20 → 1,8 s; ≥ 24 → 1,5 s | unit | `npx vitest run lib/sky/windmill.test.ts` | ❌ Wave 0 |
| SKY-04 | C-1: barrido de `sunAltitude` de −20° a +70° cada 0,5° × 5 climas × mañana/tarde → L(S1..S3) ≤ 0,075 | unit | `npx vitest run lib/sky/palette.test.ts` | ❌ Wave 0 |
| SKY-04 | C-2: la mezcla lineal de dos colores nunca supera la L máxima de los extremos | unit (propiedad) | `npx vitest run lib/sky/palette.test.ts` | ❌ Wave 0 |
| SKY-04 | Contraste real con capas compuestas (clamp del shader, relámpago en el pico) | manual | `/dev/sky` con relámpago forzado y congelado, cuentagotas | — |
| SKY-05 | Fallback: `data-sky-weather`/`data-sky-night` presentes en el HTML SSR del home | smoke | `npm run build && npx next start` + `curl -s localhost:3000 \| grep data-sky-weather` | ❌ Wave 0 (paso de verificación) |
| SKY-05 | Reducir movimiento: frame estático, molino quieto, sin relámpagos | manual | `/dev/sky` cuadro "ESTÁTICO" + DevTools "emulate prefers-reduced-motion" | — |
| SKY-06 | Limitador: con timestamps de 60 Hz (con jitter ±1 ms) dibuja ~30 fps; con 120 Hz, ~30; con 30 Hz (Modo Ahorro), 30; `dt` ≤ 100 ms al reanudar | unit | `npx vitest run lib/sky/loop.test.ts` | ❌ Wave 0 |
| SKY-06 | Gobernador: baja a 2 y después a 3 con señales sostenidas 2 s; no sube; ignora el calentamiento y la ventana de pausa | unit | `npx vitest run lib/sky/loop.test.ts` | ❌ Wave 0 |
| SKY-06 | Chunk del cielo ≤ 20 KB gzip | build check | después de `npm run build`: buscar en `.next/static/chunks` el archivo con un marcador único del renderer (por ejemplo, el nombre de un uniform) y `gzip -c <archivo> \| wc -c` | ❌ Wave 0 (paso de verificación) |
| SKY-06 | Sin three/pixi/ogl/r3f | grep | `grep -rE "from ['\"](three\|pixi\|ogl\|@react-three)" app components lib` → vacío | — |
| SKY-06 | Fluidez, pausa en segundo plano, temperatura | manual (checkpoint humano) | iPhone real, varios minutos por estado (despejado, lluvia, tormenta), segundo plano y vuelta, Modo Ahorro on/off, lectura de `/dev/sky` | — |
| D-14 | Parseo y clamp de la query de `/dev/sky` (rangos, valores inválidos → default) y `notFound` en producción | unit + smoke | `npx vitest run lib/sky/devParams.test.ts`; `node scripts/smoke.mjs <url> --expect-404 /dev/sky` (prod) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/sky`
- **Per wave merge:** `npm test && npm run typecheck && npm run lint`
- **Phase gate:** suite completa + `npm run build` + chequeo de tamaño del chunk + checkpoint en iPhone, todo en verde antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/sky/palette.test.ts`: anclas, barrido C-1, propiedad C-2
- [ ] `lib/sky/params.test.ts`: intensidad, cobertura, deriva, inclinación, resplandores
- [ ] `lib/sky/lightning.test.ts`: frecuencia ≤ 2/s, envolvente, amplitud
- [ ] `lib/sky/loop.test.ts`: limitador con jitter y distintas frecuencias de rAF, gobernador
- [ ] `lib/sky/windmill.test.ts`: período
- [ ] `lib/sky/devParams.test.ts`: query de `/dev/sky`
- [ ] Extender `lib/sky/state.test.ts`: campos opcionales y su conservación en el recálculo
- Framework: ya instalado, no hace falta configurar nada.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | sí (mínimo) | `/dev/sky` devuelve `notFound()` con `VERCEL_ENV === 'production'` (mismo patrón que `/dev/estados`), con `robots: { index: false }` |
| V5 Input Validation | sí | La query de `/dev/sky` se parsea a números con clamp a los rangos del UI-SPEC y listas cerradas (clima, rumbo). Nunca se interpola texto de la query en el DOM ni en el shader. `data-sky-*` sale de uniones cerradas, nunca de texto upstream |
| V6 Cryptography | no | (el PRNG del relámpago no es de seguridad) |
| V14 Configuration | sí | El código del shader son constantes del bundle. No hay `eval`, `new Function` ni shaders desde la red |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Exponer herramientas de dev en producción | Information disclosure | `notFound()` + smoke `--expect-404 /dev/sky` |
| Query maliciosa (`?alt=1e309&clima=<script>`) | Tampering | Parseo numérico con `Number.isFinite` y clamp; lista cerrada para enums; React escapa el texto |
| DoS local del dispositivo (GPU/batería) | Denial of service | Tope de fps, pausas, gobernador, resolución reducida |
| Fotosensibilidad (riesgo de salud, no de seguridad, pero con límite duro) | — | ≤ 2 pulsos/s, ΔL < 0,08, sin rojo saturado; test en `lightning.test.ts` |

## Sources

### Primary (HIGH confidence)
- Código del repo: `components/client/SkyBackdrop.tsx`, `components/Hero.tsx`, `components/PampaHorizon.tsx`, `lib/sky/state.ts`, `lib/sky/phase.ts`, `lib/weather/types.ts`, `lib/weather/wmo.ts`, `lib/sources/openMeteoForecast.schema.ts`, `app/globals.css`, `app/dev/estados/page.tsx`, `vitest.config.ts`, `package.json`
- `.planning/phases/03-cielo-vivo/03-CONTEXT.md` y `03-UI-SPEC.md` (contrato aprobado)
- https://github.com/mourner/suncalc: suncalc 2.x en grados, azimut horario desde el norte, campos de `getMoonIllumination`
- https://developer.mozilla.org/en-US/docs/Web/API/Animation/updatePlaybackRate: cambio de velocidad sin salto, Baseline 2020
- `npm view ogl`: 1.0.11, modificado 2025-01-27, sin `postinstall`

### Secondary (MEDIUM confidence)
- https://bugs.webkit.org/show_bug.cgi?id=215745: rAF limitado a 30 fps en Modo Ahorro, intencional según WebKit
- https://webkit.googlesource.com/WebKit/+/master/LayoutTests/webgl/max-active-contexts-oldest-context-lost-expected.txt y bug 156689: límite de 16 contextos activos, se pierde el más viejo
- https://www.khronos.org/blog/webgl-2-achieves-pervasive-support-from-all-major-web-browsers: WebGL2 en Safari 15 (iOS/macOS) sobre Metal
- https://bugzilla.mozilla.org/show_bug.cgi?id=1178956: GPUs de Apple con lowp/mediump como fp16
- https://bugs.webkit.org/show_bug.cgi?id=261331, https://developer.apple.com/forums/thread/737042: pérdida de contexto WebGL al pasar a segundo plano (iOS 17)
- https://www.tomsguide.com/phones/iphones/enable-120hz-safari-on-iphone, https://www.igeeksblog.com/this-hidden-safari-setting-unlocks-120hz-scrolling/: flag "Prefer Page Rendering Updates near 60fps"
- https://webglfundamentals.org/webgl/lessons/webgl-precision-issues.html: problemas de precisión en móviles

### Tertiary (LOW confidence)
- Comportamiento específico de la PWA standalone (pérdida de contexto, rAF): sin fuentes propias. Se asume igual que Safari y se verifica en el checkpoint.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Sin dependencias nuevas; WebGL2 en iOS y la convención de suncalc 2.x verificadas.
- Architecture: HIGH. Sale del código existente y del contrato del UI-SPEC; los riesgos de React (Strict Mode, remontajes) se razonaron sobre el código real.
- Pitfalls: MEDIUM. Los números de Safari iOS (30 fps, 16 contextos, fp16, pérdida de contexto) vienen de bugs de WebKit y foros; se confirman en el iPhone.

**Research date:** 2026-10-24
**Valid until:** 2026-11-23 (30 días; las APIs del navegador son estables, pero el comportamiento de iOS puede cambiar con una versión nueva)
