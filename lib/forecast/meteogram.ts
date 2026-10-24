// 48 h meteogram geometry (UI-SPEC 'Geometría', D-04/D-06/D-07). Pure; d3 only for scales and paths.
// x is the hour INDEX (never a time scale); local hour and day come from the -03:00 strings.
import { scaleLinear } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { dayKeyOf, hourOf } from '@/lib/forecast/hours'
import { relativeDayLabel } from '@/lib/time'
import { formatInt, formatTemp } from '@/lib/weather/format'
import type { HourlyPoint } from '@/lib/weather/types'

/** Temperature panel height; the curve lives between TEMP_PAD and TEMP_H − TEMP_PAD. */
export const TEMP_H = 120
export const TEMP_PAD = 20
/** Rain band under the temperature panel; bars grow up to RAIN_BAR_MAX from the PLOT_H baseline. */
export const RAIN_H = 40
export const RAIN_BAR_MAX = 24
/** Rain scale floor (Pitfall 7): 0.2 mm must not look like a downpour. */
export const RAIN_FLOOR_MM = 4
export const RAIN_MIN_MM = 0.1
/** A rain peak label appears only when the 48 h max reaches this. */
export const RAIN_PEAK_MIN_MM = 1
export const MIN_TEMP_SPAN_C = 8
export const AXIS_GAP = 4
export const AXIS_H = 16
/** Temperature + rain: the scrubber's touch zone in plan 04. */
export const PLOT_H = TEMP_H + RAIN_H
export const CHART_H = PLOT_H + AXIS_GAP + AXIS_H
/** Estimated glyph width of 12 px numeric labels. */
export const CHAR_W = 7
/** Estimated glyph width of 12 px uppercase day labels with 0.14em tracking. */
export const DAY_CHAR_W = 9
export const LABEL_H = 16
/** Below this many future hours with temperature the section shows its empty copy. */
export const MIN_METEOGRAM_HOURS = 12
/** SSR width: 390 − 2 × 24 px margins. */
export const DEFAULT_WIDTH = 342
/** Day segments shorter than this get no max/min labels. */
export const MIN_DAY_POINTS_FOR_LABELS = 6
export const MAX_TEMP_LABELS = 6
const DAY_LABEL_Y = 4
const DAY_LABEL_INSET = 4
const DAY_LABEL_MARGIN = 8
const TEMP_LABEL_GAP = 4

