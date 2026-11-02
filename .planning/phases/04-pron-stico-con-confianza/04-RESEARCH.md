# Phase 4: Pronóstico con confianza - Research

**Researched:** 2026-11-01
**Domain:** agregación de ensemble y multimodelo de Open-Meteo en el servidor, y visualización de incertidumbre en la lista diaria
**Confidence:** HIGH en datos y arquitectura; MEDIUM en los umbrales del semáforo (calibrados con un solo año y un solo punto)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Origen de estas decisiones:** el dueño delegó todas las áreas con la consigna "Sorpréndeme con todo, necesito que atraiga visualmente". Todo lo de abajo es criterio de Claude, no elección del dueño. La prioridad es el impacto visual, sin romper la lectura de un vistazo ni "Pampa Cielo Editorial". El UI-SPEC puede ajustar medidas y colores; si cambia el concepto, hay que avisarle al dueño.

#### Concepto visual: "el abanico"
- **D-01:** La lista deja de ser una tabla con datos sumados y pasa a **dibujar la incertidumbre**. Al recorrer los días, las barras de temperatura se abren como un abanico: finas y seguras cerca de hoy, anchas y difusas a lo lejos. La incertidumbre se ve antes de leer un número.
- **D-02:** Tres firmas visuales, y no más: **abanico** (D-05), **pluviómetro** (D-08) y **rombos** (D-11). Sin tarjetas, sombras, vidrio esmerilado, formas redondeadas ni íconos ilustrados.
- **D-03:** **Animación de entrada:** una sola vez al montar y al expandir a 14 días, las bandas se abren desde la barra central y los pluviómetros se llenan, escalonados de arriba hacia abajo. Total ≤ 700 ms, solo con CSS y sin `motion`. Con "reducir movimiento" se muestra el estado final. Esto revisa el "sin animación al expandir" de la fase 2.

#### Anatomía de la fila
- **D-04:** Se mantienen las dos líneas y la grilla de la fase 2:
  - **Línea 1:** día · mínima · barra con abanico · máxima · probabilidad.
  - **Línea 2:** rombo + palabra del semáforo + estado del tiempo a la izquierda; mm a la derecha.
  - **Borde derecho:** pluviómetro.
  - Sin solapes a 390 px con el texto más largo. Si no entra, el UI-SPEC define qué se acorta; el rombo y los mm nunca se sacrifican.

#### Rango p10–p90 (FCST-04)
- **D-05:** **Temperatura:** la barra sólida sigue yendo de mínima a máxima. A cada lado se suma una banda que se desvanece hasta el p10 de la mínima y el p90 de la máxima, sin borde duro.
- **D-06:** La banda se dibuja **en todos los días**, porque el abanico solo se lee si se ve abrirse desde cerca. Los días lejanos son el **día 4 en adelante** y ahí se suma el rango de lluvia como texto. Las escalas `bar7` y `bar14` tienen que incluir los extremos de las bandas para que no se recorten.
- **D-07:** **Lluvia:** los días 1 a 3 muestran mm del pronóstico principal, como hoy. Desde el día 4, el texto pasa a ser el rango del ensemble ("5–15 mm"). Si el p90 es menor que 1 mm, no se muestra nada.

#### Probabilidad de lluvia (FCST-03)
- **D-08:** **Pluviómetro:** una columna vertical fina y recta en el borde derecho de la fila, de toda su altura, llena desde abajo según la probabilidad, en azure. Las filas quedan pegadas, así que forman una tira continua que se lee de un vistazo como "cuándo llueve". Es la pieza más distintiva de la fase.
- **D-09:** **Número:** "70 %" en la última columna de la línea 1, en azure. Se redondea de a 5 % para no simular una precisión que no existe. Debajo de 10 % no se muestra número y el pluviómetro queda vacío. Tope visible de 95 %: nunca se dice "100 %". El lector de pantalla recibe el conteo real: "36 de 51 escenarios traen lluvia".
- **D-10:** **Fuente y cálculo:**
  - Se usa solo **ECMWF ENS** (`ecmwf_ifs025`, 51 miembros, 15 días). Un solo ensemble cubre los 14 días y evita los saltos de los días 8 y 11, cuando ICON y GFS terminan su horizonte.
  - Se calcula por miembro, sobre la suma del día local, y recién después se cuenta (Pitfall 3).
  - Cuando el ensemble dice 60 % y el pronóstico principal marca menos de 1 mm, se muestran el número y el pluviómetro sin mm. No es un error: el semáforo y la probabilidad explican esa duda.

#### Semáforo (MODL-02)
- **D-11:** **Rombos, no círculos:** el sistema de diseño usa rombos y forma recta. La forma y el color codifican juntos, así nunca depende solo del color:
  - **◆ lleno, azure:** coinciden.
  - **◈ medio lleno, sun (`--color-sun`):** dudan.
  - **◇ vacío con contorno marcado, color nuevo tipo brasa (`--color-ember`):** no se ponen de acuerdo. `--color-peach` sigue reservado para los avisos. El tono lo define el UI-SPEC y debe pasar contraste sobre `ground`.
- **D-12:** **El rombo está en todos los días; la palabra solo cuando hay duda.** Con acuerdo va el rombo solo; "DUDAN" o "SIN ACUERDO" aparecen cuando corresponde. Así la fila tranquila queda tranquila y la duda salta a la vista. La frase completa "no se ponen de acuerdo" va en la leyenda y en el texto para lector de pantalla.
- **D-13:** **Cálculo:**
  - Votan ECMWF, GFS, ICON y GEM si cubre la zona. MET Norway no vota.
  - Se compara máxima, mínima y lluvia ≥ 1 mm sí/no. No se compara `weather_code` (Pitfall 2).
  - Punto de partida, a calibrar con datos reales en el research: coinciden si todos dicen lo mismo sobre la lluvia y la dispersión de temperatura es ≤ 3 °C; no se ponen de acuerdo si la lluvia queda dividida en mitades o la dispersión es > 6 °C; dudan en el resto.
  - Los umbrales son constantes con tests, en una función pura.
- **D-14:** **Días sin modelos suficientes:** cuando queda un solo modelo con dato, en lugar del rombo se muestra una raya tenue y "SOLO UN MODELO". Nunca se muestra un acuerdo falso. Con 2 modelos, el máximo posible es "dudan" si difieren y "coinciden" si no; el planner verifica los horizontes reales.

