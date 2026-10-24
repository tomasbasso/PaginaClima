# Phase 3: Cielo vivo - Context

**Gathered:** 2026-10-24
**Status:** Ready for planning

<domain>
## Phase Boundary

El fondo de la app pasa a ser un cielo generativo animado que sigue la posición real del sol en Winifreda (noche, amanecer, día, atardecer) y el estado del tiempo (despejado, nublado, lluvia, tormenta, niebla, noche estrellada), con la silueta del horizonte pampeano abajo. Todo el texto sigue legible sobre cualquier estado. Con "reducir movimiento" el cielo es estático, y sin WebGL hay un fallback que igual representa hora y tiempo. En un iPhone real corre fluido (tope 30 fps), se pausa en segundo plano y no calienta el teléfono. `/dev/sky` permite forzar todos los estados.

Requisitos: SKY-01, SKY-02, SKY-03, SKY-04, SKY-05, SKY-06.
Fuera de la fase: estaciones del año, luna llena o eclipses como eventos (SKY-07, v2), sol/luna como datos con horarios y fase lunar dibujada en la UI (fase 5), PWA/offline (fase 6).

</domain>

<decisions>
## Implementation Decisions

> El usuario no eligió áreas para discutir ("sin preferencia"), igual que en la fase 1. Todas las decisiones de abajo son defaults recomendados por Claude y el usuario puede corregirlas antes de `/gsd-plan-phase 3`. Lo ya bloqueado en `01-UI-SPEC.md` ("Contrato con la fase 3") no se rediscute.

### Contrato que se mantiene (de las fases 1 y 2)
- **D-01:** El punto de reemplazo único es `<SkyBackdrop state={SkyState} />` (`components/client/SkyBackdrop.tsx`). `SkyState = { phase, weather, sunAltitude }` no cambia de forma. Si hace falta información extra (intensidad, viento), se agrega como campo opcional sin romper a los llamadores actuales.
- **D-02:** Los 6 tokens `data-sky` y sus gradientes CSS de `app/globals.css` quedan como **fallback** (sin WebGL, reducir movimiento, antes de que cargue el canvas) y siguen manejando `--accent` y la barra de pestañas. El canvas se monta **encima** del gradiente CSS y aparece con un fundido cuando dibujó el primer frame, así no hay flash ni salto en el primer paint ni en la hidratación.
- **D-03:** Regla estructural de contraste (SKY-04): la zona de contenido (de arriba hasta la banda del horizonte) se mantiene oscura (rango S1→S3 de cada token). Los tonos claros (S4/S5, el sol bajo, el brillo del amanecer) viven solo en la banda del horizonte. El shader respeta esa división en todos los estados.

### Estilo del cielo (a criterio de Claude)
- **D-04:** El estilo es **atmosférico y pictórico, no fotorrealista ni caricaturesco**: campos continuos (gradiente que depende de `sunAltitude`, nubes por ruido, bruma, grano fino) que combinan con la tipografía editorial y la silueta plana. Nada de íconos ni objetos tipo clipart.
- **D-05:** El **sol** se insinúa como un resplandor cerca del horizonte en amanecer y atardecer, sin disco dibujado de día (quedaría detrás del texto). De noche despejada hay **estrellas** que titilan apenas, y la luna se insinúa como un resplandor si está sobre el horizonte (la fase dibujada es de la fase 5).
- **D-06:** La transición entre fases solares es **continua**, guiada por `sunAltitude` real, no por saltos entre 4 fases. Las fases discretas solo se usan para los tokens del fallback y del acento.

### Cuánto se mueve (a criterio de Claude)
- **D-07:** El movimiento es **lento y contemplativo**: nubes que derivan, titileo de estrellas, lluvia en trazos finos y semitransparentes. No compite con la lectura del texto. Relámpagos solo en tormenta, como destello de fondo poco frecuente (cada varios segundos, aleatorio). El destello es suave: sin flashes de pantalla completa de alto contraste, por fotosensibilidad.
- **D-08:** La **intensidad sigue el dato real** cuando existe: la severidad del código WMO (llovizna/lluvia débil/fuerte), `precipMm` y `windKmh` modulan la densidad de lluvia y la velocidad de deriva de las nubes. Si falta el dato, se usan valores medios por estado. Si sumar `cloud_cover` a la llamada de `current` de Open-Meteo sale gratis (es el mismo request), se puede agregar para la densidad de nubes. Es decisión del planner.
- **D-09:** Rendimiento (SKY-06): tope de **30 fps**, pausa con `visibilitychange` (pestaña oculta o app en segundo plano) y también cuando el cielo sale de pantalla (IntersectionObserver, por ejemplo al scrollear al meteograma). DPR del canvas limitado (render a resolución reducida y escalado, porque el cielo es borroso). Con "reducir movimiento" se dibuja **un solo frame estático** del mismo cielo (si hay WebGL) en vez de animarlo, y si no hay WebGL se ve el gradiente CSS.

### Dónde vive el cielo (a criterio de Claude)
- **D-10:** El cielo sigue **solo en la caja del Hero**, como en la fase 2. El meteograma y el diario siguen sobre `bg-ground` oscuro, que es lo que garantiza su contraste. El cielo no pasa a ser un fondo fijo de toda la app.
- **D-11:** La banda compacta de `/pronostico` (Hero `compact`) usa el **mismo componente**, con el mismo estado. El tope de fps y la pausa aplican igual.

