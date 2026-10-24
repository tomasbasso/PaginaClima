// Windmill rotor speed (UI-SPEC "Molino", D-13). Pure.
import { CALM_KMH } from '@/lib/weather/wind'

/** Seconds per turn = clamp(ROTOR_K / km/h, ROTOR_MIN_S, ROTOR_MAX_S). */
export const ROTOR_K = 36
export const ROTOR_MIN_S = 1.5
export const ROTOR_MAX_S = 12

/** Seconds per full turn, or null (still rotor) with calm or without data. */
export function rotorPeriodS(windKmh: number | null | undefined): number | null {
  if (windKmh === null || windKmh === undefined || !(windKmh >= CALM_KMH)) return null
  return Math.min(ROTOR_MAX_S, Math.max(ROTOR_MIN_S, ROTOR_K / windKmh))
}
