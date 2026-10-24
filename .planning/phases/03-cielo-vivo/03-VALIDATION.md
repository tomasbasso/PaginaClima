---
phase: 3
slug: cielo-vivo
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^5.0.5 (entorno `node`, `TZ=UTC`) |
| **Config file** | `vitest.config.ts` (existe) |
| **Quick run command** | `npx vitest run lib/sky` |
| **Full suite command** | `npm test && npm run typecheck && npm run lint && npm run build` |
| **Estimated runtime** | ~5 s (quick) / ~90 s (full con build) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/sky`
- **After every plan wave:** Run `npm test && npm run typecheck && npm run lint`
- **Before `/gsd-verify-work`:** Full suite + chequeo de tamaño del chunk + checkpoint en iPhone, todo en verde
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

Mapa requisito → tarea → test, con los IDs reales de las tareas (gate final corrido en 03-07-T1: 28 archivos, 532 tests).

| Task ID | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|-------------|----------|-----------|-------------------|-------------|--------|
| 03-01-T1 | SKY-01 | Paleta continua converge a tokens en −12°/0°/+15°, mañana vs. tarde; astros con suncalc | unit | `npx vitest run lib/sky/palette.test.ts lib/sky/astro.test.ts` | ✅ | ✅ green |
| 03-03-T1 | SKY-01 | `glowX(azimut)`, visibilidad sol/luna, estrellas (viven en `lib/sky/glow.ts`) | unit | `npx vitest run lib/sky/glow.test.ts` | ✅ | ✅ green |
| 03-02-T1 | SKY-02 | Intensidad por WMO, cobertura, deriva, inclinación | unit | `npx vitest run lib/sky/params.test.ts` | ✅ | ✅ green |
| 03-02-T1 | SKY-02 | `skyFromSnapshot` llena campos nuevos y el recálculo los conserva | unit | `npx vitest run lib/sky/state.test.ts` | ✅ | ✅ green |
| 03-06-T1 | SKY-02 | Relámpagos: frecuencia ≤ 2/s, envolvente, ΔL < 0,08 | unit | `npx vitest run lib/sky/lightning.test.ts` | ✅ | ✅ green |
| 03-02-T1 | SKY-03 | Período del rotor del molino | unit | `npx vitest run lib/sky/windmill.test.ts` | ✅ | ✅ green |
| 03-01-T1 | SKY-04 | C-1 barrido de contraste L(S1..S3) ≤ 0,075; C-2 propiedad de mezcla | unit | `npx vitest run lib/sky/palette.test.ts` | ✅ | ✅ green |
| 03-07-T1 | SKY-05 | `data-sky-weather`/`data-sky-band`/`data-sky-root` en el HTML SSR, sin `<canvas` | smoke | `MSYS_NO_PATHCONV=1 node scripts/smoke.mjs http://localhost:3107 --start --expect-html '/::data-sky-weather="(despejado\|cubierto\|lluvia\|tormenta\|niebla)"' --expect-html '/::data-sky-band' --expect-html '/::data-sky-root' --reject-html '/::<canvas' ...` | ✅ | ✅ green |
| 03-03-T1 | SKY-06 | Limitador de fps (60/120/30 Hz con jitter), `dt` ≤ 100 ms; gobernador | unit | `npx vitest run lib/sky/loop.test.ts` | ✅ | ✅ green |
| 03-07-T1 | SKY-06 | Chunk del cielo ≤ 20 KB gzip (medido: `2p2tbjwuhc_3f.js`, 10965 B) | build check | `f=$(grep -rl "uBandTop" .next/static/chunks \| head -1) && test "$(gzip -c "$f" \| wc -c)" -le 20480` | ✅ | ✅ green |
| 03-07-T1 | SKY-06 | Sin three/pixi/ogl/r3f | grep | `grep -rE "from ['\"](three\|pixi\|ogl\|@react-three)" app components lib` → vacío | — | ✅ green |
| 03-05-T1 | D-14 | Parseo/clamp de la query de `/dev/sky` | unit | `npx vitest run lib/sky/devParams.test.ts` | ✅ | ✅ green |
| 03-07-T3 | D-14 | 404 de `/dev/sky` y `/dev/estados` en producción | smoke | `node scripts/smoke.mjs <PROD_URL> --expect-404 /dev/sky --expect-404 /dev/estados` | ✅ | ⬜ pending (03-07-T3) |
| 03-07-T2 | SKY-04 | Contraste compuesto medido por píxel en `/dev/sky` (≤ 0,076; ≤ 0,101 con relámpago) | manual (navegador integrado) | ver Manual-Only | — | ⬜ pending (03-07-T2) |
| 03-07-T2 | SKY-05 | Reducir movimiento y fallback sin WebGL | manual (navegador integrado) | ver Manual-Only | — | ⬜ pending (03-07-T2) |
| 03-08 | SKY-06 | Fluidez ≤ 30 fps, pausa en segundo plano, temperatura | manual (iPhone) | ver Manual-Only | — | ⬜ pending (03-08) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/sky/palette.test.ts` — anclas, barrido C-1, propiedad C-2
- [x] `lib/sky/params.test.ts` — intensidad, cobertura, deriva, inclinación
- [x] `lib/sky/glow.test.ts` — resplandores del sol, halo de la luna, estrellas
- [x] `lib/sky/lightning.test.ts` — frecuencia, envolvente, amplitud
- [x] `lib/sky/loop.test.ts` — limitador y gobernador
- [x] `lib/sky/windmill.test.ts` — período
- [x] `lib/sky/devParams.test.ts` — query de `/dev/sky`
- [x] Extender `lib/sky/state.test.ts` — campos opcionales y conservación en el recálculo

Framework ya instalado.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contraste real con capas compuestas (clamp del shader, relámpago en el pico) — 03-07-T2 | SKY-04 | La composición final ocurre en la GPU | `/dev/sky` con relámpago forzado y congelado, cuentagotas sobre la zona de contenido |
| Reducir movimiento: frame estático, sin relámpagos; fallback sin WebGL — 03-07-T2 (molino con la preferencia real: 03-08) | SKY-05 | Depende de la preferencia del SO | `/dev/sky` cuadro "ESTÁTICO" + DevTools "emulate prefers-reduced-motion" |
| Fluidez ≤ 30 fps, pausa en segundo plano, sin calentamiento — 03-08 | SKY-06 | Requiere iPhone real (sin Safari Web Inspector en Windows) | Deploy preview en el iPhone, varios minutos en despejado/lluvia/tormenta, segundo plano y vuelta, Modo Ahorro on/off, lectura de fps en `/dev/sky` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** automatizado aprobado en 03-07-T1 (2026-10-24); manuales en 03-07-T2 y 03-08
