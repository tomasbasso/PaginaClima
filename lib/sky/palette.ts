// Continuous sky palette (UI-SPEC "Anclas de color", "Clima", C-1/C-2; D-06). Pure.
// Colors are mixed in linear RGB only; the shader gets the linear stops, tests use the sRGB ones.
import type { SkyToken, SkyWeather } from './state'

/** C-1: max WCAG relative luminance of any content-zone pixel (S3 of `dia` ≈ 0.073). */
export const LMAX_CONTENT = 0.075
/** D-06 anchor: at or below this altitude the clear sky is exactly `noche`. */
export const ANCHOR_NIGHT = -12
/** D-06 anchor: the clear sky is exactly the twilight row (amanecer / atardecer). */
export const ANCHOR_TWILIGHT = 0
/** D-06 anchor: at or above this altitude the clear sky is exactly `dia`. */
export const ANCHOR_DAY = 15

/** Linear RGB, 0..1 per channel. */
export type Rgb = readonly [number, number, number]
/** sRGB, 0..255 per channel. */
export type Rgb8 = readonly [number, number, number]
export type SkyStops = readonly [Rgb, Rgb, Rgb, Rgb, Rgb]
export type SkyPalette = { linear: SkyStops; srgb: readonly [Rgb8, Rgb8, Rgb8, Rgb8, Rgb8] }

/**
 * S1..S5 of the six fallback tokens. Keep in sync with app/globals.css (palette.test.ts
 * reads the CSS and fails if they drift).
 */
export const TOKEN_STOPS: Record<SkyToken, readonly [string, string, string, string, string]> = {
  noche: ['#070b14', '#0c1323', '#121c30', '#172440', '#1d2a44'],
  amanecer: ['#1a2340', '#252d4f', '#3d3f63', '#a9747a', '#fcd5ce'],
  dia: ['#1b3456', '#22466d', '#284f75', '#6fa3c9', '#a9d6ea'],
  atardecer: ['#1b1838', '#2e2148', '#4a2a50', '#c25a48', '#f6b26b'],
  cubierto: ['#1f2833', '#29333f', '#36424f', '#56626f', '#7d8894'],
  tormenta: ['#121326', '#1d1f38', '#2b2d4d', '#33365a', '#3d4066'],
}

/** "Clima" table: weight of the `cubierto` row over the clear palette in twilight. */
const OVERCAST_WEIGHT: Partial<Record<SkyWeather, number>> = { cubierto: 0.85, lluvia: 0.9 }
/** "Clima" table: a night storm darkens towards S1 of `noche` with this weight. */
const STORM_NIGHT_WEIGHT = 0.5
/** "Clima" table: niebla desaturates the palette this much. */
const FOG_DESATURATION = 0.6
/** "Clima" table: niebla's band grey. */
const FOG_BAND = '#7d8894'

/** sRGB 0..255 → linear 0..1 (exact IEC 61966-2-1 piecewise transfer, not gamma 2.2). */
export function toLinear(c8: number): number {
  const c = c8 / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Linear 0..1 → sRGB 0..255, rounded and clamped. */
export function toSrgb8(c: number): number {
  const v = Math.min(1, Math.max(0, c))
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.round(s * 255)
}

export function hexToLinear(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16)
  return [toLinear((n >> 16) & 255), toLinear((n >> 8) & 255), toLinear(n & 255)]
}

/** WCAG relative luminance of a linear RGB color. */
export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** C-2: mix in linear RGB, so L(mix) never exceeds the brighter end. */
export function mixLinear(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

const ROWS = Object.fromEntries(
  (Object.keys(TOKEN_STOPS) as SkyToken[]).map((k) => [k, TOKEN_STOPS[k].map(hexToLinear)]),
) as Record<SkyToken, Rgb[]>
const FOG_BAND_LINEAR = hexToLinear(FOG_BAND)

function mixRows(a: readonly Rgb[], b: readonly Rgb[], t: number): Rgb[] {
  return a.map((c, i) => mixLinear(c, b[i], t))
}

function clearPalette(alt: number, morning: boolean): Rgb[] {
  const twilight = ROWS[morning ? 'amanecer' : 'atardecer']
  if (alt <= ANCHOR_NIGHT) return ROWS.noche
  if (alt <= ANCHOR_TWILIGHT) {
    return mixRows(ROWS.noche, twilight, smoothstep(ANCHOR_NIGHT, ANCHOR_TWILIGHT, alt))
  }
  if (alt < ANCHOR_DAY) return mixRows(twilight, ROWS.dia, smoothstep(ANCHOR_TWILIGHT, ANCHOR_DAY, alt))
  return ROWS.dia
}

/**
 * S1..S5 for a sun altitude (degrees), a weather and the half of the day (`morning` = before
 * solar noon, picks amanecer vs. atardecer as the 0° anchor).
 */
export function skyPalette(sunAltitude: number, weather: SkyWeather, morning: boolean): SkyPalette {
  const clear = clearPalette(sunAltitude, morning)
  let stops: Rgb[]

  if (weather === 'cubierto' || weather === 'lluvia') {
    // Night (≤ −12°) stays noche; the overcast weight ramps in up to −6° (where the fallback
    // switches to `cubierto`) so there is no jump, keeps the warm twilight trace at 0.85/0.9 and
    // reaches the full `cubierto` row by +15° (convergence with the fallback by day).
    const base = OVERCAST_WEIGHT[weather] ?? 1
    const w =
      smoothstep(ANCHOR_NIGHT, -6, sunAltitude) *
      (base + (1 - base) * smoothstep(ANCHOR_TWILIGHT, ANCHOR_DAY, sunAltitude))
    stops = mixRows(clear, ROWS.cubierto, w)
  } else if (weather === 'tormenta') {
    // `tormenta` row at any altitude ≥ −12°; deeper in the night it darkens towards S1 of
    // `noche`, ramping in between −12° and −18° so the change is continuous.
    const w = STORM_NIGHT_WEIGHT * (1 - smoothstep(-18, ANCHOR_NIGHT, sunAltitude))
    stops = ROWS.tormenta.map((c) => mixLinear(c, ROWS.noche[0], w))
  } else if (weather === 'niebla') {
    stops = clear.map((c, i) => {
      if (i >= 3) return mixLinear(c, FOG_BAND_LINEAR, FOG_DESATURATION)
      const l = luminance(c)
      return mixLinear(c, [l, l, l], FOG_DESATURATION)
    })
  } else {
    stops = clear
  }

  // Safety net for C-1: scale S1..S3 down to the cap without changing hue.
  stops = stops.map((c, i) => {
    if (i >= 3) return c
    const l = luminance(c)
    if (l <= LMAX_CONTENT) return c
    const k = LMAX_CONTENT / l
    return [c[0] * k, c[1] * k, c[2] * k] as Rgb
  })

  const linear = stops as unknown as SkyStops
  const srgb = stops.map((c) => [toSrgb8(c[0]), toSrgb8(c[1]), toSrgb8(c[2])] as Rgb8) as unknown as SkyPalette['srgb']
  return { linear, srgb }
}
