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
    const v = buildRainView(ok(stitched()), NOW)
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
})
