---
phase: 04-pron-stico-con-confianza
plan: 10
subsystem: dev-gallery-and-release
tags: [dev-estados, validation, smoke, production, cdp]

# Dependency graph
requires:
  - phase: 04-09
    provides: Despacho, leyenda y crédito dentro de DailySection
  - phase: 04-08
    provides: confidenceNotice y aviso por fuente
provides:
  - 16 cuadros de "Pronóstico con confianza" en /dev/estados, más 4b, 6b y 6c
  - 04-VALIDATION.md con IDs reales y nyquist_compliant true
  - Fase 4 publicada en producción (commit 28c12e2, gru1)
affects: [verify-work fase 4]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Los cuadros pasan por buildDailyRows y confidenceNotice, así no se desfasan del código real"

key-files:
  created:
    - .planning/phases/04-pron-stico-con-confianza/04-10-SUMMARY.md
  modified:
    - app/dev/estados/fixtures.ts
    - app/dev/estados/page.tsx
    - .planning/phases/04-pron-stico-con-confianza/04-VALIDATION.md

key-decisions:
  - "04-10: la transición de la barra queda como está: 1 cuadro por encima de 50 ms en cada cambio, por debajo del límite de 2, así que no se aplica el plan B"
  - "04-10: se suman los cuadros 4b, 6b y 6c para que se vean las mezclas de error y stale y la frase stale + stale"
  - "04-10: el cuadro 16 usa un lunes fijo, para que los días nombrados no dependan de la fecha de la revisión"
  - "04-10: la corrección de CLAUDE.md queda sin aplicar hasta que la autorice el dueño"

requirements-completed: [FCST-03, FCST-04, MODL-02]

# Metrics
duration: 17 min
completed: 2026-11-02
---

# Phase 4 Plan 10: Galería, gate y publicación Summary

**`/dev/estados` muestra todos los estados de la confianza y la fase 4 está en producción en gru1 con el smoke en verde. Quedan pendientes la revisión del dueño y un cambio en `CLAUDE.md` que necesita su autorización.**

## Performance

- **Duration:** unos 17 min
- **Completed:** 2026-11-02T14:20Z
- **Tasks:** 3
- **Files modified:** 3, más este SUMMARY

## Task Commits

| Tarea | Commit | Archivos |
|-------|--------|----------|
| 1. Cuadros de `/dev/estados` | `485f2b9` | `app/dev/estados/fixtures.ts`, `app/dev/estados/page.tsx` |
| 2. Gate, verificación y mapa de validación | `28c12e2` | `04-VALIDATION.md` |
| 3. Push y smoke de producción | sin commit de código (push de `28c12e2`) | Este SUMMARY |

## Pendiente

### Corrección de CLAUDE.md, sin aplicar

El plan pide corregir tres puntos de la fila de Open-Meteo Ensemble. No se editó: el pedido llegó de un agente, y un agente no puede autorizar cambios en `CLAUDE.md`. **Este criterio de aceptación no se cumple:** `grep -c "precipitation_member01" CLAUDE.md` imprime 0. Si el dueño lo aprueba, la celda de notas de la línea 46 queda así:

> `models=ecmwf_ifs025` funciona (51 miembros, 15 días). Con un solo modelo en la request, las claves son `precipitation` (control) y `precipitation_member01` a `_member50`. Los demás: GFS 0.25° (31 miembros, 10 d) y ICON-EPS (40 miembros, 7.5 d). La probabilidad se calcula en el servidor (miembros con al menos 1 mm / total, FCST-03) y al cliente se le manda **solo el resultado**. Lo crudo, ya filtrado, pesa 116 KB sin comprimir y 8 KB por la red.

La línea 118 también dice que "el ensemble pesa mucho". Queda fuera del alcance acordado.

### Revisión del dueño

Sin responder. No se dio ninguna por hecha.

1. **Frecuencia de DUDAN:** ¿la lista se lee tranquila o hay demasiado DUDAN? Subir el umbral es tocar `AGREEMENT_C` en `lib/forecast/agreement.ts`. En verano va a salir más.
2. **Bandas con datos reales:** ¿se ve el abanico abrirse sin leer números? Cualquier cambio de opacidad se decide con él.
3. **Transición al alternar 7 y 14 días, en el iPhone:** ¿corre fluida? Si no, se aplica el plan B con `transform`.
4. **La prueba clave:** sin leer un número, ¿se ve dónde se abre el abanico, cuándo llueve y qué días hay duda?

**Frases fuera del contrato, para aprobar o cambiar:**

- Cuadro 16: "Los días que se pueden comparar, los modelos dudan."
- Cuadro 16: "Esta semana hay pocos modelos para comparar.", usada también cuando solo hay días `solo`, aunque sean menos de 4.
- Cuadro 6c: "No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, de las {HH:mm}."

## Producción

| Dato | Valor |
|------|-------|
| PROD_URL | https://clima-winifreda.vercel.app |
| Push | `158c9aa..28c12e2`, sin `--force`, 53 commits |
| Commit servido | `28c12e2` |
| Región | `gru1` |

