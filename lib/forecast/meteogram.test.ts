import { describe, expect, it } from 'vitest'
import fixture from '@/lib/sources/__fixtures__/open-meteo-forecast.json'
import { ForecastDto } from '@/lib/sources/openMeteoForecast.schema'
import { normalizeForecast } from '@/lib/weather/normalize'
import type { HourlyPoint } from '@/lib/weather/types'
import { makeHourly } from './__fixtures__/build'
import {
  AXIS_GAP,
  CHART_H,
  CHAR_W,
  DAY_CHAR_W,
  indexAtX,
  LABEL_H,
  layoutMeteogram,
  type MeteogramLayout,
  meteogramSummary,
  MIN_TEMP_SPAN_C,
  PLOT_H,
  RAIN_BAR_MAX,
  readoutFor,
  STRONG_GUST_KMH,
  strongGustLine,
  TEMP_H,
  TEMP_PAD,
  valueTextFor,
  windColumns,
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

describe('wind row (D-05)', () => {
  it('makes 16 columns every 3 h with clamped centres and height 220', () => {
    const pts = makeHourly(START, 48)
    const cols = windColumns(pts, 342)
    expect(cols).toHaveLength(16)
    const l = layoutMeteogram(pts, 342, TODAY)
    expect(l.height).toBe(220)
    expect(CHART_H).toBe(220)
    expect(l.wind).toHaveLength(16)
    expect(cols[0].x).toBe(8)
    expect(cols[1].x).toBeCloseTo(l.xs[3])
    expect(cols[15].x).toBeCloseTo(l.xs[45])
    for (const c of cols) {
      expect(c.x).toBeGreaterThanOrEqual(8)
      expect(c.x).toBeLessThanOrEqual(342 - 8)
      expect(c.arrowY).toBeGreaterThanOrEqual(PLOT_H + AXIS_GAP + 16)
      expect(c.textY).toBeGreaterThan(c.arrowY)
      expect(c.textY + 8).toBeLessThanOrEqual(220)
    }
  })

  it('rotates downwind, hides the arrow on calm / null and formats km/h', () => {
    const speeds: (number | null)[] = [10, 10, 10, 1.5, null, 12.4]
    const dirs: (number | null)[] = [0, 270, null, 90, 90, 45]
    const pts = makeHourly(START, 18, (i) => ({
      windKmh: i % 3 === 0 ? speeds[i / 3] : 10,
      windDirDeg: i % 3 === 0 ? dirs[i / 3] : 0,
    }))
    const cols = windColumns(pts, 342)
    expect(cols.map((c) => c.rotate)).toEqual([180, 90, null, null, null, 225])
    expect(cols.map((c) => c.text)).toEqual(['10', '10', '10', '0', '—', '12'])
  })

  it('flags a column strong when any gust of its 3 h reaches 50', () => {
    const pts = makeHourly(START, 9, (i) => ({ gustKmh: i === 2 ? 50 : i === 4 ? 49.9 : 20 }))
    expect(windColumns(pts, 342).map((c) => c.strong)).toEqual([true, false, false])
    expect(STRONG_GUST_KMH).toBe(50)
  })
})

describe('strongGustLine', () => {
  it('names the max gust with the day word and franja', () => {
    const tomorrow = makeHourly(START, 48, (i) => ({ gustKmh: i === 25 ? 67.6 : i === 30 ? 55 : 20 }))
    expect(strongGustLine(tomorrow, TODAY)).toBe('Ráfagas fuertes de hasta 68 km/h mañana a la tarde')
    const today = makeHourly('2026-10-23T00:00:00-03:00', 48, (i) => ({ gustKmh: i === 3 ? 52 : 20 }))
    expect(strongGustLine(today, TODAY)).toBe('Ráfagas fuertes de hasta 52 km/h hoy a la madrugada')
    const sunday = makeHourly('2026-10-24T00:00:00-03:00', 48, (i) => ({ gustKmh: i === 45 ? 61 : 20 }))
    expect(strongGustLine(sunday, TODAY)).toBe('Ráfagas fuertes de hasta 61 km/h el domingo a la noche')
  })

  it('returns null without gusts ≥ 50', () => {
    expect(strongGustLine(makeHourly(START, 48, () => ({ gustKmh: 49.9 })), TODAY)).toBeNull()
    expect(strongGustLine(makeHourly(START, 48, () => ({ gustKmh: null })), TODAY)).toBeNull()
  })
})

describe('readoutFor', () => {
  const pts = makeHourly(START, 48)
  it('labels Ahora, Mañana 15:00 and dom 25 09:00', () => {
    expect(readoutFor(pts, 0, TODAY).timeLabel).toBe('Ahora')
    expect(readoutFor(pts, 25, TODAY).timeLabel).toBe('Mañana 15:00')
    expect(readoutFor(pts, 43, TODAY).timeLabel).toBe('dom 25 09:00')
    expect(readoutFor(pts, 5, TODAY).timeLabel).toBe('Hoy 19:00')
  })

  it('formats temperature, rain, wind and strong gust', () => {
    const r = (o: Partial<HourlyPoint>) => readoutFor([{ ...pts[0], ...o }], 0, TODAY)
    expect(r({ tempC: 18 }).temp).toBe('18°')
    expect(r({ tempC: -2.4 }).temp).toBe('−2°')
    expect(r({ tempC: null }).temp).toBe('—')
    expect(r({ precipMm: 0.05 }).rain).toBe('sin lluvia')
    expect(r({ precipMm: 0.4 }).rain).toBe('0,4 mm')
    expect(r({ precipMm: 9.94 }).rain).toBe('9,9 mm')
    expect(r({ precipMm: 12.3 }).rain).toBe('12 mm')
    expect(r({ precipMm: null }).rain).toBe('—')
    expect(r({ windKmh: 12, windDirDeg: 45 }).wind).toBe('12 km/h NE')
    expect(r({ windKmh: 12, windDirDeg: null }).wind).toBe('12 km/h')
    expect(r({ windKmh: 1 }).wind).toBe('calma')
    expect(r({ windKmh: null }).wind).toBe('—')
    expect(r({ gustKmh: 55 }).gust).toBe('ráfagas 55 km/h')
    expect(r({ gustKmh: 40 }).gust).toBeNull()
    expect(r({ gustKmh: null }).gust).toBeNull()
  })
})

describe('valueTextFor', () => {
  const [p] = makeHourly('2026-10-24T15:00:00-03:00', 1, () => ({
    tempC: 18,
    precipMm: 0.4,
    windKmh: 12,
    windDirDeg: 45,
    gustKmh: 55,
  }))
  it('reads the full hour', () => {
    expect(valueTextFor(p)).toBe(
      'sábado 15:00, 18 grados, 0,4 milímetros, viento 12 kilómetros por hora del noreste, ráfagas de 55',
    )
  })
  it('handles dry, calm and missing values', () => {
    expect(valueTextFor({ ...p, precipMm: 0, windKmh: 1, gustKmh: 20 })).toBe(
      'sábado 15:00, 18 grados, sin lluvia, viento en calma',
    )
    expect(valueTextFor({ ...p, tempC: null, precipMm: null, windKmh: null, gustKmh: null })).toBe(
      'sábado 15:00, temperatura sin dato, lluvia sin dato, viento sin dato',
    )
  })
})

describe('indexAtX', () => {
  it('maps and clamps x to an hour index', () => {
    expect(indexAtX(0, 342, 48)).toBe(0)
    expect(indexAtX(342, 342, 48)).toBe(47)
    expect(indexAtX(-20, 342, 48)).toBe(0)
    expect(indexAtX(9999, 342, 48)).toBe(47)
    expect(indexAtX(171, 342, 48)).toBe(24)
    expect(indexAtX(50, 342, 1)).toBe(0)
  })
})
