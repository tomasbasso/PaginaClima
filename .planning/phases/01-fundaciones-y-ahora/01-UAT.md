---
phase: 01-fundaciones-y-ahora
status: diagnosed
tested: 2026-10-23
method: Claude built-in browser (Chromium, viewport emulated at 390×844, dark) against production https://clima-winifreda.vercel.app and a local `next start` for /dev/estados. Not a real iPhone.
---

# Phase 1 — UAT

## Results

| # | Check | Result |
|---|-------|--------|
| 1 | Ahora at 390×844 renders per UI-SPEC: temperature 112px Playfair (16°), state "◆ CUBIERTO", sensación, data row 63 % / 1016 hPa / 14 km/h S, gust line, freshness row, credit link to open-meteo.com; fonts Playfair Display + Plus Jakarta Sans; no `rounded-*`/`shadow-*`; no horizontal scroll (scrollWidth 390); hidden h1 present | pass |
| 2 | Tab bar: 56px, bg #090e17, exactly one `aria-current="page"` (Ahora, accent #8ecae6); Pronóstico/Modelos/Cielo `aria-disabled` with "(próximamente)" | pass |
| 3 | `data-sky="cubierto"` on `<html>` and `<main>` at 19:44 local with weather code 3 | pass |
| 4 | Freshness label ticks without reload: HACE 1 MIN → 2 MIN → 3 MIN; header clock 19:45 → 19:46 ART | pass |
| 5 | /dev/estados (local): 11 frames of 390×844 — Normal, Cargando ("CARGANDO", values "—"), Desactualizado (notice), Fuente caída (notice), Sin datos (title + REINTENTAR), 6 sky tokens; negative temps use "−"; text never reaches the horizon band (min gap 64px) | pass |
| 6 | First viewport at 390×844 fits without scrolling | **issue** |
| 7 | Night frame shows "NOCHE DESPEJADA" | **issue (dev-only)** |
| 8 | Auto-refresh with backoff on the installed iOS PWA; `:has()` accent; real-device look | not testable here (needs a real iPhone) |

## Issues

### UAT-01 — Horizon band partly hidden behind the tab bar at 390×844 (minor)
- Measured on production: content block 487px (top padding 24) + spacer min 64 + band 240 + bottom padding 56 = 871px > 844px viewport. The page scrolls 27px and, on first paint, the bottom 27px of the silhouette (ground strip and fence line) sits under the fixed tab bar.
- On a real iPhone in standalone mode the safe areas (~59px top, ~34px bottom) make it worse. With the "Desactualizado"/"Fuente caída" notice the hero grows another ~64px.
- Likely cause: the extra rows added after the UI-SPEC layout was drawn (separate "DATOS: OPEN-METEO.COM" credit line, deviation for CC BY).
- The UI-SPEC allows the hero to grow on short screens, so text never overlaps the band (verified), but 844 is the target device and the composition was meant to land the band at the end of the first viewport.
- Fix options: put the credit on the same line as "ESTIMADO POR MODELO"; shrink the band on short viewports (e.g. `min(240px, …svh)`); or reduce the spacer minimum.

### UAT-02 — Night sky frame in /dev/estados shows "DESPEJADO" (dev-only, cosmetic)
- The "Cielo noche" frame renders state "DESPEJADO" instead of "NOCHE DESPEJADA". The label decides night from the real current solar phase, not the frame's fixture, so the gallery cannot show the night label during the day. Production behaviour at real night is not affected.
- Fix: let the fixture pass the solar phase (or `now`) used for the label.

### Minor note
- On /dev/estados the tab bar shows "Ahora" active although the path is /dev/estados (dev page only).

## Pending human checks (real iPhone)
- Open in Safari and as an installed PWA: look at 390px, safe areas, legibility over the sky.
- Leave the PWA in background > 15 min and return: data refreshes (backoff 1/2/4/8/15 min).
