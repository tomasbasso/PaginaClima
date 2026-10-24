// 48 h meteogram geometry (UI-SPEC 'Geometría', D-04/D-06/D-07). Pure; d3 only for scales and paths.
// x is the hour INDEX (never a time scale); local hour and day come from the -03:00 strings.
import { scaleLinear } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { DAY_PART_PHRASE, dayKeyOf, dayPart, hourOf } from '@/lib/forecast/hours'
import { addDaysToKey, relativeDayLabel, weekdayLong } from '@/lib/time'
import { formatInt, formatTemp } from '@/lib/weather/format'
import { CALM_KMH, windSector } from '@/lib/weather/wind'
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
/** Wind rows under the hour axis (D-05): 8 px gap, 16 px arrows, 16 px km/h. */
export const WIND_GAP = 8
export const ARROW_H = 16
export const KMH_H = 16
/** One wind column every this many hours (16 columns over 48 h). */
export const WIND_EVERY = 3
/** Wind column centres stay this far from the edges (the 12 px arrow needs 6). */
export const WIND_EDGE = 7
/**
 * Minimum distance between wind column centres: two 12 px tabular digits measure ≈ 14.4 px, so the
 * edge-clamped first column would touch the second (x ≈ 21.8 at 342 px). Measured with CDP.
 * On very narrow charts the gap shrinks to what fits between the edges.
 */
export const WIND_MIN_GAP = 18
/** Gusts from this speed are flagged (peach + text). Distinct from the headline's 60 on purpose. */
export const STRONG_GUST_KMH = 50
export const CHART_H = PLOT_H + AXIS_GAP + AXIS_H + WIND_GAP + ARROW_H + KMH_H
/** Estimated glyph width of 12 px numeric labels. */
export const CHAR_W = 7
/** Estimated glyph width of 12 px uppercase day labels with 0.14em tracking (measured: MAÑANA ≈ 63 px). */
export const DAY_CHAR_W = 11
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
  /** Wind row columns (every WIND_EVERY hours). */
  wind: WindColumn[]
  /** No temperature at all. */
  empty: boolean
}

export interface WindColumn {
  /** Column centre. */
  x: number
  /** Centre of the 16 px arrow row. */
  arrowY: number
  /** Centre of the 16 px km/h row. */
  textY: number
  /** Arrow rotation in degrees (points downwind); null = no arrow. */
  rotate: number | null
  text: string
  strong: boolean
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
    wind: windColumns(points, width),
    empty,
  }
}

const WIND_TOP = PLOT_H + AXIS_GAP + AXIS_H + WIND_GAP

/** 16 wind columns at indices 0, 3, …; the arrow points where the air goes (SMN). */
export function windColumns(points: HourlyPoint[], width: number): WindColumn[] {
  const n = points.length
  const x = scaleLinear().domain([0, Math.max(1, n - 1)]).range([0, width])
  const out: WindColumn[] = []
  for (let i = 0; i < n; i += WIND_EVERY) {
    const p = points[i]
    const kmh = p.windKmh
    const calm = kmh !== null && kmh < CALM_KMH
    const rotate = kmh === null || calm || p.windDirDeg === null ? null : (p.windDirDeg + 180) % 360
    const text = kmh === null ? '—' : calm ? '0' : formatInt(kmh)
    const strong = points
      .slice(i, i + WIND_EVERY)
      .some((q) => q.gustKmh !== null && q.gustKmh >= STRONG_GUST_KMH)
    out.push({
      x: Math.min(Math.max(x(i), WIND_EDGE), Math.max(WIND_EDGE, width - WIND_EDGE)),
      arrowY: WIND_TOP + ARROW_H / 2,
      textY: WIND_TOP + ARROW_H + KMH_H / 2,
      rotate,
      text,
      strong,
    })
  }
  // Push neighbours apart only where the edge clamp squeezed them (first/last columns).
  const gap = out.length > 1 ? Math.min(WIND_MIN_GAP, (width - 2 * WIND_EDGE) / (out.length - 1)) : 0
  for (let k = 1; k < out.length; k++) out[k].x = Math.max(out[k].x, out[k - 1].x + gap)
  for (let k = out.length - 2; k >= 0; k--) {
    if (out[k + 1].x > width - WIND_EDGE) out[k + 1].x = Math.max(WIND_EDGE, width - WIND_EDGE)
    out[k].x = Math.min(out[k].x, out[k + 1].x - gap)
  }
  return out
}

