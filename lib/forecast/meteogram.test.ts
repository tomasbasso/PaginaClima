import { describe, expect, it } from 'vitest'
import fixture from '@/lib/sources/__fixtures__/open-meteo-forecast.json'
import { ForecastDto } from '@/lib/sources/openMeteoForecast.schema'
import { normalizeForecast } from '@/lib/weather/normalize'
import type { HourlyPoint } from '@/lib/weather/types'
import { makeHourly } from './__fixtures__/build'
import {
  AXIS_GAP,
  CHAR_W,
  DAY_CHAR_W,
  LABEL_H,
  layoutMeteogram,
  type MeteogramLayout,
  meteogramSummary,
  MIN_TEMP_SPAN_C,
  PLOT_H,
  RAIN_BAR_MAX,
  TEMP_H,
  TEMP_PAD,
} from './meteogram'

const TODAY = '2026-10-23'
const START = '2026-10-23T14:00:00-03:00'

/** Smooth daily cycle: min at ~03h, max at ~15h. */
function cycle(base: number, amp: number) {
  return (_: number, hour: number) => ({ tempC: base + amp * Math.sin(((hour - 9) / 24) * 2 * Math.PI) })
}

interface Box {
  label: string
  x: number
  y: number
  w: number
  h: number
}

const len = (t: string) => [...t].length

/** Same conventions as the layout: day labels by left edge, everything else by centre. */
function boxes(l: MeteogramLayout): Box[] {
  const out: Box[] = []
  for (const d of l.dayLabels) out.push({ label: `day ${d.text}`, x: d.x, y: d.y, w: len(d.text) * DAY_CHAR_W, h: LABEL_H })
  const centred = [
    ...l.hourTicks.map((t) => ({ ...t, kind: 'tick' })),
    ...(l.rainPeak ? [{ ...l.rainPeak, kind: 'peak' }] : []),
    ...l.tempLabels.map((t) => ({ ...t, kind: t.kind })),
  ]
  for (const c of centred) {
    const w = len(c.text) * CHAR_W
    out.push({ label: `${c.kind} ${c.text}`, x: c.x - w / 2, y: c.y, w, h: LABEL_H })
  }
  return out
}

function expectNoOverlap(l: MeteogramLayout) {
  const bs = boxes(l)
  const eps = 1e-6
  for (const b of bs) {
    expect(b.x, b.label).toBeGreaterThanOrEqual(-eps)
    expect(b.x + b.w, b.label).toBeLessThanOrEqual(l.width + eps)
  }
  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i]
      const b = bs[j]
      const disjoint =
        a.x + a.w <= b.x + eps || b.x + b.w <= a.x + eps || a.y + a.h <= b.y + eps || b.y + b.h <= a.y + eps
      expect(disjoint, `${a.label} overlaps ${b.label}`).toBe(true)
    }
  }
}

