---
phase: 04-pron-stico-con-confianza
plan: 01
subsystem: ui
tags: [navigation, tab-bar, next-link, vitest]

# Dependency graph
requires:
  - phase: 05
    provides: la ruta /cielo activa, que deja a Modelos como la única pestaña deshabilitada
provides:
  - Barra de tres pestañas (Ahora, Pronóstico, Cielo), todas Link
  - SectionId y SECTIONS sin Modelos y sin el campo enabled
affects: [04-10]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - lib/sections.ts
    - lib/sections.test.ts
    - components/TabBar.tsx

key-decisions:
  - "04-01: MODL-02 sigue abierto al cerrar este plan: solo se sacó la pestaña; el semáforo por día llega en planes posteriores"

patterns-established: []

requirements-completed: []

# Metrics
duration: 2 min
completed: 2026-11-02
---

# Phase 4 Plan 01: Barra de tres pestañas Summary

**Modelos desaparece de la barra (entrada, `SectionId`, ícono, `enabled` y rama `aria-disabled`), y Ahora, Pronóstico y Cielo se reparten el ancho con el `flex-1` que ya existía.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-11-02T01:23:18Z
- **Completed:** 2026-11-02T01:25:02Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- `SECTIONS` tiene exactamente `ahora`, `pronostico` y `cielo`, sin campo `enabled`.
- `TabBar` renderiza un único caso, `Link`; se fueron el `span aria-disabled` y el texto "(próximamente)".
- `Record<SectionId, ...>` mantiene los íconos alineados con las secciones: el compilador rechaza un ícono de más o de menos.
- No se agregó ruta ni redirección para `/modelos`, y no existe `app/modelos`.

## Task Commits

1. **Tarea 1: Barra de tres pestañas, sin rastro de Modelos**
   - `c9d8f4d` test(04-01): add failing test for three-tab bar (RED)
   - `ea571bc` feat(04-01): remove the Modelos tab from the bar (GREEN)

No hizo falta REFACTOR.

## Files Modified

- `lib/sections.ts` - tipo y lista de secciones, comentario reescrito
- `lib/sections.test.ts` - aserciones sobre los ids y las claves de cada sección; título D-19
- `components/TabBar.tsx` - sin ícono `modelos`, sin rama deshabilitada

## Verification

- `npx vitest run lib/sections.test.ts`: 6 de 6. En RED fallaron los 2 tests nuevos y pasaron los 4 de `isActiveSection`.
- Suite completa: 699 tests en 42 archivos, todos en verde.
- `npm run typecheck` y `npm run lint`: salen con 0.
- Los criterios por `grep` de `lib/sections.ts` y `components/TabBar.tsx` dan 0 coincidencias; `flex-1` aparece 1 vez.

**Sin comprobar en este plan:** el 404 de `/modelos` y la barra en el navegador. No se corrió `next build` ni se abrió la app; el smoke queda para 04-10, como indica el plan.

## Decisions Made

- **MODL-02 no se marcó completo.** El plan lo lista en `requirements`, pero el requisito pide el semáforo de coincidencia en cada día, y este plan solo saca la pestaña. Los planes 04-05 a 04-10 también lo listan, así que se cierra cuando el semáforo esté hecho.

## Deviations from Plan

### Adjustments

**1. Test de claves agregado al de ids**
- **Found during:** Tarea 1 (RED)
- **Issue:** el plan describe la conducta "ninguna entrada tiene clave `enabled`", y la acción solo pide la aserción sobre los ids.
- **Fix:** se sumó un segundo test que exige que cada sección tenga solo `id`, `label` y `href`.
- **Files modified:** `lib/sections.test.ts`
- **Commit:** `c9d8f4d`

**2. Frontmatter `requirements-completed` vacío**
- **Issue:** la plantilla pide copiar los ids del plan, lo que daría MODL-02 por hecho sin semáforo.
- **Fix:** queda vacío y no se corrió `requirements.mark-complete`. Ver "Decisions Made".

## Issues Encountered

None.

## Next Phase Readiness

La barra está lista. Los archivos de este plan no bloquean a los planes siguientes de la fase.

## Self-Check: PASSED

- Archivos encontrados: `lib/sections.ts`, `lib/sections.test.ts`, `components/TabBar.tsx`
- Commits encontrados: `c9d8f4d`, `ea571bc`
