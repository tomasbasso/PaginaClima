---
phase: 05-lluvia-sat-lite-y-astros
plan: 05
subsystem: dev-gallery-and-release
tags: [dev-estados, validation, smoke, production, gibs, moon, rain]
requires:
  - phase: 05-01
    provides: lib/sky/moon.ts, lib/sky/sun.ts
  - phase: 05-02
    provides: lib/rain/view.ts (buildRainView)
  - phase: 05-03
    provides: /cielo con Sol y luna y Lluvia acumulada
  - phase: 05-04
    provides: Satélite GOES-East, /api/satelite/[stamp], smoke --expect-satellite
provides:
  - Cuadros de Luna (8 fases), Sol (diciembre, junio, "igual que ayer"), Lluvia (todos los estados) y Satélite (normal, vieja, sin imagen, cargando) en /dev/estados
  - 05-VALIDATION.md con IDs reales, nyquist_compliant true y wave_0_complete true
  - Fase 5 publicada en producción (commit 69d9d28, gru1) y verificada con smoke
affects: [verify-work fase 5]
tech-stack:
  added: []
  patterns:
    - "Fixtures de /dev/estados relativos a nowMs usando los mismos builders puros que producción"
key-files:
  created:
    - .planning/phases/05-lluvia-sat-lite-y-astros/05-05-VISUAL-REVIEW.md
    - .planning/phases/05-lluvia-sat-lite-y-astros/05-05-SUMMARY.md
  modified:
    - app/dev/estados/fixtures.ts
    - app/dev/estados/page.tsx
    - .planning/phases/05-lluvia-sat-lite-y-astros/05-VALIDATION.md
decisions:
  - "Revisión visual hecha en el navegador integrado a 390x844 sobre build de producción local; sin medición en iPhone real (decisión del dueño)"
metrics:
  duration: ~45 min (tres sesiones)
  completed: 2026-10-25
  tasks: 3
  files: 4
---

# Phase 5 Plan 05: Galería de estados, gate y publicación Summary

Galería /dev/estados con la luna del hemisferio sur, el sol, la lluvia acumulada y el satélite; gate completo en verde (680 tests, /cielo ISR 10m) y fase 5 desplegada en producción en gru1 con smoke de producción en verde, incluida la ruta del satélite sirviendo image/jpeg inmutable.

## Tareas

| # | Tarea | Commit | Archivos |
|---|-------|--------|----------|
| 1 | Cuadros de Luna, Sol, Lluvia y Satélite en /dev/estados | c2806ec | app/dev/estados/fixtures.ts, app/dev/estados/page.tsx |
| 2 | Gate completo, revisión visual y mapa de validación | 2152466, 69d9d28 (revisión visual del orquestador) | 05-VALIDATION.md, 05-05-VISUAL-REVIEW.md |
| 3 | Push a main y smoke de producción | sin commit de código (push de 69d9d28) | 05-05-SUMMARY.md |

## Gate de la Tarea 2

- `npm test`: 41 archivos, **680 tests** en verde (repetido antes del push: 680/680)
- `npm run typecheck`: limpio (repetido antes del push)
- `npm run lint`: limpio
- `npm run build`: `○ /cielo 10m` (sigue siendo ISR) y `ƒ /api/satelite/[stamp]` (dinámica, Node)
- Smoke local contra `next start`: exit 0

## Revisión visual (orquestador, navegador integrado)

Fecha: 2026-10-25. Build de producción local (`next start -p 3107`) con viewport de 390×844 y el panel del navegador a la vista. No se usó un iPhone real; el dueño no quiso medir en el dispositivo.