#### Lectura editorial
- **D-15:** **Despacho de confianza:** arriba de la lista, una sola frase generada por reglas, en Playfair itálica y con la regla vertical de 2 px del "Editorial Atmosphere Callout". Ejemplo: "Hasta el jueves los modelos coinciden. El fin de semana, dudan." Es una función pura con tests, en rioplatense y sin signos de exclamación. Si no hay datos, no se muestra.
- **D-16:** **Leyenda de una línea** debajo del despacho, en tipografía de etiqueta: "◆ COINCIDEN · ◈ DUDAN · ◇ NO SE PONEN DE ACUERDO". Sin tooltips ni modales. Junto a ella o al pie de la lista va el crédito "Probabilidad: 51 escenarios de ECMWF".

#### Fallas y datos
- **D-17:** **Degradación por fuente (DATA-03):** si falla el ensemble, la fila vuelve al aspecto de la fase 2, sin abanico, número ni pluviómetro. Si falla el multimodelo, no hay rombos ni despacho. Cada falla lleva un aviso discreto; `/pronostico` nunca se rompe y se usa el último dato bueno cuando exista.
- **D-18:** **Caché:** el ensemble y el multimodelo tienen adapters propios con `readThrough` y TTL largo, según la frecuencia de cada corrida. Al snapshot y al cliente llega solo el resultado agregado por día, nunca los miembros crudos. Se piden solo las variables necesarias, porque el ensemble cuenta varias "calls" en Open-Meteo.

#### Barra de pestañas
- **D-19:** **Modelos se elimina del todo**, no se oculta: se borran la entrada, el `SectionId`, el ícono de `TabBar.tsx` y la aserción de `lib/sections.test.ts`. La barra queda con tres pestañas: Ahora, Pronóstico y Cielo.

### Claude's Discretion
- Medidas, opacidades, curvas de la animación y tono exacto de `--color-ember`: los define el UI-SPEC.
- Reglas exactas del despacho y su vocabulario, siguiendo el titular de la fase 2.
- Forma de los nuevos tipos en `WeatherSnapshot` y reparto en módulos.
- Texto de los avisos de D-17.

### Deferred Ideas (OUT OF SCOPE)
- Sumar la coincidencia al titular de la home ("Fresco y seguro: los modelos coinciden").
- Umbral de "lluvia importante" (≥ 10 mm) además del ≥ 1 mm.
- Detalle por día al tocar la fila, con los escenarios crudos: sigue diferido desde la fase 2.
- Abanico o probabilidad en el meteograma de 48 h.

**Contrato visual:** `04-UI-SPEC.md` está aprobado y el dueño eligió mantenerlo sin cambios (sketch 001, variante A). Este research no lo modifica. Donde el UI-SPEC y D-16 difieren (leyenda en dos líneas), manda el UI-SPEC.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FCST-03 | Probabilidad de lluvia de cada día desde los miembros del ensemble (≥ 1 mm en el día local) | Patrones 1 y 2; Pitfalls 1 y 2. La suma diaria de la API no respeta el día local: hay que sumar la lluvia horaria en la ventana (00:00, 24:00] |
| FCST-04 | Rango p10–p90 de temperatura y lluvia en los días lejanos | Patrón 2; ejemplos de percentil y `rainRangeText`. La temperatura sale del `daily` del ensemble, no del horario |
| MODL-02 | Semáforo por día (coinciden / dudan / no se ponen de acuerdo) con modelos independientes | GEM confirmado; horizontes medidos; Patrón 3 con umbrales calibrados contra 12 meses de corridas pasadas y ERA5 |
| Criterio 4 del roadmap | Sin botón Modelos en la barra | Patrón 5, lista de archivos verificada con grep |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Todo gratis y sin uso comercial: Vercel Hobby y plan gratis de Open-Meteo.
- Stack: Next.js + TypeScript (`^5`, no TS 7), Tailwind v4 configurado desde CSS (`@theme`), Vitest.
- **No se llama a las APIs en cada visita:** todo pasa por la caché del servidor. El cliente nunca llama a Open-Meteo.
- Validar con Zod en el borde servidor → API externa: un cambio de schema debe fallar ruidoso en el proxy.
- `cacheComponents` queda apagado. El proyecto usa `unstable_cache` + `readThrough`.
- Mobile first: el uso principal es el iPhone.
- No usar `motion` para esto (D-03 lo prohíbe), ni librerías nuevas de gráficos.
- Flujo GSD para los cambios al repo.

**CLAUDE.md queda desactualizado en tres puntos** (verificados hoy; no contradicen ninguna decisión):
1. Dice que el ensemble devuelve `precipitation_memberNN_ecmwf_ifs025_ensemble`. Con un solo modelo en la request, las claves son `precipitation` (control) y `precipitation_member01` a `_member50`.
2. Dice miembros con ≥ 0,2 mm. Manda el ≥ 1 mm de FCST-03.
3. Dice que el crudo "pesa mucho". Con solo lo necesario son 116 KB sin comprimir y 8 KB por la red.

## Summary

Todo lo necesario está disponible y gratis, y no hace falta instalar ningún paquete. **GEM cubre Winifreda** con `gem_seamless` (idéntico a `gem_global` en la respuesta real). Votan **4 modelos los días 1 a 7, 3 los días 8 a 10 y 2 los días 11 a 14**, según la respuesta del 2026-11-01. "SOLO UN MODELO" no aparece en 14 días salvo que falle una fuente.

Hay un hallazgo que cambia la implementación: **la `precipitation_sum` diaria de Open-Meteo da un día local corrido para los ensembles de 3 horas**. El bloque de lluvia de 21:00 a 00:00 queda en el día siguiente. Para el 2026-11-04 real, la probabilidad da 28/51 (55 %) con la suma diaria, 17/51 (35 %) sumando los sellos 00–23, y **3/51 (sin número) con la ventana correcta (00:00, 24:00]**. Además la diaria trae valores negativos (−0,1 mm; 5 en la respuesta real). Por eso la lluvia se suma desde `hourly=precipitation`, mientras que la temperatura se toma del `daily`, porque la horaria interpolada recorta el pico hasta 4 °C.

Los umbrales de partida de D-13 (3/6 °C) resultaron demasiado estrictos: con 4 modelos, a 5 días, "coinciden" sale el 9 % de los días y "no se ponen de acuerdo" el 40 %. También tienen un sesgo por cantidad de votantes: el rango entre 2 modelos es menor que entre 4, así que los días 11–14 parecerían más seguros que el día 5. La recomendación es un umbral **por cantidad de votantes**: N=4 → 5/9 °C, N=3 → 4/7,5 °C, N=2 → 2,5 °C. Contra ERA5, el semáforo discrimina bien la lluvia (aciertos de 96 % / 79 % / 56 % a un día) y poco la temperatura.

