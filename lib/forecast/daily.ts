// Daily rows for /pronostico (UI-SPEC "Anatomía de la fila", D-08..D-12). Pure.
// Everything the client island needs is precomputed here as plain serialisable data.
import { localDateKey, longDayLabel, relativeDayLabel } from '@/lib/time'
import { formatTemp } from '@/lib/weather/format'
import type { DailyPoint, DayConfidence } from '@/lib/weather/types'
import { describeWeather } from '@/lib/weather/wmo'
import type { Verdict } from './agreement'
import { rainRange, rainRangeText, toDisplayPct } from './ensemble'
import { rowStatus } from './rowStatus'

const NBSP = '\u00A0'

export type DoubtWord = 'Dudan' | 'Sin acuerdo' | 'Solo un modelo'

/** Fractions 0..1 of the common scale of the visible days (D-06). */
export interface DailyBar {
  lo: number
  hi: number
  bandLo: number | null // null without that percentile: no piece is drawn on that side
  bandHi: number | null
}

export interface DailyRow {
  key: string // local 'YYYY-MM-DD'
  label: string // 'Hoy' · 'Mañana' · 'dom 25'
  stateLabel: string | null // always complete: it feeds srText, the screen shows the variants below
  statusNormal: string | null // state on line 2 for a column of at least 327 px; null = no room (D-04)
  statusCompact: string | null // same, under 327 px
  minText: string
  maxText: string
  rainText: string | null
  probText: string | null // '70 %' with NBSP · '—' day without data · null under 10 % or ensemble down
  probPct: number | null // shown value, the height of the rain gauge fill
  ensembleUp: boolean // some visible day has ensemble data; false = phase-2 look
  verdict: Verdict
  word: DoubtWord | null // sentence case, uppercased by CSS; null when agreeing or without data (D-12)
  modelsUp: boolean // some visible day has a verdict other than sinDato
  bar7: DailyBar | null // scale of rows 0..6; null for rows 7..13
  bar14: DailyBar | null // scale of all rows
  tentative: boolean // days 8..14 (D-08)
  srText: string
}

/** Max rows shown when expanded; the first DEFAULT_DAYS are the collapsed list (D-08). */
export const MAX_DAYS = 14
export const DEFAULT_DAYS = 7
/** Index of day 4: from here on the rain is the ensemble range (D-07). */
const FIRST_RANGE_INDEX = 3

/** Rounded mm only from 1 mm (D-10). The probability of precipitation is never used. */
export function rainText(mm: number | null): string | null {
  return mm !== null && mm >= 1 ? `${Math.round(mm)}${NBSP}mm` : null
}

const tempText = (v: number | null) => (v === null ? '—' : `${formatTemp(v)}°`)

type Scale = { lo: number; hi: number }
type EnsembleFields = NonNullable<DayConfidence['ensemble']>
type EnsembleByDate = Map<string, DayConfidence['ensemble']>

/**
 * Band limits in degrees, null by side. Each one contains the main value: the main forecast is not
 * a member of the ensemble, so a p90 under the maximum is normal and must not eat the segment.
 */
function bandFor(d: DailyPoint, ensemble: EnsembleFields | null): { lo: number | null; hi: number | null } {
  if (!ensemble || d.tMinC === null || d.tMaxC === null) return { lo: null, hi: null }
  const { tMinP10C: p10, tMaxP90C: p90 } = ensemble
  return {
    lo: p10 === null ? null : Math.min(p10, d.tMinC),
    hi: p90 === null ? null : Math.max(p90, d.tMaxC),
  }
}

function scaleFor(days: DailyPoint[], ensembleByDate: EnsembleByDate): Scale | null {
  const values: number[] = []
  for (const d of days) {
    if (d.tMinC !== null) values.push(d.tMinC)
    if (d.tMaxC !== null) values.push(d.tMaxC)
    // Only what is drawn takes room in the domain: without a band it stays the phase-2 one.
    const band = bandFor(d, ensembleByDate.get(d.date) ?? null)
    if (band.lo !== null) values.push(band.lo)
    if (band.hi !== null) values.push(band.hi)
  }
  if (values.length === 0) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null
  return { lo, hi }
}

// Same clamped linear map as d3 scaleLinear().clamp(true), inline so this module needs no d3.
function barFor(d: DailyPoint, ensemble: EnsembleFields | null, scale: Scale | null): DailyBar | null {
  if (!scale || d.tMinC === null || d.tMaxC === null) return null
  const frac = (v: number) => Math.min(1, Math.max(0, (v - scale.lo) / (scale.hi - scale.lo)))
  const band = bandFor(d, ensemble)
  return {
    lo: frac(d.tMinC),
    hi: frac(d.tMaxC),
    bandLo: band.lo === null ? null : frac(band.lo),
    bandHi: band.hi === null ? null : frac(band.hi),
  }
}

/** The shown value is rounded and capped, so the screen reader gets the real count instead (D-09). */
function probabilitySentence(ensembleUp: boolean, ensemble: EnsembleFields | null): string {
  if (!ensembleUp) return ''
  if (!ensemble) return ' Sin dato de probabilidad.'
  return ` ${ensemble.rainMembers} de ${ensemble.members} escenarios traen lluvia.`
}

const mmSentence = (mm: number) => `${mm} ${mm === 1 ? 'milímetro' : 'milímetros'} de lluvia`

