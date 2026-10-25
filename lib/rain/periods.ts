// Calendar periods for rain totals (D-01, D-02). Pure. Keys are "YYYY-MM-DD" in ART; never parsed
// with `new Date(key)` (runtime TZ dependent). No rolling windows: week from Monday, month from
// day 1, year from January 1.
import { addDaysToKey, weekdayLong } from '@/lib/time'

/** Extra history before the earliest period so "Última lluvia" has data in January (05-03). */
export const SERIES_MARGIN_DAYS = 90

export type PeriodStarts = { week: string; month: string; year: string }

function mondayOf(key: string): string {
  let d = key
  for (let i = 0; i < 6 && weekdayLong(d) !== 'lunes'; i++) d = addDaysToKey(d, -1)
  return d
}

/** Start keys of the current week (Monday ART), month and calendar year. */
export function periodStarts(todayKey: string): PeriodStarts {
  return {
    week: mondayOf(todayKey),
    month: `${todayKey.slice(0, 8)}01`,
    year: `${todayKey.slice(0, 4)}-01-01`,
  }
}

/** First day of the stitched series: min(monday, Jan 1) − margin (the week may start in December). */
export function seriesStart(todayKey: string): string {
  const { week, year } = periodStarts(todayKey)
  return addDaysToKey(week < year ? week : year, -SERIES_MARGIN_DAYS)
}

/** Sum of mm for the days in [start, until]. `until` null (no data) → 0. */
export function periodTotal(
  days: readonly { date: string; mm: number }[],
  start: string,
  until: string | null,
): number {
  if (until === null) return 0
  let total = 0
  for (const d of days) if (d.date >= start && d.date <= until) total += d.mm
  return total
}