/** 'Ráfagas fuertes de hasta 68 km/h mañana a la tarde', or null without gusts ≥ 50. */
export function strongGustLine(points: HourlyPoint[], todayKey: string): string | null {
  let best = -1
  for (let i = 0; i < points.length; i++) {
    const g = points[i].gustKmh
    if (g === null) continue
    if (best < 0 || g > (points[best].gustKmh as number)) best = i
  }
  if (best < 0) return null
  const max = points[best].gustKmh as number
  if (max < STRONG_GUST_KMH) return null
  const key = dayKeyOf(points[best].time)
  const day = key === todayKey ? 'hoy' : key === addDaysToKey(todayKey, 1) ? 'mañana' : `el ${weekdayLong(key)}`
  const franja = DAY_PART_PHRASE[dayPart(hourOf(points[best].time))]
  return `Ráfagas fuertes de hasta ${formatInt(max)} km/h ${day} ${franja}`
}

export interface Readout {
  /** Sentence case ('Ahora', 'Mañana 15:00'); the UI uppercases with CSS. */
  timeLabel: string
  temp: string
  rain: string
  wind: string
  /** Only for gusts ≥ STRONG_GUST_KMH. */
  gust: string | null
}

const hh = (time: string) => `${String(hourOf(time)).padStart(2, '0')}:00`

/** null = no rain worth naming; otherwise '0,4' or '12' (comma decimal under 10). */
function rainAmount(mm: number): string | null {
  if (mm < RAIN_MIN_MM) return null
  const one = Math.round(mm * 10) / 10
  return one < 10 ? one.toFixed(1).replace('.', ',') : formatInt(mm)
}

/** Fixed readout line above the chart for the selected hour (UI-SPEC "Lectura"). */
export function readoutFor(points: HourlyPoint[], i: number, todayKey: string): Readout {
  const p = points[i]
  const timeLabel = i === 0 ? 'Ahora' : `${relativeDayLabel(dayKeyOf(p.time), todayKey)} ${hh(p.time)}`
  const temp = p.tempC === null ? '—' : `${formatTemp(p.tempC)}°`
  const amount = p.precipMm === null ? undefined : rainAmount(p.precipMm)
  const rain = amount === undefined ? '—' : amount === null ? 'sin lluvia' : `${amount} mm`
  let wind: string
  if (p.windKmh === null) wind = '—'
  else if (p.windKmh < CALM_KMH) wind = 'calma'
  else if (p.windDirDeg === null) wind = `${formatInt(p.windKmh)} km/h`
  else wind = `${formatInt(p.windKmh)} km/h ${windSector(p.windDirDeg).short}`
  const gust = p.gustKmh !== null && p.gustKmh >= STRONG_GUST_KMH ? `ráfagas ${formatInt(p.gustKmh)} km/h` : null
  return { timeLabel, temp, rain, wind, gust }
}

/** aria-valuetext of the scrubber slider (UI-SPEC copy). */
export function valueTextFor(p: HourlyPoint): string {
  const parts = [`${weekdayLong(dayKeyOf(p.time))} ${hh(p.time)}`]
  parts.push(p.tempC === null ? 'temperatura sin dato' : `${formatTemp(p.tempC)} grados`)
  if (p.precipMm === null) parts.push('lluvia sin dato')
  else {
    const amount = rainAmount(p.precipMm)
    parts.push(amount === null ? 'sin lluvia' : `${amount} ${amount === '1' ? 'milímetro' : 'milímetros'}`)
  }
  if (p.windKmh === null) parts.push('viento sin dato')
  else if (p.windKmh < CALM_KMH) parts.push('viento en calma')
  else {
    const dir = p.windDirDeg === null ? '' : ` del ${windSector(p.windDirDeg).long}`
    parts.push(`viento ${formatInt(p.windKmh)} kilómetros por hora${dir}`)
  }
  if (p.gustKmh !== null && p.gustKmh >= STRONG_GUST_KMH) parts.push(`ráfagas de ${formatInt(p.gustKmh)}`)
  return parts.join(', ')
}

/** Pointer x (relative to the chart) → hour index; same mapping as x.invert, clamped to [0, n − 1]. */
export function indexAtX(px: number, width: number, n: number): number {
  if (n <= 1 || width <= 0) return 0
  return Math.min(n - 1, Math.max(0, Math.round((px / width) * (n - 1))))
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
