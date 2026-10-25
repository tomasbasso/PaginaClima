// "Última lluvia" line (D-04, UI-SPEC "Última lluvia"). Pure. Uses the same stitched series as
// the totals, so it never disagrees with them.
import type { RainDay } from './stitch'
import { addDaysToKey, formatDayOfMonth } from '@/lib/time'
import { formatMm } from '@/lib/weather/format'

/**
 * A rain day is a local day with ≥ 1.0 mm (R1mm convention of ETCCDI). ERA5 drizzles: in
 * 1991–2020 it gives ~123 days/year with ≥ 0.1 mm against ~78 with ≥ 1 mm, so a lower threshold
 * would report spurious "lluvias" nobody saw.
 */
export const RAIN_DAY_MM = 1

const NBSP = ' '
const RECENT_DAYS = 14

export type LastRain = {
  /** Text before the mm (ink/75 + ink); the whole sentence when there is no rain day. */
  lead: string
  /** "12 mm" with U+00A0, painted in azure; null when there is no rain day. */
  mmText: string | null
  /** Full sentence (sr and tests). */
  text: string
}

function ageInDays(date: string, todayKey: string): number {
  let n = 0
  for (let d = date; d < todayKey && n <= RECENT_DAYS + 1; d = addDaysToKey(d, 1)) n++
  return n
}

export function lastRainText(days: readonly RainDay[], todayKey: string, start: string): LastRain {
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i]
    if (day.mm < RAIN_DAY_MM) continue
    const age = ageInDays(day.date, todayKey)
    const when =
      age === 0
        ? 'hoy'
        : age === 1
          ? 'ayer'
          : age <= RECENT_DAYS
            ? `hace ${age} días`
            : `el ${formatDayOfMonth(day.date)}`
    const lead = `Última lluvia: ${when}, `
    const mmText = `${formatMm(day.mm)}${NBSP}mm`
    return { lead, mmText, text: `${lead}${mmText}` }
  }
  const lead = `Sin lluvias de 1 mm o más desde el ${formatDayOfMonth(start)}`
  return { lead, mmText: null, text: lead }
}
