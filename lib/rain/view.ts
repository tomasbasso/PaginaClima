// View model of the "Lluvia acumulada" block (RAIN-01, UI-SPEC "Bloque 2"). Pure.
// RainData lives here (not in series.ts, which is server-only) so tests and the component can
// import the type. 05-03 extends RainRow/RainView with normal, compare and lastRain.
import { periodStarts, periodTotal } from './periods'
import type { StitchedRain } from './stitch'
import { addDaysToKey, localDateKey, monthLong, weekdayLong } from '@/lib/time'
import { formatMm } from '@/lib/weather/format'

export type RainData =
  | { status: 'ok'; stitched: StitchedRain; recentError: string | null }
  | { status: 'error'; code: string }

export type RainRow = {
  id: 'week' | 'month' | 'year'
  label: string
  mm: number
  mmText: string
  srText: string
}

export type RainView =
  | { status: 'error' }
  | { status: 'ok'; rows: RainRow[]; noticeText: string | null }

function row(id: RainRow['id'], label: string, srLead: string, mm: number): RainRow {
  const mmText = formatMm(mm)
  return { id, label, mm, mmText, srText: `${srLead} llovieron ${mmText} milímetros.` }
}

export function buildRainView(data: RainData | { status: 'error' }, now: Date): RainView {
  if (data.status !== 'ok' || data.stitched.dataUntil === null) return { status: 'error' }
  const { days, dataUntil, lagging } = data.stitched
  const todayKey = localDateKey(now)
  const starts = periodStarts(todayKey)
  // A period starting after dataUntil sums nothing (0); never a rolling window.
  const total = (start: string) => periodTotal(days, start, dataUntil)

  const rows: RainRow[] = [
    row('week', 'En lo que va de la semana', 'En lo que va de la semana', total(starts.week)),
    row('month', `En lo que va de ${monthLong(todayKey)}`, 'En lo que va del mes', total(starts.month)),
    row('year', `En lo que va de ${todayKey.slice(0, 4)}`, 'En lo que va del año', total(starts.year)),
  ]

  // lagging = dataUntil before yesterday (stitch.ts); re-checked here against the render instant.
  const isLagging = lagging && dataUntil < addDaysToKey(todayKey, -1)
  const noticeText = isLagging
    ? `Los datos de lluvia llegan hasta el ${weekdayLong(dataUntil)} ${Number(dataUntil.slice(8, 10))}. Sumamos los días que faltan cuando estén disponibles.`
    : null

  return { status: 'ok', rows, noticeText }
}