### Horizonte pampeano (a criterio de Claude)
- **D-12:** La silueta `components/PampaHorizon.tsx` sigue siendo **SVG plano** (no se pasa al shader), así queda nítida a cualquier DPR. El canvas va detrás.
- **D-13:** Reacciones mínimas y baratas: el **rotor del molino gira** con una velocidad proporcional al viento actual (CSS/SVG, quieto con viento calmo o sin dato, quieto con reducir movimiento), y los **relámpagos aclaran apenas el cielo detrás** de la silueta (contraluz). La niebla es parte del cielo (bruma baja detrás de la silueta), no una capa delante del texto.

### Herramienta de revisión
- **D-14:** `/dev/sky` (nueva, `notFound()` en producción como `/dev/estados`) permite forzar fase solar o `sunAltitude`, clima, intensidad y viento, y ver lado a lado el canvas, el frame estático (reducir movimiento) y el fallback CSS. Es lo que se usa para revisar cada estado del criterio 1 del roadmap.

### Claude's Discretion
- Las cuatro áreas presentadas (estilo, cuánto se mueve, dónde vive, horizonte que reacciona): el usuario no tuvo preferencia y quedan con los defaults de arriba.
- Técnica de render (WebGL2 a mano, `ogl` o Canvas 2D): la decide la **investigación** de esta fase (WebGL2 contra Canvas 2D en Safari standalone y presupuesto en iPhone), dentro de lo que dice `CLAUDE.md` (no three.js/R3F/Pixi).
- Paleta exacta del shader, siempre que respete D-03 y converja con los tokens del fallback.
- Si se suma `cloud_cover` al snapshot (D-08).
- Cómo se mide "no se calienta" en la verificación: checkpoint humano en un iPhone real con varios minutos de uso, más una medición de frame time en el navegador.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Alcance y requisitos
- `.planning/ROADMAP.md` §Phase 3 — objetivo, 4 criterios de éxito y tema de investigación
- `.planning/REQUIREMENTS.md` — SKY-01..SKY-06 (y SKY-07 de v2, para no adelantarlo)
- `.planning/PROJECT.md` — restricciones (gratis, mobile first, iPhone como uso principal)
- `CLAUDE.md` §"Cielo vivo generativo" y §"What NOT to Use" — shader con 1 draw call, nada de three.js/R3F/Pixi

### Contrato visual
- `.planning/phases/01-fundaciones-y-ahora/01-UI-SPEC.md` §"Estados del cielo" y "Contrato con la fase 3" — tokens `data-sky`, división capa superior / banda, `--accent`, `theme-color`
- `.planning/phases/02-pron-stico-n-cleo/02-UI-SPEC.md` — refactor de `Hero` (caja del cielo, `compact`, slot `below`)
- `design/stitch/DESIGN.md` — sistema "Pampa Cielo Editorial"
- `design/stitch/home-atardecer.png`, `home-tarde.png`, `home-tarde-v2.png`, `home-tormenta.png` — capturas aprobadas de referencia de clima/hora

### Arquitectura e investigación previa
- `.planning/research/STACK.md` — WebGL2 a mano u `ogl`, suncalc 2.1.1 (altura en grados)
- `.planning/research/PITFALLS.md` — trampas de Safari/iOS y de hora local
- `.planning/phases/01-fundaciones-y-ahora/01-CONTEXT.md` — D-14: `/dev/estados` como antecedente de `/dev/sky`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/sky/state.ts`: `SkyState`, `SkyWeather`, `resolveSkyState`, `skyToken`, `skyFromSnapshot` (ya mapea llovizna→lluvia, nieve→cubierto).
- `lib/sky/phase.ts`: `getSolarPhase(now)` con suncalc, devuelve fase y `sunAltitude` en grados (umbrales ±6°).
- `components/client/SkyBackdrop.tsx`: dos capas CSS con crossfade, recálculo cada 60 s y sincronización de `data-sky` en `<html>` y en el `<main>`. Es el punto de reemplazo.
- `components/PampaHorizon.tsx`: silueta SVG (alambrado, molino con rotor de 12 aspas, dos caldenes), 120 px de alto.
- `components/Hero.tsx`: caja del cielo (`full` y `compact`) con `SkyBackdrop live` y la banda del horizonte.
- `app/dev/estados/`: galería con frames de 390×844 y fixtures. Base para `/dev/sky`.
- `lib/weather/wmo.ts`: códigos WMO → grupo (incluye la severidad que sirve para la intensidad).

### Established Patterns
- Lógica pura en `lib/` con tests de Vitest al lado. Componentes de cliente en `components/client/`.
- Tokens en `@theme` / `:root` de `app/globals.css`, sin `tailwind.config.js`. Ya hay bloques `@media (prefers-reduced-motion: reduce)`.
- Las páginas de dev devuelven `notFound()` cuando `VERCEL_ENV === 'production'`.

### Integration Points
- `SkyBackdrop` dentro de `Hero` (home, `/pronostico`, `loading.tsx`, `error.tsx`, `global-error`): el canvas tiene que tolerar remontajes y el render de error del cliente.
- `NowData.windKmh`, `precipMm` y `weatherCode` para la intensidad (D-08) y el molino (D-13). Hoy `SkyState` no lleva viento: se suma como campo opcional.

</code_context>

<specifics>
## Specific Ideas

- El ROADMAP pide probarlo **en un iPhone real** (fluidez, pausa en segundo plano y temperatura): va como checkpoint humano en la verificación.
- Estados nombrados en PROJECT.md: amanecer, siesta, tormenta, noche estrellada, niebla.

</specifics>

<deferred>
## Deferred Ideas

- Estaciones del año, luna llena o eclipses en el cielo: SKY-07 (v2).
- Disco y fase lunar dibujados con datos: fase 5 (ASTRO-02).
- Cielo como fondo fijo de toda la app (detrás del meteograma): descartado por contraste, se puede reconsiderar después del MVP.

</deferred>

---

*Phase: 03-cielo-vivo*
*Context gathered: 2026-10-24*
