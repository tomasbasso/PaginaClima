---
phase: 04-pron-stico-con-confianza
plan: 08
subsystem: ui
tags: [faults, avisos, degradacion, vitest, accesibilidad]

# Dependency graph
requires:
  - phase: 04-06
    provides: Rombo y modelsUp, con la fila que ya degrada por fuente
provides:
  - confidenceNotice, que elige la copy del aviso según las fuentes
  - Faults ensemble-down y models-down, que borran el dato además de marcar el estado
  - Prop notice en DailySection, con un solo Notice role="status" arriba de la lista
affects: [04-09, 04-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Los faults de fuentes de confianza borran el dato: para estas fuentes 'error' significa que no hay nada para mostrar"

key-files:
  created:
    - lib/forecast/confidenceNotice.ts
    - lib/forecast/confidenceNotice.test.ts
  modified:
    - lib/weather/faults.ts
    - lib/weather/snapshot.test.ts
    - .env.example
    - components/DailySection.tsx
    - app/pronostico/page.tsx

key-decisions:
  - "04-08: en una mezcla de error y stale gana la copy de falla, porque la fuente stale conserva su fila completa y la otra no muestra nada"
  - "04-08: stale y stale usa una frase nueva, fuera del contrato, con la hora más vieja: queda para revisión del dueño"
  - "04-08: una fuente stale sin fetchedAt usable se trata como error: no hay hora para citar"

patterns-established:
  - "El aviso de fuente se elige en una función pura y se pasa por prop, así la página sin tests no tiene lógica de copy"

requirements-completed: [FCST-03, MODL-02]

# Metrics
duration: 8 min
completed: 2026-11-02
---

# Phase 4 Plan 08: Aviso por fuente caída en /pronostico Summary

**Cuando falla el ensemble, el multimodelo o los dos, `/pronostico` muestra un solo aviso discreto arriba de la lista y conserva el resto del pronóstico; dos faults nuevos permiten forzar esas fallas fuera de producción.**

## Performance

- **Duration:** 8 min de trabajo, repartidos en dos sesiones (unos 2 min la interrumpida, unos 6 la de cierre)
- **Started:** 2026-11-02T02:06:02Z
- **Completed:** 2026-11-02T13:50:44Z, con unas 11 h 35 min de pausa por la interrupción
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `confidenceNotice` devuelve una copy para cada combinación de fuentes, o `null` si no hay nada que avisar. Solo llegan a pantalla frases locales y una hora formateada: `errorCode` nunca.
- `ensemble-down` y `models-down` borran el dato además de cambiar el estado, y `readFault` los ignora con `VERCEL_ENV=production`. `empty` ahora también limpia `confidence`.
- `DailySection` dibuja el aviso a 32 px de la silueta y a 24 px de la lista. La rama sin filas de la página no cambió.

## Comprobación en el navegador

Primera vez que estos estados de `DailyList` se ven en pantalla. Fue en Chrome headless contra el build de producción, con datos reales y los 14 días abiertos, a 390 y 320 px. Sirve como revisión técnica: el juicio visual del dueño sigue pendiente para 04-10.

| Estado | Avisos | Rombos | Tira | Abanico | Última columna | Alto del aviso (390 / 320) |
|--------|--------|--------|------|---------|----------------|----------------------------|
| `ensemble-down` | 1 | 14 | 0 | 0 | `{n} mm` | 72 / 72 px |
| `models-down` | 1 | 0 | 14 | sí | `%` | 72 / 96 px |
| Las dos caídas (parche temporal) | 1 | 0 | 0 | 0 | `{n} mm` | 72 / 96 px |

En los seis casos: 0 de scroll horizontal, 0 de desborde en la fila y en la línea 2, filas de 76 y 77 px, 32 px sobre el aviso, 24 px debajo y 24 px de margen derecho. El texto para lector de pantalla también degrada: sin modelos no los menciona, y con las dos fuentes caídas termina en `sin lluvia significativa.`

Las filas coinciden con la tabla "Fallas por fuente" del UI-SPEC en barra, última columna, línea 2 y tira. Despacho, leyenda y crédito de esa tabla todavía no existen, así que no se pudieron comprobar.

## Task Commits

1. **Tarea 1: Faults nuevos y copy del aviso**
   - `e0680d0` (test, RED)
   - `b720670` (feat, GREEN)
2. **Tarea 2: Aviso en /pronostico, verificado con faults reales**
   - `ad5ed75` (feat)

## Files Created/Modified

- `lib/forecast/confidenceNotice.ts` - Elección pura de la copy
- `lib/forecast/confidenceNotice.test.ts` - Cada combinación de fuentes y los casos fuera del contrato
- `lib/weather/faults.ts` - `ensemble-down`, `models-down` y `confidence: []` en `empty`
- `lib/weather/snapshot.test.ts` - Borrado del dato e ignorados en producción
- `.env.example` - Nombra los faults nuevos
- `components/DailySection.tsx` - Prop `notice`
- `app/pronostico/page.tsx` - Pasa `confidenceNotice(snapshot.sources)` en la rama con filas

## Decisions Made

- En una mezcla de `error` y `stale` gana la copy de falla: la fuente `stale` sigue mostrando su fila completa y la otra no muestra nada.
- Una fuente `stale` sin `fetchedAt` usable se trata como `error`, porque no hay hora para citar.

## Para revisión del dueño

Esta frase no está en el contrato de copy aprobado. El plan la pide para `stale` en las dos fuentes y se armó con piezas de las copys aprobadas, citando la hora más vieja:

> No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, de las {HH:mm}.

## Interrupción

La sesión del primer ejecutor terminó con la Tarea 1 commiteada y la Tarea 2 sin commitear. Al retomar se revisó el `git diff`: las ediciones de `DailySection.tsx` y `page.tsx` cumplían el plan y se conservaron tal cual, sin descartar ni rehacer nada. Toda la verificación de la Tarea 2 se corrió de nuevo en esta sesión. No quedó registro de lo que la primera sesión llegó a comprobar, así que no se tuvo en cuenta.

## Deviations from Plan

### Verificación agregada

**1. Revisión en el navegador y estado "las dos caídas"**
- **Found during:** Tarea 2
- **Issue:** el plan solo pide smokes de HTML, y ningún fault produce las dos fuentes caídas a la vez.
- **Fix:** se sumó la revisión en Chrome. Para ver las dos caídas se parcheó `models-down` en `lib/weather/faults.ts` de forma temporal y se revirtió enseguida. `git diff` de ese archivo quedó vacío y el parche no entró en ningún commit.
- **Commit:** ninguno, no cambió código

Por lo demás, el plan se ejecutó como estaba escrito.

## Issues Encountered

- **Último dato bueno sin ver en pantalla:** las copys con hora, incluida la frase nueva, solo tienen tests unitarios. El plan deja esa revisión para los cuadros 4 y 6 de `/dev/estados` (04-10).
- **Estado "las dos caídas" sin fault propio:** se vio una sola vez con el parche temporal. No hay smoke que lo repita, y el cuadro 7 de `/dev/estados` (04-10) es lo que lo va a cubrir.
- **Mezclas con `stale` y `error`:** solo tienen tests unitarios.
- **Barra de pestañas en las capturas:** aparece a mitad de página por la captura de página completa. Es un efecto de la captura, no de la app.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test`: 49 archivos y 900 tests en verde
- `npm run typecheck`, `npm run lint` y `npm run build`: sin errores
- Smoke con `WEATHER_FAULT=ensemble-down`: aviso y rombos presentes, sin `data-pluvio` ni `abanico-l`
- Smoke con `WEATHER_FAULT=models-down`: aviso y `data-pluvio` presentes, sin `data-rombo`
- Smoke sin fault: rombos y pluviómetro presentes, sin ninguno de los dos avisos
- Búsquedas del plan: `confidenceNotice(` 1, `pb-12 pt-8` 1, faults nuevos en `.env.example` 1
- El último build se hizo sin fault, así que `.next` no quedó con una falla aplicada

## Next Phase Readiness

- 04-09 y 04-10 pueden pasar `notice` a `DailySection`. El aviso va antes de la lista, y lo que se sume debajo tiene que mantener los 24 px (`aviso → despacho` en el UI-SPEC).
- `/dev/estados` debe cubrir los estados que acá no se vieron: los dos de último dato bueno y las dos fuentes caídas.

## Self-Check: PASSED

- Los 7 archivos del plan existen y los commits `e0680d0`, `b720670` y `ad5ed75` están en `main`.

---
*Phase: 04-pron-stico-con-confianza*
*Completed: 2026-11-02*