**Primary recommendation:** dos adapters nuevos que cachean solo agregados, la ventana de lluvia (00:00, 24:00] como única función compartida, veredicto derivado al armar el snapshot, y umbrales por N en una constante con tests.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pedir ensemble y multimodelo | API / Backend (adapters `server-only`) | Data Cache | Exigencia de CLAUDE.md; el cliente nunca llama a Open-Meteo |
| Agregar miembros (conteo, percentiles) | API / Backend (función pura llamada desde el adapter) | — | D-18: solo se cachea el agregado |
| Calcular el veredicto por día | API / Backend (pura, en `snapshot.ts`) | — | Cambiar un umbral no debe exigir invalidar la caché; los valores por modelo no llegan a `/api/weather` |
| Armar la fila, escalas, textos y `srText` | Frontend Server (ISR, `buildDailyRows`) | — | Patrón de fase 2: fila precalculada y serializable |
| Elegir 7/14 días | Browser (isla `DailyList`) | — | Único estado de cliente, sin cambios |
| Animación de entrada | Browser (solo CSS) | — | D-03: sin JS |
| Variante de texto a 320/390 | Browser (container query) | Frontend Server genera los dos textos | UI-SPEC: no depende de la hidratación |

## Standard Stack

### Core

Sin dependencias nuevas. `package.json` no cambia.

| Pieza | Versión | Uso en la fase |
|-------|---------|----------------|
| `zod` | 4.6.7 (instalada) | `z.looseObject` acepta las columnas por miembro. Probado contra la respuesta real [VERIFIED: ejecución local] |
| `next` `unstable_cache` | 16.4.3 (instalada) | Igual que los demás adapters |
| Tailwind v4 | instalado | `@container` y `@max-[327px]:` están en el core, sin plugin [CITED: tailwindcss.com, Context7] |
| Vitest | ^5.0.5 (instalado) | Suite actual: 42 archivos y 698 tests en verde [VERIFIED: ejecutado hoy] |

### Endpoints verificados con Winifreda (-36.23, -64.23), 2026-11-01

| Fuente | Parámetros | Tamaño crudo | Por red | Tiempo |
|--------|-----------|--------------|---------|--------|
| Ensemble | `models=ecmwf_ifs025&forecast_days=15&hourly=precipitation&daily=temperature_2m_max,temperature_2m_min` | 116 KB | 8 KB gzip | 1,1–1,9 s |
| Multimodelo | `models=ecmwf_ifs,gfs_seamless,icon_seamless,gem_seamless&forecast_days=15&hourly=precipitation&daily=temperature_2m_max,temperature_2m_min` | 16 KB | 2 KB gzip | ≈ 1,6 s |

El timeout de 8 s de los demás adapters alcanza. Ambas URLs se arman en `lib/config.ts` junto a las demás, con `timezone=TZ`. Hay que pedir `forecast_days=15` en las dos, aunque se muestren 14, para tener el sello de las 00:00 que cierra el día 14. [VERIFIED: requests reales]

### Horizontes reales por modelo (Forecast API, `daily`)

| Modelo | ID | Días con dato | Vota en |
|--------|----|---------------|---------|
| ECMWF IFS HRES | `ecmwf_ifs` | 15 (día 16 nulo) | 1–14 |
| GFS | `gfs_seamless` | 16 | 1–14 |
| ICON | `icon_seamless` | **7** (día 8 nulo; solo 22 de 24 horas) | 1–7 |
| GEM | `gem_seamless` | **10** (día 11 nulo) | 1–10 |

[VERIFIED: respuesta real] La doc de Open-Meteo dice 7,5 días para el ICON del ensemble y 10 para GEM Global [CITED: open-meteo.com/en/docs/gem-api]. Los cortes pueden moverse un día según la corrida [ASSUMED], así que **nunca se codifica un horizonte**: un modelo vota si tiene dato completo ese día.

### Alternativas descartadas

| En vez de | Se podría | Por qué no |
|-----------|-----------|------------|
| `hourly=precipitation` | `daily=precipitation_sum` en el ensemble | Día corrido y negativos (Pitfall 1) |
| `daily=temperature_2m_max/min` | Máx/mín desde la temperatura horaria del ensemble | Recorta el pico: 25,7 vs 27,7 °C y 23 vs 27 °C en el control real |
| `ecmwf_ifs` | `ecmwf_ifs025` en el multimodelo | Casi igual y de menor resolución |
| `d3-array` | Percentil propio de 6 líneas | No vale una dependencia directa nueva |

**Instalación:** ninguna.

## Package Legitimacy Audit

La fase no instala paquetes externos, así que el gate no aplica y no se corrió slopcheck.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| — | — | — | — | — | No aplica | Ninguno |

**Packages removed due to slopcheck [SLOP] verdict:** ninguno.
**Packages flagged as suspicious [SUS]:** ninguno.

## Architecture Patterns

### System Architecture Diagram

```
 ensemble-api.open-meteo.com           api.open-meteo.com (models=4)
   (51 miembros: lluvia horaria,         (lluvia horaria, máx/mín diarias
    máx/mín diarias)                      por modelo)
          │ TTL 3 h                             │ TTL 1 h
          ▼                                     ▼
 fetchEnsembleRaw: Zod → agregar        fetchModelsRaw: Zod → por modelo y día
   lib/forecast/localDayRain (00:00,24:00] ◄──┘
          │  Cached<EnsembleDay[]>              │ Cached<ModelsDay[]>
          ▼                                     ▼
 unstable_cache + readThrough ───┬─── unstable_cache + readThrough
                                 ▼
             getWeatherSnapshot (Promise.allSettled, nunca lanza)
             ¿falló? → sources[n].status = 'error' | 'stale'
             multimodelo → agreementFor(día) → veredicto
                                 │  WeatherSnapshot.confidence
             ┌───────────────────┼───────────────┐
             ▼                   ▼               ▼
       /api/weather       buildDailyRows    buildDespacho
       (solo agregados)   (fila, escalas,   (primeras 7 filas)
                           textos, srText)
                                 │
                                 ▼
             /pronostico (ISR 600 s) → DailyList (elige bar7/bar14)
```

### Recommended Project Structure

```
lib/sources/
├── openMeteoEnsemble.schema.ts   # Zod, sin server-only
├── openMeteoEnsemble.ts          # fetchRaw + 2 getters unstable_cache
├── openMeteoModels.schema.ts
├── openMeteoModels.ts
└── __fixtures__/open-meteo-ensemble.json, open-meteo-models.json
lib/forecast/
├── localDayRain.ts               # ventana (00:00, 24:00], compartida
├── ensemble.ts                   # conteo, p10/p90, toDisplayPct, rainRangeText
├── agreement.ts                  # umbrales + veredicto
├── despacho.ts                   # reglas 0–12 del UI-SPEC
├── rowStatus.ts                  # acortado del estado, normal y compacto
└── daily.ts                      # se extiende
components/
├── Rombo.tsx                     # SVG; server-safe
└── Despacho.tsx                  # despacho + leyenda
```

