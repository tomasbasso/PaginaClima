---
phase: 03-cielo-vivo
plan: 08
subsystem: sky
tags: [uat, iphone, checkpoint]
requires: [03-07]
provides: [decisión de BUFFER_SCALE y umbrales GOV_*]
affects: [components/client/sky/renderer.ts, lib/sky/loop.ts]
key-files:
  created: [.planning/phases/03-cielo-vivo/03-HUMAN-UAT.md]
  modified: []
decisions:
  - "BUFFER_SCALE se queda en 0.5 (default del UI-SPEC) porque no hubo medición en el iPhone"
  - "Umbrales del gobernador sin cambios: CPU 28 ms, intervalo 45 ms, sostenido 2 s, calentamiento 2 s"
metrics:
  duration: 10 min
  completed: 2026-10-24
---

# Phase 3 Plan 08: Checkpoint en el iPhone real (omitido por el dueño)

**Resumen:** La medición en el iPhone no se hizo. El dueño no pudo entrar al deploy preview: el dominio `*.vercel.app` no se pudo leer en la sesión y el dashboard pide login. Tampoco pudo entrar al plan B, el build de producción servido en la LAN en `http://192.168.100.18:3000`, que respondía desde la PC pero no desde el iPhone. Decidió seguir sin medir: "No me deja ingresar pero no importa eso del iphone". Por eso se aplicaron las opciones sin cambios, que no requieren medición.

## Tareas

| Task | Resultado |
|------|-----------|
| 1. Medición en el iPhone | Omitida por el dueño. Las 7 pruebas quedaron `skipped` en 03-HUMAN-UAT.md |
| 2. Decisión de escala y umbrales | escala-05 + umbrales-ok, con la respuesta textual registrada en `## Decisiones` |
| 3. Aplicar y desplegar | Sin cambios de código: `BUFFER_SCALE = 0.5` y `GOV_*` ya tenían esos valores. No hizo falta otro deploy; producción ya corre 2409946 y el smoke de 03-07 pasó |

## Deviations from Plan

- **Checkpoint humano omitido por decisión del dueño.** Los pasos 2–8 del Task 1 no tienen lecturas reales. El criterio 4 del roadmap ("fluido en un iPhone real, se pausa, no calienta") queda sin verificar en el dispositivo. Lo cubren los tests (limitador de 30 fps, pausas, gobernador) y la revisión de escritorio de 03-07, pero no hay medición en el iPhone. Quedó anotado en `## Gaps` de 03-HUMAN-UAT.md.

## Known Stubs

Ninguno.

## Self-Check: PASSED

- 03-HUMAN-UAT.md existe, con `BUFFER_SCALE` y las decisiones registradas.
- `components/client/sky/renderer.ts` tiene `export const BUFFER_SCALE = 0.5` y `lib/sky/loop.ts` tiene `GOV_CPU_LIMIT_MS = 28` y `GOV_INTERVAL_LIMIT_MS = 45`, igual que en UAT.
