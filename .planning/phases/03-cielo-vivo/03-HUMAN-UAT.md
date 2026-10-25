---
status: complete
phase: 03-cielo-vivo
source: [03-08-PLAN.md]
started: 2026-10-24T00:00:00-03:00
updated: 2026-10-24T00:00:00-03:00
---

## Current Test

[omitida por el dueño: no pudo entrar al preview ni al servidor en la LAN desde el iPhone, y decidió no hacer la medición]

## Dispositivo

- iPhone: no medido
- iOS: no medido
- Preview: deploy `BwPzY1Y51TJ4fTzJe5yaj7LNxynd` (rama `preview/cielo-vivo`, commit aa99c5e = árbol de 2409946). URL: no se pudo abrir desde el iPhone (tampoco el plan B en la LAN, 192.168.100.18:3000)
- Producción: https://clima-winifreda.vercel.app

## Tests

### 2. Fluidez por estado (`/dev/sky`, ESCALA 0,5×, 2–3 min cada uno)
expected: ~30 FPS, CALIDAD 1 y ms bajos en Siesta, Lluvia de día y Tormenta de noche.
result: skipped (el dueño decidió no medir en el iPhone)

### 3. Escala 0,5× contra 0,75× (Lluvia de día y Noche estrellada)
expected: Anotar FPS en cada escala y si a 0,5× la lluvia o las estrellas se ven empastadas o parpadean.
result: skipped (el dueño decidió no medir en el iPhone)

### 4. Modo Ahorro de batería (Tormenta de noche)
expected: Sigue en ~30 FPS (no 20) y CALIDAD 1.
result: skipped (el dueño decidió no medir en el iPhone)

### 5. Segundo plano 1–2 min (home de producción, idealmente desde la pantalla de inicio)
expected: Al volver, el cielo sigue sin saltos. Un gradiente plano en vez del canvas es aceptable; una pantalla negra no.
result: skipped (el dueño decidió no medir en el iPhone)

### 6. Temperatura (home abierta 5–10 min con el clima real)
expected: No se calienta más que con una web normal y no aparece el aviso de temperatura.
result: skipped (el dueño decidió no medir en el iPhone)

### 7. Reducir movimiento (Ajustes → Accesibilidad → Movimiento)
expected: En la home, el cielo y el molino quedan quietos, sin relámpagos ni fundidos.
result: skipped (el dueño decidió no medir en el iPhone)

### 8. Legibilidad del texto de Ahora (Siesta y Tormenta de noche)
expected: Se lee bien sobre el cielo.
result: skipped (el dueño decidió no medir en el iPhone)

## Summary

total: 7
passed: 0
issues: 0
pending: 0
skipped: 7
blocked: 0

## Decisiones

Respuesta del dueño (2026-10-24): "No me deja ingresar pero no importa eso del iphone"

- `BUFFER_SCALE: 0.5`. Queda el default del UI-SPEC (opción escala-05) porque no hay medición que justifique subir a 0,75×.
- Umbrales del gobernador sin cambios (opción umbrales-ok): `GOV_CPU_LIMIT_MS = 28`, `GOV_INTERVAL_LIMIT_MS = 45`, `GOV_SUSTAIN_MS = 2000`, `GOV_WARMUP_MS = 2000`.

## Gaps

- Sin medición en un iPhone real: no hay datos de fluidez, del Modo Ahorro, del segundo plano, de la temperatura ni de reducir movimiento con la preferencia del sistema. La red de seguridad es el gobernador, que baja la calidad solo, más el tope de 30 fps y las pausas, todo cubierto por tests. Si en el uso diario aparecen tirones o calor, se mide con `/dev/sky` y se ajustan `BUFFER_SCALE` y los umbrales GOV_*.