Todo lo lógico va en `lib/` porque Vitest solo incluye `**/*.test.ts` con entorno `node`: **no hay tests de componentes**. Lo que quede dentro de `DailyList.tsx` solo se verifica en el navegador.

### Pattern 1: Un día local de lluvia es la ventana (00:00, 24:00]

**Qué:** el valor horario es "suma de la hora anterior" [CITED: open-meteo.com/en/docs]. El sello 00:00 pertenece al día anterior. El día D suma los sellos D 01:00 … D+1 00:00, y solo vale si están las 24 horas.

**Evidencia:** los bloques de 3 h reales se ven en los sellos 13-14-15, 46-47-48, y terminan en horas múltiplos de 3 locales: coinciden con los pasos de 3 h en UTC. La sensibilidad se ve en el miembro 01: el bloque de 5,5 mm/h en 22-23-00 pertenece completo al día anterior.

**Cuándo:** ensemble y multimodelo. Es la misma función para los dos. [VERIFIED: requests reales]

```typescript
// lib/forecast/localDayRain.ts. Pura. `time` son sellos locales de Open-Meteo.
/** 'YYYY-MM-DD' -> mm, solo para días con las 24 horas presentes. */
export function localDayRain(
  time: string[],
  mm: Array<number | null>,
): Map<string, number> {
  const totals = new Map<string, { sum: number; n: number }>()
  time.forEach((t, i) => {
    const v = mm[i]
    if (v === null || v === undefined) return
    const key = t.slice(11, 13) === '00' ? addDaysToKey(t.slice(0, 10), -1) : t.slice(0, 10)
    const cur = totals.get(key) ?? { sum: 0, n: 0 }
    totals.set(key, { sum: cur.sum + Math.max(0, v), n: cur.n + 1 })
  })
  const out = new Map<string, number>()
  for (const [k, { sum, n }] of totals) if (n === 24) out.set(k, sum)
  return out
}
```

`addDaysToKey(key, n)` ya existe en `lib/time.ts`. Se compara la hora con `slice` porque el Zod `localDT` acepta sellos con y sin segundos. **La condición `n === 24` descarta sola el "ayer" parcial y el último día incompleto.**

### Pattern 2: Adapter que cachea solo el agregado

Copiar `lib/sources/openMeteoRecentRain.ts`: `fetchRaw` que valida y devuelve `{ data, fetchedAt }`, `unstable_cache` con key versionada, y otro getter con `bucket`. Código de error `SourceError` con los dos `SourceId` nuevos.

```typescript
// openMeteoEnsemble.schema.ts
const MEMBER = /^precipitation(_member\d{2})?$/
export const EnsembleDto = z.object({
  timezone: z.literal(TZ),
  hourly: z.looseObject({ time: z.array(localDT) }).superRefine(sameLengthAsTime),
  daily: z.looseObject({ time: z.array(z.iso.date()) }).superRefine(sameLengthAsTime),
}).superRefine((d, ctx) => { /* ≥ 40 columnas MEMBER, cada una nums; si no, issue => 'schema' */ })

export interface EnsembleDay {
  date: string
  members: number        // miembros con el día completo; el conteo real de D-09
  rainMembers: number    // ≥ 1 mm
  rainP10Mm: number
  rainP90Mm: number
  tMinP10C: number | null
  tMaxP90C: number | null
}
```

Percentil con interpolación lineal, igual que el default de numpy. Con 51 miembros, p10 es el índice 5 y p90 el 45:

```typescript
export function quantile(sorted: number[], p: number): number {
  const h = (sorted.length - 1) * p
  const lo = Math.floor(h)
  const hi = Math.min(lo + 1, sorted.length - 1)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo)
}
```

- **Mínimo de miembros:** un día con menos de la mitad de los miembros completos no se publica, y el UI-SPEC lo dibuja como "Día sin dato de ensemble".
- **TTL:** `openMeteoEnsemble: 10_800` (3 h) y `openMeteoModels: 3_600` (1 h) en `TTL`. Las corridas del ensemble salen cada 6 h y aparecen unas 10 h después de su hora nominal, según `meta.json` [VERIFIED: 06Z visible 9,5 h después; 12Z, 11,1 h]. Encaja con `ARCHITECTURE.md` (3600–10800 s).
- **Cuota:** 8 + 24 requests por día. El ensemble pesa unas 4 calls según el ejemplo de la doc [CITED: open-meteo.com/en/docs/ensemble-api], así que serían menos de 100 calls contra 10.000 por día [CITED: open-meteo.com/en/pricing]. La fórmula exacta no está documentada [ASSUMED].

### Pattern 3: Veredicto con umbral por cantidad de votantes

Un modelo vota si ese día tiene `tMax`, `tMin` y las 24 horas de lluvia. Los valores por modelo se quedan en la caché del adapter: **no se copian al snapshot**, porque `/api/weather` lo serializa completo y MODL-02 pide no mostrarlos por separado.

```typescript
// lib/forecast/agreement.ts. Pura.
export type Verdict = 'coinciden' | 'dudan' | 'desacuerdo' | 'solo' | 'sinDato'
import { RAIN_DAY_MM } from '@/lib/rain/lastRain' // ya vale 1; ver pregunta abierta 4

/** [coinciden hasta, desacuerdo por encima de], en °C de rango. Ver calibración. */
export const AGREEMENT_C: Record<2 | 3 | 4, readonly [number, number]> = {
  4: [5, 9],
  3: [4, 7.5],
  2: [2.5, Infinity], // D-14: con 2 modelos, nunca 'desacuerdo'
}

export function verdictFor(votes: ModelVote[]): Verdict {
  const n = votes.length
  if (n === 0) return 'sinDato'
  if (n === 1) return 'solo'
  const [okC, noC] = AGREEMENT_C[n as 2 | 3 | 4]
  const range = (xs: number[]) => round1(Math.max(...xs) - Math.min(...xs)) // evita 4.000000000000004
  const spread = Math.max(range(votes.map((v) => v.tMaxC)), range(votes.map((v) => v.tMinC)))
  const yes = votes.filter((v) => v.rainMm >= RAIN_DAY_MM).length
  const unanimous = yes === 0 || yes === n
  if (n > 2 && (yes * 2 === n || spread > noC)) return 'desacuerdo'
  return unanimous && spread <= okC ? 'coinciden' : 'dudan'
}
```

Con N=3 la lluvia no puede quedar "en mitades", así que allí solo llega a `desacuerdo` por temperatura. Es la lectura literal de D-13 y se acepta.