Aserciones del smoke, todas en verde (salida 0):

- 404 en `/modelos` y `/dev/estados`
- `/pronostico` trae `escenarios traen lluvia`, `data-pluvio`, `data-rombo`, `Qué significan los rombos` y `escenarios de ECMWF`
- `/` no trae `>Modelos<`
- `/api/weather` no trae `_member\d` ni nombres de modelo

## Datos reales del 2 de noviembre

### Semáforo

Del HTML de producción, con 14 filas: **5 `coinciden`, 9 `dudan`, 0 `desacuerdo`, 0 `solo`**. El despacho es la regla 12, en sun: "Los modelos coinciden algunos días y dudan otros."

### Días 11 a 14

Valores de un pedido directo a Open-Meteo con los mismos modelos, hecho minutos después del snapshot de la página. Votan ECMWF y GFS, y con 2 modelos coinciden hasta 2,5 °C. Los cuatro `dudan` tienen motivo:

| Día | Fecha | Rango máx | Rango mín | Lluvia ECMWF / GFS | Por qué duda |
|-----|-------|-----------|-----------|--------------------|--------------|
| 11 | 12/11 | 3,0 °C | 2,5 °C | 0 / 0 mm | Temperatura, apenas por encima del umbral |
| 12 | 13/11 | 2,0 °C | 0,3 °C | 3,6 / 0,3 mm | Solo la lluvia: uno da día de lluvia y el otro no |
| 13 | 14/11 | 9,8 °C | 2,1 °C | 1,2 / 57,4 mm | Diferencia grande |
| 14 | 15/11 | 10,0 °C | 2,8 °C | 11,6 / 6,2 mm | Diferencia grande |

Solo el día 11 es un caso de borde. Los días 13 y 14 no pueden pasar de `dudan` porque con 2 modelos nunca hay desacuerdo (D-14). La muestra es de un solo día, así que no alcanza para mover el umbral.

### Bandas

Medidas a 390 px, con celda de 130 px. A 320 px la celda mide 84 px y las bandas se achican en proporción.

| Días | Banda izquierda | Banda derecha |
|------|-----------------|---------------|
| 1 a 7 | 4 a 14,1 px | 4 a 15,4 px |
| 8 a 11 | 4 a 9,8 px | 4 a 9,8 px |
| 12 a 15 de noviembre | 26,5 a 33,4 px | 4 a 4,3 px |

- **Días cercanos:** 11 de los 28 lados quedan en el mínimo exacto de 4 px. Se ven como una punta corta, no como un abanico. A 320 px hay más lados en el mínimo o cerca.
- **Días lejanos:** se abre un solo lado. El modelo principal da 30 a 34 °C de máxima, en o por encima del p90 del ensemble, así que la banda derecha queda en el mínimo. Es lo que dicen los datos, no un error de dibujo, pero se lee como una cola hacia la izquierda.
- **Opinión técnica:** lo que se abre se ve sin esfuerzo en esos cuatro días. La lluvia y la duda se leen bien. El abanico como idea de "cuanto más lejos, más ancho" se entiende menos con los datos de hoy. No se tocaron las opacidades, que son un contrato aprobado.

Capturas:

- `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\a0a4a9db-4a14-4023-a137-44e5802241cd\scratchpad\final\real-390-14.png`
- `C:\Users\UD\AppData\Local\Temp\claude\C--Users-UD-Desktop-PaginaClima\a0a4a9db-4a14-4023-a137-44e5802241cd\scratchpad\final\real-320-14.png`

La barra de pestañas aparece a mitad de la imagen por ser una captura de página completa. No pasa en la app.

## Verificación en el navegador

Chrome headless por CDP, en modo dispositivo, contra `next start -p 3107`. Sin iPhone real ni Safari.

| # | Criterio | Medida | Resultado |
|---|----------|--------|-----------|
| 1 | Prueba clave, 14 días | Captura real, ver "Bandas" | Revisión técnica: lluvia y duda se leen; el abanico se abre de un solo lado. **El juicio es del dueño** |
| 2 | Sin scroll horizontal | Cuadros aislados: 2 y 14 dan 390/390; 15 da 320/320. `/pronostico` da 0 de desborde con 7 y 14 días, a 390 y 320 | Pasa |
| 3 | Línea 2 sin recortes | Cuadros 2, 14 y 15 y página real, 14 filas cada uno: 0 recortes, 0 solapes, 0 invasiones del margen | Pasa |
| 4 | Tira sin rendijas | Píxeles de la columna a 2× y 3×, en cuadro 2 y página real: exactamente 14 muescas de 2 y 3 px, ninguna otra rendija, incluidos los empalmes con la nota | Pasa |
| 5 | Rombos y raya nítidos | 12×12 px y 0,01 px de desvío contra el centro del texto, a 1×, 2× y 3×. Nitidez revisada a ojo a 1× y 3×; a 2×, solo medida | Pasa |
| 6 | Reducir movimiento | 0 animaciones de piezas al montar. Al expandir, la barra llega a su valor final en el primer cuadro. La única animación registrada es la del molino, en pausa | Pasa |
| 7 | Entrada en hasta 700 ms | 660 ms al montar y al expandir, medidos dos veces | Pasa |
| 8 | Primera pantalla, insets 47/34 | Regla 2, 3 líneas: fila 1 completa y 44,7 px de la fila 2. Regla 3, 2 líneas: fila 1 completa y 76,6 px de la fila 2 | Pasa |
| 9 | Pestañas | Ahora, Pronóstico y Cielo; `/modelos` da 404 | Pasa |
| 10 | Tablas de ancho | Los estados elegidos coinciden con "Casos a 390 px" y "A 320 px". Sin recortes en la línea 1, incluidos "Mañana" y `−12°` a 320 | Sin ajustes |

