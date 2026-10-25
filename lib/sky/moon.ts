// Moon for /cielo (ASTRO-02, D-08). Pure: callers pass `now`.
// Southern hemisphere: the waxing moon is lit on the LEFT, the waning moon on the right (the
// opposite of the northern hemisphere). The terminator stays vertical: no rotation by `angle`
// (UI-SPEC [default]).
import { getMoonIllumination, getMoonTimes } from 'suncalc'
import { LAT, LON } from '@/lib/config'
import { UTC_OFFSET_MIN } from '@/lib/sky/astro'
import { formatDayLong, formatHHmm, localDateKey } from '@/lib/time'

/** Disc radius and center in the 64×64 viewBox (1px stroke fits inside). */
export const MOON_R = 31
export const MOON_C = 32
/** Below this the lit part is not drawn (new moon); above the other one the disc is full. */
export const NEW_MOON_FRACTION = 0.02
export const FULL_MOON_FRACTION = 0.98
/** ±1 day around each principal phase, as a fraction of the synodic month (1 / 29.53). */
export const PHASE_WINDOW = 0.0339

const HOUR_MS = 3_600_000
const SEARCH_HOURS = 31 * 24

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export type MoonGeometry = { litSide: 'left' | 'right'; rx: number }

export function moonGeometry(fraction: number, waxing: boolean): MoonGeometry {
  const f = clamp01(fraction)
  return {
    litSide: waxing ? 'left' : 'right',
    rx: Number((MOON_R * Math.abs(1 - 2 * f)).toFixed(2)),
  }
}

/**
 * SVG path of the lit part, or null for a new moon (only the shaded disc shows).
 * Half disc on the lit side from the top (32,1) to the bottom (32,63), then the terminator half
 * ellipse back to the top: it cuts into the lit side for a thin crescent and bulges into the
 * shaded side for a gibbous moon.
 */
export function moonPath(fraction: number, waxing: boolean): string | null {
  const f = clamp01(fraction)
  if (f < NEW_MOON_FRACTION) return null
  const top = `${MOON_C} ${MOON_C - MOON_R}`
  const bottom = `${MOON_C} ${MOON_C + MOON_R}`
  if (f > FULL_MOON_FRACTION) {
    return `M ${top} A ${MOON_R} ${MOON_R} 0 1 1 ${bottom} A ${MOON_R} ${MOON_R} 0 1 1 ${top} Z`
  }
  const { litSide, rx } = moonGeometry(f, waxing)
  const thin = f < 0.5
  const sweepLit = litSide === 'left' ? 0 : 1
  // left: thin crescent 1, gibbous 0 · right: thin 0, gibbous 1
  const sweepTerm = litSide === 'left' ? (thin ? 1 : 0) : thin ? 0 : 1
  return `M ${top} A ${MOON_R} ${MOON_R} 0 0 ${sweepLit} ${bottom} A ${rx} ${MOON_R} 0 0 ${sweepTerm} ${top} Z`
}

/** Phase name with ±1 day windows around the principal phases (UI-SPEC table). */
export function moonPhaseName(phase: number): string {
  const p = ((phase % 1) + 1) % 1
  const w = PHASE_WINDOW
  if (p < w || p >= 1 - w) return 'Luna nueva'
  if (p < 0.25 - w) return 'Luna creciente'
  if (p < 0.25 + w) return 'Cuarto creciente'
  if (p < 0.5 - w) return 'Gibosa creciente'
  if (p < 0.5 + w) return 'Luna llena'
  if (p < 0.75 - w) return 'Gibosa menguante'
  if (p < 0.75 + w) return 'Cuarto menguante'
  return 'Luna menguante'
}

/**
 * Next full moon: hourly sweep of getMoonIllumination for up to 31 days, looking for the first
 * crossing phase < 0.5 → ≥ 0.5. 744 calls, about 7 ms (measured): fine for an ISR render, and an
 * hour of precision is plenty to name the day.
 */
export function nextFullMoon(now: Date): Date | null {
  let prev = getMoonIllumination(now).phase
  for (let h = 1; h <= SEARCH_HOURS; h++) {
    const t = new Date(now.getTime() + h * HOUR_MS)
    const phase = getMoonIllumination(t).phase
    if (prev < 0.5 && phase >= 0.5) return t
    prev = phase
  }
  return null
}

export interface MoonInfo {
  path: string | null
  name: string
  illuminatedText: string
  fullMoonText: string | null
  timesText: string | null
  srText: string
}

function moonTimes(now: Date): { rise: string | null; set: string | null } | null {
  const t = getMoonTimes(now, LAT, LON, UTC_OFFSET_MIN)
  if (t.alwaysUp || t.alwaysDown) return null
  const rise = t.rise ? formatHHmm(t.rise) : null
  const set = t.set ? formatHHmm(t.set) : null
  if (!rise && !set) return null
  return { rise, set }
}

export function moonInfo(now: Date): MoonInfo {
  const { fraction, phase, waxing } = getMoonIllumination(now)
  const f = clamp01(fraction)
  const name = moonPhaseName(phase)
  const percent = Math.round(f * 100)
  const illuminatedText = `Iluminada al ${percent} %`

  // Omitted while the name already says "Luna llena" (±1 day window), not only when it is today:
  // otherwise today would read "Luna llena · Llena el lunes 26" (05-RESEARCH, Patrón 5).
  const full = name === 'Luna llena' ? null : nextFullMoon(now)
  const fullDay = full ? formatDayLong(localDateKey(full)) : null
  const fullMoonText = fullDay ? `Llena el ${fullDay}` : null

  const times = moonTimes(now)
  const timesParts = times
    ? [times.rise ? `Sale ${times.rise}` : null, times.set ? `se pone ${times.set}` : null].filter(
        (s): s is string => s !== null,
      )
    : []
  const timesText = timesParts.length
    ? timesParts.join(' · ').replace(/^se pone/, 'Se pone')
    : null

  const srParts = [`${name}, iluminada al ${percent} por ciento.`]
  if (fullDay) srParts.push(`La próxima luna llena es el ${fullDay}.`)
  if (times?.rise) srParts.push(`La luna sale a las ${times.rise}.`)
  if (times?.set) srParts.push(`Se pone a las ${times.set}.`)

  return {
    path: moonPath(f, waxing),
    name,
    illuminatedText,
    fullMoonText,
    timesText,
    srText: srParts.join(' '),
  }
}