### Calibración de los umbrales

**Método:** Previous Runs API, 2025-11-01 a 2026-10-30, `previous_day1/3/5/7` de los 4 modelos en el punto de Winifreda, con máx/mín sacadas de la temperatura horaria y la lluvia en (00:00, 24:00]. Validación contra ERA5 hasta el 2026-10-24. En la corrida de hoy, el rango de las máximas horarias difiere del de las diarias en 0,5 °C como mucho (días 1–10), así que el método no parece inflar la dispersión. Es una sola corrida y no se comprobó con las mínimas.

Porcentaje de días coinciden / dudan / desacuerdo:

| Votantes y plazo | D-13 (3/6 °C) | **Recomendado** |
|------------------|---------------|-----------------|
| N=4, a 1 día | 26 / 57 / 17 | **57 / 35 / 8** |
| N=4, a 3 días | 16 / 58 / 26 | **43 / 47 / 9** |
| N=4, a 5 días | 9 / 51 / 40 | **34 / 50 / 16** |
| N=3, a 7 días | 9 / 52 / 39 | **19 / 63 / 18** |
| N=2, a 7 días | 33 / 67 / 0 | **25 / 75 / 0** |

La columna recomendada baja de forma casi continua con el plazo, que es lo que D-01 quiere mostrar. Con D-13 tal cual, `coinciden` salta del 9 % al 33 % cuando quedan 2 modelos, justo donde hay menos información. El factor entre N es el `d2` de rango de muestras (1,128 / 1,693 / 2,059); 5 × 1,128 / 2,059 = 2,74, redondeado hacia abajo a 2,5.

**¿Sirve el semáforo?** Aciertos de "lluvia sí/no" por mayoría contra ERA5, y error medio de temperatura:

| N=4, umbrales recomendados | Coinciden | Dudan | Desacuerdo |
|----------------------------|-----------|-------|------------|
| A 1 día, lluvia | 96 % | 79 % | **56 %** |
| A 3 días, lluvia | 93 % | 87 % | **57 %** |
| A 5 días, lluvia | 94 % | 83 % | **60 %** |
| Error de temperatura (1 / 3 / 5 días) | 1,0 / 1,3 / 1,6 °C | 1,1 / 1,3 / 1,6 °C | 1,3 / 1,3 / 1,6 °C |

**Conclusión honesta:** discrimina muy bien si va a llover y casi nada el error de temperatura. No hace falta cambiar nada en la interfaz: "dudan" y "no se ponen de acuerdo" no prometen un número.

**Estación del año** (recomendado, coinciden/dudan/desacuerdo): a 3 días con N=4 da DJF 26/61/13, MAM 40/53/7, JJA 47/44/9, SON 61/33/7. **En verano va a dominar "dudan"**, y con N=2 llega a DJF 11/89/0. Es real y coherente con la convección de La Pampa, pero el dueño lo va a notar justo ahora que empieza el verano.

**Límites:** un año y un punto; ICON no llega a `previous_day7`; más allá de 7 días no hay corridas guardadas, así que los días 8–14 son extrapolación; ERA5 es reanálisis, no pluviómetro. Confianza MEDIUM.

**Umbral de lluvia:** subirlo a 2 mm no cambia casi nada (45 % vs 43 % de coinciden a 1 día, medido con el par 4/8 °C). En 55 de 94 días con lluvia dividida, un modelo del "no" tenía ≥ 0,3 mm. Se mantiene 1 mm por D-13.

### Veredictos con los datos reales de hoy

| Día | N | Rango °C | Lluvia (ECMWF/GFS/ICON/GEM) | Veredicto recomendado |
|-----|---|----------|------------------------------|----------------------|
| 11-01 | 4 | 2,4 | 3,4 / 3,9 / 0,6 / 1,3 | dudan |
| 11-03 | 4 | 2,1 | 32,6 / 2,3 / 34,8 / 22,2 | coinciden |
| 11-05 | 4 | 2,9 | 5,2 / 4 / 0,8 / 0 | desacuerdo |
| 11-07 | 4 | 11,2 | 0 / 0 / 7,5 / 0 | desacuerdo |
| 11-08 | 3 | 4,0 | 0 / 0 / — / 0 | coinciden |
| 11-10 | 3 | 14,6 | 0 / 0 / — / 21,9 | desacuerdo |
| 11-12 | 2 | 3,0 | 0 / 0 | dudan |

Lluvia con suma diaria de la API, como referencia. La ventana correcta mueve algunos valores: GEM pasa de 22,2/16,5 mm a 36/2,7 mm entre el 3 y el 4.

### Pattern 4: Tipos en el snapshot

`WeatherSnapshot` es el contrato que también usarán la fase 6 y la fase 7, y D-18 lo nombra, así que va ahí y no en un agregador aparte como `getRainData`.

```typescript
export type SourceId = /* … */ | 'open-meteo-ensemble' | 'open-meteo-models'

export interface DayConfidence {
  date: string
  ensemble: Omit<EnsembleDay, 'date'> | null
  verdict: Verdict       // 'sinDato' si falló el multimodelo o no hay votantes
  voters: number
}
// WeatherSnapshot.confidence: DayConfidence[]   ([] si fallaron las dos fuentes)
```

- `sources[0]` sigue siendo `open-meteo`: **los nuevos van al final** (lo leen `Ahora`, `Pronostico` y `selectAhoraVariant`).
- El campo es obligatorio. El compilador va a señalar `app/dev/estados/fixtures.ts` y las dos ramas de `built` en `snapshot.ts`.
- `readFault` suma `'ensemble-down'` y `'models-down'`, y la rama `empty` limpia `confidence`. `snapshot.test.ts` **tiene que mockear los dos adapters nuevos**; si no, intenta salir a la red.
- `buildDailyRows(daily, now, confidence?)` con tercer argumento opcional: los usos de la fase 2 y los cuadros de la galería siguen compilando. El join es por `date`, así que un día pasado de un dato viejo cae solo (UI-SPEC "Último dato bueno").
- El aviso sale de `sources[n].status`: `error` → copy de falla, `stale` → copy de último dato con `fetchedAt`.
- La regla de borrar por fuente del UI-SPEC necesita saber si el dato existe, no solo el estado: `status: 'error'` no trae dato, `stale` sí.

### Pattern 5: Quitar Modelos

Grep sobre `app`, `components`, `lib` y `public`: solo aparece en `lib/sections.ts` (líneas 2, 3, 13), `lib/sections.test.ts` (7, 10) y `components/TabBar.tsx` (55). No hay ruta ni entrada en manifest o sitemap.

