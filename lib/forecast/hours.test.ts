import { describe, expect, it } from 'vitest'
import { makeDaily, makeHourly } from './__fixtures__/build'
import { DAY_PART_PHRASE, dayKeyOf, dayPart, hourOf, selectFutureHours } from './hours'

describe('lib/forecast/hours under TZ=UTC', () => {
  it('runs in UTC like Vercel', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(0)
  })

  it('hourOf / dayKeyOf slice the -03:00 ISO, with or without seconds', () => {
    expect(hourOf('2026-10-23T14:00:00-03:00')).toBe(14)
    expect(dayKeyOf('2026-10-23T14:00:00-03:00')).toBe('2026-10-23')
    expect(hourOf('2026-10-23T14:00-03:00')).toBe(14)
    expect(dayKeyOf('2026-10-23T23:00-03:00')).toBe('2026-10-23')
    expect(hourOf('2026-10-24T00:00:00-03:00')).toBe(0)
  })

  it('selectFutureHours drops hours before the current local hour', () => {
    const points = makeHourly('2026-10-23T09:00:00-03:00', 12)
    const kept = selectFutureHours(points, new Date('2026-10-23T17:30:00Z')) // 14:30 ART
    expect(kept[0].time).toBe('2026-10-23T14:00:00-03:00')
    expect(kept).toHaveLength(7)
  })

  it('selectFutureHours keeps the current hour when now is exactly on the hour', () => {
    const points = makeHourly('2026-10-23T09:00:00-03:00', 12)
    const kept = selectFutureHours(points, new Date('2026-10-23T17:00:00Z')) // 14:00 ART
    expect(kept[0].time).toBe('2026-10-23T14:00:00-03:00')
  })

  it('dayPart ranges', () => {
    for (const h of [0, 5]) expect(dayPart(h)).toBe('madrugada')
    for (const h of [6, 11]) expect(dayPart(h)).toBe('mañana')
    for (const h of [12, 13]) expect(dayPart(h)).toBe('mediodía')
    for (const h of [14, 19]) expect(dayPart(h)).toBe('tarde')
    for (const h of [20, 23]) expect(dayPart(h)).toBe('noche')
  })

  it('DAY_PART_PHRASE matches the UI-SPEC franjas', () => {
    expect(DAY_PART_PHRASE).toEqual({
      madrugada: 'a la madrugada',
      mañana: 'a la mañana',
      mediodía: 'al mediodía',
      tarde: 'a la tarde',
      noche: 'a la noche',
    })
  })

  it('makeHourly builds withOffset-format times crossing midnight', () => {
    const pts = makeHourly('2026-10-23T14:00:00-03:00', 48)
    expect(pts).toHaveLength(48)
    expect(pts[0].time).toBe('2026-10-23T14:00:00-03:00')
    expect(pts[10].time).toBe('2026-10-24T00:00:00-03:00')
    expect(pts[47].time).toBe('2026-10-25T13:00:00-03:00')
    for (const p of pts) expect(p.time.endsWith(':00:00-03:00')).toBe(true)
    expect(pts[0].isDay).toBe(1)
    expect(pts[10].isDay).toBe(0)
  })

  it('makeHourly applies overrides by index and local hour', () => {
    const pts = makeHourly('2026-10-23T14:00:00-03:00', 4, (_i, hour) =>
      hour === 15 ? { precipMm: 2 } : {},
    )
    expect(pts.map((p) => p.precipMm)).toEqual([0, 2, 0, 0])
  })

  it('makeDaily builds consecutive keys', () => {
    const days = makeDaily('2026-10-31', 3, (i) => (i === 1 ? { tMaxC: 30 } : {}))
    expect(days.map((d) => d.date)).toEqual(['2026-10-31', '2026-11-01', '2026-11-02'])
    expect(days[1].tMaxC).toBe(30)
    expect(days[0].sunrise).toBe('2026-10-31T06:30')
  })
})
