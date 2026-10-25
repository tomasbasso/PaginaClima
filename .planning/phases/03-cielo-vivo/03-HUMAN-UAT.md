---
status: partial
phase: 03-cielo-vivo
source: [03-08-PLAN.md]
started: 2026-10-24T00:00:00-03:00
updated: 2026-10-24T00:00:00-03:00
---

## Current Test

[awaiting human testing]

## Dispositivo

- iPhone: [pending]
- iOS: [pending]
- Preview: deploy `BwPzY1Y51TJ4fTzJe5yaj7LNxynd` (rama `preview/cielo-vivo`, commit aa99c5e = árbol de 2409946). URL: [pending, desde el dashboard de Vercel]
- Producción: https://clima-winifreda.vercel.app

## Tests

### 2. Fluidez por estado (`/dev/sky`, ESCALA 0,5×, 2–3 min cada uno)
expected: ~30 FPS, CALIDAD 1 y ms bajos en Siesta, Lluvia de día y Tormenta de noche.
result: [pending]

### 3. Escala 0,5× contra 0,75× (Lluvia de día y Noche estrellada)
expected: Anotar FPS en cada escala y si a 0,5× la lluvia o las estrellas se ven empastadas o parpadean.
result: [pending]

### 4. Modo Ahorro de batería (Tormenta de noche)
expected: Sigue en ~30 FPS (no 20) y CALIDAD 1.
result: [pending]

### 5. Segundo plano 1–2 min (home de producción, idealmente desde la pantalla de inicio)
expected: Al volver, el cielo sigue sin saltos. Un gradiente plano en vez del canvas es aceptable; una pantalla negra no.
result: [pending]

### 6. Temperatura (home abierta 5–10 min con el clima real)
expected: No se calienta más que con una web normal y no aparece el aviso de temperatura.
result: [pending]

### 7. Reducir movimiento (Ajustes → Accesibilidad → Movimiento)
expected: En la home, el cielo y el molino quedan quietos, sin relámpagos ni fundidos.
result: [pending]

### 8. Legibilidad del texto de Ahora (Siesta y Tormenta de noche)
expected: Se lee bien sobre el cielo.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
