// View model of the "Lluvia acumulada" block (RAIN-01..03, D-03..D-05, UI-SPEC "Bloque 2"). Pure.
// RainData lives here (not in series.ts, which is server-only) so tests and the component can
// import the type.
import { compareRain } from './compare'
import { lastRainText, type LastRain } from './lastRain'
import { loadClimatology, normalFor } from './normal'
import { periodStarts, periodTotal } from './periods'
import type { StitchedRain } from './stitch'
import { addDaysToKey, localDateKey, monthLong, weekdayLong } from '@/lib/time'
import { formatMm } from '@/lib/weather/format'

export type RainData =
  | { status: 'ok'; stitched: StitchedRain; recentError: string | null }
  | { status: 'error'; code: string }

/** Fractions of the column width (0..1). The bigger of observed/normal sits at BAR_PEAK. */
export type RainBar = { observedFrac: number; normalFrac: number }

export type RainRow = {
  id: 'week' | 'month' | 'year'
  label: string
  mm: number
  mmText: string
  /** Null without climatology (state "Sin climatología"); same for the three below. */
  normalMm: number | null
  normalText: string | null
  compareText: string | null
  bar: RainBar | null
  srText: string
}

export type RainView =
  | { status: 'error' }
  | {
      status: 'ok'
      rows: RainRow[]
      noticeText: string | null
      lastRain: LastRain
      disclaimer: string
      missingNormalText: string | null
    }

const NBSP = ' '
/** UI-SPEC "Escala [default]": max = max(observed, normal) / 0.8. */
const BAR_PEAK = 0.8
const DISCLAIMER = 'Estimado por reanálisis, no pluviómetro.'
const DISCLAIMER_NORMAL = 'Lo normal es el promedio 1991–2020 a la misma fecha.'
const MISSING_NORMAL = 'No pudimos cargar el promedio histórico para comparar.'

function lowerFirst(t: string): string {
  return t.charAt(0).toLowerCase() + t.slice(1)
}

export function rainBar(observedMm: number, normalMm: number): RainBar {
  const peak = Math.max(observedMm, normalMm)
  const max = peak > 0 ? peak / BAR_PEAK : 1
  return { observedFrac: observedMm / max, normalFrac: normalMm / max }
}

function row(id: RainRow['id'], label: string, srLead: string, mm: number, normalMm: number | null): RainRow {
  const mmText = formatMm(mm)
  const srBase = `${srLead} llovieron ${mmText} milímetros.`
  if (normalMm === null) {
    return { id, label, mm, mmText, normalMm: null, normalText: null, compareText: null, bar: null, srText: srBase }
  }
  const normalMmText = formatMm(normalMm)
  const compareText = compareRain(mm, normalMm)
  return {
    id,
    label,
    mm,
    mmText,
    normalMm,
    normalText: `Lo normal a esta fecha: ${normalMmText}${NBSP}mm`,
    compareText,
    bar: rainBar(mm, normalMm),
    // After a colon Spanish continues in lowercase: '…: casi lo normal.'
    srText: `${srBase} Lo normal a esta fecha son ${normalMmText} milímetros: ${lowerFirst(compareText)}.`,
  }
}

export function buildRainView(
  data: RainData | { status: 'error' },
  now: Date,
  climatology: readonly number[] | null = loadClimatology(),
): RainView {
  if (data.status !== 'ok' || data.stitched.dataUntil === null) return { status: 'error' }
  const { days, dataUntil, lagging, todayFraction, start } = data.stitched
  const todayKey = localDateKey(now)
  const starts = periodStarts(todayKey)
  // A period starting after dataUntil sums nothing (0); never a rolling window.
  const total = (from: string) => periodTotal(days, from, dataUntil)
  // Normal prorated to dataUntil (not today): "a la misma fecha" stays literal with lagging data.
  // todayFraction is 0 when today is not included, and then today is never reached anyway.
  const normal = (from: string) =>
    climatology ? normalFor(climatology, from, dataUntil, { todayKey, todayFraction }) : null

  const rows: RainRow[] = [
    row('week', 'En lo que va de la semana', 'En lo que va de la semana', total(starts.week), normal(starts.week)),
    row(
      'month',
      `En lo que va de ${monthLong(todayKey)}`,
      'En lo que va del mes',
      total(starts.month),
      normal(starts.month),
    ),
    row(
      'year',
      `En lo que va de ${todayKey.slice(0, 4)}`,
      'En lo que va del año',
      total(starts.year),
      normal(starts.year),
    ),
  ]

  // lagging = dataUntil before yesterday (stitch.ts); re-checked here against the render instant.
  const isLagging = lagging && dataUntil < addDaysToKey(todayKey, -1)
  const noticeText = isLagging
    ? `Los datos de lluvia llegan hasta el ${weekdayLong(dataUntil)} ${Number(dataUntil.slice(8, 10))}. Sumamos los días que faltan cuando estén disponibles.`
    : null

  return {
    status: 'ok',
    rows,
    noticeText,
    lastRain: lastRainText(days, todayKey, start),
    disclaimer: climatology ? `${DISCLAIMER} ${DISCLAIMER_NORMAL}` : DISCLAIMER,
    missingNormalText: climatology ? null : MISSING_NORMAL,
  }
}
