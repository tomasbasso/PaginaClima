// Sun and moon for the sky renderer (UI-SPEC "Resplandores"). Pure: callers pass `now`.
// suncalc 2.x returns degrees, azimuth clockwise from north (0 = N, 90 = E): no conversion here.
import { getMoonIllumination, getMoonPosition, getPosition, getTimes } from 'suncalc'
import { LAT, LON } from '@/lib/config'

/** Argentina civil day offset in minutes (UTC−3, no DST), for suncalc's day selection. */
const UTC_OFFSET_MIN = -180

export type SkyAstro = {
  /** Before solar noon: the 0° anchor is amanecer, otherwise atardecer. */
  morning: boolean
  sunAzimuth: number
  moonAltitude: number
  moonAzimuth: number
  /** Illuminated fraction, 0..1. */
  moonFraction: number
}

const wrap360 = (deg: number) => ((deg % 360) + 360) % 360

export function astroAt(now: Date): SkyAstro {
  const sun = getPosition(now, LAT, LON)
  const moon = getMoonPosition(now, LAT, LON)
  const { solarNoon } = getTimes(now, LAT, LON, 0, UTC_OFFSET_MIN)
  const { fraction } = getMoonIllumination(now)
  return {
    morning: now.getTime() < solarNoon.getTime(),
    sunAzimuth: wrap360(sun.azimuth),
    moonAltitude: moon.altitude,
    moonAzimuth: wrap360(moon.azimuth),
    moonFraction: Math.min(1, Math.max(0, fraction)),
  }
}
