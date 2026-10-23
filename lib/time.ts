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

// Always hourCycle 'h23' (the 12-hour flag set to false can yield "24:05" at midnight).
const headerFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const hhmmFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const dayMonthFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
})

function parts(fmt: Intl.DateTimeFormat, d: Date): Partial<Record<Intl.DateTimeFormatPartTypes, string>> {
  const out: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value
  return out
}

/** "viernes 23 de octubre, 23:59" — assembled from parts, never from ICU literals. */
export function formatHeaderDate(d: Date): string {
  const p = parts(headerFormat, d)
  return `${p.weekday} ${p.day} de ${p.month}, ${p.hour}:${p.minute}`.toLowerCase()
}

/** "00:05" in Argentina time, 24 h. */
export function formatHHmm(d: Date): string {
  const p = parts(hhmmFormat, d)
  return `${p.hour}:${p.minute}`
}

/** "23/10" in Argentina time. */
export function formatDayMonth(d: Date): string {
  // es-AR ICU drops '2-digit' for day/month ("5/1"), so pad explicitly.
  const p = parts(dayMonthFormat, d)
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}`
}
