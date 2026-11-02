// Local-day rain window (D-10, RESEARCH Pattern 1). Pure. Shared by the ensemble and the models.
// An hourly value is the sum of the PREVIOUS hour, so the 00:00 stamp belongs to the day before:
// day D adds the stamps D 01:00 … D+1 00:00. This is why the API's daily sum is not used: it
// shifts a 3 h block ending at 00:00 into the next day and can go negative (Pitfall 1).
import { addDaysToKey } from '@/lib/time'

const HOURS_IN_DAY = 24

/** Sums keep 2 decimals: ten hours of 0.1 add up to 0.999… and would miss the 1 mm threshold. */
const round2 = (n: number) => Math.round(n * 100) / 100

/** 'YYYY-MM-DD' -> mm, only for days with their 24 hours present. Takes naive local stamps. */
export function localDayRain(time: string[], mm: Array<number | null>): Map<string, number> {
  const totals = new Map<string, { sum: number; hours: number }>()
  time.forEach((stamp, i) => {
    const value = mm[i]
    if (value === null || value === undefined) return
    const date = stamp.slice(0, 10)
    // Compared by slice: the zod localDT accepts stamps with and without seconds.
    const key = stamp.slice(11, 13) === '00' ? addDaysToKey(date, -1) : date
    const current = totals.get(key) ?? { sum: 0, hours: 0 }
    totals.set(key, { sum: current.sum + Math.max(0, value), hours: current.hours + 1 })
  })

  // The hour count alone drops the partial "yesterday" and the incomplete last day.
  const out = new Map<string, number>()
  for (const [key, { sum, hours }] of totals) {
    if (hours === HOURS_IN_DAY) out.set(key, round2(sum))
  }
  return out
}