describe('layoutMeteogram (FCST-01, D-04/D-06/D-07) under TZ=UTC', () => {
  it('runs under TZ=UTC like Vercel', () => {
    expect(new Date().getTimezoneOffset()).toBe(0)
  })

  it('maps the hour index linearly across the width', () => {
    const l = layoutMeteogram(makeHourly(START, 48), 342, TODAY)
    expect(l.n).toBe(48)
    expect(l.width).toBe(342)
    expect(l.xs[0]).toBe(0)
    expect(l.xs[47]).toBeCloseTo(342)
    expect(l.step).toBeCloseTo(342 / 47)
    expect(l.xs[1]).toBeCloseTo(342 / 47)
  })

  it('puts hour ticks only at local 00/06/12/18 with two-digit text', () => {
    const l = layoutMeteogram(makeHourly(START, 48), 342, TODAY)
    expect(l.hourTicks.map((t) => t.text)).toEqual(['18', '00', '06', '12', '18', '00', '06', '12'])
    expect(l.hourTicks).toHaveLength(8)
    for (const t of l.hourTicks) expect(t.y).toBe(PLOT_H + AXIS_GAP)
  })

  it('draws day separators at local 00 and labels Hoy / Mañana / dom 25', () => {
    const l = layoutMeteogram(makeHourly(START, 48), 342, TODAY)
    expect(l.daySeparators).toHaveLength(2)
    expect(l.daySeparators[0]).toBeCloseTo(l.xs[10])
    expect(l.daySeparators[1]).toBeCloseTo(l.xs[34])
    expect(l.dayLabels.map((d) => d.text)).toEqual(['Hoy', 'Mañana', 'dom 25'])
    expect(l.dayLabels[0].x).toBe(0)
    expect(l.dayLabels[1].x).toBeCloseTo(l.xs[10] + 4)
    expect(l.dayLabels[2].x).toBeCloseTo(l.xs[34] + 4)
    for (const d of l.dayLabels) expect(d.y).toBe(4)
  })

  it('omits a day label whose segment is too narrow (start at 22:00 drops Hoy)', () => {
    const l = layoutMeteogram(makeHourly('2026-10-23T22:00:00-03:00', 48), 342, TODAY)
    expect(l.dayLabels[0].text).toBe('Mañana')
    expect(l.dayLabels.map((d) => d.text)).not.toContain('Hoy')
  })

  it('starts the first day label at x 0 when the data starts at local 00', () => {
    const l = layoutMeteogram(makeHourly('2026-10-24T00:00:00-03:00', 48), 342, TODAY)
    expect(l.dayLabels[0]).toMatchObject({ x: 0, text: 'Mañana' })
    expect(l.dayLabels.map((d) => d.text)).toEqual(['Mañana', 'dom 25'])
  })

  it('widens a flat temperature domain to the minimum span and keeps the curve in the middle band', () => {
    const l = layoutMeteogram(makeHourly(START, 48), 342, TODAY)
    // flat 20 °C → domain [16, 24] → 20 sits in the middle of [20, 100]
    for (const y of l.tempY) expect(y).toBeCloseTo((TEMP_H - TEMP_PAD + TEMP_PAD) / 2)
    expect(MIN_TEMP_SPAN_C).toBe(8)
    const w = layoutMeteogram(makeHourly(START, 48, cycle(15, 8)), 342, TODAY)
    const ys = w.tempY.filter((y): y is number => y !== null)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(TEMP_PAD - 1e-9)
    expect(Math.max(...ys)).toBeLessThanOrEqual(TEMP_H - TEMP_PAD + 1e-9)
  })

  it('splits the temperature path at null hours and flags all-null as empty', () => {
    const gap = makeHourly(START, 48, (i) => (i >= 20 && i < 24 ? { tempC: null } : {}))
    const l = layoutMeteogram(gap, 342, TODAY)
    expect(l.tempPath!.match(/M/g)).toHaveLength(2)
    expect(l.tempY[21]).toBeNull()
    expect(l.empty).toBe(false)
    const none = layoutMeteogram(makeHourly(START, 48, () => ({ tempC: null })), 342, TODAY)
    expect(none.tempPath).toBeNull()
    expect(none.areaPath).toBeNull()
    expect(none.empty).toBe(true)
    expect(none.tempLabels).toEqual([])
    expect(none.zeroY).toBeNull()
  })

  it('draws rain bars only for ≥ 0.1 mm on a 4 mm floor', () => {
    const pts = makeHourly(START, 48, (i) => ({ precipMm: i === 3 ? 0.2 : i === 4 ? 0.05 : i === 5 ? 4 : 0 }))
    const l = layoutMeteogram(pts, 342, TODAY)
    expect(l.rainBars).toHaveLength(2)
    const [small, big] = l.rainBars
    expect(small.h).toBeLessThanOrEqual(2)
    expect(small.h).toBeGreaterThan(0)
    expect(small.y + small.h).toBeCloseTo(PLOT_H)
    expect(big.h).toBeCloseTo(RAIN_BAR_MAX)
    expect(big.w).toBeCloseTo(l.step - 2)
    expect(big.x).toBeCloseTo(l.xs[5] - (l.step - 2) / 2)
  })

  it('clamps rain bars at the edges', () => {
    const pts = makeHourly(START, 48, (i) => ({ precipMm: i === 0 || i === 47 ? 2 : 0 }))
    const l = layoutMeteogram(pts, 342, TODAY)
    expect(l.rainBars[0].x).toBe(0)
    const last = l.rainBars[1]
    expect(last.x + last.w).toBeLessThanOrEqual(342 + 1e-9)
  })

  it('shows the rain peak only when the max is ≥ 1 mm, above the first max bar', () => {
    const none = layoutMeteogram(makeHourly(START, 48, (i) => ({ precipMm: i === 5 ? 0.9 : 0 })), 342, TODAY)
    expect(none.rainPeak).toBeNull()
    const pts = makeHourly(START, 48, (i) => ({ precipMm: i === 10 || i === 30 ? 6.4 : i === 11 ? 2 : 0 }))
    const l = layoutMeteogram(pts, 342, TODAY)
    expect(l.rainPeak!.text).toBe('6 mm')
    expect(l.rainPeak!.x).toBeCloseTo(l.xs[10])
    const bar = l.rainBars.find((b) => Math.abs(b.x + b.w / 2 - l.xs[10]) < 1e-6)!
    expect(l.rainPeak!.y + LABEL_H).toBeLessThanOrEqual(bar.y + 1e-9)
  })

  it('clamps the rain peak inside the width', () => {
    const l = layoutMeteogram(makeHourly(START, 48, (i) => ({ precipMm: i === 47 ? 12 : 0 })), 342, TODAY)
    const w = len(l.rainPeak!.text) * CHAR_W
    expect(l.rainPeak!.x + w / 2).toBeLessThanOrEqual(342 + 1e-9)
  })

  it('covers night runs from half a step before to half a step after, clamped', () => {
    const l = layoutMeteogram(makeHourly(START, 48), 342, TODAY)
    // isDay 0 for 20..06 → indices 6..16 (20:00 to 06:00) and 30..40
    expect(l.nightBands).toHaveLength(2)
    expect(l.nightBands[0].x).toBeCloseTo(l.xs[6] - l.step / 2)
    expect(l.nightBands[0].x + l.nightBands[0].w).toBeCloseTo(l.xs[16] + l.step / 2)
    const fromNight = layoutMeteogram(makeHourly('2026-10-23T22:00:00-03:00', 48), 342, TODAY)
    expect(fromNight.nightBands[0].x).toBe(0)
    for (const b of fromNight.nightBands) expect(b.x + b.w).toBeLessThanOrEqual(342 + 1e-9)
  })

  it('returns zeroY only when the domain includes 0 °C', () => {
    expect(layoutMeteogram(makeHourly(START, 48), 342, TODAY).zeroY).toBeNull()
    const frost = layoutMeteogram(makeHourly(START, 48, cycle(2, 6)), 342, TODAY)
    expect(frost.zeroY).not.toBeNull()
    expect(frost.zeroY!).toBeGreaterThan(TEMP_PAD)
    expect(frost.zeroY!).toBeLessThan(TEMP_H - TEMP_PAD)
  })

  it('labels max/min per day segment with ≥ 6 points, at most 6, with U+2212', () => {
    const l = layoutMeteogram(makeHourly(START, 48, cycle(2, 6)), 342, TODAY)
    expect(l.tempLabels.length).toBeGreaterThan(0)
    expect(l.tempLabels.length).toBeLessThanOrEqual(6)
    expect(l.tempLabels.some((t) => t.kind === 'min' && t.text === '−4°')).toBe(true)
    expect(l.tempLabels.some((t) => t.kind === 'max' && t.text === '8°')).toBe(true)
    // 13 points from 14:00: today has 10 points, tomorrow 3 → only today is labelled
    const short = layoutMeteogram(makeHourly(START, 13, cycle(15, 8)), 342, TODAY)
    for (const t of short.tempLabels) expect(t.x).toBeLessThanOrEqual(short.xs[9] + 20)
  })

  it('has no overlapping labels across fixtures at 342 and 560 px', () => {
    const fixtures: Record<string, HourlyPoint[]> = {
      flat: makeHourly(START, 48),
      rainDay: makeHourly(START, 48, (i, h) => ({
        ...cycle(14, 5)(i, h),
        precipMm: h >= 15 && h <= 21 ? 1.5 + (h % 3) : 0,
      })),
      storm: makeHourly(START, 48, (i, h) => ({
        ...cycle(26, 8)(i, h),
        precipMm: i === 6 ? 28 : i === 7 ? 12 : i > 30 && i < 34 ? 3 : 0,
        weatherCode: i === 6 ? 95 : 0,
      })),
      frost: makeHourly(START, 48, cycle(1, 7)),
      start22: makeHourly('2026-10-23T22:00:00-03:00', 48, cycle(18, 7)),
      start00: makeHourly('2026-10-24T00:00:00-03:00', 48, (i, h) => ({
        ...cycle(18, 7)(i, h),
        precipMm: i === 0 ? 5 : 0,
      })),
      thirteen: makeHourly(START, 13, cycle(20, 6)),
      edgeRain: makeHourly(START, 48, (i, h) => ({ ...cycle(30, 4)(i, h), precipMm: i === 0 || i === 47 ? 9 : 0 })),
    }
    expect(Object.keys(fixtures).length).toBeGreaterThanOrEqual(7)
    for (const width of [342, 560]) {
      for (const pts of Object.values(fixtures)) expectNoOverlap(layoutMeteogram(pts, width, TODAY))
    }
  })

  it('lays out the real Open-Meteo fixture at 342 px without overlaps', () => {
    const { hourly48 } = normalizeForecast(ForecastDto.parse(fixture))
    const todayKey = hourly48[0].time.slice(0, 10)
    const l = layoutMeteogram(hourly48, 342, todayKey)
    expect(l.empty).toBe(false)
    expect(l.tempPath).toMatch(/^M/)
    expect(l.hourTicks.length).toBeGreaterThanOrEqual(7)
    expectNoOverlap(l)
  })
})

describe('meteogramSummary', () => {
  it('summarises temperature range, total rain and max wind', () => {
    const pts = makeHourly(START, 48, (i) => ({
      tempC: i === 3 ? 9.2 : i === 20 ? 23.6 : 15,
      precipMm: i === 10 ? 2.5 : i === 11 ? 3.6 : 0,
      windKmh: i === 30 ? 34.6 : 12,
    }))
    expect(meteogramSummary(pts)).toBe(
      'Meteograma de las próximas 48 horas: temperatura entre 9 y 24 grados, lluvia total 6 milímetros, viento de hasta 35 kilómetros por hora.',
    )
  })

  it('says sin lluvia under 0.1 mm', () => {
    const pts = makeHourly(START, 48, (i) => ({ precipMm: i === 3 ? 0.05 : 0 }))
    expect(meteogramSummary(pts)).toBe(
      'Meteograma de las próximas 48 horas: temperatura entre 20 y 20 grados, sin lluvia, viento de hasta 10 kilómetros por hora.',
    )
  })
})
