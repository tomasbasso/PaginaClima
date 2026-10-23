// Time helpers (DATA-04). Pure. Never parse an API naive local time with `new Date(naive)`:
// the result depends on the runtime TZ (UTC on Vercel, ART on a laptop).
import { TZ } from '@/lib/config'

/**
 * Attach the API's UTC offset to a naive local time.
 * withOffset('2026-10-23T12:00', -10800) → '2026-10-23T12:00:00-03:00'
 */
export function withOffset(naive: string, offsetSeconds: number): string {
  const withSeconds = /T\d{2}:\d{2}$/.test(naive) ? `${naive}:00` : naive
  const sign = offsetSeconds < 0 ? '-' : '+'
  const abs = Math.abs(offsetSeconds)
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0')
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0')
  return `${withSeconds}${sign}${hh}:${mm}`
}

const dateKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Local calendar day in Winifreda as "YYYY-MM-DD" (matches Open-Meteo `daily.time`). */
export function localDateKey(d: Date): string {
  return dateKeyFormat.format(d)
}