/** Same source as the visible text: the range from day 4 with ensemble, the main forecast otherwise. */
function srRain(d: DailyPoint, ensemble: EnsembleFields | null, farDay: boolean): string {
  if (farDay && ensemble) {
    const range = rainRange(ensemble.rainP10Mm, ensemble.rainP90Mm)
    if (!range) return 'sin lluvia significativa'
    return range.lo === range.hi
      ? mmSentence(range.hi)
      : `entre ${range.lo} y ${range.hi} milímetros de lluvia`
  }
  return rainText(d.precipSumMm) !== null && d.precipSumMm !== null
    ? mmSentence(Math.round(d.precipSumMm))
    : 'sin lluvia significativa'
}

function temperatureRangeSentence(d: DailyPoint, ensemble: EnsembleFields | null, farDay: boolean): string {
  if (!farDay) return ''
  const band = bandFor(d, ensemble)
  if (band.lo === null || band.hi === null) return ''
  return ` La temperatura podría ir de ${formatTemp(band.lo)} a ${formatTemp(band.hi)} grados.`
}

/** The short word on screen; the full "no se ponen de acuerdo" goes to the screen reader (D-12). */
const WORDS: Record<Verdict, DoubtWord | null> = {
  coinciden: null,
  dudan: 'Dudan',
  desacuerdo: 'Sin acuerdo',
  solo: 'Solo un modelo',
  sinDato: null,
}

/** Two voters are named as two: with only them, "los modelos" would promise more than there is (D-14). */
function agreementSentence(verdict: Verdict, voters: number): string {
  const subject = voters === 2 ? 'Los 2 modelos con dato' : 'Los modelos'
  switch (verdict) {
    case 'coinciden':
      return ` ${subject} coinciden.`
    case 'dudan':
      return ` ${subject} dudan.`
    case 'desacuerdo':
      return ' Los modelos no se ponen de acuerdo.'
    case 'solo':
      return ' Hay un solo modelo para este día, no se puede comparar.'
    case 'sinDato':
      return ''
  }
}

function srTextFor(
  dayLabel: string,
  stateLabel: string | null,
  d: DailyPoint,
  ensemble: EnsembleFields | null,
  ensembleUp: boolean,
  farDay: boolean,
  agreement: string,
): string {
  const t = (v: number | null) => (v === null ? 'sin dato' : `${formatTemp(v)} grados`)
  const state = stateLabel ? `${stateLabel.toLowerCase()}, ` : ''
  const probability = probabilitySentence(ensembleUp, ensemble)
  const range = temperatureRangeSentence(d, ensemble, farDay)
  return `${dayLabel}: ${state}mínima ${t(d.tMinC)}, máxima ${t(d.tMaxC)}, ${srRain(d, ensemble, farDay)}.${probability}${range}${agreement}`
}

/**
 * Rows from today's local date on (past days of a stale snapshot are dropped, D-12), at most 14.
 * Day keys are compared as 'YYYY-MM-DD' strings; today comes from localDateKey (ART), never UTC.
 * Ensemble and verdict join by date: an entry for a day that is not visible is never used.
 */
export function buildDailyRows(daily: DailyPoint[], now: Date, confidence: DayConfidence[] = []): DailyRow[] {
  const todayKey = localDateKey(now)
  const days = daily.filter((d) => d.date >= todayKey).slice(0, MAX_DAYS)
  const ensembleByDate: EnsembleByDate = new Map(confidence.map((c) => [c.date, c.ensemble]))
  const modelsByDate = new Map(confidence.map((c) => [c.date, c]))
  const scale7 = scaleFor(days.slice(0, DEFAULT_DAYS), ensembleByDate)
  const scale14 = scaleFor(days, ensembleByDate)
  const ensembleUp = days.some((d) => Boolean(ensembleByDate.get(d.date)))
  const verdictOf = (date: string): Verdict => modelsByDate.get(date)?.verdict ?? 'sinDato'
  const modelsUp = days.some((d) => verdictOf(d.date) !== 'sinDato')
  return days.map((d, i) => {
    const stateLabel = describeWeather(d.weatherCode, { night: false }).label
    const ensemble = ensembleByDate.get(d.date) ?? null
    const farDay = i >= FIRST_RANGE_INDEX
    const verdict = verdictOf(d.date)
    const agreement = agreementSentence(verdict, modelsByDate.get(d.date)?.voters ?? 0)
    const rain =
      farDay && ensemble ? rainRangeText(ensemble.rainP10Mm, ensemble.rainP90Mm) : rainText(d.precipSumMm)
    const probPct = ensemble ? toDisplayPct(ensemble.rainMembers, ensemble.members) : null
    const probText = !ensembleUp
      ? null
      : !ensemble
        ? '—'
        : probPct === null
          ? null
          : `${probPct}${NBSP}%`
    const word = WORDS[verdict]
    // With the ensemble down the mm sit in the last column, so they take nothing from line 2.
    const status = rowStatus({
      label: stateLabel,
      word,
      hasGlyph: verdict !== 'sinDato',
      mmText: ensembleUp ? rain : null,
    })
    return {
      key: d.date,
      label: relativeDayLabel(d.date, todayKey),
      stateLabel,
      statusNormal: status.normal,
      statusCompact: status.compact,
      minText: tempText(d.tMinC),
      maxText: tempText(d.tMaxC),
      rainText: rain,
      probText,
      probPct,
      ensembleUp,
      verdict,
      word,
      modelsUp,
      bar7: i < DEFAULT_DAYS ? barFor(d, ensemble, scale7) : null,
      bar14: barFor(d, ensemble, scale14),
      tentative: i >= DEFAULT_DAYS,
      srText: srTextFor(longDayLabel(d.date, todayKey), stateLabel, d, ensemble, ensembleUp, farDay, agreement),
    }
  })
}