export interface MeteogramLayout {
  width: number
  height: number
  n: number
  /** x of every point. */
  xs: number[]
  step: number
  tempY: (number | null)[]
  tempPath: string | null
  areaPath: string | null
  rainBars: { x: number; y: number; w: number; h: number }[]
  /** x = label centre, y = top of the 16 px label box. */
  rainPeak: { x: number; y: number; text: string } | null
  nightBands: { x: number; w: number }[]
  /** x of each local-00 point. */
  daySeparators: number[]
  /** x = LEFT edge, y = top of the box. Text in sentence case (the renderer uppercases). */
  dayLabels: { x: number; y: number; text: string }[]
  /** x = label centre, y = top of the box. */
  hourTicks: { x: number; y: number; text: string }[]
  /** x = label centre, y = top of the box. */
  tempLabels: { x: number; y: number; text: string; kind: 'max' | 'min' }[]
  zeroY: number | null
  /** No temperature at all. */
  empty: boolean
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

const chars = (t: string) => [...t].length

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function clampCentre(cx: number, w: number, width: number): number {
  return Math.min(Math.max(cx, w / 2), Math.max(w / 2, width - w / 2))
}

function centredBox(cx: number, y: number, text: string): Box {
  const w = chars(text) * CHAR_W
  return { x: cx - w / 2, y, w, h: LABEL_H }
}

/** Temperature domain [min − 1, max + 1], widened symmetrically to at least MIN_TEMP_SPAN_C. */
function tempDomain(temps: number[]): [number, number] {
  let lo = Math.min(...temps) - 1
  let hi = Math.max(...temps) + 1
  if (hi - lo < MIN_TEMP_SPAN_C) {
    const mid = (lo + hi) / 2
    lo = mid - MIN_TEMP_SPAN_C / 2
    hi = mid + MIN_TEMP_SPAN_C / 2
  }
  return [lo, hi]
}

export function layoutMeteogram(points: HourlyPoint[], width: number, todayKey: string): MeteogramLayout {
  const n = points.length
  const x = scaleLinear().domain([0, Math.max(1, n - 1)]).range([0, width])
  const step = width / Math.max(1, n - 1)
  const xs = points.map((_, i) => x(i))

  // Temperature
  const temps = points.flatMap((p) => (p.tempC === null ? [] : [p.tempC]))
  const empty = temps.length === 0
  let tempY: (number | null)[] = points.map(() => null)
  let tempPath: string | null = null
  let areaPath: string | null = null
  let zeroY: number | null = null
  let y: ((v: number) => number) | null = null
  if (!empty) {
    const [lo, hi] = tempDomain(temps)
    const ys = scaleLinear().domain([lo, hi]).range([TEMP_H - TEMP_PAD, TEMP_PAD])
    y = (v: number) => ys(v)
    tempY = points.map((p) => (p.tempC === null ? null : ys(p.tempC)))
    tempPath =
      line<HourlyPoint>()
        .defined((p) => p.tempC !== null)
        .x((_, i) => x(i))
        .y((p) => ys(p.tempC as number))
        .curve(curveMonotoneX)
        .digits(1)(points) || null
    areaPath =
      area<HourlyPoint>()
        .defined((p) => p.tempC !== null)
        .x((_, i) => x(i))
        .y0(TEMP_H)
        .y1((p) => ys(p.tempC as number))
        .curve(curveMonotoneX)
        .digits(1)(points) || null
    if (lo <= 0 && hi >= 0) zeroY = ys(0)
  }

  // Rain
  const mms = points.map((p) => p.precipMm ?? 0)
  const maxMm = n ? Math.max(...mms) : 0
  const rainScale = scaleLinear().domain([0, Math.max(RAIN_FLOOR_MM, maxMm)]).range([0, RAIN_BAR_MAX])
  const barW = Math.max(1, step - 2)
  const rainBars: MeteogramLayout['rainBars'] = []
  points.forEach((p, i) => {
    if (p.precipMm === null || p.precipMm < RAIN_MIN_MM) return
    const x0 = Math.max(0, xs[i] - barW / 2)
    const x1 = Math.min(width, xs[i] + barW / 2)
    const h = rainScale(p.precipMm)
    rainBars.push({ x: x0, y: PLOT_H - h, w: x1 - x0, h })
  })

  // Night bands: contiguous isDay === 0 runs
  const nightBands: MeteogramLayout['nightBands'] = []
  for (let i = 0; i < n; i++) {
    if (points[i].isDay !== 0) continue
    let j = i
    while (j + 1 < n && points[j + 1].isDay === 0) j++
    const x0 = Math.max(0, xs[i] - step / 2)
    const x1 = Math.min(width, xs[j] + step / 2)
    nightBands.push({ x: x0, w: x1 - x0 })
    i = j
  }

  // Days
  const dayStarts: number[] = []
  const daySeparators: number[] = []
  points.forEach((p, i) => {
    if (hourOf(p.time) === 0) daySeparators.push(xs[i])
    if (i === 0 || hourOf(p.time) === 0) dayStarts.push(i)
  })
  const segments = dayStarts.map((start, k) => ({ start, end: k + 1 < dayStarts.length ? dayStarts[k + 1] - 1 : n - 1 }))

  // Labels, in priority order: day labels > hour ticks > rain peak > max > min.
  const kept: Box[] = []
  const tryKeep = (b: Box) => {
    if (kept.some((k) => intersects(k, b))) return false
    kept.push(b)
    return true
  }

  const dayLabels: MeteogramLayout['dayLabels'] = []
  segments.forEach(({ start, end }, k) => {
    const text = relativeDayLabel(dayKeyOf(points[start].time), todayKey)
    const w = chars(text) * DAY_CHAR_W
    const segX0 = xs[start]
    const segX1 = k + 1 < segments.length ? xs[segments[k + 1].start] : width
    if (end < start || segX1 - segX0 < w + DAY_LABEL_MARGIN) return
    const lx = Math.min(start === 0 ? 0 : segX0 + DAY_LABEL_INSET, width - w)
    if (tryKeep({ x: lx, y: DAY_LABEL_Y, w, h: LABEL_H })) dayLabels.push({ x: lx, y: DAY_LABEL_Y, text })
  })

  const hourTicks: MeteogramLayout['hourTicks'] = []
  const tickY = PLOT_H + AXIS_GAP
  points.forEach((p, i) => {
    const h = hourOf(p.time)
    if (h % 6 !== 0) return
    const text = String(h).padStart(2, '0')
    const cx = clampCentre(xs[i], chars(text) * CHAR_W, width)
    if (tryKeep(centredBox(cx, tickY, text))) hourTicks.push({ x: cx, y: tickY, text })
  })

  let rainPeak: MeteogramLayout['rainPeak'] = null
  if (maxMm >= RAIN_PEAK_MIN_MM) {
    const i = mms.indexOf(maxMm)
    const text = `${formatInt(maxMm)} mm`
    const cx = clampCentre(xs[i], chars(text) * CHAR_W, width)
    const py = PLOT_H - rainScale(maxMm) - LABEL_H
    if (tryKeep(centredBox(cx, py, text))) rainPeak = { x: cx, y: py, text }
  }

  const tempLabels: MeteogramLayout['tempLabels'] = []
  if (y) {
    const maxCands: MeteogramLayout['tempLabels'] = []
    const minCands: MeteogramLayout['tempLabels'] = []
    for (const { start, end } of segments) {
      let iMax = -1
      let iMin = -1
      let count = 0
      for (let i = start; i <= end; i++) {
        const t = points[i].tempC
        if (t === null) continue
        count++
        if (iMax < 0 || t > (points[iMax].tempC as number)) iMax = i
        if (iMin < 0 || t < (points[iMin].tempC as number)) iMin = i
      }
      if (count < MIN_DAY_POINTS_FOR_LABELS) continue
      const tMax = points[iMax].tempC as number
      const tMin = points[iMin].tempC as number
      const maxText = `${formatTemp(tMax)}°`
      const minText = `${formatTemp(tMin)}°`
      maxCands.push({
        x: clampCentre(xs[iMax], chars(maxText) * CHAR_W, width),
        y: Math.max(0, y(tMax) - TEMP_LABEL_GAP - LABEL_H),
        text: maxText,
        kind: 'max',
      })
      minCands.push({
        x: clampCentre(xs[iMin], chars(minText) * CHAR_W, width),
        y: Math.min(TEMP_H - LABEL_H, y(tMin) + TEMP_LABEL_GAP),
        text: minText,
        kind: 'min',
      })
    }
    for (const c of [...maxCands, ...minCands]) {
      if (tempLabels.length >= MAX_TEMP_LABELS) break
      if (tryKeep(centredBox(c.x, c.y, c.text))) tempLabels.push(c)
    }
  }

  return {
    width,
    height: CHART_H,
    n,
    xs,
    step,
    tempY,
    tempPath,
    areaPath,
    rainBars,
    rainPeak,
    nightBands,
    daySeparators,
    dayLabels,
    hourTicks,
    tempLabels,
    zeroY,
    empty,
  }
}

/** aria-label copy of the chart (UI-SPEC "Copy"). */
export function meteogramSummary(points: HourlyPoint[]): string {
  const parts: string[] = []
  const temps = points.flatMap((p) => (p.tempC === null ? [] : [p.tempC]))
  if (temps.length) {
    parts.push(`temperatura entre ${formatTemp(Math.min(...temps))} y ${formatTemp(Math.max(...temps))} grados`)
  }
  const total = points.reduce((s, p) => s + (p.precipMm ?? 0), 0)
  if (total < RAIN_MIN_MM) parts.push('sin lluvia')
  else if (Math.round(total) < 1) parts.push('lluvia total de menos de 1 milímetro')
  else {
    const mm = formatInt(total)
    parts.push(`lluvia total ${mm} ${mm === '1' ? 'milímetro' : 'milímetros'}`)
  }
  const winds = points.flatMap((p) => (p.windKmh === null ? [] : [p.windKmh]))
  if (winds.length) parts.push(`viento de hasta ${formatInt(Math.max(...winds))} kilómetros por hora`)
  return `Meteograma de las próximas 48 horas: ${parts.join(', ')}.`
}