Recomendación para lo que el UI-SPEC dejó al plan: **borrar también el campo `enabled` y la rama `aria-disabled`**. Solo `TabBar.tsx` y el test lo leen, ninguna fase futura agrega pestañas y `min-h-11` no cambia. Es un plan chico e independiente: puede ir en la primera ola.

### Anti-Patterns to Avoid

- **Usar `daily=precipitation_sum` del ensemble:** ver Pitfall 1.
- **Promediar miembros y después aplicar el umbral:** diluye la señal (Pitfall 3 del proyecto).
- **Cachear el DTO crudo:** el Data Cache recibiría 116 KB por getter; solo el agregado.
- **Guardar los valores por modelo en el snapshot:** salen por `/api/weather`.
- **Escribir horizontes como constantes:** el dato decide.
- **Guardar el veredicto en la caché del adapter:** un cambio de umbral tardaría 1 h o exigiría subir la versión de la key.
- **Usar `describeWeather` o `weather_code` para votar:** D-13.
- **Aplicar el `min(4px)` de la banda sin dato:** con ensemble nulo no se dibuja nada (UI-SPEC).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache con último dato bueno | Otro mecanismo | `readThrough` + `unstable_cache` + bucket | Ya resuelve refresco esperado y `stale` |
| Días en hora argentina | Date math | `localDateKey`, `addDaysToKey`, `relativeDayLabel` de `lib/time` | Pitfall 4 del proyecto |
| Validación de respuesta | `if` a mano | Zod + `sameLengthAsTime` | Fallo `schema` uniforme |
| Medir texto en runtime | Canvas/JS | Tablas del UI-SPEC + función pura + `@container` | Sin hidratación, según contrato |
| Animación | `motion`, observers | Keyframes del UI-SPEC | D-03 |
| Reducir movimiento | Código nuevo | Regla global de `globals.css:226` | Ya pone `animation: none !important` |

**Key insight:** lo difícil de esta fase es qué ventana se suma y qué umbral es honesto, no el código.

## Common Pitfalls

### Pitfall 1: La suma diaria de la API corre el día
**What goes wrong:** con `daily=precipitation_sum` en un ensemble de 3 h, el bloque de 21:00 a 00:00 cae en el día siguiente. Real, 2026-11-04: 55 % vs 6 % correcto. También sale −0,1 mm.
**Why it happens:** la agregación diaria usa los sellos, y un bloque que termina a las 00:00 lleva sello del día nuevo. Para modelos horarios la diferencia es de una hora y la diaria coincide con la suma de sellos 00–23 [VERIFIED: comparación diaria vs horaria por modelo].
**How to avoid:** `localDayRain` en ambos adapters y un test con el caso real: bloque de lluvia en sellos 22, 23 y 00.
**Warning signs:** día seco tras una tormenta nocturna con probabilidad alta; negativos.

### Pitfall 2: Las claves no son las de CLAUDE.md
**What goes wrong:** buscar `_ecmwf_ifs025_ensemble` da cero miembros. El miembro de control es la columna sin sufijo; hay que contarlo para llegar a 51.
**How to avoid:** regex del Patrón 2 sobre un fixture real; `members` sale del dato y no es una constante ("51 es el valor esperado", UI-SPEC).

### Pitfall 3: Comparación de punto flotante en el umbral
**What goes wrong:** en JavaScript, 16,1 − 12,1 da 4,000000000000002: un rango de 4,0 deja de "coincidir" con N=3. Pasa en los cinco umbrales (por ejemplo, 19,1 − 10,1 con el de 9 °C). [VERIFIED: ejecución local]
**How to avoid:** redondear a un decimal antes de comparar; test con el borde exacto en cada umbral.

### Pitfall 4: Rango de lluvia casi siempre desde 0
**What goes wrong:** el ejemplo del contrato es "5–15 mm", pero hoy los días 4+ dan "0–4 mm", "0–17 mm", "0–20 mm" o nada. p10 es 0 en casi todos los días lejanos.
**How to avoid:** no tocar el contrato. Sí usar valores reales en los cuadros de `/dev/estados`, para que el dueño lo vea. `p90 < 1` se evalúa **antes** de redondear: 0,9 no muestra nada.

### Pitfall 5: Probabilidad de "Hoy" incluye horas ya pasadas
**What goes wrong:** a las 22:00, "Hoy 70 %" puede referirse a una lluvia de la mañana. Es la lectura literal de "suma del día local" (D-10), así que se implementa así.
**How to avoid:** nada en esta fase; queda como pregunta abierta.

### Pitfall 6: Dominio de las escalas
**What goes wrong:** si la banda llega al borde pero el dominio no la incluye, se recorta. Si `hi <= lo` después de sumar bandas, `scaleFor` devuelve null.
**How to avoid:** `scaleFor` recibe grados de `tMin`, `tMax`, `bandLo` y `bandHi`, y sigue con la fase 2 si no hay ensemble. Test: ninguna fracción fuera de [0, 1].

### Pitfall 7: Contra-intuición con el pronóstico principal
**What goes wrong:** `/pronostico` usa `best_match`, que no es uno de los votantes ni la mediana del ensemble. "Sin mm" con "60 %" o el p90 por debajo de la máxima son normales.
**How to avoid:** D-10 y UI-SPEC ya lo resuelven con `min`/`max` en bandas y sin aviso. Cubrirlo en tests para que nadie lo "arregle".

### Pitfall 8: Bump de versión de cache key
**What goes wrong:** cambiar la forma de `EnsembleDay` sin subir la key deja datos viejos con forma vieja hasta 3 h en producción, y el render se rompe.
**How to avoid:** `['open-meteo-ensemble','v1']`, y subir a `v2` en cualquier cambio de forma.

### Pitfall 9: Transición de `width: max(...)` en Safari
**What goes wrong:** el UI-SPEC transiciona `left`, `right` y `width` con `max(4px, calc(...))` al pasar de `bar7` a `bar14`. La interpolación de funciones matemáticas debería funcionar, pero no se probó en Safari [ASSUMED].
**How to avoid:** es solo un adorno: agregar el caso a la verificación en navegador. Si salta sin animar, queda igual de correcto.

### Pitfall 10: Banda débil a la vista
**What goes wrong:** el sketch 001 anotó que las bandas se leen débil, con datos inventados. Hoy, comparado con ECMWF HRES (no con el pronóstico principal que dibuja la barra), los días 1–3 se abren de 0 a 2 °C por lado, y los días 12–14 de 2 a 6 °C. Cerca de hoy manda el mínimo de 4 px del contrato.
**How to avoid:** mirarlo con datos reales en `/pronostico` antes de cerrar. No retocar opacidades sin avisar: es un contrato aprobado.

