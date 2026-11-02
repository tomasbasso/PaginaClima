// Local-day rain window (00:00, 24:00] (D-10, RESEARCH Pattern 1).
import { describe, expect, it } from 'vitest'
import { addDaysToKey } from '@/lib/time'
import { localDayRain } from './localDayRain'

const pad = (n: number) => String(n).padStart(2, '0')

/** Stamps of one full local day: D 01:00 … D+1 00:00. */
function fullDay(date: string): string[] {
  const hours = Array.from({ length: 23 }, (_, i) => `${date}T${pad(i + 1)}:00`)
  return [...hours, `${addDaysToKey(date, 1)}T00:00`]
}

describe('localDayRain()', () => {
  it('sums a rain block on stamps 22, 23 and 00 into the previous day', () => {
    const time = [...fullDay('2026-11-03'), ...fullDay('2026-11-04')]
    const mm = time.map((t) =>
      ['2026-11-03T22:00', '2026-11-03T23:00', '2026-11-04T00:00'].includes(t) ? 5.5 : 0,
    )
    const out = localDayRain(time, mm)
    expect(out.get('2026-11-03')).toBe(16.5)
    expect(out.get('2026-11-04')).toBe(0)
  })

  it('does not publish a day with 23 hours', () => {
    const time = fullDay('2026-11-03').slice(0, 23)
    expect(localDayRain(time, time.map(() => 1)).size).toBe(0)
  })

  it('drops the partial "yesterday" of a series that opens at 00:00', () => {
    const time = ['2026-11-03T00:00', ...fullDay('2026-11-03')]
    const out = localDayRain(time, time.map(() => 1))
    expect([...out.keys()]).toEqual(['2026-11-03'])
    expect(out.get('2026-11-03')).toBe(24)
  })

  it('counts a negative value as 0', () => {
    const time = fullDay('2026-11-03')
    const mm = time.map((_, i) => (i === 0 ? -0.1 : 0))
    expect(localDayRain(time, mm).get('2026-11-03')).toBe(0)
  })

  it('does not count null as an hour', () => {
    const time = fullDay('2026-11-03')
    const mm = time.map((_, i) => (i === 5 ? null : 1))
    expect(localDayRain(time, mm).has('2026-11-03')).toBe(false)
  })

  it('accepts stamps with and without seconds', () => {
    const time = fullDay('2026-11-03').map((t, i) => (i % 2 === 0 ? `${t}:00` : t))
    expect(localDayRain(time, time.map(() => 1)).get('2026-11-03')).toBe(24)
  })

  it('crosses month and year boundaries', () => {
    const out = localDayRain(fullDay('2026-12-31'), fullDay('2026-12-31').map(() => 0.5))
    expect(out.get('2026-12-31')).toBe(12)
    expect(out.has('2027-01-01')).toBe(false)
  })

  it('does not lose the threshold to float drift: ten hours of 0.1 are exactly 1', () => {
    const time = fullDay('2026-11-03')
    const mm = time.map((_, i) => (i < 10 ? 0.1 : 0))
    expect(localDayRain(time, mm).get('2026-11-03')).toBe(1)
  })
})
