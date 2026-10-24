---
phase: 02-pron-stico-n-cleo
reviewed: 2026-10-23T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - lib/time.ts
  - lib/forecast/hours.ts
  - lib/forecast/headline.ts
  - lib/forecast/daily.ts
  - lib/forecast/meteogram.ts
  - lib/weather/wind.ts
  - lib/sections.ts
  - components/Ahora.tsx
  - components/Header.tsx
  - components/Hero.tsx
  - components/Pronostico.tsx
  - components/MeteogramSection.tsx
  - components/client/Meteogram.tsx
  - components/client/DailyList.tsx
  - components/client/SkyBackdrop.tsx
  - app/page.tsx
  - app/pronostico/page.tsx
  - app/pronostico/loading.tsx
  - app/globals.css
  - package.json
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: fixed
---

# Phase 2: Code Review Report

**Reviewed:** 2026-10-23
**Depth:** standard
**Files Reviewed:** 24 (los tests y app/dev/estados se leyeron solo por su superficie, sin hallazgos)
**Status:** issues_found

## Summary

No se encontraron bugs de zona horaria: todas las horas y días salen de slicing sobre los strings `-03:00` (`hourOf`, `dayKeyOf`) o de `Intl` con `timeZone`; no hay `getHours()` ni `new Date(naive)`. El ISR se mantiene (`revalidate = 600`, sin query params, sin APIs dinámicas). El manejo de `null` en geometría, titular y filas diarias es consistente. No hay problemas de seguridad (todo el texto sale de tablas locales, sin `dangerouslySetInnerHTML`). Quedan dos advertencias de corrección menor y tres observaciones.

## Warnings

### WR-01: El scrubber mapea el puntero con `layout.width`, no con el ancho real del overlay

**File:** `components/client/Meteogram.tsx:67-70`
**Issue:** `selectAt` calcula `indexAtX(e.clientX - rect.left, layout.width, n)`, pero el slider es `w-full` del contenedor y el SVG tiene `width={layout.width}` fijo. Mientras `layout.width` (inicialmente 342, o el último valor del ResizeObserver) difiera de `rect.width`, por ejemplo en el primer frame, tras rotar el dispositivo o con la ventana en iPad, el cursor y la hora seleccionada quedan desalineados. El error crece hacia el borde derecho.
**Fix:**
```ts
setSel(indexAtX(e.clientX - rect.left, rect.width, n))
```
Mantener `layout.width` solo para dibujar.

### WR-02: Titular de tarde/noche calculado solo con las horas restantes del día

**File:** `lib/forecast/headline.ts:95-111, 170`
**Issue:** `window` son las horas futuras de hoy. A las 20:00 la ventana tiene 4 puntos (pasa `MIN_WINDOW_POINTS`), y `buildContext` evalúa `max <= COLD_MAX_C` o `max >= HEAT_C` sobre esas horas nocturnas. Un día de 30 °C que a las 20 h baja a 12 °C produce "Día frío", y el sustantivo "día" no aplica a la noche. Con `isNow` y sin prefijo, `GeneralNoun` usa 'tarde'/'noche' solo para el cielo, pero el contexto térmico sigue siendo del resto del día.
**Fix:** Evaluar calor y frío del día con toda la jornada local (`hourly48` filtrado por `dayKeyOf === target`, sin `selectFutureHours`) y reservar la ventana futura para evento y cielo. Alternativa mínima: omitir `día frío` y `día de calor` cuando `h >= 18` y devolver solo heladas y viento.

## Info

### IN-01: Comparación muerta `amount === '1'` en `valueTextFor`

**File:** `lib/forecast/meteogram.ts:402`
**Issue:** `rainAmount` devuelve `'1,0'` para ~1 mm (nunca `'1'`), así que el singular "milímetro" no se usa y el lector de pantalla dice "1,0 milímetros". En `meteogramSummary` (línea 432) sí funciona porque usa `formatInt`.
**Fix:** Comparar con `'1,0'` o decidir el singular con el número (`Math.round(mm * 10) === 10`).

### IN-02: El SVG usa ancho fijo de 342 px en SSR y puede generar scroll horizontal en pantallas angostas

**File:** `components/client/Meteogram.tsx:132-138`
**Issue:** `width={layout.width}` sin `max-width: 100%`. En un viewport de 320-360 px (contenedor menor a 342) el primer render desborda hasta que el ResizeObserver corrige tras la hidratación, con un parpadeo de overflow y reflow.
**Fix:** Agregar `style={{ maxWidth: '100%' }}` o `className="block max-w-full select-none"`, más `viewBox` si se quiere escalar el primer frame.

### IN-03: `Math.min(...values)` y `Math.max(...mms)` con spread sobre arreglos

**File:** `lib/forecast/daily.ts:47-48`, `lib/forecast/meteogram.ts:127-128,176`
**Issue:** Con los tamaños actuales (≤ 48 y ≤ 28 elementos) es inofensivo, pero queda frágil si algún día se amplía el horizonte (límite de argumentos).
**Fix:** Usar `reduce` o `d3-array` `extent`. Sin urgencia.

---

_Reviewed: 2026-10-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Fixes aplicados (2026-10-24)

- WR-01, WR-02, IN-01 e IN-02 corregidos en `fix(02): apply code review warnings`, con tests nuevos para WR-02 (máxima diaria) e IN-01 (singular).
- IN-03 (`Math.min/max` con spread) queda como está: con 48 y 14 puntos es seguro.
