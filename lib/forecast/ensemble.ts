// Real rain probability from ECMWF ENS (D-09, D-10, FCST-03). Pure. Each member gets its local-day
// sum and is compared to the threshold BEFORE counting: averaging first dilutes the signal.
// Temperatures come from the daily block, never the hourly one (which clips the peak by up to 4 °C).
import { RAIN_DAY_MM } from '@/lib/rain/lastRain'
import { localDayRain } from './localDayRain'

export interface EnsembleDay {
  date: string
  /** Members with the whole day present: the real count of D-09 (51 is only the expected value). */
  members: number
  /** Members with at least RAIN_DAY_MM in the local day. */
  rainMembers: number
  rainP10Mm: number
  rainP90Mm: number
  tMinP10C: number | null
  tMaxP90C: number | null
}

/** Control plus _member01…: with a single model in the request, the columns carry no model suffix. */
export const MEMBER_RAIN = /^precipitation(_member\d{2})?$/
const MEMBER_T_MIN = /^temperature_2m_min(_member\d{2})?$/
const MEMBER_T_MAX = /^temperature_2m_max(_member\d{2})?$/

const NBSP = '\u00A0'

const P10 = 0.1
const P90 = 0.9

/** Shown value: under this raw share there is no number (D-09). */
const MIN_DISPLAY_SHARE = 0.1
/** From this raw share on it shows 95, never 100 (D-09). */
const TOP_DISPLAY_SHARE = 0.925

type Block = { time: string[]; [column: string]: unknown }

/** Linear interpolation, like numpy's default. `sorted` must be ascending and not empty. */
export function quantile(sorted: readonly number[], p: number): number {
  const h = (sorted.length - 1) * p
  const lo = Math.floor(h)
  const hi = Math.min(lo + 1, sorted.length - 1)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo)
}

/** Rounded to steps of 5 %, from the raw share (the thresholds never see the rounded value). */
export function toDisplayPct(rainMembers: number, members: number): number | null {
  if (members <= 0) return null
  const raw = rainMembers / members
  if (raw < MIN_DISPLAY_SHARE) return null
  if (raw >= TOP_DISPLAY_SHARE) return 95
  return Math.min(90, Math.max(10, Math.round((raw * 100) / 5) * 5))
}

/**
 * Rounded limits of the rain range (D-07), or null under 1 mm of p90. The threshold reads the raw
 * value: 0.9 mm shows nothing even though it rounds to 1. With real data p10 is usually 0 (Pitfall 4).
 */
export function rainRange(p10: number, p90: number): { lo: number; hi: number } | null {
  if (p90 < RAIN_DAY_MM) return null
  return { lo: Math.round(p10), hi: Math.round(p90) }
}

export function rainRangeText(p10: number, p90: number): string | null {
  const range = rainRange(p10, p90)
  if (!range) return null
  return range.lo === range.hi ? `${range.hi}${NBSP}mm` : `${range.lo}–${range.hi}${NBSP}mm`
}

const ascending = (a: number, b: number) => a - b

/** Fewer than half of the members is not an ensemble worth quoting. */
const isEnough = (present: number, total: number) => present * 2 >= total

function memberColumns(block: Block, pattern: RegExp): string[] {
  return Object.keys(block).filter((key) => pattern.test(key))
}

/** Percentile of one daily column family at row `row`; null if there are too few values. */
function dailyQuantile(daily: Block, pattern: RegExp, row: number, p: number): number | null {
  if (row < 0) return null
  const columns = memberColumns(daily, pattern)
  const values = columns
    .map((key) => (daily[key] as Array<number | null>)[row])
    .filter((value): value is number => typeof value === 'number')
  if (values.length === 0 || !isEnough(values.length, columns.length)) return null
  return quantile(values.sort(ascending), p)
}

/** Takes the loose blocks of the validated DTO and returns only the per-day aggregate (D-18). */
export function aggregateEnsemble(hourly: Block, daily: Block): EnsembleDay[] {
  const columns = memberColumns(hourly, MEMBER_RAIN)
  const perMember = columns.map((key) =>
    localDayRain(hourly.time, hourly[key] as Array<number | null>),
  )
  const dates = [...new Set(perMember.flatMap((days) => [...days.keys()]))].sort()

  const out: EnsembleDay[] = []
  for (const date of dates) {
    const totals = perMember
      .map((days) => days.get(date))
      .filter((mm): mm is number => mm !== undefined)
      .sort(ascending)
    if (!isEnough(totals.length, columns.length)) continue

    const row = daily.time.indexOf(date)
    out.push({
      date,
      members: totals.length,
      rainMembers: totals.filter((mm) => mm >= RAIN_DAY_MM).length,
      rainP10Mm: quantile(totals, P10),
      rainP90Mm: quantile(totals, P90),
      tMinP10C: dailyQuantile(daily, MEMBER_T_MIN, row, P10),
      tMaxP90C: dailyQuantile(daily, MEMBER_T_MAX, row, P90),
    })
  }
  return out
}