| Chequeo | Resultado |
|---------|-----------|
| `/cielo` h1 | "Mirando para arriba" |
| Orden de bloques (h2) | Sol y luna → Lluvia acumulada → Satélite |
| `document.documentElement.scrollWidth` | 390 (igual a `innerWidth`, sin scroll horizontal) |
| Caja del satélite | 342×342 (cuadrada); la imagen cargó con `naturalWidth` 720 |
| Marcador del satélite | En el centro, con el rótulo "WINIFREDA" legible y la hora del pase ("Imagen infrarroja de las 14:30") |
| Aclaración de reanálisis | Visible en `/cielo` y en los cuadros de `/dev/estados#lluvia` |
| Link al SMN | `href="https://www.smn.gob.ar/radar"`, `target="_blank"`, `rel` con `noopener` |
| Pestañas | Ahora, Pronóstico, Modelos (próximamente, deshabilitada, sin tocar) y Cielo (activa, `aria-current`) |
| Luna en `/dev/estados#luna` | La creciente y el cuarto creciente se ven iluminados a la IZQUIERDA; el cuarto menguante y la menguante, a la derecha; la nueva sin luz y la llena como disco completo |
| Barras de lluvia en `/dev/estados#lluvia` | El cuadro "Menos de lo normal" tiene la marca NORMAL al 80 % y el observado en azure; se leen "50 % menos de lo normal" y "Lo normal a esta fecha" |

## Push y smoke de producción (Tarea 3)

- Push: `git push origin main` → `fd2124c..69d9d28  main -> main` (sin --force). `git merge-base --is-ancestor HEAD origin/main` OK.
- PROD_URL: https://clima-winifreda.vercel.app (de 01-02-SUMMARY.md)
- Commit desplegado: **69d9d28** (el smoke esperó dos ciclos mientras producción seguía en fd2124c)
- Región: **gru1**
- Comando: `MSYS_NO_PATHCONV=1 node scripts/smoke.mjs "$PROD_URL" --expect-region gru1 --expect-commit 69d9d28 --expect-404 /dev/estados --expect-satellite --expect-html '/cielo::Mirando para arriba' --expect-html '/cielo::Sol y luna' --expect-html '/cielo::Lluvia acumulada' --expect-html '/cielo::Estimado por reanálisis, no pluviómetro' --expect-html '/cielo::href="https://www.smn.gob.ar/radar"' --expect-html '/::href="/cielo"'` → **exit 0**

| Aserción | Resultado |
|----------|-----------|
| GET / → 200 con "Winifreda" | ok |
| commit = 69d9d28 | ok |
| sources[0].fetchedAt estable entre requests (2026-10-25T17:57:38.759Z) | ok |
| now.tempC | 16.6 |
| region = gru1 | ok |
| GET /dev/estados → 404 | ok |
| /cielo contiene "Mirando para arriba" | ok |
| /cielo contiene "Sol y luna" | ok |
| /cielo contiene "Lluvia acumulada" | ok |
| /cielo contiene "Estimado por reanálisis, no pluviómetro" | ok |
| /cielo contiene `href="https://www.smn.gob.ar/radar"` | ok |
| / contiene `href="/cielo"` | ok |
| GET /api/satelite/20261025T1720Z.jpg → 200 image/jpeg, immutable, nosniff, 40241 B | ok |
| GET /api/satelite/19990101T0000Z.jpg (stamp viejo) → 404 | ok |
| `curl /cielo` | 200 (`X-Vercel-Cache: HIT`) |

Headers de la ruta del satélite (stamp 20261025T1720Z): `Content-Type: image/jpeg`, `Cache-Control: public, max-age=86400, immutable`, `X-Content-Type-Options: nosniff`, `X-Vercel-Cache: MISS` (primer pedido), `X-Vercel-Id: gru1::gru1::…`.

GIBS respondió al primer intento: no hizo falta el reintento de 10 minutos.

## Deviations from Plan

None - plan executed exactly as written.

## Threat model

- T-05-17: /dev/estados → 404 en producción (verificado por el smoke).
- T-05-18: push simple sin --force; el smoke confirmó que el commit desplegado es origin/main.
- T-05-19: stamp viejo → 404 y Cache-Control inmutable (verificado).

## Self-Check: PASSED

- FOUND: app/dev/estados/fixtures.ts, app/dev/estados/page.tsx, 05-VALIDATION.md, 05-05-VISUAL-REVIEW.md
- FOUND commits: c2806ec, 2152466, 69d9d28 (en origin/main)
