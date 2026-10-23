// Aggregator: read-through for Open-Meteo, plain allSettled for MET Norway, outcome-based status.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from '@/lib/sources/__fixtures__/open-meteo-forecast.json'
import type { SourceId } from './types'
import { isOutdated } from './freshness'
import { selectAhoraVariant } from './status'

const mocks = vi.hoisted(() => ({
  getOpenMeteoForecast: vi.fn(),
  getOpenMeteoForecastFresh: vi.fn(),
  getMetNorway: vi.fn(),
}))

vi.mock('@/lib/sources/openMeteoForecast', () => ({
  getOpenMeteoForecast: mocks.getOpenMeteoForecast,
  getOpenMeteoForecastFresh: mocks.getOpenMeteoForecastFresh,
}))
vi.mock('@/lib/sources/metNorway', () => ({ getMetNorway: mocks.getMetNorway }))

const T0 = Date.parse('2026-10-23T15:00:00Z')
const MIN = 60_000
const iso = (ms: number) => new Date(ms).toISOString()
const om = (ms: number) => ({ data: fixture, fetchedAt: iso(ms) })
const met = (ms: number) => ({
  data: { updatedAt: iso(ms), firstTime: iso(ms), firstTempC: 18 },
  fetchedAt: iso(ms),
})

/** Built from the post-resetModules graph so instanceof matches inside the aggregator. */
async function sourceError(source: SourceId, code: string) {
  const { SourceError } = await import('@/lib/sources/errors')
  return new SourceError(source, code)
}

async function loadSnapshot() {
  const mod = await import('./snapshot')
  return mod.getWeatherSnapshot()
}

describe('getWeatherSnapshot() status', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    mocks.getOpenMeteoForecast.mockReset()
    mocks.getOpenMeteoForecastFresh.mockReset()
    mocks.getMetNorway.mockReset()
    mocks.getMetNorway.mockResolvedValue(met(T0 - 5 * MIN))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('idle-then-visit, healthy upstream: fresh data, ok, normal, not outdated', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 3 * 60 * MIN))
    mocks.getOpenMeteoForecastFresh.mockResolvedValue(om(T0))

    const s = await loadSnapshot()

    expect(s.sources[0]).toEqual({ id: 'open-meteo', status: 'ok', fetchedAt: iso(T0) })
    expect(selectAhoraVariant(s)).toBe('normal')
    expect(isOutdated(T0 - Date.parse(s.sources[0].fetchedAt!))).toBe(false)
    expect(mocks.getOpenMeteoForecastFresh).toHaveBeenCalledWith(Math.floor(T0 / 900_000))
  })

  it('idle-then-visit, failing upstream: last-good kept, stale http_500, degraded', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 3 * 60 * MIN))
    mocks.getOpenMeteoForecastFresh.mockRejectedValue(await sourceError('open-meteo', 'http_500'))

    const s = await loadSnapshot()

    expect(s.sources[0]).toEqual({
      id: 'open-meteo',
      status: 'stale',
      fetchedAt: iso(T0 - 3 * 60 * MIN),
      errorCode: 'http_500',
    })
    expect(s.now).not.toBeNull()
    expect(selectAhoraVariant(s)).toBe('degraded')
  })

  it('Open-Meteo last-good rejected: never throws, now null, error, empty', async () => {
    mocks.getOpenMeteoForecast.mockRejectedValue(await sourceError('open-meteo', 'network'))

    const s = await loadSnapshot()

    expect(s.now).toBeNull()
    expect(s.hourly48).toEqual([])
    expect(s.sources[0]).toEqual({
      id: 'open-meteo',
      status: 'error',
      fetchedAt: null,
      errorCode: 'network',
    })
    expect(selectAhoraVariant(s)).toBe('empty')
    expect(mocks.getOpenMeteoForecastFresh).not.toHaveBeenCalled()
  })

  it('MET rejected only: Open-Meteo unaffected', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getMetNorway.mockRejectedValue(await sourceError('met-norway', 'http_503'))

    const s = await loadSnapshot()

    expect(s.now).not.toBeNull()
    expect(s.sources[0].status).toBe('ok')
    expect(s.sources[1]).toEqual({
      id: 'met-norway',
      status: 'error',
      fetchedAt: null,
      errorCode: 'http_503',
    })
  })

  it('MET 2 h old stays ok (no read-through for MET)', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getMetNorway.mockResolvedValue(met(T0 - 2 * 60 * MIN))

    const s = await loadSnapshot()

    expect(s.sources[1]).toEqual({
      id: 'met-norway',
      status: 'ok',
      fetchedAt: iso(T0 - 2 * 60 * MIN),
    })
    expect(mocks.getMetNorway).toHaveBeenCalledTimes(1)
  })
})
