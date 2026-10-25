---
phase: 05-lluvia-sat-lite-y-astros
plan: 04
subsystem: satellite
tags: [gibs, goes-east, satellite, route-handler, cache, smoke]
requires:
  - phase: 05-03
    provides: /cielo con Sol y luna y Lluvia acumulada
provides:
  - lib/satellite/frame.ts (stamps, parseStamp, markerPosition, URLs GIBS, satelliteView)
  - lib/sources/gibs.ts (getSatelliteFrame por stamp, getSatelliteLatest/Fresh con fallback de paso negro)
  - app/api/satelite/[stamp] (JPEG inmutable, nosniff, 404 sin fetch para stamps inválidos)
  - Bloque Satélite al final de /cielo + flag --expect-satellite del smoke
affects: [05-05]
tech-stack:
  added: []
  patterns:
    - "Ruta binaria Node con Cache-Control inmutable por stamp; la página solo guarda {stamp, timeISO}"
    - "Validación de content-type y tamaño que lanza dentro de unstable_cache para no cachear respuestas malas"
key-files:
  created:
    - lib/satellite/frame.ts
    - lib/satellite/frame.test.ts
    - lib/satellite/latest.ts
    - lib/sources/gibs.ts
    - lib/sources/gibs.test.ts
    - lib/sources/__fixtures__/gibs-domains.xml
    - lib/sources/__fixtures__/gibs-blank.jpg
    - lib/sources/__fixtures__/gibs-frame.jpg
    - app/api/satelite/[stamp]/route.ts
    - app/api/satelite/[stamp]/route.test.ts
    - components/cielo/Satelite.tsx
    - components/client/SateliteImg.tsx
  modified:
    - lib/config.ts
    - lib/weather/types.ts
    - scripts/smoke.mjs
    - app/cielo/page.tsx
    - CLAUDE.md
key-decisions:
  - "Satélite: 'hace N min' por debajo de 120 min y 'hace N h' (piso) desde 120; vieja = estrictamente > 90 min"
  - "Satélite: un pase de otro día ART que el render dice 'ayer a las HH:mm' (la ventana de 24 h no permite más atrás)"
  - "GIBS acepta TIME y BBOX percent-encoded por URLSearchParams (A1 verificada con request real: JPEG de 39 733 B)"
requirements-completed: []
duration: ~10 min
completed: 2026-10-25
---

# Phase 05 Plan 04: Satélite IR GOES-East en /cielo Summary

**Imagen IR GOES-East de 800 km centrada en Winifreda, elegida en el servidor con fallback T/T−10/T−20 ante el JPEG negro de GIBS, servida por `/api/satelite/{stamp}.jpg` inmutable, con marcador, hora ART y link al radar del SMN.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-10-25
- **Tasks:** 3/3
- **Files:** 17

## Accomplishments

- `lib/satellite/frame.ts` puro y probado: stamps ↔ ISO, `parseStamp` como allowlist estricta (regex, grilla de 10 min, fecha real, ventana de 24 h, ISO reconstruido desde los números), `markerPosition` por Web Mercator (Winifreda en 0,5/0,5), URLs WMS y DescribeDomains (bucket de 10 min), `latestSlotFromDomains` y `satelliteView` con la copy del UI-SPEC.
- `lib/sources/gibs.ts`: content-type `image/jpeg` antes de leer, ≤ 8 000 B → `blank`, > 1 MB → `schema`, todo dentro de `unstable_cache`. El último pase prueba T, T−10 y T−20 y deja el JPEG ganador en la Data Cache que después usa la ruta.
- `/api/satelite/[stamp]`: runtime Node. Un stamp inválido da 404 no-store sin tocar GIBS. Uno válido da `image/jpeg` con `public, max-age=86400, s-maxage=31536000, immutable` y `nosniff`. Si falla, 502 no-store sin cuerpo.
- El bloque Satélite es el último de `/cielo`: rótulo de hora (peach si está vieja), caja 1:1 con "Cargando imagen" detrás, `<img loading=lazy decoding=async>` en una isla que solo existe para `onError`, rombo y rótulo WINIFREDA, pie con escala de color y atribución, y el link al SMN siempre visible.
- Fixtures reales de GIBS (2026-10-25): `gibs-domains.xml` de 380 B, `gibs-frame.jpg` de 39 733 B y `gibs-blank.jpg` de 3 321 B.
- CLAUDE.md nombra la capa `GOES-East_ABI_Band13_Clean_Infrared` con la descripción verificada, y la confianza pasa a HIGH.

## Task Commits

1. **Tarea 1: geometría, stamps y textos del satélite y CLAUDE.md**: `5173291` (test, RED) → `395706b` (feat, GREEN)
2. **Tarea 2: adapter GIBS, ruta binaria y flag del smoke**: `ad82f74` (test, RED) → `c5fd511` (feat, GREEN)
3. **Tarea 3: bloque Satélite en /cielo**: `e5f5f5f` (feat)

## Verification

- `npm test`: 41 archivos, 680 tests en verde. `typecheck` y `lint` en 0.
- `npm run build`: `/cielo` queda ○ (ISR 10m). `/api/satelite/[stamp]` es ƒ.
- Smoke local con `--expect-satellite` y los 7 `--expect-html`: todo ok. `/api/satelite/20261025T1710Z.jpg` dio 200 image/jpeg immutable nosniff de 40 304 B, y `19990101T0000Z` dio 404.
- `grep gibs.earthdata` en los componentes da 0, y `lib/satellite/latest.ts` no tiene `throw`.

## Deviations from Plan

None - plan executed exactly as written.

Notas menores dentro del alcance:
- El test del adapter no hace `vi.mock('server-only')` porque `vitest.config.ts` ya lo aliasa.
- El rótulo del marcador va a 12 px del centro del rombo (`left-3`/`right-3`): son 8 px desde el borde del rombo de unos 8 px, como pide el UI-SPEC.

## Known Stubs

Ninguno. `showImage={false}` en `Satelite` existe solo para el cuadro "cargando" de `/dev/estados`, que se cablea en 05-05.

## Threat Flags

Ninguna superficie nueva fuera del threat model. `/api/satelite/[stamp]` está cubierta por T-05-11 a T-05-16.

## Next Phase Readiness

- 05-05 puede usar `gibs-frame.jpg` y `Satelite` (`showImage`, `view` null y vieja) para `/dev/estados`, y el smoke de producción con `--expect-satellite`.
- No se verificó a ojo el render en el navegador (marcador y rótulo). Conviene revisarlo en el cierre de fase.

## Self-Check: PASSED