## Code Examples

### Valor mostrado de probabilidad (D-09, tabla del UI-SPEC)

```typescript
export function toDisplayPct(rainMembers: number, members: number): number | null {
  if (members <= 0) return null
  const raw = rainMembers / members
  if (raw < 0.1) return null       // el umbral se aplica al crudo
  if (raw >= 0.925) return 95      // nunca 100
  return Math.min(90, Math.max(10, Math.round((raw * 100) / 5) * 5))
}
// 5/51 → null · 6/51 → 10 · 35/51 → 70 · 47/51 → 90 · 48/51 → 95 · 51/51 → 95
```

Valores reales de hoy: 35, 12, 51, 3, 42, 15, 3, 3, 7, 5, 8, 16, 28, 31 de 51 miembros → 70, 25, 95, —, 80, 30, —, —, 15, —, 15, 30, 55, 60 %.

### Rango de lluvia (D-07)

```typescript
export function rainRangeText(p10: number, p90: number): string | null {
  if (p90 < 1) return null
  const lo = Math.round(p10), hi = Math.round(p90)
  return lo === hi ? `${hi} mm` : `${lo}–${hi} mm`
}
```

### URL (en `lib/config.ts`)

```typescript
export const OPEN_METEO_ENSEMBLE_URL = `https://ensemble-api.open-meteo.com/v1/ensemble?${new URLSearchParams({
  latitude: String(LAT), longitude: String(LON),
  models: 'ecmwf_ifs025',
  hourly: 'precipitation',
  daily: 'temperature_2m_max,temperature_2m_min',
  forecast_days: '15',
  timezone: TZ,
}).toString()}`
```

### Claves del multimodelo

`temperature_2m_max_ecmwf_ifs`, `temperature_2m_min_gfs_seamless`, `precipitation_icon_seamless`, etc. Pueden ser `null` más allá del horizonte. [VERIFIED: respuesta real]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plugin `@tailwindcss/container-queries` | `@container` y `@max-*` en el core | Tailwind v4.0 | Nada que instalar |
| Pestaña Modelos con cada modelo | Veredicto dentro del Pronóstico | Decisión del 2026-10-25 | Solo `Verdict` llega al snapshot |

**Deprecated/outdated:** `research/ARCHITECTURE.md` sugiere `lib/weather/derive/` y `fetch` con `revalidate`. El código real usa `lib/forecast/` y `unstable_cache`: seguir el código.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Los horizontes de ICON y GEM pueden moverse un día según la corrida | Stack | Bajo: se calcula por dato |
| A2 | Menos de 100 calls por día: la fórmula del peso no está publicada | Patrón 2 | Bajo: hay margen de 100 veces |
| A3 | La transición de `width: max()` funciona en Safari | Pitfall 9 | Bajo: solo pierde un adorno |
| A4 | Los umbrales valen para los días 8–14, sin corridas guardadas a ese plazo | Calibración | Medio: se ajusta una constante |
| A5 | La calibración de 12 meses representa los próximos años | Calibración | Medio: se ajusta una constante |
| A6 | Los umbrales por N respetan "a calibrar" de D-13 | Patrón 3 | Medio: D-13 habla de un solo par. Es delegación del dueño y no cambia el concepto, pero el planner debería mencionarlo |

## Open Questions (RESOLVED)

1. **¿Crédito `COINCIDENCIA: {N} MODELOS` con N variable?**
   - What we know: N es 4, 3 o 2 según el día; el UI-SPEC pide un número.
   - What's unclear: qué N mostrar en la lista completa.
   - Recommendation: el máximo de votantes en la lista. El `srText` ya dice "Los 2 modelos con dato" donde toca.
   - RESOLVED: N es el máximo de votantes de la lista (plan 04-09).
2. **¿Mucho "DUDAN" para la fila tranquila de D-12?**
   - What we know: `dudan` sale entre 35 % y 75 % de los días según plazo y votantes, y en verano más.
   - What's unclear: si le va a resultar pesado al dueño.
   - Recommendation: ya se eligió el juego menos ruidoso que sigue siendo honesto. Revisar en la verificación final; subir el umbral es tocar una constante.
   - RESOLVED: se sale con `AGREEMENT_C` y el dueño lo revisa en la verificación final (plan 04-10).
3. **¿Debe "Hoy" contar solo las horas restantes?**
   - What we know: FCST-03 y D-10 dicen día local.
   - Recommendation: implementar día completo y no agrandar la fase.
   - RESOLVED: "Hoy" cuenta el día local completo (plan 04-02).
4. **¿Reutilizar `RAIN_DAY_MM` de `lib/rain/lastRain.ts`?**
   - What we know: existe y vale 1.
   - Recommendation: reutilizarla si `lastRain.ts` no arrastra dependencias de servidor; si no, moverla a un módulo sin dependencias.
   - RESOLVED: se reutiliza; `lastRain.ts` no arrastra dependencias de servidor (plan 04-02).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build y tests | ✓ | 24.22.1 | — |
| Ensemble API | FCST-03/04 | ✓ | HTTP 200 | D-17 |
| Forecast API multimodelo | MODL-02 | ✓ | HTTP 200 | D-17 |
| `gsd-sdk`, Vitest | Flujo y tests | ✓ | — | — |
| iPhone real | Verificación | ✗ desde este entorno | — | DevTools a 390×844, como aceptó el dueño en 03-08 y 05-05 |

