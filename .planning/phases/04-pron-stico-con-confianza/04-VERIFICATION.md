---
phase: 04-pron-stico-con-confianza
verified: 2026-11-02T14:58:16Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "Si una fuente de confianza falla, el Pronóstico lo avisa y conserva el último dato bueno (D-17): una respuesta vacía o toda null ya no pisa el último dato ni da ok"
  gaps_remaining: []
  regressions: []
release_pending:
  summary: "Los arreglos no están publicados: main local va 8 commits adelante de origin/main (c69f7e1, confirmado con git ls-remote). CR-01 sigue activo en producción hasta el push."
  local_head: "3cd326a"
  remote_head: "c69f7e1"
  after_push: "Correr scripts/smoke.mjs contra producción con --expect-commit <HEAD>"
human_verification:
  - test: "Frecuencia de DUDAN: abrir /pronostico con 14 días y leer la lista"
    expected: "Se lee tranquila; hoy hay 5 coinciden / 9 dudan (de 14), si es mucho se sube AGREEMENT_C"
    why_human: "Juicio de diseño del dueño; no respondido"
  - test: "Bandas con datos reales"
    expected: "Se ve el abanico abrirse sin leer números"
    why_human: "Percepción visual; no respondido"
  - test: "Transición al alternar 7 y 14 días en el iPhone"
    expected: "Corre fluida; si no, plan B con transform"
    why_human: "Rendimiento en dispositivo; la medida en Chrome headless no reemplaza al iPhone; no respondido"
  - test: "Prueba clave: sin leer un número, ver dónde se abre el abanico, cuándo llueve y qué días hay duda"
    expected: "Las tres cosas se entienden de un vistazo"
    why_human: "Revisión visual del dueño (04-10 Task 3); no respondida"
  - test: "Aprobar o cambiar las frases fuera del contrato: las de los cuadros 16 y 6c (04-10-SUMMARY) y las 5 frases nuevas de aviso de 04-REVIEW-FIX.md (WR-01 y WR-02), más el uso de la copy de error para un dato viejo que no cubre ningún día visible"
    expected: "Copy aprobado por el dueño y 04-UI-SPEC.md actualizado; verlas también en /dev/estados, porque el diseño de esos avisos no se revisó en un navegador"
    why_human: "Decisión de copy; ninguna frase está aprobada"
  - test: "Autorizar la corrección de CLAUDE.md (fila Open-Meteo Ensemble)"
    expected: "grep -c precipitation_member01 CLAUDE.md > 0 tras aplicar; hoy da 0"
    why_human: "Un agente no puede autorizar cambios en CLAUDE.md; criterio de 04-10 Task 2 sin cumplir"
  - test: "Decidir si una respuesta parcial del ensemble o del multimodelo cuenta como falla (ver Hallazgos)"
    expected: "O se acepta como está, o se pide un mínimo de días y bloque daily no vacío en el adapter"
    why_human: "Decisión de alcance: 04-REVIEW-FIX.md rechazó solo el agregado vacío y dejó el punto abierto; una respuesta con daily todo null hoy da ok y borra las bandas sin aviso"
  - test: "Decidir si una falla de MET Norway debe quitar 'sigue al día' del aviso de /pronostico"
    expected: "O queda así, o se filtra ese id en restOfForecast"
    why_human: "Decisión de copy: esa fuente no alimenta /pronostico, pero WR-02 se aplicó literal a todas"
---

# Phase 4: Pronóstico con confianza - Verification Report

**Phase Goal:** El usuario sabe cuánta confianza tenerle al pronóstico sin salir del Pronóstico: una probabilidad de lluvia real, el rango de incertidumbre en los días lejanos y un semáforo que dice si los modelos coinciden.
**Verified:** 2026-11-02T14:58:16Z
**Status:** human_needed
**Re-verification:** Yes, after gap closure (CR-01)

