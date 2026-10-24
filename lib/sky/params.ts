// Weather parameters of the sky (UI-SPEC "Intensidad (D-08)", capas 3, 4 y 6). Pure.
// Upstream numbers (WMO code, mm, km/h, degrees) are resolved through closed tables and fixed
// clamps, so an absurd value never pushes densities or speeds out of budget (T-03-05).
import { CALM_KMH } from '@/lib/weather/wind'
import type { SkyState, SkyWeather } from './state'

/** WMO code → base intensity 0–1 (rain density, cloud darkness, lightning rate). */
export const INTENSITY_BY_WMO: Record<number, number> = {
  51: 0.25,
  53: 0.25,
  55: 0.4,
  56: 0.4,
  57: 0.4,
  61: 0.5,
  80: 0.5,
  63: 0.7,
  66: 0.7,
  81: 0.7,
  65: 1,
  67: 1,
  82: 1,
  95: 0.8,
  96: 1,
  99: 1,
}

/** Without a table entry (or without data): lluvia 0,6 · tormenta 0,8 · the rest 0. */
export const DEFAULT_INTENSITY: Record<SkyWeather, number> = {
  despejado: 0,
  cubierto: 0,
  niebla: 0,
  lluvia: 0.6,
  tormenta: 0.8,
}

/** `intensity = max(base, min(1, precipMm / PRECIP_FULL_MM))`. */
export const PRECIP_FULL_MM = 6

/** Clear-sky codes → cloud cover 0–1 (code 2 "algo nublado" = 0,4). */
export const COVER_BY_WMO: Record<number, number> = { 0: 0, 1: 0.15, 2: 0.4 }

/** Cloud cover by weather when the code has no own entry. */
export const DEFAULT_COVER: Record<SkyWeather, number> = {
  despejado: 0,
  cubierto: 0.85,
  lluvia: 0.9,
  tormenta: 0.95,
  niebla: 0.3,
}

/** Cloud drift: 4 + 0,15 · km/h px/s, capped at 12; 6 px/s without data. */
export const DRIFT_BASE_PX_S = 4
export const DRIFT_PER_KMH = 0.15
export const DRIFT_MAX_PX_S = 12
export const DRIFT_DEFAULT_PX_S = 6

/** Rain tilt: 8° from vertical + up to 12° more with the wind (0,2°/km/h), capped at 20°. */
export const RAIN_TILT_BASE_DEG = 8
export const RAIN_TILT_PER_KMH = 0.2
export const RAIN_TILT_MAX_DEG = 20

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const finite = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v)

export function intensityFromCode(
  code: number | null,
  weather: SkyWeather,
  precipMm?: number | null,
): number {
  const base = (code !== null ? INTENSITY_BY_WMO[code] : undefined) ?? DEFAULT_INTENSITY[weather]
  if (!finite(precipMm) || precipMm <= 0) return base
  return Math.max(base, Math.min(1, precipMm / PRECIP_FULL_MM))
}

export function coverFromCode(code: number | null, weather: SkyWeather): number {
  if (weather === 'despejado' && code !== null && code in COVER_BY_WMO) return COVER_BY_WMO[code]
  return DEFAULT_COVER[weather]
}

/**
 * Screen direction of the east-west wind component: +1 = towards the right (east, looking north).
 * Wind FROM the west (270°) blows towards the east → +1; from the east (90°) → −1.
 * Without direction (or a pure N/S wind) → right.
 */
function eastwardSign(windDirDeg: number | null | undefined): 1 | -1 {
  if (!finite(windDirDeg)) return 1
  return -Math.sin((windDirDeg * Math.PI) / 180) < -1e-9 ? -1 : 1
}

/** Signed horizontal cloud drift in px/s (CSS px). */
export function cloudDriftPxPerS(
  windKmh: number | null | undefined,
  windDirDeg: number | null | undefined,
): number {
  const sign = eastwardSign(windDirDeg)
  if (windKmh === null || windKmh === undefined || Number.isNaN(windKmh)) {
    return sign * DRIFT_DEFAULT_PX_S
  }
  const kmh = Math.max(0, windKmh)
  return sign * Math.min(DRIFT_MAX_PX_S, DRIFT_BASE_PX_S + DRIFT_PER_KMH * kmh)
}

/** Signed rain tilt in degrees from the vertical, same sign as the drift. */
export function rainTiltDeg(
  windKmh: number | null | undefined,
  windDirDeg: number | null | undefined,
): number {
  const sign = eastwardSign(windDirDeg)
  const kmh =
    windKmh === null || windKmh === undefined || Number.isNaN(windKmh) || windKmh < CALM_KMH
      ? 0
      : windKmh
  return sign * Math.min(RAIN_TILT_MAX_DEG, RAIN_TILT_BASE_DEG + RAIN_TILT_PER_KMH * kmh)
}

export type SkyParams = {
  cover: number
  intensity: number
  driftPxPerS: number
  rainTiltDeg: number
  rain: number
  fog: number
  starsFactor: number
}

/**
 * Stars for a clear sky by cover: 1 up to 0,15 (codes 0–1), 0,5 at 0,4 (code 2, "la mitad"),
 * fading linearly to 0 at 0,85. Never with another weather.
 */
function starsFactor(weather: SkyWeather, cover: number): number {
  if (weather !== 'despejado') return 0
  if (cover <= 0.15) return 1
  if (cover <= 0.4) return 1 - (0.5 * (cover - 0.15)) / 0.25
  if (cover <= 0.85) return 0.5 - (0.5 * (cover - 0.4)) / 0.45
  return 0
}

/** Everything the weather layers of the shader need, with UI-SPEC defaults for missing fields. */
export function skyParams(state: SkyState): SkyParams {
  const cover = finite(state.cloudCover)
    ? clamp01(state.cloudCover / 100)
    : coverFromCode(null, state.weather)
  const intensity = finite(state.intensity)
    ? clamp01(state.intensity)
    : DEFAULT_INTENSITY[state.weather]
  const wet = state.weather === 'lluvia' || state.weather === 'tormenta'
  return {
    cover,
    intensity,
    driftPxPerS: cloudDriftPxPerS(state.windKmh, state.windDirDeg),
    rainTiltDeg: rainTiltDeg(state.windKmh, state.windDirDeg),
    rain: wet ? intensity : 0,
    fog: state.weather === 'niebla' ? 1 : 0,
    starsFactor: starsFactor(state.weather, cover),
  }
}
