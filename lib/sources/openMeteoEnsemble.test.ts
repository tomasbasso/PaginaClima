// Ensemble adapter (D-17, D-18). Same failure contract as the forecast; caches only the aggregate.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/open-meteo-ensemble.json'

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

async function load() {
  return import('./openMeteoEnsemble')
}

function stub(impl: (input: unknown) => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status = 200) =>
  async () => new Response(JSON.stringify(body), { status })

/** Same columns with every value null: how Open-Meteo says it has no data. */
const allNull = <T extends object>(block: T) =>
  Object.fromEntries(
    Object.entries(block).map(([key, values]) => [
      key,
      key === 'time' ? values : (values as unknown[]).map(() => null),
    ]),
  )

const noData = { ...fixture, hourly: allNull(fixture.hourly), daily: allNull(fixture.daily) }

describe('Open-Meteo ensemble adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves the real fixture as 14 aggregated days and asks only for what it needs', async () => {
    const fetchMock = stub(json(fixture))
    const { fetchOpenMeteoEnsembleRaw } = await load()
    const r = await fetchOpenMeteoEnsembleRaw()
    expect(r.data).toHaveLength(14)
    expect(r.data[0].members).toBe(51)
    expect(Number.isFinite(Date.parse(r.fetchedAt))).toBe(true)

    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.host).toBe('ensemble-api.open-meteo.com')
    expect(url.searchParams.get('models')).toBe('ecmwf_ifs025')
    expect(url.searchParams.get('hourly')).toBe('precipitation')
    expect(url.searchParams.get('daily')).toBe('temperature_2m_max,temperature_2m_min')
    expect(url.searchParams.get('forecast_days')).toBe('15')
    expect(url.searchParams.get('timezone')).toBe('America/Argentina/Buenos_Aires')
  })

  it('never keeps raw member columns in the result', async () => {
    stub(json(fixture))
    const { fetchOpenMeteoEnsembleRaw } = await load()
    const r = await fetchOpenMeteoEnsembleRaw()
    expect(JSON.stringify(r)).not.toMatch(/_member\d|precipitation_member/)
    expect(Object.keys(r.data[0]).sort()).toEqual([
      'date',
      'members',
      'rainMembers',
      'rainP10Mm',
      'rainP90Mm',
      'tMaxP90C',
      'tMinP10C',
    ])
  })

  it('rejects with http_500 under its own source id', async () => {
    stub(json({ error: true, reason: 'boom' }, 500))
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({
      name: 'SourceError',
      source: 'open-meteo-ensemble',
      code: 'http_500',
    })
  })

  it('rejects with http_400 without leaking the upstream reason', async () => {
    stub(json({ error: true, reason: 'secret detail' }, 400))
    const { getOpenMeteoEnsemble } = await load()
    const err = await getOpenMeteoEnsemble().then(
      () => null,
      (e: unknown) => e,
    )
    expect(err).toMatchObject({ name: 'SourceError', code: 'http_400' })
    const e = err as Error
    expect(JSON.stringify({ ...e, message: e.message })).not.toContain('secret detail')
  })

  it('rejects with network when fetch throws a TypeError', async () => {
    stub(async () => {
      throw new TypeError('fetch failed')
    })
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({ code: 'network' })
  })

  it('rejects with timeout on an AbortSignal timeout', async () => {
    stub(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({ code: 'timeout' })
  })

  it('rejects with schema when the body is not JSON', async () => {
    stub(async () => new Response('<html>', { status: 200 }))
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when there are fewer than 40 member columns', async () => {
    const hourly: Record<string, unknown> = { time: fixture.hourly.time }
    const source = fixture.hourly as unknown as Record<string, unknown>
    for (let i = 1; i <= 39; i++) {
      const key = `precipitation_member${String(i).padStart(2, '0')}`
      hourly[key] = source[key]
    }
    stub(json({ ...fixture, hourly }))
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when a member column holds something other than numbers', async () => {
    const broken = {
      ...fixture,
      hourly: { ...fixture.hourly, precipitation_member01: fixture.hourly.time.map(() => 'x') },
    }
    stub(json(broken))
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when a daily temperature column holds something other than numbers', async () => {
    const broken = {
      ...fixture,
      daily: { ...fixture.daily, temperature_2m_max: fixture.daily.time.map(() => 'x') },
    }
    stub(json(broken))
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when arrays differ in length', async () => {
    const broken = {
      ...fixture,
      hourly: { ...fixture.hourly, precipitation: fixture.hourly.precipitation.slice(2) },
    }
    stub(json(broken))
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema on another timezone', async () => {
    stub(json({ ...fixture, timezone: 'UTC' }))
    const { getOpenMeteoEnsemble } = await load()
    await expect(getOpenMeteoEnsemble()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when every member column is null, so an empty result is never cached', async () => {
    stub(json(noData))
    const { fetchOpenMeteoEnsembleRaw } = await load()
    await expect(fetchOpenMeteoEnsembleRaw()).rejects.toMatchObject({
      name: 'SourceError',
      source: 'open-meteo-ensemble',
      code: 'schema',
    })
  })

  it('a response with no usable day leaves the last good value: stale, or error with none', async () => {
    const { deriveSourceStatus } = await import('@/lib/weather/status')
    const { readThrough } = await import('./readThrough')
    const { getOpenMeteoEnsemble, getOpenMeteoEnsembleFresh } = await load()
    stub(json(noData))
    const nowMs = Date.parse('2026-11-02T15:00:00Z')
    const lastGood = { data: [{
        date: '2026-11-02',
        members: 51,
        rainMembers: 10,
        rainP10Mm: 0,
        rainP90Mm: 4,
        tMinP10C: 8,
        tMaxP90C: 24,
      }], fetchedAt: '2026-11-02T06:00:00.000Z' }

    const kept = await Promise.allSettled([
      readThrough({ getCached: async () => lastGood, getFresh: getOpenMeteoEnsembleFresh, ttlS: 3600, nowMs }),
    ])
    expect(deriveSourceStatus(kept[0])).toBe('stale')
    expect(kept[0]).toMatchObject({ value: { value: lastGood, refreshError: 'schema' } })

    const none = await Promise.allSettled([
      readThrough({ getCached: getOpenMeteoEnsemble, getFresh: getOpenMeteoEnsembleFresh, ttlS: 3600, nowMs }),
    ])
    expect(deriveSourceStatus(none[0])).toBe('error')
  })

  it('getOpenMeteoEnsembleFresh(bucket) resolves the same shape', async () => {
    const fetchMock = stub(json(fixture))
    const { getOpenMeteoEnsembleFresh } = await load()
    const r = await getOpenMeteoEnsembleFresh(7)
    expect(r.data).toHaveLength(14)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
