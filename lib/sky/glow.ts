// Sun glow, moon halo and star fade (UI-SPEC "Resplandores", capas 2 y 3; D-05: no disc). Pure.
// suncalc 2.x: azimuth in degrees, clockwise from north (0 = N, 90 = E, 270 = W). Winifreda sees
// the sun pass through the north, so the sky looks north: east is on the right.
import type { SkyAstro } from './astro'
import { smoothstep } from './palette'
import type { SkyWeather } from './state'

/** Sun glow visible between these altitudes (degrees), peak at 0°. */
export const SUN_GLOW_MIN_ALT = -8
export const SUN_GLOW_MAX_ALT = 12
/** Moon height on screen: 0° → horizon (yFrac 1), ≥ MOON_TOP_ALT → MOON_TOP_FRAC from the top. */
export const MOON_TOP_ALT = 45
export const MOON_TOP_FRAC = 0.3
/** Stars fade in between these sun altitudes. */
export const STARS_START_ALT = -6
export const STARS_FULL_ALT = -12

/** Horizontal glow position (0 = left, 1 = right of the box), within [0.1, 0.9]. */
export function glowX(azimuthDeg: number): number {
  const x = 0.5 + 0.4 * Math.sin((azimuthDeg * Math.PI) / 180)
  return Math.min(0.9, Math.max(0.1, x))
}

export type SunGlow = { x: number; strength: number }
export type MoonGlow = { x: number; yFrac: number; strength: number }

export function sunGlow(sunAltitude: number, sunAzimuth: number): SunGlow {
  const x = glowX(sunAzimuth)
  if (!(sunAltitude >= SUN_GLOW_MIN_ALT && sunAltitude <= SUN_GLOW_MAX_ALT)) return { x, strength: 0 }
  const strength =
    sunAltitude <= 0
      ? smoothstep(SUN_GLOW_MIN_ALT, 0, sunAltitude)
      : 1 - smoothstep(0, SUN_GLOW_MAX_ALT, sunAltitude)
  return { x, strength }
}

/** Moon halo: only above the horizon and with a clear sky; strength ∝ illuminated fraction. */
export function moonGlow(astro: SkyAstro, weather: SkyWeather): MoonGlow {
  const x = glowX(astro.moonAzimuth)
  const t = Math.min(1, Math.max(0, astro.moonAltitude / MOON_TOP_ALT))
  const yFrac = 1 - (1 - MOON_TOP_FRAC) * t
  if (!(astro.moonAltitude > 0) || weather !== 'despejado') return { x, yFrac, strength: 0 }
  return { x, yFrac, strength: Math.min(1, Math.max(0, astro.moonFraction)) }
}

/** Global star alpha from the sun altitude: 0 at ≥ −6°, 1 at ≤ −12°. */
export function starsAlpha(sunAltitude: number): number {
  return 1 - smoothstep(STARS_FULL_ALT, STARS_START_ALT, sunAltitude)
}
