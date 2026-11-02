import { describe, expect, it } from 'vitest'
import { makeConfidence, makeDaily } from './__fixtures__/build'
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
      'Mañana: algo nublado, mínima 7 grados, máxima 19 grados, sin lluvia significativa.',
    )
    expect(rows[2].srText).toBe(
      'Domingo 25: algo nublado, mínima 7 grados, máxima 19 grados, 4 milímetros de lluvia.',
    )
    expect(rows[2].rainText).toBe('4 mm')
    expect(rows[1].rainText).toBeNull()
  })

  it('uses the singular for a rounded total of 1 mm', () => {
    const rows = buildDailyRows(
      makeDaily('2026-10-23', 1, () => ({ weatherCode: 2, tMinC: 7, tMaxC: 19, precipSumMm: 1.2 })),
      new Date('2026-10-23T15:00:00Z'),
    )
    expect(rows[0].srText).toBe('Hoy: algo nublado, mínima 7 grados, máxima 19 grados, 1 milímetro de lluvia.')
  })

  it('says "sin dato" and skips the state when missing', () => {
    const rows = buildDailyRows(
      makeDaily('2026-10-23', 1, () => ({ weatherCode: null, tMinC: null, tMaxC: null })),
      new Date('2026-10-23T15:00:00Z'),
    )
    expect(rows[0].srText).toBe('Hoy: mínima sin dato, máxima sin dato, sin lluvia significativa.')
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
  it('shows rounded mm only from 1 mm, with a non-breaking space', () => {
    expect(rainText(null)).toBeNull()
    expect(rainText(0.9)).toBeNull()
    expect(rainText(1)).toBe('1 mm')
    expect(rainText(4.4)).toBe('4 mm')
    expect(rainText(12.6)).toBe('13 mm')
  })
})

describe('buildDailyRows with the ensemble (FCST-03, D-09, D-10)', () => {
  const NOW = new Date('2026-10-23T15:00:00Z')
  const START = '2026-10-23'

  it('shows the display value as text and as the fill height', () => {
    const rows = buildDailyRows(
      makeDaily(START, 4),
      NOW,
      makeConfidence(START, 4, (i) => ({ rainMembers: [35, 5, 6, 51][i] })),
    )
    expect(rows.map((r) => r.probText)).toEqual(['70 %', null, '10 %', '95 %'])
    expect(rows.map((r) => r.probPct)).toEqual([70, null, 10, 95])
    for (const r of rows) expect(r.ensembleUp).toBe(true)
  })

  it('marks a day without data with a dash while other days have it', () => {
    const rows = buildDailyRows(
      makeDaily(START, 3),
      NOW,
      makeConfidence(START, 2, (i) => (i === 0 ? null : { rainMembers: 20 })),
    )
    for (const i of [0, 2]) {
      expect(rows[i].probText).toBe('—')
      expect(rows[i].probPct).toBeNull()
      expect(rows[i].ensembleUp).toBe(true)
    }
    expect(rows[1].probText).toBe('40 %')
  })

  it('reports the ensemble as down with two arguments or with no day that has it', () => {
    const cases = [
      buildDailyRows(makeDaily(START, 3), NOW),
      buildDailyRows(makeDaily(START, 3), NOW, []),
      buildDailyRows(makeDaily(START, 3), NOW, makeConfidence(START, 3, () => null)),
    ]
    for (const rows of cases) {
      for (const r of rows) {
        expect(r.ensembleUp).toBe(false)
        expect(r.probText).toBeNull()
        expect(r.probPct).toBeNull()
      }
    }
  })

  it('joins by date, so a past day of the ensemble is never used', () => {
    // Offset by one day: the first entry is yesterday and must not land on today's row.
    const rows = buildDailyRows(
      makeDaily(START, 2),
      NOW,
      makeConfidence('2026-10-22', 2, (i) => ({ rainMembers: i === 0 ? 51 : 10 })),
    )
    expect(rows[0].probPct).toBe(20)
    expect(rows[1].probText).toBe('—')
  })

  it('does not count only-past ensemble data as the ensemble being up', () => {
    const rows = buildDailyRows(makeDaily(START, 2), NOW, makeConfidence('2026-10-20', 2))
    expect(rows[0].ensembleUp).toBe(false)
  })

  it('shows the probability without mm under 1 mm of the main forecast (D-10)', () => {
    const rows = buildDailyRows(
      makeDaily(START, 1, () => ({ precipSumMm: 0.5 })),
      NOW,
      makeConfidence(START, 1, () => ({ rainMembers: 31 })),
    )
    expect(rows[0].probText).toBe('60 %')
    expect(rows[0].rainText).toBeNull()
  })

  it('keeps the main forecast mm on days 1 to 14', () => {
    const rows = buildDailyRows(
      makeDaily(START, 14, () => ({ precipSumMm: 4.4 })),
      NOW,
      makeConfidence(START, 14, () => ({ rainMembers: 30, rainP10Mm: 5, rainP90Mm: 15 })),
    )
    for (const r of rows) expect(r.rainText).toBe('4 mm')
  })

  describe('srText', () => {
    const day = (precipSumMm: number, weatherCode = 2) => () => ({
      weatherCode,
      tMinC: 7,
      tMaxC: 19,
      precipSumMm,
    })

    it('adds the real count', () => {
      const rows = buildDailyRows(
        makeDaily(START, 2, day(0)),
        NOW,
        makeConfidence(START, 2, () => ({ rainMembers: 8 })),
      )
      expect(rows[1].srText).toBe(
        'Mañana: algo nublado, mínima 7 grados, máxima 19 grados, sin lluvia significativa. 8 de 51 escenarios traen lluvia.',
      )
    })

    it('keeps the real count when no number is shown, and the real number of members', () => {
      const rows = buildDailyRows(
        makeDaily(START, 2, day(0)),
        NOW,
        makeConfidence(START, 2, (i) => ({ rainMembers: 5, members: i === 0 ? 51 : 50 })),
      )
      expect(rows[0].probText).toBeNull()
      expect(rows[0].srText).toContain('5 de 51 escenarios traen lluvia.')
      expect(rows[1].srText).toContain('5 de 50 escenarios traen lluvia.')
    })

    it('says so when the day has no ensemble data', () => {
      const rows = buildDailyRows(
        makeDaily(START, 2, day(3)),
        NOW,
        makeConfidence(START, 2, (i) => (i === 0 ? { rainMembers: 8 } : null)),
      )
      expect(rows[1].srText).toBe(
        'Mañana: algo nublado, mínima 7 grados, máxima 19 grados, 3 milímetros de lluvia. Sin dato de probabilidad.',
      )
    })

    it('omits the probability when the ensemble is down', () => {
      const rows = buildDailyRows(makeDaily(START, 2, day(4.4, 80)), NOW, [])
      expect(rows[1].srText).toBe(
        'Mañana: chaparrones, mínima 7 grados, máxima 19 grados, 4 milímetros de lluvia.',
      )
    })

    it('uses the long day and the full state', () => {
      const rows = buildDailyRows(
        makeDaily(START, 3, day(0, 99)),
        NOW,
        makeConfidence(START, 3, () => ({ rainMembers: 40 })),
      )
      expect(rows[2].label).toBe('dom 25')
      expect(rows[2].srText).toBe(
        'Domingo 25: tormenta con granizo, mínima 7 grados, máxima 19 grados, sin lluvia significativa. 40 de 51 escenarios traen lluvia.',
      )
    })
  })
})
