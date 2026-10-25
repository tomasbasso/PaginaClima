// Prorated 1991–2020 normal (RAIN-02, D-03, RESEARCH Patrón 2). Pure.
//
// The climatology is a committed JSON (365 smoothed daily values, ERA5, circular 31-day mean)
// generated once by scripts/climatology.mjs (D-10). It is never requested at runtime or build.
// It is validated before use (T-05-08): if it does not parse, the block shows the
// "Sin climatología" state instead of corrupt figures.
import { z } from 'zod'
import raw from './climatology-1991-2020.json'
import { addDaysToKey } from '@/lib/time'

const ClimatologySchema = z.object({
  daily: z.array(z.number().finite().nonnegative()).length(365),
})

export function parseClimatology(obj: unknown): number[] | null {
  const r = ClimatologySchema.safeParse(obj)
  return r.success ? r.data.daily : null
}

export function loadClimatology(): number[] | null {
  return parseClimatology(raw)
}

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] as const

/** Index 0..364 on a non-leap calendar; 29/02 maps onto 28/02. */
export function doyIndex(key: string): number {
  const m = Number(key.slice(5, 7))
  const d = Math.min(Number(key.slice(8, 10)), m === 2 ? 28 : 31)
  return MONTH_START[m - 1] + d - 1
}

/**
 * Normal rain from `start` to `until` (inclusive). Prorated to `until` = dataUntil, not to today,
 * so "a la misma fecha" stays literal when data lag. When `until` is today, today's value is
 * weighted by the share of the day already observed.
 */
export function normalFor(
  daily: readonly number[],
  start: string,
  until: string,
  today: { todayKey: string; todayFraction: number },
): number {
  let sum = 0
  for (let d = start; d <= until; d = addDaysToKey(d, 1)) {
    const v = daily[doyIndex(d)]
    sum += d === today.todayKey ? v * today.todayFraction : v
  }
  return sum
}