**Importante:** esta verificación vale para el código de `main` local (`3cd326a`). **Los arreglos no están en producción**: `origin/main` sigue en `c69f7e1`, 8 commits atrás. Ningún ítem de `human_verification` está aprobado.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / FCST-03: cada día muestra la probabilidad calculada desde miembros del ensemble (>= 1 mm en el día local) | VERIFIED | `aggregateEnsemble` suma por miembro y día local (`localDayRain`) y compara con `RAIN_DAY_MM = 1` antes de contar; `buildDailyRows` arma `probText`/`probPct`. Producción: `data-pluvio` x14 |
| 2 | SC2 / FCST-04: los días lejanos muestran el rango p10-p90 de temperatura y lluvia | VERIFIED (lectura visual pendiente) | Cuantiles en `ensemble.ts`; `daily.ts` usa `rainRangeText` desde el día 4 y `bandFor` para las bandas. Si el abanico se lee bien lo juzga el dueño |
| 3 | SC3 / MODL-02: semáforo por día con modelos independientes, sin mostrarlos por separado | VERIFIED | `VOTING_MODELS` = ECMWF, GFS, ICON, GEM; `verdictFor` y el snapshot exponen solo `verdict` y `voters`. Producción: `data-rombo` x20, `/api/weather` sin `votes`, miembros ni nombres de modelo, 5 coinciden / 9 dudan |
| 4 | SC4 / D-19: la barra de pestañas no tiene Modelos | VERIFIED | `lib/sections.ts` tiene Ahora, Pronóstico y Cielo; 0 menciones de "modelos" en `components/TabBar.tsx`; no existe `app/modelos`; `/modelos` da 404 en producción |
| 5 | D-17: si falla una fuente de confianza, hay aviso y se conserva el último dato bueno; una respuesta vacía o toda null no pisa el último dato ni da `ok` | VERIFIED en el código (gap anterior cerrado; sin publicar; respuestas parciales: ver Hallazgos) | Ambos adapters lanzan `SourceError(id, 'schema')` si `data.length === 0` (`openMeteoEnsemble.ts:43`, `openMeteoModels.ts:43`), antes de que `unstable_cache` pueda guardar. Prueba propia abajo |

**Score:** 5/5. La verificación anterior contaba 4 porque SC4 iba dentro de la verdad 3; aquí va aparte porque es un criterio del roadmap.

### Re-verificación de D-17 / CR-01

Prueba hecha para esta verificación, fuera del repo: adapter real con `fetch` simulado, pasado por `readThrough` y `deriveSourceStatus`, usando los fixtures reales. "Con último dato" usa un dato viejo, más allá del TTL.

| Fuente | Respuesta | Adapter | Con último dato | ¿Lo conserva? | Sin último dato |
|--------|-----------|---------|-----------------|---------------|-----------------|
| ensemble | todo null | lanza `schema` | stale | sí | error |
| ensemble | arrays vacíos | lanza `schema` | stale | sí | error |
| ensemble | hourly todo null | lanza `schema` | stale | sí | error |
| ensemble | hourly vacío | lanza `schema` | stale | sí | error |
| ensemble | `{}` | lanza `schema` | stale | sí | error |
| models | todo null | lanza `schema` | stale | sí | error |
| models | arrays vacíos | lanza `schema` | stale | sí | error |
| models | hourly o daily todo null | lanza `schema` | stale | sí | error |
| models | hourly o daily vacío | lanza `schema` | stale | sí | error |
| models | `{}` | lanza `schema` | stale | sí | error |
| ensemble | **daily todo null o vacío** | 14 días, las 14 temperaturas null | **ok** | **no** | ok |
| ensemble | **cortada a 1 día** | 1 día | **ok** | **no** | ok |
| models | **cortada a 1 día** | 1 día | **ok** | **no** | ok |
| ambas | fixture completo (control) | 14 días | ok | no (dato nuevo, correcto) | ok |

Las filas en negrita no son vacías ni todas null, así que quedan fuera de CR-01. Ver Hallazgos.

