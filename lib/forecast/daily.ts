// Daily rows for /pronostico (UI-SPEC "Anatomía de la fila", D-08..D-12). Pure.
// Everything the client island needs is precomputed here as plain serialisable data.
import { localDateKey, relativeDayLabel } from '@/lib/time'
import { formatTemp } from '@/lib/weather/format'
import type { DailyPoint } from '@/lib/weather/types'
import { describeWeather } from '@/lib/weather/wmo'

/** Fractions 0..1 of the common scale of the visible days (D-09). */
export interface DailyBar {
  lo: number
  hi: number
}

export interface DailyRow {
  key: string // local 'YYYY-MM-DD'
  label: string // 'Hoy' · 'Mañana' · 'dom 25'
  stateLabel: string | null
  minText: string
  maxText: string
  rainText: string | null
  bar7: DailyBar | null // scale of rows 0..6; null for rows 7..13
  bar14: DailyBar | null // scale of all rows
  tentative: boolean // days 8..14 (D-08)
  srText: string
}

/** Max rows shown when expanded; the first DEFAULT_DAYS are the collapsed list (D-08). */
export const MAX_DAYS = 14
export const DEFAULT_DAYS = 7

/** Rounded mm only from 1 mm (D-10). The probability of precipitation is never used. */
export function rainText(mm: number | null): string | null {
  return mm !== null && mm >= 1 ? `${Math.round(mm)} mm` : null
}

const tempText = (v: number | null) => (v === null ? '—' : `${formatTemp(v)}°`)

type Scale = { lo: number; hi: number }

function scaleFor(days: DailyPoint[]): Scale | null {
  const values: number[] = []
  for (const d of days) {
    if (d.tMinC !== null) values.push(d.tMinC)
    if (d.tMaxC !== null) values.push(d.tMaxC)
  }
  if (values.length === 0) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null
  return { lo, hi }
}

// Same clamped linear map as d3 scaleLinear().clamp(true), inline so this module needs no d3.
function barFor(d: DailyPoint, scale: Scale | null): DailyBar | null {
  if (!scale || d.tMinC === null || d.tMaxC === null) return null
  const frac = (v: number) => Math.min(1, Math.max(0, (v - scale.lo) / (scale.hi - scale.lo)))
  return { lo: frac(d.tMinC), hi: frac(d.tMaxC) }
}

function srTextFor(label: string, stateLabel: string | null, d: DailyPoint, rain: string | null): string {
  const t = (v: number | null) => (v === null ? 'sin dato' : `${formatTemp(v)} grados`)
  const state = stateLabel ? `${stateLabel.toLowerCase()}, ` : ''
  const rainPart =
    rain !== null && d.precipSumMm !== null
      ? `${Math.round(d.precipSumMm)} milímetros de lluvia`
      : 'sin lluvia significativa'
  return `${label}: ${state}mínima ${t(d.tMinC)}, máxima ${t(d.tMaxC)}, ${rainPart}`
}

/**
 * Rows from today's local date on (past days of a stale snapshot are dropped, D-12), at most 14.
 * Day keys are compared as 'YYYY-MM-DD' strings; today comes from localDateKey (ART), never UTC.
 */
export function buildDailyRows(daily: DailyPoint[], now: Date): DailyRow[] {
  const todayKey = localDateKey(now)
  const days = daily.filter((d) => d.date >= todayKey).slice(0, MAX_DAYS)
  const scale7 = scaleFor(days.slice(0, DEFAULT_DAYS))
  const scale14 = scaleFor(days)
  return days.map((d, i) => {
    const label = relativeDayLabel(d.date, todayKey)
    const stateLabel = describeWeather(d.weatherCode, { night: false }).label
    const rain = rainText(d.precipSumMm)
    return {
      key: d.date,
      label,
      stateLabel,
      minText: tempText(d.tMinC),
      maxText: tempText(d.tMaxC),
      rainText: rain,
      bar7: i < DEFAULT_DAYS ? barFor(d, scale7) : null,
      bar14: barFor(d, scale14),
      tentative: i >= DEFAULT_DAYS,
      srText: srTextFor(label, stateLabel, d, rain),
    }
  })
}
