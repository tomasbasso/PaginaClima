# 05-05 — Revisión visual (orquestador, navegador integrado)

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
