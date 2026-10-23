// Solar phase for Winifreda (UI-SPEC "Estados del cielo" step 1). Pure.
// suncalc 2.x returns altitude in DEGREES already (no radian conversion).
import { getPosition, getTimes } from 'suncalc'
import { LAT, LON } from '@/lib/config'

export type SolarPhase = 'noche' | 'amanecer' | 'dia' | 'atardecer'

/** Argentina civil day offset in minutes (UTC−3, no DST), for suncalc's day selection. */
const UTC_OFFSET_MIN = -180

export function getSolarPhase(now: Date): { phase: SolarPhase; sunAltitude: number } {
  const altitude = getPosition(now, LAT, LON).altitude
  if (altitude < -6) return { phase: 'noche', sunAltitude: altitude }
  if (altitude >= 6) return { phase: 'dia', sunAltitude: altitude }
  const { solarNoon } = getTimes(now, LAT, LON, 0, UTC_OFFSET_MIN)
  return {
    phase: now.getTime() < solarNoon.getTime() ? 'amanecer' : 'atardecer',
    sunAltitude: altitude,
  }
}
