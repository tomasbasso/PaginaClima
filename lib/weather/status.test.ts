import { describe, expect, it } from 'vitest'
import { deriveSourceStatus, selectAhoraVariant, snapshotHasNow } from './status'
import type { NowData, SourceInfo, WeatherSnapshot } from './types'

const NOW: NowData = {
  time: '2026-10-23T12:00:00-03:00',
  tempC: 18,
  feelsC: 17,
  humidityPct: 50,
  pressureHpa: 1013,
  windKmh: 10,
  gustKmh: 20,
  windDirDeg: 90,
  weatherCode: 0,
  isDay: 1,
  precipMm: 0,
}

function snap(now: NowData | null, om: Partial<SourceInfo>): WeatherSnapshot {
  return {
    generatedAt: '2026-10-23T15:00:00.000Z',
    now,
    hourly48: [],
    daily: [],
    sources: [
      { id: 'open-meteo', status: 'ok', fetchedAt: '2026-10-23T15:00:00.000Z', ...om },
      { id: 'met-norway', status: 'ok', fetchedAt: '2026-10-23T15:00:00.000Z' },
    ],
  }
}

describe('deriveSourceStatus()', () => {
  it('rejected → error', () => {
    expect(deriveSourceStatus({ status: 'rejected', reason: new Error('x') })).toBe('error')
  })

  it('fulfilled without refreshError → ok', () => {
    expect(deriveSourceStatus({ status: 'fulfilled', value: {} })).toBe('ok')
  })

  it('fulfilled with refreshError → stale', () => {
    expect(deriveSourceStatus({ status: 'fulfilled', value: { refreshError: 'http_500' } })).toBe(
      'stale',
    )
  })

  it('an old fetchedAt alone never yields stale (age is not an input)', () => {
    const value = { refreshError: undefined, value: { fetchedAt: '2020-01-01T00:00:00Z' } }
    expect(deriveSourceStatus({ status: 'fulfilled', value })).toBe('ok')
  })
})

describe('selectAhoraVariant()', () => {
  it('now null → empty', () => {
    expect(selectAhoraVariant(snap(null, { status: 'error', fetchedAt: null }))).toBe('empty')
  })

  it('ok → normal, even with a 3 h old fetchedAt', () => {
    expect(selectAhoraVariant(snap(NOW, { fetchedAt: '2026-10-23T12:00:00.000Z' }))).toBe('normal')
  })

  it.each(['stale', 'error'] as const)('%s with now set → degraded', (status) => {
    expect(selectAhoraVariant(snap(NOW, { status }))).toBe('degraded')
  })
})

describe('snapshotHasNow (WR-08)', () => {
  it('is true for a snapshot with current data', () => {
    expect(snapshotHasNow({ now: NOW, sources: [] })).toBe(true)
  })

  it('is false without current data or for malformed bodies', () => {
    expect(snapshotHasNow({ now: null, sources: [] })).toBe(false)
    expect(snapshotHasNow({ now: { tempC: 'x' } })).toBe(false)
    expect(snapshotHasNow(null)).toBe(false)
    expect(snapshotHasNow('Sin datos')).toBe(false)
    expect(snapshotHasNow(undefined)).toBe(false)
  })
})
