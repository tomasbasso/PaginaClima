import { describe, expect, it } from 'vitest'
import { makeDaily } from './__fixtures__/build'
import { buildDailyRows, rainText } from './daily'

describe('buildDailyRows (FCST-02, D-08..D-12) under TZ=UTC', () => {
  it('runs under TZ=UTC like Vercel', () => {
    expect(new Date().getTimezoneOffset()).toBe(0)
  })

  it('drops past days of a stale snapshot and labels Hoy / Mañana / weekday', () => {
    const rows = buildDailyRows(makeDaily('2026-10-22', 15), new Date('2026-10-23T15:00:00Z'))
    expect(rows[0].key).toBe('2026-10-23')
    expect(rows[0].label).toBe('Hoy')
    expect(rows[1].label).toBe('Mañana')
    expect(rows[2].label).toBe('dom 25')
    expect(rows).toHaveLength(14)
  })

  it('caps at 14 rows', () => {
    expect(buildDailyRows(makeDaily('2026-10-23', 16), new Date('2026-10-23T15:00:00Z'))).toHaveLength(14)
  })

  it('uses the Argentine local day, not the UTC day', () => {
    const daily = makeDaily('2026-10-22', 15)
    expect(buildDailyRows(daily, new Date('2026-10-24T02:59:00Z'))[0].key).toBe('2026-10-23')
    expect(buildDailyRows(daily, new Date('2026-10-24T03:00:00Z'))[0].key).toBe('2026-10-24')
  })

  it('computes the 7-day and 14-day common scales', () => {
    const tMin = [10, 5, 12, 8, 9, 11, 7, 2, 6, 6, 6, 6, 6, 6]
    const tMax = [25, 20, 30, 22, 24, 26, 21, 35, 20, 20, 20, 20, 20, 20]
    const rows = buildDailyRows(
      makeDaily('2026-10-23', 14, (i) => ({ tMinC: tMin[i], tMaxC: tMax[i] })),
      new Date('2026-10-23T15:00:00Z'),
    )
    // 7-day scale: lo 5 (row 1), hi 30 (row 2)
    expect(rows[1].bar7?.lo).toBe(0)
    expect(rows[2].bar7?.hi).toBe(1)
    expect(rows[0].bar7).toEqual({ lo: 5 / 25, hi: 20 / 25 })
    for (let i = 7; i < 14; i++) expect(rows[i].bar7).toBeNull()
    // 14-day scale: lo 2 (row 7), hi 35 (row 7)
    expect(rows[7].bar14).toEqual({ lo: 0, hi: 1 })
    expect(rows[0].bar14).toEqual({ lo: 8 / 33, hi: 23 / 33 })
    for (const r of rows) {
      for (const b of [r.bar7, r.bar14]) {
        if (!b) continue
        expect(b.lo).toBeGreaterThanOrEqual(0)
        expect(b.hi).toBeLessThanOrEqual(1)
      }
    }
  })

  it('shows an em dash and no bars when a value is null', () => {
    const rows = buildDailyRows(
      makeDaily('2026-10-23', 8, (i) => (i === 0 ? { tMinC: null, tMaxC: 18.6 } : { tMinC: 10 + i, tMaxC: 25 })),
      new Date('2026-10-23T15:00:00Z'),
    )
    expect(rows[0].minText).toBe('—')
    expect(rows[0].maxText).toBe('19°')
    expect(rows[0].bar7).toBeNull()
    expect(rows[0].bar14).toBeNull()
    expect(rows[1].bar7).not.toBeNull()
  })

  it('formats negatives with U+2212 and takes the day state label (never night)', () => {
    const rows = buildDailyRows(
      makeDaily('2026-10-23', 2, (i) => ({ tMinC: -2.4, tMaxC: 9, weatherCode: i === 0 ? 0 : 1234 })),
      new Date('2026-10-23T15:00:00Z'),
    )
    expect(rows[0].minText).toBe('−2°')
    expect(rows[0].stateLabel).toBe('Despejado')
    expect(rows[1].stateLabel).toBeNull()
  })

  it('marks days 8..14 as tentative', () => {
    const rows = buildDailyRows(makeDaily('2026-10-23', 14), new Date('2026-10-23T15:00:00Z'))
    rows.forEach((r, i) => expect(r.tentative).toBe(i >= 7))
  })

  it('writes the screen-reader sentence', () => {
    const rows = buildDailyRows(
      makeDaily('2026-10-23', 3, (i) => ({
        weatherCode: 2,
        tMinC: 7,
        tMaxC: 19,
        precipSumMm: i === 1 ? 0.4 : 4.4,
      })),
      new Date('2026-10-23T15:00:00Z'),
    )
    expect(rows[1].srText).toBe(
      'Mañana: algo nublado, mínima 7 grados, máxima 19 grados, sin lluvia significativa',
    )
    expect(rows[2].srText).toBe('dom 25: algo nublado, mínima 7 grados, máxima 19 grados, 4 milímetros de lluvia')
    expect(rows[2].rainText).toBe('4 mm')
    expect(rows[1].rainText).toBeNull()
  })

  it('says "sin dato" and skips the state when missing', () => {
    const rows = buildDailyRows(
      makeDaily('2026-10-23', 1, () => ({ weatherCode: null, tMinC: null, tMaxC: null })),
      new Date('2026-10-23T15:00:00Z'),
    )
    expect(rows[0].srText).toBe('Hoy: mínima sin dato, máxima sin dato, sin lluvia significativa')
  })

  it('leaves every bar null on a flat scale or without finite values', () => {
    const flat = buildDailyRows(
      makeDaily('2026-10-23', 14, () => ({ tMinC: 10, tMaxC: 10 })),
      new Date('2026-10-23T15:00:00Z'),
    )
    for (const r of flat) {
      expect(r.bar7).toBeNull()
      expect(r.bar14).toBeNull()
    }
    const empty = buildDailyRows(
      makeDaily('2026-10-23', 14, () => ({ tMinC: null, tMaxC: null })),
      new Date('2026-10-23T15:00:00Z'),
    )
    for (const r of empty) {
      expect(r.bar7).toBeNull()
      expect(r.bar14).toBeNull()
    }
  })

  it('returns no rows when every day is in the past', () => {
    expect(buildDailyRows(makeDaily('2026-10-01', 7), new Date('2026-10-23T15:00:00Z'))).toEqual([])
  })
})

describe('rainText (D-10)', () => {
  it('shows rounded mm only from 1 mm', () => {
    expect(rainText(null)).toBeNull()
    expect(rainText(0.9)).toBeNull()
    expect(rainText(1)).toBe('1 mm')
    expect(rainText(4.4)).toBe('4 mm')
    expect(rainText(12.6)).toBe('13 mm')
  })
})
