// Fixture builders shared by every phase-2 test and /dev/estados. Not a test file. Pure.
// Times use the exact withOffset format ('YYYY-MM-DDTHH:00:00-03:00').
import { addDaysToKey } from '@/lib/time'
import type { DailyPoint, HourlyPoint } from '@/lib/weather/types'

const HOUR_MS = 3_600_000
const ART_OFFSET_MS = 3 * HOUR_MS

/**
 * n consecutive hourly points starting at `startIso` (any ISO with offset, on the hour).
 * `over(i, hour)` receives the index and the local hour and returns field overrides.
 */
export function makeHourly(
  startIso: string,
  n: number,
  over?: (i: number, hour: number) => Partial<HourlyPoint>,
): HourlyPoint[] {
  const start = Date.parse(startIso)
  const out: HourlyPoint[] = []
  for (let i = 0; i < n; i++) {
    const local = new Date(start + i * HOUR_MS - ART_OFFSET_MS).toISOString()
    const time = `${local.slice(0, 13)}:00:00-03:00`
    const hour = Number(local.slice(11, 13))
    out.push({
      time,
      tempC: 20,
      feelsC: 20,
      precipMm: 0,
      weatherCode: 0,
      windKmh: 10,
      gustKmh: 18,
      windDirDeg: 0,
      humidityPct: 50,
      isDay: hour >= 7 && hour <= 19 ? 1 : 0,
      ...(over ? over(i, hour) : {}),
    })
  }
  return out
}

/** n consecutive daily points starting at `startKey` ('YYYY-MM-DD'). */
export function makeDaily(
  startKey: string,
  n: number,
  over?: (i: number, key: string) => Partial<DailyPoint>,
): DailyPoint[] {
  const out: DailyPoint[] = []
  for (let i = 0; i < n; i++) {
    const key = addDaysToKey(startKey, i)
    out.push({
      date: key,
      weatherCode: 0,
      tMaxC: 25,
      tMinC: 10,
      precipSumMm: 0,
      sunrise: `${key}T06:30`,
      sunset: `${key}T19:45`,
      gustMaxKmh: 30,
      ...(over ? over(i, key) : {}),
    })
  }
  return out
}
