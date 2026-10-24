---
phase: 3
slug: cielo-vivo
status: draft
nyquist_compliant: false
wave_0_complete: false
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

Lo completa el planner/executor con los IDs reales de tarea. Mapa requisito → test (de 03-RESEARCH.md):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| SKY-01 | Paleta continua converge a tokens en −12°/0°/+15°, mañana vs. tarde | unit | `npx vitest run lib/sky/palette.test.ts` | ❌ W0 | ⬜ pending |
| SKY-01 | `glowX(azimut)`, visibilidad sol/luna | unit | `npx vitest run lib/sky/glow.test.ts` | ❌ W0 | ⬜ pending |
| SKY-02 | Intensidad por WMO, cobertura, deriva, inclinación | unit | `npx vitest run lib/sky/params.test.ts` | ❌ W0 | ⬜ pending |
| SKY-02 | `skyFromSnapshot` llena campos nuevos y el recálculo los conserva | unit | `npx vitest run lib/sky/state.test.ts` | ✅ extender | ⬜ pending |
| SKY-02 | Relámpagos: frecuencia ≤ 2/s, envolvente, ΔL < 0,08 | unit | `npx vitest run lib/sky/lightning.test.ts` | ❌ W0 | ⬜ pending |
| SKY-03 | Período del rotor del molino | unit | `npx vitest run lib/sky/windmill.test.ts` | ❌ W0 | ⬜ pending |
| SKY-04 | C-1 barrido de contraste L(S1..S3) ≤ 0,075; C-2 propiedad de mezcla | unit | `npx vitest run lib/sky/palette.test.ts` | ❌ W0 | ⬜ pending |
| SKY-05 | `data-sky-weather`/`data-sky-night` en el HTML SSR | smoke | `npm run build && npx next start` + `curl -s localhost:3000 \| grep data-sky-weather` | ❌ W0 | ⬜ pending |
| SKY-06 | Limitador de fps (60/120/30 Hz con jitter), `dt` ≤ 100 ms; gobernador | unit | `npx vitest run lib/sky/loop.test.ts` | ❌ W0 | ⬜ pending |
| SKY-06 | Chunk del cielo ≤ 20 KB gzip | build check | buscar marcador del renderer en `.next/static/chunks` + `gzip -c \| wc -c` | ❌ W0 | ⬜ pending |
| SKY-06 | Sin three/pixi/ogl/r3f | grep | `grep -rE "from ['\"](three\|pixi\|ogl\|@react-three)" app components lib` → vacío | — | ⬜ pending |
| D-14 | Parseo/clamp de la query de `/dev/sky`; 404 en producción | unit + smoke | `npx vitest run lib/sky/devParams.test.ts`; `node scripts/smoke.mjs <url> --expect-404 /dev/sky` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/sky/palette.test.ts` — anclas, barrido C-1, propiedad C-2
- [ ] `lib/sky/params.test.ts` — intensidad, cobertura, deriva, inclinación
- [ ] `lib/sky/glow.test.ts` — resplandores del sol, halo de la luna, estrellas
- [ ] `lib/sky/lightning.test.ts` — frecuencia, envolvente, amplitud
- [ ] `lib/sky/loop.test.ts` — limitador y gobernador
- [ ] `lib/sky/windmill.test.ts` — período
- [ ] `lib/sky/devParams.test.ts` — query de `/dev/sky`
- [ ] Extender `lib/sky/state.test.ts` — campos opcionales y conservación en el recálculo

Framework ya instalado.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contraste real con capas compuestas (clamp del shader, relámpago en el pico) | SKY-04 | La composición final ocurre en la GPU | `/dev/sky` con relámpago forzado y congelado, cuentagotas sobre la zona de contenido |
| Reducir movimiento: frame estático, molino quieto, sin relámpagos | SKY-05 | Depende de la preferencia del SO | `/dev/sky` cuadro "ESTÁTICO" + DevTools "emulate prefers-reduced-motion" |
| Fluidez ≤ 30 fps, pausa en segundo plano, sin calentamiento | SKY-06 | Requiere iPhone real (sin Safari Web Inspector en Windows) | Deploy preview en el iPhone, varios minutos en despejado/lluvia/tormenta, segundo plano y vuelta, Modo Ahorro on/off, lectura de fps en `/dev/sky` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
