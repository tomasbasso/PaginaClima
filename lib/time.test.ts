import { describe, expect, it } from 'vitest'
import {
  addDaysToKey,
  formatDayLong,
  formatDayMonth,
  formatDayOfMonth,
  formatHHmm,
  formatHeaderDate,
  localDateKey,
  localHour,
  monthLong,
  relativeDayLabel,
  weekdayLong,
  weekdayShort,
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
  it('localHour reads the Argentina hour, never the runtime one', () => {
    expect(localHour(new Date('2026-10-24T02:59:00Z'))).toBe(23)
    expect(localHour(new Date('2026-10-24T03:00:00Z'))).toBe(0)
    expect(localHour(new Date('2026-10-23T17:30:00Z'))).toBe(14)
  })

  it('addDaysToKey crosses month and year boundaries', () => {
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('weekdayShort / weekdayLong come from local tables', () => {
    expect(weekdayShort('2026-10-24')).toBe('sáb')
    expect(weekdayLong('2026-10-24')).toBe('sábado')
    expect(weekdayShort('2026-10-25')).toBe('dom')
    expect(weekdayLong('2026-10-28')).toBe('miércoles')
  })

  it('relativeDayLabel: Hoy, Mañana, then "{weekday} {day}"', () => {
    expect(relativeDayLabel('2026-10-23', '2026-10-23')).toBe('Hoy')
    expect(relativeDayLabel('2026-10-24', '2026-10-23')).toBe('Mañana')
    expect(relativeDayLabel('2026-10-25', '2026-10-23')).toBe('dom 25')
    expect(relativeDayLabel('2026-11-02', '2026-10-31')).toBe('lun 2')
  })
})

describe('month helpers (local MONTH_LONG table)', () => {
  it('names the month and the day of the month', () => {
    expect(monthLong('2026-10-25')).toBe('octubre')
    expect(monthLong('2026-01-01')).toBe('enero')
    expect(monthLong('2026-12-31')).toBe('diciembre')
    expect(formatDayOfMonth('2026-08-12')).toBe('12 de agosto')
    expect(formatDayOfMonth('2026-08-02')).toBe('2 de agosto')
  })

  it('writes the long day with the weekday', () => {
    expect(formatDayLong('2026-11-05')).toBe('jueves 5 de noviembre')
  })
})
