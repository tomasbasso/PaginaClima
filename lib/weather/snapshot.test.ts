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
  getOpenMeteoEnsemble: vi.fn(),
  getOpenMeteoEnsembleFresh: vi.fn(),
  getOpenMeteoModels: vi.fn(),
  getOpenMeteoModelsFresh: vi.fn(),
}))

vi.mock('@/lib/sources/openMeteoForecast', () => ({
  getOpenMeteoForecast: mocks.getOpenMeteoForecast,
  getOpenMeteoForecastFresh: mocks.getOpenMeteoForecastFresh,
}))
vi.mock('@/lib/sources/metNorway', () => ({ getMetNorway: mocks.getMetNorway }))
vi.mock('@/lib/sources/openMeteoEnsemble', () => ({
  getOpenMeteoEnsemble: mocks.getOpenMeteoEnsemble,
  getOpenMeteoEnsembleFresh: mocks.getOpenMeteoEnsembleFresh,
}))
vi.mock('@/lib/sources/openMeteoModels', () => ({
  getOpenMeteoModels: mocks.getOpenMeteoModels,
  getOpenMeteoModelsFresh: mocks.getOpenMeteoModelsFresh,
}))

const T0 = Date.parse('2026-10-23T15:00:00Z')
const MIN = 60_000
const iso = (ms: number) => new Date(ms).toISOString()
const om = (ms: number) => ({ data: fixture, fetchedAt: iso(ms) })
const met = (ms: number) => ({
  data: { updatedAt: iso(ms), firstTime: iso(ms), firstTempC: 18 },
  fetchedAt: iso(ms),
})
const ensembleDay = {
  date: '2026-10-23',
  members: 51,
  rainMembers: 35,
  rainP10Mm: 0,
  rainP90Mm: 12.5,
  tMinP10C: 8.1,
  tMaxP90C: 24.4,
}
const ens = (ms: number) => ({ data: [ensembleDay], fetchedAt: iso(ms) })
/** Four close, dry votes: the day agrees. */
const modelsDay = {
  date: ensembleDay.date,
  votes: [20, 21, 22, 23].map((tMaxC) => ({ tMaxC, tMinC: 10, rainMm: 0 })),
}
const mods = (ms: number, data: unknown[] = [modelsDay]) => ({ data, fetchedAt: iso(ms) })

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
    mocks.getOpenMeteoEnsemble.mockReset()
    mocks.getOpenMeteoEnsembleFresh.mockReset()
    mocks.getOpenMeteoEnsemble.mockResolvedValue(ens(T0 - 5 * MIN))
    mocks.getOpenMeteoModels.mockReset()
    mocks.getOpenMeteoModelsFresh.mockReset()
    mocks.getOpenMeteoModels.mockResolvedValue(mods(T0 - 5 * MIN))
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

  it('ensemble ok: confidence carries the aggregate per day, without the date twice', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))

    const s = await loadSnapshot()

    const { date, ...ensemble } = ensembleDay
    expect(s.confidence).toEqual([{ date, ensemble, verdict: 'coinciden', voters: 4 }])
    expect(s.sources[2]).toEqual({
      id: 'open-meteo-ensemble',
      status: 'ok',
      fetchedAt: iso(T0 - 5 * MIN),
    })
    expect(mocks.getOpenMeteoEnsembleFresh).not.toHaveBeenCalled()
  })

  it('ensemble rejected: never throws, the verdict stays and open-meteo stays first', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getOpenMeteoEnsemble.mockRejectedValue(
      await sourceError('open-meteo-ensemble', 'http_500'),
    )

    const s = await loadSnapshot()

    expect(s.now).not.toBeNull()
    expect(s.sources[0]).toMatchObject({ id: 'open-meteo', status: 'ok' })
    expect(s.sources[2]).toEqual({
      id: 'open-meteo-ensemble',
      status: 'error',
      fetchedAt: null,
      errorCode: 'http_500',
    })
    expect(s.confidence).toEqual([
      { date: ensembleDay.date, ensemble: null, verdict: 'coinciden', voters: 4 },
    ])
    expect(selectAhoraVariant(s)).toBe('normal')
  })

  it('ensemble refresh fails past its 3 h TTL: stale, last-good aggregate kept', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getOpenMeteoEnsemble.mockResolvedValue(ens(T0 - 4 * 60 * MIN))
    mocks.getOpenMeteoEnsembleFresh.mockRejectedValue(
      await sourceError('open-meteo-ensemble', 'timeout'),
    )

    const s = await loadSnapshot()

    expect(s.sources[2]).toEqual({
      id: 'open-meteo-ensemble',
      status: 'stale',
      fetchedAt: iso(T0 - 4 * 60 * MIN),
      errorCode: 'timeout',
    })
    expect(s.confidence).toHaveLength(1)
    expect(s.confidence[0].ensemble?.rainMembers).toBe(35)
    expect(mocks.getOpenMeteoEnsembleFresh).toHaveBeenCalledWith(Math.floor(T0 / 10_800_000))
  })

  it('Open-Meteo down and ensemble up: confidence still arrives', async () => {
    mocks.getOpenMeteoForecast.mockRejectedValue(await sourceError('open-meteo', 'network'))

    const s = await loadSnapshot()

    expect(s.now).toBeNull()
    expect(s.sources[0].id).toBe('open-meteo')
    expect(s.confidence).toHaveLength(1)
  })

  it('models rejected: never throws, the ensemble stays and every verdict is sinDato', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getOpenMeteoModels.mockRejectedValue(await sourceError('open-meteo-models', 'http_500'))

    const s = await loadSnapshot()

    expect(s.now).not.toBeNull()
    expect(s.sources[0]).toMatchObject({ id: 'open-meteo', status: 'ok' })
    expect(s.sources[3]).toEqual({
      id: 'open-meteo-models',
      status: 'error',
      fetchedAt: null,
      errorCode: 'http_500',
    })
    expect(s.confidence).toHaveLength(1)
    expect(s.confidence[0].ensemble?.rainMembers).toBe(35)
    expect(s.confidence[0]).toMatchObject({ verdict: 'sinDato', voters: 0 })
    expect(selectAhoraVariant(s)).toBe('normal')
  })

  it('ensemble and models rejected: confidence is empty', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getOpenMeteoEnsemble.mockRejectedValue(
      await sourceError('open-meteo-ensemble', 'http_500'),
    )
    mocks.getOpenMeteoModels.mockRejectedValue(await sourceError('open-meteo-models', 'network'))

    const s = await loadSnapshot()

    expect(s.confidence).toEqual([])
    expect(s.now).not.toBeNull()
  })

  it('models refresh fails past its 1 h TTL: stale, the verdict comes from the last votes', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getOpenMeteoModels.mockResolvedValue(mods(T0 - 2 * 60 * MIN))
    mocks.getOpenMeteoModelsFresh.mockRejectedValue(
      await sourceError('open-meteo-models', 'timeout'),
    )

    const s = await loadSnapshot()

    expect(s.sources[3]).toEqual({
      id: 'open-meteo-models',
      status: 'stale',
      fetchedAt: iso(T0 - 2 * 60 * MIN),
      errorCode: 'timeout',
    })
    expect(s.confidence[0]).toMatchObject({ verdict: 'coinciden', voters: 4 })
    expect(mocks.getOpenMeteoModelsFresh).toHaveBeenCalledWith(Math.floor(T0 / 3_600_000))
  })

  it('joins both sources on the sorted union of dates', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getOpenMeteoModels.mockResolvedValue(
      mods(T0 - 5 * MIN, [
        { ...modelsDay, date: '2026-10-24', votes: modelsDay.votes.slice(0, 3) },
        { ...modelsDay, date: '2026-10-22', votes: modelsDay.votes.slice(0, 1) },
      ]),
    )

    const s = await loadSnapshot()

    expect(s.confidence.map((d) => [d.date, d.ensemble !== null, d.verdict, d.voters])).toEqual([
      ['2026-10-22', false, 'solo', 1],
      ['2026-10-23', true, 'sinDato', 0],
      ['2026-10-24', false, 'coinciden', 3],
    ])
  })

  it('the serialized snapshot has no raw member columns and no model names', async () => {
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))

    const s = await loadSnapshot()

    const leak = /_member\d|precipitation_member|ecmwf_ifs|gfs_seamless|icon_seamless|gem_seamless/
    // The guard itself: a typo in this pattern once let temperature members through.
    expect('temperature_2m_max_member01').toMatch(leak)
    expect(JSON.stringify(s)).not.toMatch(leak)
    expect(s.confidence[0]).not.toHaveProperty('votes')
  })
})

