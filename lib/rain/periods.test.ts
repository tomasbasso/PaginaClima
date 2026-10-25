import { describe, expect, it } from 'vitest'
import { periodStarts, periodTotal, seriesStart, SERIES_MARGIN_DAYS } from './periods'

describe('periodStarts (calendar periods ART, D-01/D-02)', () => {
  it.each([
    ['2026-10-25', { week: '2026-10-19', month: '2026-10-01', year: '2026-01-01' }], // domingo
    ['2026-10-19', { week: '2026-10-19', month: '2026-10-01', year: '2026-01-01' }], // lunes = propio inicio
    ['2026-10-20', { week: '2026-10-19', month: '2026-10-01', year: '2026-01-01' }],
    ['2027-01-01', { week: '2026-12-28', month: '2027-01-01', year: '2027-01-01' }], // semana cruza el año
    ['2028-02-29', { week: '2028-02-28', month: '2028-02-01', year: '2028-01-01' }],
  ])('%s', (today, expected) => {
    expect(periodStarts(today)).toEqual(expected)
  })
})

describe('seriesStart', () => {
  it('uses min(monday, Jan 1) minus the margin', () => {
    expect(SERIES_MARGIN_DAYS).toBe(90)
    expect(seriesStart('2026-10-25')).toBe('2025-10-03')
  })

  it('starts from the December monday when the week crosses the year', () => {
    // min('2026-12-28', '2027-01-01') = '2026-12-28' − 90 días
    expect(seriesStart('2027-01-01')).toBe('2026-09-29')
  })
})

describe('periodTotal', () => {
  const days = [
    { date: '2026-10-17', mm: 5 },
    { date: '2026-10-18', mm: 1.5 },
    { date: '2026-10-19', mm: 2 },
    { date: '2026-10-20', mm: 0.25 },
    { date: '2026-10-21', mm: 10 },
  ]

  it('sums the days in [start, until]', () => {
    expect(periodTotal(days, '2026-10-18', '2026-10-20')).toBeCloseTo(3.75)
  })

  it('is 0 when the period starts after the data', () => {
    expect(periodTotal(days, '2026-10-22', '2026-10-21')).toBe(0)
  })

  it('is 0 without data', () => {
    expect(periodTotal(days, '2026-10-18', null)).toBe(0)
  })
})
