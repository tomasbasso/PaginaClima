// Hour/day helpers for phase-2 forecast views (RESEARCH Pattern 1). Pure.
// Times are Open-Meteo local ISO strings with the -03:00 offset: read hour and day by slicing,
// never by comparing full ISO strings (fixtures may lack seconds) or by `new Date(t).getHours()`.
import type { HourlyPoint } from '@/lib/weather/types'

const HOUR_MS = 3_600_000

/** '2026-10-23T14:00:00-03:00' → 14 (local hour). */
export function hourOf(time: string): number {
  return Number(time.slice(11, 13))
}

/** '2026-10-23T14:00:00-03:00' → '2026-10-23' (local day key). */
export function dayKeyOf(time: string): string {
  return time.slice(0, 10)
}

/**
 * Drop the hours before the current one (Pitfall 3: a cached snapshot starts in the past).
 * ART is a whole-hour offset, so the UTC hour floor equals the local one.
 */
export function selectFutureHours(points: HourlyPoint[], now: Date): HourlyPoint[] {
  const floor = now.getTime() - (now.getTime() % HOUR_MS)
  return points.filter((p) => Date.parse(p.time) >= floor)
}

export type DayPart = 'madrugada' | 'mañana' | 'mediodía' | 'tarde' | 'noche'

/** UI-SPEC "Franjas": 0–5 madrugada · 6–11 mañana · 12–13 mediodía · 14–19 tarde · 20–23 noche. */
export function dayPart(hour: number): DayPart {
  if (hour <= 5) return 'madrugada'
  if (hour <= 11) return 'mañana'
  if (hour <= 13) return 'mediodía'
  if (hour <= 19) return 'tarde'
  return 'noche'
}

export const DAY_PART_PHRASE: Record<DayPart, string> = {
  madrugada: 'a la madrugada',
  mañana: 'a la mañana',
  mediodía: 'al mediodía',
  tarde: 'a la tarde',
  noche: 'a la noche',
}
