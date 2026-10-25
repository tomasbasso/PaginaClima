import { describe, expect, it } from 'vitest'
import type { StitchedRain } from './stitch'
import { buildRainView, type RainData } from './view'

// Sunday 2026-10-25 12:00 ART; week from monday 19.
const NOW = new Date('2026-10-25T15:00:00Z')

function stitched(over: Partial<StitchedRain> = {}): StitchedRain {
  return {
    start: '2025-10-03',
    days: [
      { date: '2025-12-31', mm: 100, source: 'era5' }, // previous year: outside every period
      { date: '2026-03-10', mm: 40, source: 'era5' },
      { date: '2026-10-05', mm: 7.5, source: 'era5' },
      { date: '2026-10-18', mm: 1.3, source: 'era5' },
      { date: '2026-10-20', mm: 2, source: 'recent' },
      { date: '2026-10-25', mm: 1.24, source: 'recent' },
    ],
    dataUntil: '2026-10-25',
    todayIncluded: true,
    todayFraction: 13 / 24,
    lagging: false,
    ...over,
  }
}

const NB = ' '
const FLAT = Array.from({ length: 365 }, () => 0.6)

const ok = (s: StitchedRain): RainData => ({ status: 'ok', stitched: s, recentError: null })

describe('buildRainView', () => {
  it('maps an error to the Sin datos state', () => {
    expect(buildRainView({ status: 'error' }, NOW)).toEqual({ status: 'error' })
    expect(buildRainView({ status: 'error', code: 'timeout' }, NOW)).toEqual({ status: 'error' })
  })

  it('is an error when ERA5 has no day in the window (dataUntil null)', () => {
    expect(buildRainView(ok(stitched({ days: [], dataUntil: null, lagging: true })), NOW)).toEqual({
      status: 'error',
    })
  })

  it('builds week, month and year rows in order with labels, figures and sr text', () => {
    const v = buildRainView(ok(stitched()), NOW, null)
    if (v.status !== 'ok') throw new Error('expected ok')
    expect(v.rows.map((r) => r.id)).toEqual(['week', 'month', 'year'])
    expect(v.rows.map((r) => r.label)).toEqual([
      'En lo que va de la semana',
      'En lo que va de octubre',
      'En lo que va de 2026',
    ])
    expect(v.rows.map((r) => r.mmText)).toEqual(['3,2', '12', '52'])
    expect(v.rows.map((r) => r.srText)).toEqual([
      'En lo que va de la semana llovieron 3,2 milímetros.',
      'En lo que va del mes llovieron 12 milímetros.',
      'En lo que va del año llovieron 52 milímetros.',
    ])
    expect(v.noticeText).toBeNull()
  })

  it('adds the lagging notice with the weekday and day of dataUntil', () => {
    const v = buildRainView(ok(stitched({ dataUntil: '2026-10-18', lagging: true, todayIncluded: false })), NOW)
    if (v.status !== 'ok') throw new Error('expected ok')
    expect(v.noticeText).toBe(
      'Los datos de lluvia llegan hasta el domingo 18. Sumamos los días que faltan cuando estén disponibles.',
    )
    // Week starts (19) after dataUntil (18): 0.
    expect(v.rows[0].mm).toBe(0)
    expect(v.rows[0].mmText).toBe('0')
    expect(v.rows[1].mm).toBeCloseTo(8.8)
  })

  it('shows 0 for every period that starts after dataUntil (new month and year)', () => {
    const now = new Date('2027-01-02T15:00:00Z') // saturday; week from monday 2026-12-28
    const s = stitched({
      days: [
        { date: '2026-12-28', mm: 3, source: 'era5' },
        { date: '2026-12-30', mm: 1, source: 'era5' },
      ],
      dataUntil: '2026-12-30',
      lagging: true,
      todayIncluded: false,
    })
    const v = buildRainView(ok(s), now)
    if (v.status !== 'ok') throw new Error('expected ok')
    expect(v.rows.map((r) => r.label)).toEqual([
      'En lo que va de la semana',
      'En lo que va de enero',
      'En lo que va de 2027',
    ])
    expect(v.rows.map((r) => r.mm)).toEqual([4, 0, 0])
    expect(v.noticeText).toContain('miércoles 30')
  })

  it('with climatology: normal, compare, bar and full sr text per row', () => {
    const v = buildRainView(ok(stitched()), NOW, FLAT)
    if (v.status !== 'ok') throw new Error('expected ok')
    // Week 19–24/10 = 6 days + 25/10 × 13/24 → 6.5417 × 0.6 = 3.925 mm.
    const week = v.rows[0]
    expect(week.normalMm).toBeCloseTo((6 + 13 / 24) * 0.6)
    expect(week.normalText).toBe(`Lo normal a esta fecha: 3,9${NB}mm`)
    expect(week.compareText).toBe(`15${NB}% menos de lo normal`) // r 0.8255 → 17.45 → 15
    // obs 3.24 < normal 3.925: normal at 0.8, observed proportional.
    expect(week.bar?.normalFrac).toBeCloseTo(0.8)
    expect(week.bar?.observedFrac).toBeCloseTo((3.24 / week.normalMm!) * 0.8)
    expect(week.srText).toBe(
      `En lo que va de la semana llovieron 3,2 milímetros. Lo normal a esta fecha son 3,9 milímetros: 15${NB}% menos de lo normal.`,
    )
    // Month 1–24/10 + 13/24 = 24.54 days × 0.6 = 14.7; obs 12.04 → r 0.82 → 20 % menos.
    expect(v.rows[1].srText).toBe(
      `En lo que va del mes llovieron 12 milímetros. Lo normal a esta fecha son 15 milímetros: 20${NB}% menos de lo normal.`,
    )
    expect(v.rows[2].srText.startsWith('En lo que va del año llovieron 52 milímetros. Lo normal a esta fecha son ')).toBe(
      true,
    )
    expect(v.disclaimer).toBe(
      'Estimado por reanálisis, no pluviómetro. Lo normal es el promedio 1991–2020 a la misma fecha.',
    )
    expect(v.missingNormalText).toBeNull()
  })

  it('the bigger of observed and normal sits at 0.8; both 0 gives an empty scale', () => {
    const v = buildRainView(ok(stitched()), NOW, FLAT.map(() => 0.01))
    if (v.status !== 'ok') throw new Error('expected ok')
    const year = v.rows[2]
    expect(year.bar?.observedFrac).toBeCloseTo(0.8)
    expect(year.bar?.normalFrac).toBeLessThan(0.8)
    const zero = buildRainView(
      ok(stitched({ days: [{ date: '2026-10-25', mm: 0, source: 'recent' }], start: '2026-10-25' })),
      NOW,
      FLAT.map(() => 0),
    )
    if (zero.status !== 'ok') throw new Error('expected ok')
    expect(zero.rows[0].bar).toEqual({ observedFrac: 0, normalFrac: 0 })
    expect(zero.rows[0].compareText).toBe('Todavía es pronto para comparar')
  })

  it('lagging data prorate the normal only up to dataUntil', () => {
    const v = buildRainView(ok(stitched({ dataUntil: '2026-10-18', lagging: true, todayIncluded: false, todayFraction: 0 })), NOW, FLAT)
    if (v.status !== 'ok') throw new Error('expected ok')
    expect(v.rows[0].normalMm).toBe(0) // week starts after dataUntil
    expect(v.rows[1].normalMm).toBeCloseTo(18 * 0.6)
  })

  it('includes the last rain line', () => {
    const v = buildRainView(ok(stitched()), NOW, FLAT)
    if (v.status !== 'ok') throw new Error('expected ok')
    expect(v.lastRain).toEqual({
      lead: 'Última lluvia: hoy, ',
      mmText: `1,2${NB}mm`,
      text: `Última lluvia: hoy, 1,2${NB}mm`,
    })
  })

  it('without climatology: no bar or comparison, missing text and short disclaimer', () => {
    const v = buildRainView(ok(stitched()), NOW, null)
    if (v.status !== 'ok') throw new Error('expected ok')
    for (const r of v.rows) {
      expect(r.bar).toBeNull()
      expect(r.compareText).toBeNull()
      expect(r.normalText).toBeNull()
      expect(r.normalMm).toBeNull()
    }
    expect(v.missingNormalText).toBe('No pudimos cargar el promedio histórico para comparar.')
    expect(v.disclaimer).toBe('Estimado por reanálisis, no pluviómetro.')
    expect(v.lastRain.mmText).toBe(`1,2${NB}mm`)
  })

  it('lowercases the comparison inside the sr sentence', () => {
    // Month: 12.04 mm over 1–24/10 + 13/24 of the 25th → per-day normal making r = 1.
    const perDay = 12.04 / (24 + 13 / 24)
    const v = buildRainView(ok(stitched()), NOW, FLAT.map(() => perDay))
    if (v.status !== 'ok') throw new Error('expected ok')
    expect(v.rows[1].compareText).toBe('Casi lo normal')
    expect(v.rows[1].srText).toBe(
      'En lo que va del mes llovieron 12 milímetros. Lo normal a esta fecha son 12 milímetros: casi lo normal.',
    )
  })

  it('defaults to the committed climatology', () => {
    const v = buildRainView(ok(stitched()), NOW)
    if (v.status !== 'ok') throw new Error('expected ok')
    expect(v.missingNormalText).toBeNull()
    expect(v.rows[0].compareText).not.toBeNull()
  })
})
