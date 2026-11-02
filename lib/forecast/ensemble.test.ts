// Ensemble aggregation (D-09, D-10, FCST-03): count per member first, then show.
import { describe, expect, it } from 'vitest'
import fixture from '@/lib/sources/__fixtures__/open-meteo-ensemble.json'
import { addDaysToKey } from '@/lib/time'
import { aggregateEnsemble, quantile, toDisplayPct } from './ensemble'

const pad = (n: number) => String(n).padStart(2, '0')
const DATE = '2026-11-03'

/** The 24 stamps of DATE: D 01:00 … D+1 00:00. */
const DAY_HOURS = [
  ...Array.from({ length: 23 }, (_, i) => `${DATE}T${pad(i + 1)}:00`),
  `${addDaysToKey(DATE, 1)}T00:00`,
]

const column = (i: number) => (i === 0 ? 'precipitation' : `precipitation_member${pad(i)}`)

/** Hourly block with one column per entry; each one holds that member's day total in one hour. */
function hourlyWith(totals: Array<number | null>) {
  const block: { time: string[]; [key: string]: unknown } = { time: DAY_HOURS }
  totals.forEach((total, i) => {
    block[column(i)] = DAY_HOURS.map((_, h) => (total === null ? null : h === 0 ? total : 0))
  })
  return block
}

const noDaily = { time: [] as string[] }

describe('aggregateEnsemble()', () => {
  it('real fixture: 51 members with the control included, 14 days published', () => {
    const days = aggregateEnsemble(fixture.hourly, fixture.daily)
    expect(days).toHaveLength(14)
    expect(days[0].date).toBe(fixture.hourly.time[0].slice(0, 10))
    for (const d of days) {
      expect(d.members).toBe(51)
      expect(d.rainMembers).toBeGreaterThanOrEqual(0)
      expect(d.rainMembers).toBeLessThanOrEqual(51)
      expect(d.rainP10Mm).toBeLessThanOrEqual(d.rainP90Mm)
      expect(d.tMinP10C).not.toBeNull()
      expect(d.tMaxP90C).not.toBeNull()
      expect(d.tMinP10C!).toBeLessThan(d.tMaxP90C!)
    }
  })

  it('real fixture: the 15th day is incomplete and is not published', () => {
    const days = aggregateEnsemble(fixture.hourly, fixture.daily)
    expect(days.map((d) => d.date)).not.toContain(fixture.daily.time[14])
  })

  it('real fixture: temperature percentiles come from the daily block', () => {
    const [first] = aggregateEnsemble(fixture.hourly, fixture.daily)
    const daily = fixture.daily as unknown as Record<string, Array<number | null>>
    const values = (re: RegExp) =>
      Object.keys(daily)
        .filter((k) => re.test(k))
        .map((k) => daily[k][0] as number)
        .sort((a, b) => a - b)
    expect(first.tMinP10C).toBeCloseTo(quantile(values(/^temperature_2m_min(_member\d{2})?$/), 0.1))
    expect(first.tMaxP90C).toBeCloseTo(quantile(values(/^temperature_2m_max(_member\d{2})?$/), 0.9))
  })

  it('counts per member before anything else: one soaked member among 50 dry ones counts 1', () => {
    const totals = [51, ...Array.from({ length: 50 }, () => 0)]
    const [day] = aggregateEnsemble(hourlyWith(totals), noDaily)
    expect(day.rainMembers).toBe(1)
    expect(day.members).toBe(51)
  })

  it('threshold edges: 0.99 mm does not count, 1.0 mm does', () => {
    const [day] = aggregateEnsemble(hourlyWith([0.99, 1]), noDaily)
    expect(day.rainMembers).toBe(1)
  })

  it('counts the night block of stamps 22-23-00 in the day it fell', () => {
    const block = hourlyWith([0])
    block.precipitation = DAY_HOURS.map((_, h) => (h >= 21 ? 5.5 : 0))
    const [day] = aggregateEnsemble(block, noDaily)
    expect(day.date).toBe(DATE)
    expect(day.rainMembers).toBe(1)
  })

  it('does not publish a day with 25 of 51 complete members; publishes it with 26', () => {
    const withComplete = (n: number) =>
      Array.from({ length: 51 }, (_, i) => (i < n ? 0 : null))
    expect(aggregateEnsemble(hourlyWith(withComplete(25)), noDaily)).toEqual([])
    const [day] = aggregateEnsemble(hourlyWith(withComplete(26)), noDaily)
    expect(day.members).toBe(26)
  })

  it('rain percentiles use every member', () => {
    const totals = Array.from({ length: 51 }, (_, i) => i)
    const [day] = aggregateEnsemble(hourlyWith(totals), noDaily)
    expect(day.rainP10Mm).toBe(5)
    expect(day.rainP90Mm).toBe(45)
  })

  it('leaves temperature null when the daily block has no value for the date', () => {
    const [day] = aggregateEnsemble(hourlyWith([0]), noDaily)
    expect(day.tMinP10C).toBeNull()
    expect(day.tMaxP90C).toBeNull()
  })

  it('leaves temperature null when fewer than half of the members have it', () => {
    const daily = {
      time: [DATE],
      temperature_2m_min: [10],
      temperature_2m_min_member01: [null],
      temperature_2m_min_member02: [null],
      temperature_2m_max: [20],
      temperature_2m_max_member01: [21],
      temperature_2m_max_member02: [22],
    }
    const [day] = aggregateEnsemble(hourlyWith([0]), daily)
    expect(day.tMinP10C).toBeNull()
    expect(day.tMaxP90C).toBeCloseTo(21.8)
  })
})

describe('quantile()', () => {
  it('interpolates like numpy: p10 and p90 of 0..50 are 5 and 45', () => {
    const sorted = Array.from({ length: 51 }, (_, i) => i)
    expect(quantile(sorted, 0.1)).toBe(5)
    expect(quantile(sorted, 0.9)).toBe(45)
  })

  it('interpolates between neighbours and handles a single value', () => {
    expect(quantile([0, 10], 0.25)).toBe(2.5)
    expect(quantile([7], 0.9)).toBe(7)
  })
})

describe('toDisplayPct()', () => {
  it.each([
    [5, 51, null],
    [6, 51, 10],
    [35, 51, 70],
    [47, 51, 90],
    [48, 51, 95],
    [51, 51, 95],
    [0, 0, null],
  ])('%i of %i → %s', (rain, members, expected) => {
    expect(toDisplayPct(rain, members)).toBe(expected)
  })
})
