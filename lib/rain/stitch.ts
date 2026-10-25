// ERA5 + past_days stitching (D-10, RESEARCH Patrón 1). Pure: no next, no lib/sources.
//
// One value per local day with strict priority: ERA5 non-null > complete recent day > cut.
// ERA5 lags ~5–8 days and returns null for the days it does not fully cover; the forecast
// past_days hourly series fills those days. Today only sums the hours already elapsed (the rest
// of the hourly series is forecast, Pitfall 4). The first day without data cuts the series:
// later days are never invented (Pitfall 3).
import { addDaysToKey, localDateKey, localHour } from '@/lib/time'

export type RainDay = { date: string; mm: number; source: 'era5' | 'recent' }

export type StitchedRain = {
  days: RainDay[]
  start: string
  /** Last local day with data (inclusive); null when not even `start` has data. */
  dataUntil: string | null
  todayIncluded: boolean
  /**
   * Share of today already observed, to prorate today's normal (05-03). We use
   * (hourNow + 1) / 24: the hourly value stamped HH:00 covers the hour before it, and today sums
   * HH = 00..hourNow, i.e. hourNow + 1 values. 0 when today is not included.
   */
  todayFraction: number
  /** dataUntil is before yesterday ART: the UI shows the "datos atrasados" Notice. */
  lagging: boolean
}

type DayAgg = { sum: number; count: number; nulls: number }

function aggregateRecent(
  recent: readonly { time: string; mm: number | null }[] | null,
  todayKey: string,
  hourNow: number,
): Map<string, DayAgg> {
  const byDay = new Map<string, DayAgg>()
  if (!recent) return byDay
  for (const { time, mm } of recent) {
    const date = time.slice(0, 10)
    // Today: only the hours already elapsed; the rest is forecast.
    if (date === todayKey && Number(time.slice(11, 13)) > hourNow) continue
    const agg = byDay.get(date) ?? { sum: 0, count: 0, nulls: 0 }
    agg.count++
    if (mm === null) agg.nulls++
    else agg.sum += mm
    byDay.set(date, agg)
  }
  return byDay
}

export function stitchDailyRain(
  era5: readonly { date: string; mm: number | null }[],
  recent: readonly { time: string; mm: number | null }[] | null,
  now: Date,
  start: string,
): StitchedRain {
  const todayKey = localDateKey(now)
  const hourNow = localHour(now)
  const yesterday = addDaysToKey(todayKey, -1)

  const era5ByDay = new Map<string, number>()
  for (const { date, mm } of era5) if (mm !== null) era5ByDay.set(date, mm)
  const recentByDay = aggregateRecent(recent, todayKey, hourNow)

  const days: RainDay[] = []
  for (let d = start; d <= todayKey; d = addDaysToKey(d, 1)) {
    const fromEra5 = era5ByDay.get(d)
    if (fromEra5 !== undefined) {
      days.push({ date: d, mm: fromEra5, source: 'era5' })
      continue
    }
    const agg = recentByDay.get(d)
    const needed = d === todayKey ? hourNow + 1 : 24
    if (agg && agg.nulls === 0 && agg.count === needed) {
      days.push({ date: d, mm: agg.sum, source: 'recent' })
      continue
    }
    break // first gap: cut, never invent later days
  }

  const dataUntil = days.length > 0 ? days[days.length - 1].date : null
  const todayIncluded = dataUntil === todayKey
  return {
    days,
    start,
    dataUntil,
    todayIncluded,
    todayFraction: todayIncluded ? (hourNow + 1) / 24 : 0,
    lagging: dataUntil === null || dataUntil < yesterday,
  }
}