describe('getWeatherSnapshot() WEATHER_FAULT (D-13)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getOpenMeteoForecast.mockReset()
    mocks.getOpenMeteoForecastFresh.mockReset()
    mocks.getMetNorway.mockReset()
    mocks.getOpenMeteoForecast.mockResolvedValue(om(T0 - 5 * MIN))
    mocks.getMetNorway.mockResolvedValue(met(T0 - 5 * MIN))
    mocks.getOpenMeteoEnsemble.mockReset()
    mocks.getOpenMeteoEnsembleFresh.mockReset()
    mocks.getOpenMeteoEnsemble.mockResolvedValue(ens(T0 - 5 * MIN))
    mocks.getOpenMeteoModels.mockReset()
    mocks.getOpenMeteoModelsFresh.mockReset()
    mocks.getOpenMeteoModels.mockResolvedValue(mods(T0 - 5 * MIN))
    vi.stubEnv('VERCEL_ENV', undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('openmeteo-down: Open-Meteo error but last-good data kept', async () => {
    vi.stubEnv('WEATHER_FAULT', 'openmeteo-down')
    const s = await loadSnapshot()
    expect(s.sources[0]).toEqual({
      id: 'open-meteo',
      status: 'error',
      fetchedAt: iso(T0 - 5 * MIN),
      errorCode: 'fault',
    })
    expect(s.now).not.toBeNull()
    expect(s.sources[1].status).toBe('ok')
    expect(selectAhoraVariant(s)).toBe('degraded')
  })

  it('metno-down: only MET is error', async () => {
    vi.stubEnv('WEATHER_FAULT', 'metno-down')
    const s = await loadSnapshot()
    expect(s.sources[0].status).toBe('ok')
    expect(s.sources[1]).toMatchObject({ id: 'met-norway', status: 'error', errorCode: 'fault' })
    expect(selectAhoraVariant(s)).toBe('normal')
  })

  it('stale: Open-Meteo fetchedAt shifted back 45 min, still ok', async () => {
    vi.stubEnv('WEATHER_FAULT', 'stale')
    const s = await loadSnapshot()
    expect(s.sources[0]).toEqual({ id: 'open-meteo', status: 'ok', fetchedAt: iso(T0 - 50 * MIN) })
    expect(isOutdated(T0 - Date.parse(s.sources[0].fetchedAt!))).toBe(true)
  })

  it('empty: no data, every source error', async () => {
    vi.stubEnv('WEATHER_FAULT', 'empty')
    const s = await loadSnapshot()
    expect(s.now).toBeNull()
    expect(s.hourly48).toEqual([])
    expect(s.daily).toEqual([])
    expect(s.confidence).toEqual([])
    for (const src of s.sources) expect(src).toMatchObject({ status: 'error', fetchedAt: null })
    expect(selectAhoraVariant(s)).toBe('empty')
  })

  it('ensemble-down: the data goes too, so the failure notice never sits on a full row', async () => {
    vi.stubEnv('WEATHER_FAULT', 'ensemble-down')
    const s = await loadSnapshot()
    expect(s.sources[2]).toEqual({
      id: 'open-meteo-ensemble',
      status: 'error',
      fetchedAt: null,
      errorCode: 'fault',
    })
    expect(s.confidence.length).toBeGreaterThan(0)
    for (const day of s.confidence) expect(day.ensemble).toBeNull()
    // The other source and the main forecast stay untouched.
    expect(s.sources[3].status).toBe('ok')
    expect(s.confidence[0]).toMatchObject({ verdict: 'coinciden', voters: 4 })
    expect(selectAhoraVariant(s)).toBe('normal')
  })

  it('models-down: every verdict goes to sinDato with no voters, and the ensemble stays', async () => {
    vi.stubEnv('WEATHER_FAULT', 'models-down')
    const s = await loadSnapshot()
    expect(s.sources[3]).toEqual({
      id: 'open-meteo-models',
      status: 'error',
      fetchedAt: null,
      errorCode: 'fault',
    })
    expect(s.confidence.length).toBeGreaterThan(0)
    for (const day of s.confidence) expect(day).toMatchObject({ verdict: 'sinDato', voters: 0 })
    expect(s.sources[2].status).toBe('ok')
    expect(s.confidence[0].ensemble?.rainMembers).toBe(35)
    expect(selectAhoraVariant(s)).toBe('normal')
  })

  it.each(['openmeteo-down', 'metno-down', 'stale', 'empty', 'ensemble-down', 'models-down'])(
    'ignores %s in production',
    async (fault) => {
      vi.stubEnv('WEATHER_FAULT', fault)
      vi.stubEnv('VERCEL_ENV', 'production')
      const s = await loadSnapshot()
      expect(s.now).not.toBeNull()
      expect(s.sources.map((x) => x.status)).toEqual(['ok', 'ok', 'ok', 'ok'])
      expect(s.sources[0].fetchedAt).toBe(iso(T0 - 5 * MIN))
      expect(s.confidence[0]).toMatchObject({ verdict: 'coinciden', voters: 4 })
      expect(s.confidence[0].ensemble).not.toBeNull()
    },
  )

  it('ignores an unknown fault value', async () => {
    vi.stubEnv('WEATHER_FAULT', 'everything-on-fire')
    const s = await loadSnapshot()
    expect(s.sources.map((x) => x.status)).toEqual(['ok', 'ok', 'ok', 'ok'])
    expect(s.now).not.toBeNull()
  })
})