Camino al aviso, leído en el código: `infoFrom` en `snapshot.ts` copia `stale` y `errorCode`; `buildConfidence` sigue usando `value.value.data`, que es el último dato bueno; `app/pronostico/page.tsx` llama a `confidenceNotice(snapshot.sources, now, rows[0])` y `DailySection` lo muestra con `Notice`. La lectura en producción de un stale real no se probó porque el arreglo no está publicado.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/sources/openMeteoEnsemble.ts` | Falla si el agregado queda vacío | VERIFIED | Línea 43; usado en `snapshot.ts` por `readThrough` |
| `lib/sources/openMeteoModels.ts` | Falla si el agregado queda vacío | VERIFIED | Línea 43; usado en `snapshot.ts` por `readThrough` |
| `lib/forecast/confidenceNotice.ts` | Un aviso, con fecha cuando el dato es de otro día, y "sigue al día" solo si es cierto | VERIFIED | Firma con `visible`; llamada desde la página; test recorre las 81 combinaciones |
| `lib/forecast/agreement.ts` | `verdictFor` no lanza con más de 4 votantes | VERIFIED | Sin umbrales devuelve `sinDato` |
| `test/skeleton.e2e.test.ts`, `lib/weather/snapshot.test.ts` | Guarda D-18 con la regex correcta | VERIFIED | `_member\d` en ambos, y cada test comprueba que la regex detecta `temperature_2m_max_member01` |
| `app/dev/estados/fixtures.ts`, `page.tsx` | Cuadros de confianza con `buildDailyRows` | VERIFIED | 15 numerados más 3b, 4b, 4c, 4d, 5b, 6b, 6c y 6d en la lista; `/dev/estados` da 404 en producción. El diseño de los cuadros nuevos no se vio en un navegador |
| `04-VALIDATION.md` | Mapa completo | VERIFIED | `nyquist_compliant: true` |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| Adapters | `readThrough` | `getCached` y `getFresh` en `getWeatherSnapshot` | WIRED |
| `readThrough` | `sources[]` | `refreshError` -> `deriveSourceStatus` -> `infoFrom` | WIRED |
| `snapshot.sources` | Aviso en pantalla | `confidenceNotice` -> `DailySection` -> `Notice` | WIRED |
| `snapshot.confidence` | Filas | `buildDailyRows` -> `DailySection` -> `DailyList` | WIRED |
| Fuente en error | Resto del snapshot | `Promise.allSettled`; `verdictFor` ya no puede lanzar | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Produces Real Data | Status |
|----------|------|--------|--------------------|--------|
| `DailySection` / `DailyList` | filas de probabilidad, banda y veredicto | Open-Meteo ensemble y multimodelo, vía snapshot | Sí: `/api/weather` en producción trae 14 días, 4 fuentes `ok` | FLOWING |
| `Notice` | texto del aviso | `snapshot.sources` y la fila 0 | Sí, función pura con tests; sin stale real en producción para observarlo | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suite completa | `npx vitest run` | 50 archivos, 974 tests, todos pasan | PASS |
| Tipos | `npx tsc --noEmit` | sin errores | PASS |
| Lint | `npm run lint` | sin errores | PASS |
| Respuestas vacías o null | Prueba propia (tabla de arriba) | las 10 clases vacías o null dan stale/error | PASS |
| Producción `/pronostico` | `curl` | 200 en gru1, `data-pluvio` x14, `data-rombo` x20, ECMWF presente, sin link a `/modelos` | PASS (código anterior a los arreglos) |
| Producción 404 | `curl` a `/modelos` y `/dev/estados` | 404 y 404 | PASS (código anterior a los arreglos) |
| Producción `/api/weather` | `curl` | 4 fuentes `ok`, 14 días, sin miembros ni modelos | PASS (código anterior a los arreglos) |
| Publicado | `git ls-remote origin refs/heads/main` | `c69f7e1`; HEAD local `3cd326a`, 8 commits adelante | PENDIENTE |

`npm run build` no se corrió: habría pisado `.next` y pegado a las APIs. Lo afirma 04-REVIEW-FIX.md, pero no está comprobado aquí ni por un deploy de Vercel.

### Probe Execution

No hay probes declarados para esta fase. Ni los PLAN ni los SUMMARY nombran `scripts/*/tests/probe-*.sh`.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| FCST-03 | 04-02, 04-03, 04-10 | SATISFIED | Verdad 1 |
| FCST-04 | 04-04, 04-10 | SATISFIED (revisión visual pendiente) | Verdad 2 |
| MODL-02 | 04-05, 04-06, 04-10 | SATISFIED | Verdades 3 y 4 |

Sin requisitos huérfanos: REQUIREMENTS.md mapea solo estos tres IDs a la fase 4.

### Hallazgos

| Severidad | Dónde | Hallazgo | Efecto |
|-----------|-------|----------|--------|
| WARNING | Publicación | Los commits `1e1d99b`, `df61739`, `ca447a0`, `ddeff15` y `af4e4c8` no están en `origin/main` | Producción todavía puede guardar un agregado vacío, con estado `ok` y sin aviso (CR-01) |
| WARNING | `lib/sources/openMeteoEnsemble.ts:43` | El chequeo mira solo el largo: hourly bueno con daily todo null o vacío da 14 días sin temperaturas | Estado `ok`, se pisa el último dato, las bandas desaparecen y no hay aviso. D-17 pide aviso por cada falla |
| WARNING | Ambos adapters, línea 43 | Una respuesta cortada a 1 día pasa como éxito | Se pisa un dato completo. Los demás días quedan sin confianza y sin aviso, porque `healthOf` da `ok` |
| INFO | `lib/forecast/confidenceNotice.ts:37` | Una falla de MET Norway quita "sigue al día", aunque no alimenta `/pronostico` | La frase es más cauta de lo necesario |
| INFO | Cachés con clave `v1` | La clave no se subió con el arreglo | Una entrada vacía ya guardada dura hasta su TTL. Después `readThrough` la devuelve como stale, y `healthOf` la trata como error porque no cubre ningún día visible, así que el aviso es correcto |
| INFO | `04-UI-SPEC.md` | La tabla de copy está atrasada frente al código | Queda atada a la aprobación del dueño |
| INFO | 04-REVIEW.md | IN-01 a IN-04 quedaron sin tocar, como estaba indicado | Sin efecto en el objetivo |

No hay marcadores `TBD`, `FIXME`, `XXX`, `TODO`, `HACK` ni `PLACEHOLDER` en los archivos tocados por los arreglos.

Las respuestas parciales quedan como WARNING y no como BLOCKER porque CR-01 y el pedido de esta verificación cubren lo vacío y lo todo null, y 04-REVIEW-FIX.md deja el mínimo de días como punto abierto. No hay evidencia de que Open-Meteo las mande así. La decisión es del dueño.

### Human Verification Required

Ninguno de estos está aprobado.

#### 1. Frecuencia de DUDAN

**Test:** abrir `/pronostico` con 14 días y leer la lista.
**Expected:** se lee tranquila. Hoy hay 5 coinciden y 9 dudan; si es mucho, se sube `AGREEMENT_C`.
**Why human:** juicio de diseño.

#### 2. Bandas con datos reales

**Test:** mirar el abanico en días lejanos.
**Expected:** se ve abrirse sin leer números. Según 04-10-SUMMARY, hoy se abre de un solo lado en los días 12 a 15 de noviembre.
**Why human:** percepción visual.

#### 3. Transición 7 y 14 días en el iPhone

**Test:** alternar en el dispositivo.
**Expected:** corre fluida; si no, plan B con `transform`.
**Why human:** rendimiento en un dispositivo real.

#### 4. Prueba clave

**Test:** sin leer un número, ver dónde se abre el abanico, cuándo llueve y qué días hay duda.
**Expected:** las tres cosas se entienden de un vistazo.
**Why human:** revisión visual del dueño.

#### 5. Frases fuera del contrato

**Test:** aprobar o cambiar:

- Cuadro 16: "Los días que se pueden comparar, los modelos dudan."
- Cuadro 16: "Esta semana hay pocos modelos para comparar."
- Cuadro 6c: "No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, de las {HH:mm}."
- "Ahora no tenemos la probabilidad de lluvia ni el rango de temperatura. Te mostramos el resto del pronóstico."
- "Ahora no podemos comparar los modelos, así que esta vez no hay rombos. Te mostramos el resto del pronóstico."
- "No pudimos actualizar la probabilidad de lluvia. Te mostramos la última que tenemos, del {dd/MM} a las {HH:mm}."
- "No pudimos actualizar la comparación entre modelos. Te mostramos la última que tenemos, del {dd/MM} a las {HH:mm}."
- "No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, del {dd/MM} a las {HH:mm}."
- Uso nuevo de la copy de error existente: un dato viejo que no cubre ningún día visible.

**Expected:** copy aprobado y `04-UI-SPEC.md` al día. Conviene verlas en `/dev/estados`, porque esos avisos no se revisaron en un navegador.
**Why human:** decisión de copy.

#### 6. Corrección de CLAUDE.md

**Test:** autorizar el cambio de la fila Open-Meteo Ensemble.
**Expected:** `grep -c precipitation_member01 CLAUDE.md` da más de 0 tras aplicarlo; hoy da 0.
**Why human:** un agente no puede autorizar cambios en `CLAUDE.md`.

#### 7. Respuestas parciales

**Test:** decidir si una respuesta con daily todo null, o cortada a pocos días, cuenta como falla.
**Expected:** se acepta como está, o se agrega un mínimo de días y un chequeo del bloque daily en el adapter.
**Why human:** decisión de alcance que 04-REVIEW-FIX.md dejó abierta.

#### 8. MET Norway en "sigue al día"

**Test:** decidir si esa falla debe quitar la frase.
**Expected:** queda así, o se filtra ese id en `restOfForecast`.
**Why human:** decisión de copy.

### Gaps Summary

El gap anterior está cerrado en el código: una respuesta vacía o toda null del ensemble o del multimodelo ya no reemplaza el último dato bueno, da `stale` si hay uno y `error` si no hay. No hubo regresiones en los otros criterios: 974 tests pasan, y tipos y lint están limpios.

No quedan gaps bloqueantes. La fase no está cerrada por tres motivos: los arreglos falta publicarlos y comprobarlos con el smoke, la revisión del dueño sigue sin responder, y queda por decidir qué hacer con las respuestas parciales.

---

_Verified: 2026-11-02T14:58:16Z_
_Verifier: Claude (gsd-verifier)_
