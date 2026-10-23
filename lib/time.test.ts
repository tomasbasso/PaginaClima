import { describe, expect, it } from 'vitest'
import {
  formatDayMonth,
  formatHHmm,
  formatHeaderDate,
  localDateKey,
  withOffset,
} from './time'

describe('lib/time (D-08, DATA-04) under TZ=UTC', () => {
  it('runs in UTC like Vercel', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(0)
  })

  it('localDateKey stays on the local day until 03:00Z', () => {
    expect(localDateKey(new Date('2026-10-24T02:59:00Z'))).toBe('2026-10-23')
    expect(localDateKey(new Date('2026-10-24T03:00:00Z'))).toBe('2026-10-24')
  })

  it('formatHeaderDate assembles "{weekday} {day} de {month}, {HH:mm}" in Argentina time', () => {
    expect(formatHeaderDate(new Date('2026-10-24T02:59:00Z'))).toBe('viernes 23 de octubre, 23:59')
    expect(formatHeaderDate(new Date('2026-10-24T03:00:00Z'))).toBe('sábado 24 de octubre, 00:00')
    expect(formatHeaderDate(new Date('2026-10-24T00:30:00Z')).startsWith('viernes 23')).toBe(true)
  })

  it('formatHHmm renders 24h', () => {
    expect(formatHHmm(new Date('2026-10-24T03:05:00Z'))).toBe('00:05')
    expect(formatHHmm(new Date('2026-10-23T18:40:00Z'))).toBe('15:40')
    expect(formatHHmm(new Date('2026-10-23T12:05:00Z'))).toBe('09:05')
  })

  it('formatDayMonth renders dd/MM in local time', () => {
    expect(formatDayMonth(new Date('2026-10-24T02:59:00Z'))).toBe('23/10')
    expect(formatDayMonth(new Date('2026-01-05T12:00:00Z'))).toBe('05/01')
  })

  it('withOffset attaches the API offset', () => {
    expect(withOffset('2026-10-23T12:00', -10800)).toBe('2026-10-23T12:00:00-03:00')
  })

  it('never emits a.m./p.m. markers', () => {
    const instants = ['2026-10-24T03:05:00Z', '2026-10-23T18:40:00Z', '2026-10-23T15:00:00Z']
    for (const iso of instants) {
      const d = new Date(iso)
      for (const out of [formatHeaderDate(d), formatHHmm(d), formatDayMonth(d)]) {
        expect(out).not.toMatch(/[ap]\.\s?m\./i)
      }
    }
  })
})
