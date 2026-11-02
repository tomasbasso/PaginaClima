// Daily rows for /pronostico (UI-SPEC "Anatomía de la fila", D-08..D-12). Pure.
// Everything the client island needs is precomputed here as plain serialisable data.
import { localDateKey, longDayLabel, relativeDayLabel } from '@/lib/time'
import { formatTemp } from '@/lib/weather/format'
import type { DailyPoint, DayConfidence } from '@/lib/weather/types'
import { describeWeather } from '@/lib/weather/wmo'
import { toDisplayPct } from './ensemble'

const NBSP = '\u00A0'

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
  probText: string | null // '70 %' with NBSP · '—' day without data · null under 10 % or ensemble down
  probPct: number | null // shown value, the height of the rain gauge fill
  ensembleUp: boolean // some visible day has ensemble data; false = phase-2 look
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
  return mm !== null && mm >= 1 ? `${Math.round(mm)}${NBSP}mm` : null
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

type EnsembleFields = NonNullable<DayConfidence['ensemble']>

/** The shown value is rounded and capped, so the screen reader gets the real count instead (D-09). */
function probabilitySentence(ensembleUp: boolean, ensemble: EnsembleFields | null): string {
  if (!ensembleUp) return ''
  if (!ensemble) return ' Sin dato de probabilidad.'
  return ` ${ensemble.rainMembers} de ${ensemble.members} escenarios traen lluvia.`
}

function srTextFor(
  dayLabel: string,
  stateLabel: string | null,
  d: DailyPoint,
  rain: string | null,
  probability: string,
): string {
  const t = (v: number | null) => (v === null ? 'sin dato' : `${formatTemp(v)} grados`)
  const state = stateLabel ? `${stateLabel.toLowerCase()}, ` : ''
  const mm = rain !== null && d.precipSumMm !== null ? Math.round(d.precipSumMm) : null
  const rainPart =
    mm === null ? 'sin lluvia significativa' : `${mm} ${mm === 1 ? 'milímetro' : 'milímetros'} de lluvia`
  return `${dayLabel}: ${state}mínima ${t(d.tMinC)}, máxima ${t(d.tMaxC)}, ${rainPart}.${probability}`
}

/**
 * Rows from today's local date on (past days of a stale snapshot are dropped, D-12), at most 14.
 * Day keys are compared as 'YYYY-MM-DD' strings; today comes from localDateKey (ART), never UTC.
 * The ensemble joins by date: an entry for a day that is not visible is never used.
 */
export function buildDailyRows(daily: DailyPoint[], now: Date, confidence: DayConfidence[] = []): DailyRow[] {
  const todayKey = localDateKey(now)
  const days = daily.filter((d) => d.date >= todayKey).slice(0, MAX_DAYS)
  const scale7 = scaleFor(days.slice(0, DEFAULT_DAYS))
  const scale14 = scaleFor(days)
  const ensembleByDate = new Map(confidence.map((c) => [c.date, c.ensemble]))
  const ensembleUp = days.some((d) => Boolean(ensembleByDate.get(d.date)))
  return days.map((d, i) => {
    const stateLabel = describeWeather(d.weatherCode, { night: false }).label
    const rain = rainText(d.precipSumMm)
    const ensemble = ensembleByDate.get(d.date) ?? null
    const probPct = ensemble ? toDisplayPct(ensemble.rainMembers, ensemble.members) : null
    const probText = !ensembleUp
      ? null
      : !ensemble
        ? '—'
        : probPct === null
          ? null
          : `${probPct}${NBSP}%`
    return {
      key: d.date,
      label: relativeDayLabel(d.date, todayKey),
      stateLabel,
      minText: tempText(d.tMinC),
      maxText: tempText(d.tMaxC),
      rainText: rain,
      probText,
      probPct,
      ensembleUp,
      bar7: i < DEFAULT_DAYS ? barFor(d, scale7) : null,
      bar14: barFor(d, scale14),
      tentative: i >= DEFAULT_DAYS,
      srText: srTextFor(
        longDayLabel(d.date, todayKey),
        stateLabel,
        d,
        rain,
        probabilitySentence(ensembleUp, ensemble),
      ),
    }
  })
}
