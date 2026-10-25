import { describe, expect, it } from 'vitest'
import raw from './climatology-1991-2020.json'
import { doyIndex, loadClimatology, normalFor, parseClimatology } from './normal'

// Synthetic climatology: day i is worth i + 1 mm, so sums are easy to check by hand.
const SYN = Array.from({ length: 365 }, (_, i) => i + 1)
const NO_TODAY = { todayKey: '2099-01-01', todayFraction: 0 }

describe('committed climatology JSON', () => {
  it('has 365 finite non-negative values summing to ~702 mm', () => {
    expect(raw.smoothing).toBe('circular-31d')
    expect(raw.period).toBe('1991-2020')
    expect(raw.daily).toHaveLength(365)
    for (const v of raw.daily) {
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
    }
    const sum = raw.daily.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum - 702)).toBeLessThanOrEqual(1)
    expect(raw.annualMm).toBe(Math.round(sum * 10) / 10)
  })

  it('loadClimatology returns the 365 values', () => {
    const c = loadClimatology()
    expect(c).not.toBeNull()
    expect(c).toHaveLength(365)
  })
})

describe('parseClimatology', () => {
  it('accepts a valid object', () => {
    expect(parseClimatology({ daily: SYN })).toEqual(SYN)
  })
  it('rejects 364 values, a negative value, NaN and garbage', () => {
    expect(parseClimatology({ daily: SYN.slice(1) })).toBeNull()
    expect(parseClimatology({ daily: [...SYN.slice(1), -1] })).toBeNull()
    expect(parseClimatology({ daily: [...SYN.slice(1), Number.NaN] })).toBeNull()
    expect(parseClimatology(null)).toBeNull()
    expect(parseClimatology('x')).toBeNull()
  })
})

describe('doyIndex', () => {
  it('maps a non-leap calendar, 29/02 onto 28/02', () => {
    expect(doyIndex('2026-01-01')).toBe(0)
    expect(doyIndex('2026-02-28')).toBe(58)
    expect(doyIndex('2026-03-01')).toBe(59)
    expect(doyIndex('2026-12-31')).toBe(364)
    expect(doyIndex('2028-02-29')).toBe(58)
    expect(doyIndex('2028-03-01')).toBe(59)
    expect(doyIndex('2028-12-31')).toBe(364)
  })
})

describe('normalFor', () => {
  it('sums whole days and weights today by todayFraction', () => {
    // 1/10 = index 273 → value 274 ... 24/10 = index 296 → value 297; 25/10 → 298.
    let expected = 0
    for (let v = 274; v <= 297; v++) expected += v
    expected += 0.5 * 298
    expect(normalFor(SYN, '2026-10-01', '2026-10-25', { todayKey: '2026-10-25', todayFraction: 0.5 })).toBeCloseTo(
      expected,
    )
  })

  it('stops at dataUntil when it is before today (no today weighting)', () => {
    let expected = 0
    for (let v = 274; v <= 291; v++) expected += v // 1/10 .. 18/10
    expect(normalFor(SYN, '2026-10-01', '2026-10-18', { todayKey: '2026-10-25', todayFraction: 0.5 })).toBeCloseTo(
      expected,
    )
  })

  it('uses the 28/02 value for 29/02', () => {
    expect(normalFor(SYN, '2028-02-29', '2028-02-29', NO_TODAY)).toBe(59)
    expect(normalFor(SYN, '2028-02-28', '2028-03-01', NO_TODAY)).toBe(59 + 59 + 60)
  })

  it('is 0 when start is after until', () => {
    expect(normalFor(SYN, '2026-11-01', '2026-10-31', NO_TODAY)).toBe(0)
  })

  it('a full year with the real climatology is the annual normal', () => {
    const c = loadClimatology()
    if (!c) throw new Error('expected climatology')
    expect(normalFor(c, '2026-01-01', '2026-12-31', NO_TODAY)).toBeCloseTo(raw.annualMm, 0)
  })
})