**Missing dependencies with no fallback:** ninguna.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^5.0.5, entorno `node`, `TZ=UTC` |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run lib/forecast lib/sources lib/weather lib/sections.test.ts` |
| Full suite command | `npm test`, más `npm run typecheck` y `npm run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FCST-03 | El bloque de los sellos 22-23-00 cuenta para el día anterior | unit | `npx vitest run lib/forecast/localDayRain.test.ts` | ❌ Wave 0 |
| FCST-03 | Conteo ≥ 1 mm por miembro y control incluido (51) | unit | `npx vitest run lib/forecast/ensemble.test.ts` | ❌ Wave 0 |
| FCST-03 | `toDisplayPct`: 5/51, 6/51, 47/51, 48/51, 51/51 | unit | `npx vitest run lib/forecast/ensemble.test.ts` | ❌ Wave 0 |
| FCST-03 | Adapter: fixture real OK, roto → `SourceError('schema')`, 500 → `http_500` | unit | `npx vitest run lib/sources/openMeteoEnsemble.test.ts` | ❌ Wave 0 |
| FCST-04 | p10/p90 con 51 valores conocidos; día incompleto se excluye | unit | `npx vitest run lib/forecast/ensemble.test.ts` | ❌ Wave 0 |
| FCST-04 | Bandas: `bandLo ≤ lo`, `bandHi ≥ hi`, fracciones en [0, 1], dominio de `bar7` y `bar14` | unit | `npx vitest run lib/forecast/daily.test.ts` | ✅ se extiende |
| FCST-04 | `rainRangeText`; día 3 usa principal, día 4 usa ensemble; sin ensemble vuelve al principal | unit | `npx vitest run lib/forecast/daily.test.ts` | ✅ se extiende |
| MODL-02 | Votantes 4/3/2/1/0; bordes exactos de cada umbral; N=2 nunca `desacuerdo` | unit | `npx vitest run lib/forecast/agreement.test.ts` | ❌ Wave 0 |
| MODL-02 | Adapter multimodelo: horizonte nulo no vota; MET Norway no entra | unit | `npx vitest run lib/sources/openMeteoModels.test.ts` | ❌ Wave 0 |
| MODL-02 | `buildDespacho`: una prueba por regla 0–12, ≤ 82 caracteres, sin "!" | unit | `npx vitest run lib/forecast/despacho.test.ts` | ❌ Wave 0 |
| MODL-02 | `srText` de cada caso del UI-SPEC | unit | `npx vitest run lib/forecast/daily.test.ts` | ✅ se extiende |
| D-04 | Producto cartesiano del UI-SPEC: WMO × palabras × mm, a 327 y 272 px | unit | `npx vitest run lib/forecast/rowStatus.test.ts` | ❌ Wave 0 |
| D-17 | Fuente caída o `stale` no rompe; `sources[0]` sigue primero | unit | `npx vitest run lib/weather/snapshot.test.ts` | ✅ se extiende (mocks) |
| D-17 | Faults nuevos ignorados en producción | unit | `npx vitest run lib/weather/snapshot.test.ts` | ✅ se extiende |
| Criterio 4 | Tres secciones, sin `modelos` | unit | `npx vitest run lib/sections.test.ts` | ✅ se cambia |
| Criterio 4 | `/modelos` da 404 | smoke | `node scripts/smoke.mjs` con `--expect-404` (con `MSYS_NO_PATHCONV=1`) | ✅ |
| UI-SPEC | "Verificación en el navegador", 10 criterios, 16 cuadros de `/dev/estados` | manual | Justificado: no hay tests de componentes y son juicios visuales | — |
| D-18 | Ningún dato de miembro ni de modelo en `/api/weather` | smoke | Inspeccionar el JSON en un test del snapshot: ausencia de `member` y nombres de modelo | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** quick run command.
- **Per wave merge:** `npm test && npm run typecheck && npm run lint`.
- **Phase gate:** suite completa más `npm run build`, los 10 criterios de navegador, y la "prueba clave" de CONTEXT.

### Wave 0 Gaps

- [ ] `lib/sources/__fixtures__/open-meteo-ensemble.json`: captura real de la URL final (≈ 116 KB, como máximo).
- [ ] `lib/sources/__fixtures__/open-meteo-models.json`: captura real.
- [ ] Constructor sintético en `lib/forecast/__fixtures__/`: la captura de hoy no se va a repetir, así que el caso del cruce de medianoche **debe** ser sintético.
- [ ] Archivos de test de la tabla marcados ❌.

No hace falta instalar nada. La suite actual está verde (698 tests).

## Security Domain

Nivel ASVS 1. La fase no agrega rutas, datos de usuario, secretos ni parámetros.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | App sin usuarios |
| V3 Session Management | no | — |
| V4 Access Control | no | `/dev/estados` ya se oculta en producción; los faults nuevos usan el mismo `readFault` |
| V5 Input Validation | sí | Zod sobre toda respuesta externa |
| V6 Cryptography | no | — |
| V7 Errors and Logging | sí | Solo códigos gruesos de `SourceError`, sin texto upstream |
| V14 Data Protection (salida) | sí | Solo agregados en el snapshot y `/api/weather` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Respuesta upstream alterada o con nueva forma | Tampering | Zod; el dato inválido es `schema` y sigue el último bueno |
| Inyección de marcado | Tampering | React escapa; el despacho es de tablas locales; sin `dangerouslySetInnerHTML` |
| Agotar la cuota compartida de Open-Meteo | DoS | TTLs largos y sin parámetros de consulta |
| `WEATHER_FAULT` en producción | Elevation/DoS | Gate existente por `VERCEL_ENV` con test |
| Filtrar detalles internos en errores | Info Disclosure | Códigos gruesos |

## Sources

### Primary (HIGH confidence)
- Requests reales del 2026-11-01 a `ensemble-api.open-meteo.com/v1/ensemble`, `api.open-meteo.com/v1/forecast`, `previous-runs-api.open-meteo.com/v1/forecast`, `historical-forecast-api.open-meteo.com/v1/forecast` y `archive-api.open-meteo.com/v1/archive` para Winifreda; más `ensemble-api.open-meteo.com/data/ecmwf_ifs025_ensemble/static/meta.json`.
- [Ensemble API](https://open-meteo.com/en/docs/ensemble-api): modelos, miembros, horizontes, agregaciones diarias.
- [Forecast API](https://open-meteo.com/en/docs): `precipitation` como suma de la hora anterior.
- [GEM API](https://open-meteo.com/en/docs/gem-api): GEM Global, global, 10 días.
- [Previous Runs API](https://open-meteo.com/en/docs/previous-runs-api): `previous_day1..7`, GEM incluido.
- [Pricing](https://open-meteo.com/en/pricing): 10.000 calls por día, conteo fraccionario.
- Context7 `/tailwindlabs/tailwindcss.com`: `@container`, `@max-[...]`.
- Código del repo: `lib/sources/*`, `lib/forecast/daily.ts`, `lib/weather/*`, `components/*`, `app/pronostico/page.tsx`.

### Secondary (MEDIUM confidence)
- Calibración propia con 12 meses de corridas y ERA5. Un solo punto.
- `.planning/research/PITFALLS.md` y `ARCHITECTURE.md`, contrastados con requests de hoy.

### Tertiary (LOW confidence)
- Ninguna fuente usada solo por búsqueda web.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sin paquetes nuevos; endpoints probados.
- Architecture: HIGH — copia patrones existentes.
- Ventana de lluvia: HIGH — medida en datos reales y coherente con la doc; es deducción propia, no algo que Open-Meteo documente para el ensemble.
- Umbrales: MEDIUM — un año, un punto, sin datos a más de 7 días.
- Pitfalls: HIGH en datos, MEDIUM en Safari.

**Research date:** 2026-11-01
**Valid until:** 2026-12-01 (Open-Meteo agrega modelos con frecuencia; los horizontes se recalculan solos)
