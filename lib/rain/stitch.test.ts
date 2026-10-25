import { describe, expect, it } from 'vitest'
import { stitchDailyRain } from './stitch'

// 15:00 UTC = 12:00 ART (hourNow 12).
const NOW = new Date('2026-10-25T15:00:00Z')

/** 24 hourly values for a local day; `value(h)` returns mm or null; `hours` limits the count. */
function day(date: string, value: (h: number) => number | null, hours = 24) {
  return Array.from({ length: hours }, (_, h) => ({
    time: `${date}T${String(h).padStart(2, '0')}:00`,
    mm: value(h),
  }))
}

const era5 = [
  { date: '2026-10-19', mm: 1 },
  { date: '2026-10-20', mm: 2 },
  { date: '2026-10-21', mm: null },
  { date: '2026-10-22', mm: null },
  { date: '2026-10-23', mm: null },
  { date: '2026-10-24', mm: null },
  { date: '2026-10-25', mm: null },
]

const recentFull = [
  ...day('2026-10-20', () => 5), // ERA5 has this day: must be ignored
  ...day('2026-10-21', () => 0.5), // 12
  ...day('2026-10-22', () => 0),
  ...day('2026-10-23', (h) => (h === 3 ? 4 : 0)),
  ...day('2026-10-24', () => 0.1), // 2.4
  ...day('2026-10-25', (h) => (h <= 12 ? 1 : 100)), // 13 past hours, the rest is forecast
]

describe('stitchDailyRain (D-10)', () => {
  const r = stitchDailyRain(era5, recentFull, NOW, '2026-10-19')

  it.each([
    ['2026-10-19', 1, 'era5'], // ERA5
    ['2026-10-20', 2, 'era5'], // último día ERA5: gana aunque haya reciente
    ['2026-10-21', 12, 'recent'], // primer día reciente
    ['2026-10-23', 4, 'recent'],
    ['2026-10-24', 2.4, 'recent'],
    ['2026-10-25', 13, 'recent'], // hoy parcial: solo HH ≤ 12
  ])('%s → %s mm from %s', (date, mm, source) => {
    const d = r.days.find((x) => x.date === date)
    expect(d?.source).toBe(source)
    expect(d?.mm).toBeCloseTo(mm as number)
  })

  it('never yields two values for the same date and covers start..today', () => {
    const dates = r.days.map((d) => d.date)
    expect(new Set(dates).size).toBe(dates.length)
    expect(dates).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
  })

  it('includes today with todayFraction = (hourNow + 1) / 24', () => {
    expect(r.start).toBe('2026-10-19')
    expect(r.dataUntil).toBe('2026-10-25')
    expect(r.todayIncluded).toBe(true)
    expect(r.todayFraction).toBeCloseTo(13 / 24)
    expect(r.lagging).toBe(false)
  })

  it('ignores ERA5 days before start', () => {
    const s = stitchDailyRain([{ date: '2026-10-18', mm: 50 }, ...era5], recentFull, NOW, '2026-10-19')
    expect(s.days[0].date).toBe('2026-10-19')
  })

  it('cuts the series at the first gap and does not invent later days', () => {
    const gappy = [
      ...day('2026-10-21', () => 0.5),
      ...day('2026-10-22', (h) => (h === 5 ? null : 0)), // incomplete
      ...day('2026-10-23', () => 1),
      ...day('2026-10-24', () => 1),
      ...day('2026-10-25', () => 1),
    ]
    const s = stitchDailyRain(era5, gappy, NOW, '2026-10-19')
    expect(s.dataUntil).toBe('2026-10-21')
    expect(s.days.at(-1)?.date).toBe('2026-10-21')
    expect(s.todayIncluded).toBe(false)
    expect(s.lagging).toBe(true)
  })

  it('treats a past day with fewer than 24 hours as incomplete', () => {
    const short = [...day('2026-10-21', () => 0.5, 23)]
    const s = stitchDailyRain(era5, short, NOW, '2026-10-19')
    expect(s.dataUntil).toBe('2026-10-20')
  })

  it('stops at the last ERA5 day when the recent adapter failed (null)', () => {
    const s = stitchDailyRain(era5, null, NOW, '2026-10-19')
    expect(s.dataUntil).toBe('2026-10-20')
    expect(s.days).toHaveLength(2)
    expect(s.todayIncluded).toBe(false)
    expect(s.lagging).toBe(true)
  })

  it('is not lagging when data reaches yesterday', () => {
    const upToYesterday = recentFull.filter((h) => !h.time.startsWith('2026-10-25'))
    const s = stitchDailyRain(era5, upToYesterday, NOW, '2026-10-19')
    expect(s.dataUntil).toBe('2026-10-24')
    expect(s.todayIncluded).toBe(false)
    expect(s.lagging).toBe(false)
  })

  it('returns dataUntil null when not even the first day has data', () => {
    const s = stitchDailyRain([{ date: '2026-10-19', mm: null }], null, NOW, '2026-10-19')
    expect(s.dataUntil).toBeNull()
    expect(s.days).toEqual([])
    expect(s.lagging).toBe(true)
  })

  it('crosses the year (now 2027-01-01 12:00 ART)', () => {
    const now = new Date('2027-01-01T15:00:00Z')
    const s = stitchDailyRain(
      [
        { date: '2026-12-28', mm: 1 },
        { date: '2026-12-29', mm: 0 },
        { date: '2026-12-30', mm: null },
      ],
      [...day('2026-12-30', () => 0), ...day('2026-12-31', () => 0.5), ...day('2027-01-01', () => 1)],
      now,
      '2026-12-28',
    )
    expect(s.days.map((d) => [d.date, d.source])).toEqual([
      ['2026-12-28', 'era5'],
      ['2026-12-29', 'era5'],
      ['2026-12-30', 'recent'],
      ['2026-12-31', 'recent'],
      ['2027-01-01', 'recent'],
    ])
    expect(s.days.at(-1)?.mm).toBeCloseTo(13)
    expect(s.dataUntil).toBe('2027-01-01')
  })
})