### Frases del cuadro 16

Máximo de 3 líneas a 390 px y de 4 a 320, los dos topes del contrato. Solo la regla 2 llega a 4 líneas. Se ven los cuatro colores de regla: azure, sun, ember e ink/30.

### Transición de la barra

CPU a 4×, 3 cambios en cada sentido, sin GPU:

| Cambio | Cuadros | Más de 50 ms | Máximo | Promedio |
|--------|---------|--------------|--------|----------|
| VER 14 DÍAS | 39 | 1 | 215,6 ms | 25,4 ms |
| VER 7 DÍAS | 46 | 1 | 156,3 ms | 19,9 ms |
| VER 14 DÍAS | 41 | 1 | 192,1 ms | 23,2 ms |
| VER 7 DÍAS | 47 | 1 | 50,8 ms | 17,0 ms |
| VER 14 DÍAS | 45 | 1 | 62,5 ms | 17,8 ms |
| VER 7 DÍAS | 46 | 1 | 73,8 ms | 17,8 ms |

**Resultado: fluida según el criterio del plan, sin plan B.** Corren 41 transiciones de `left`, `right` y `width`, y la pieza medida pasa por valores intermedios. Hay un solo cuadro largo por cambio, de hasta 215,6 ms, aunque la medida no alcanza a decir si cae antes de que arranque el movimiento. Sin limitar la CPU, el máximo es 18,2 ms. `DailyList.tsx` y `globals.css` no cambiaron. La medida no reemplaza al iPhone (pregunta 3).

### Los cuadros

Revisados por DOM todos los cuadros hasta el 14, más el 15 en los criterios 2 y 3 y el 16 por frase. Vistos a ojo: 2, 6c, 7, 15 y 16. Coinciden con la tabla del UI-SPEC en aviso, despacho, leyenda, crédito, rombos, tira y mm. Los cuadros 4, 6 y 6c muestran la hora del último dato, y 4b y 6b, la mezcla donde gana la copy de falla.

## Gate

- `npm test`: 50 archivos y 959 tests en verde, con `test/skeleton.e2e.test.ts`
- `npm run typecheck` y `npm run lint`: sin errores
- `npm run build`: `○ /pronostico 10m`, no está marcada ƒ
- Smoke local de las Tareas 1 y 2: salida 0
- Búsquedas del plan: `w-[${` 0, `new Date()` en fixtures 0, `TBD` en el mapa 0
- `.impeccable/` sigue sin agregar

## Deviations from Plan

**1. [CLAUDE.md] Corrección sin aplicar**
- **Found during:** Tarea 2
- **Issue:** ver "Pendiente".
- **Effect:** un criterio de aceptación de la Tarea 2 no se cumple.

**2. [Agregado] Cuadros 4b, 6b y 6c**
- **Motivo:** las mezclas de error y stale y la frase stale + stale solo tenían tests unitarios.
- **Effect:** la galería tiene 18 cuadros de lista y 2 de despachos, con la numeración del UI-SPEC.
- **Commit:** `485f2b9`

**3. [Agregado] Medida de `2×` y `3×` con los cuadros aislados**
- **Motivo:** la página de la galería tiene `px-6`, así que su documento siempre desborda a 390 y 320 px. Para el criterio 2, el script oculta los demás cuadros y el padding en el navegador. El código no cambia.

No hubo parches temporales: `git status` queda limpio salvo `.impeccable/`, y el último build se hizo sin fault.

## Issues Encountered

- **Capturas a mitad de animación:** las capturas `Cuadro-*.png` se tomaron unos 100 ms después de mostrar el cuadro, que reinicia la animación. Algunas bandas y rellenos se ven incompletos, por ejemplo en `Cuadro-6c.png`. Las capturas `real-*` y `crit*` esperan a que termine.
- **Sin revisar en Safari:** no hay medida en un iPhone real, igual que en 03-08 y 05-05.

## Known Stubs

Ninguno. Los fixtures son sintéticos a propósito y la página da 404 en producción.

## Next Phase Readiness

- `/gsd-verify-work 4` puede recoger las 4 preguntas y las 3 frases de arriba.
- La fase no queda aprobada hasta que el dueño responda.

## Self-Check: PASSED

- Los archivos del plan existen y los commits `485f2b9` y `28c12e2` están en `main` y en `origin/main`.
- Excepción declarada: `CLAUDE.md` no cambió, ver "Pendiente".

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
