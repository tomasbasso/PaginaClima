// Multi-model adapter (D-13, D-17, D-18). Same failure contract as the ensemble; caches only the votes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addDaysToKey } from '@/lib/time'
import { aggregateModels } from '@/lib/forecast/agreement'
import fixture from './__fixtures__/open-meteo-models.json'

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

async function load() {
  return import('./openMeteoModels')
}

function stub(impl: (input: unknown) => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status = 200) =>
  async () => new Response(JSON.stringify(body), { status })

const pad = (n: number) => String(n).padStart(2, '0')

/** Same columns with every value null: how Open-Meteo says it has no data. */
const allNull = <T extends object>(block: T) =>
  Object.fromEntries(
    Object.entries(block).map(([key, values]) => [
      key,
      key === 'time' ? values : (values as unknown[]).map(() => null),
    ]),
  )

const noData = { ...fixture, hourly: allNull(fixture.hourly), daily: allNull(fixture.daily) }

const sliceColumns = <T extends object>(block: T, rows: number) =>
  Object.fromEntries(
    Object.entries(block).map(([key, values]) => [key, (values as unknown[]).slice(0, rows)]),
  )

/**
 * The fixture cut to exactly n closed days. A local day ends on the 00:00 stamp of the next one and
 * the first stamp belongs to a partial "yesterday", so n days need 24 * n + 1 hourly rows.
 */
const firstDays = (n: number) => ({
  ...fixture,
  hourly: sliceColumns(fixture.hourly, 24 * n + 1),
  daily: sliceColumns(fixture.daily, n),
})

/** Stamps of one full local day: D 01:00 … D+1 00:00. */
function fullDay(date: string): string[] {
  const hours = Array.from({ length: 23 }, (_, i) => `${date}T${pad(i + 1)}:00`)
  return [...hours, `${addDaysToKey(date, 1)}T00:00`]
}

/** One model, one day, with the given rain per stamp. */
function oneModel(date: string, rain: (stamp: string) => number | null) {
  const time = fullDay(date)
  return {
    hourly: { time, precipitation_gfs_seamless: time.map(rain) },
    daily: {
      time: [date],
      temperature_2m_max_gfs_seamless: [25],
      temperature_2m_min_gfs_seamless: [10],
    },
  }
}

/** Fixture blocks without the columns of one model. */
function withoutModel(model: string) {
  const drop = (block: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(block).filter(([key]) => !key.endsWith(`_${model}`)))
  return { ...fixture, hourly: drop(fixture.hourly), daily: drop(fixture.daily) }
}

describe('aggregateModels()', () => {
  const days = aggregateModels(fixture.hourly, fixture.daily)

  it('takes the votes of the real capture: 4 on day 1 and 2 on day 14', () => {
    expect(days).toHaveLength(14)
    expect(days[0].votes).toHaveLength(4)
    expect(days[13].votes).toHaveLength(2)
    expect(days.map((d) => d.date)).toEqual(fixture.daily.time.slice(0, 14))
  })

  it('never hands out a vote with a null', () => {
    for (const day of days) {
      for (const vote of day.votes) {
        expect(Number.isFinite(vote.tMaxC)).toBe(true)
        expect(Number.isFinite(vote.tMinC)).toBe(true)
        expect(Number.isFinite(vote.rainMm)).toBe(true)
      }
    }
  })

  it('reads the temperatures of the daily block, not of the hourly one', () => {
    expect(days[0].votes[0].tMaxC).toBe(fixture.daily.temperature_2m_max_ecmwf_ifs[0])
    expect(days[0].votes[0].tMinC).toBe(fixture.daily.temperature_2m_min_ecmwf_ifs[0])
  })

  it('a model without the maximum, the minimum or one rain hour does not vote that day', () => {
    const date = '2026-11-03'
    const base = oneModel(date, () => 0)
    expect(aggregateModels(base.hourly, base.daily)[0].votes).toHaveLength(1)

    const noMax = { ...base.daily, temperature_2m_max_gfs_seamless: [null] }
    expect(aggregateModels(base.hourly, noMax)).toEqual([])

    const noMin = { ...base.daily, temperature_2m_min_gfs_seamless: [null] }
    expect(aggregateModels(base.hourly, noMin)).toEqual([])

    const oneHourMissing = oneModel(date, (stamp) => (stamp === `${date}T05:00` ? null : 0))
    expect(aggregateModels(oneHourMissing.hourly, oneHourMissing.daily)).toEqual([])
  })

  it('a rain block on stamps 22, 23 and 00 counts in the previous day', () => {
    const date = '2026-11-03'
    const next = addDaysToKey(date, 1)
    const time = [...fullDay(date), ...fullDay(next)]
    const block = [`${date}T22:00`, `${date}T23:00`, `${next}T00:00`]
    const days2 = aggregateModels(
      { time, precipitation_gfs_seamless: time.map((t) => (block.includes(t) ? 5.5 : 0)) },
      {
        time: [date, next],
        temperature_2m_max_gfs_seamless: [25, 25],
        temperature_2m_min_gfs_seamless: [10, 10],
      },
    )
    expect(days2.map((d) => d.votes[0].rainMm)).toEqual([16.5, 0])
  })
})

describe('Open-Meteo models adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves the real fixture and asks only for what it needs', async () => {
    const fetchMock = stub(json(fixture))
    const { fetchOpenMeteoModelsRaw } = await load()
    const r = await fetchOpenMeteoModelsRaw()
    expect(r.data).toHaveLength(14)
    expect(r.data[0].votes).toHaveLength(4)
    expect(Number.isFinite(Date.parse(r.fetchedAt))).toBe(true)

    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.host).toBe('api.open-meteo.com')
    expect(url.searchParams.get('models')).toBe(
      'ecmwf_ifs,gfs_seamless,icon_seamless,gem_seamless',
    )
    expect(url.searchParams.get('forecast_days')).toBe('15')
    expect(url.searchParams.get('hourly')).toBe('precipitation')
    expect(url.searchParams.get('daily')).toBe('temperature_2m_max,temperature_2m_min')
    expect(url.searchParams.get('timezone')).toBe('America/Argentina/Buenos_Aires')
  })

  it('keeps no model names in the result', async () => {
    stub(json(fixture))
    const { fetchOpenMeteoModelsRaw } = await load()
    const r = await fetchOpenMeteoModelsRaw()
    expect(JSON.stringify(r.data)).not.toMatch(/ecmwf_ifs|gfs_seamless|icon_seamless|gem_seamless/)
    expect(Object.keys(r.data[0].votes[0]).sort()).toEqual(['rainMm', 'tMaxC', 'tMinC'])
  })

  it('a missing model does not break the request and does not vote', async () => {
    stub(json(withoutModel('gem_seamless')))
    const { fetchOpenMeteoModelsRaw } = await load()
    const r = await fetchOpenMeteoModelsRaw()
    expect(r.data[0].votes).toHaveLength(3)
  })

  it('rejects with http_500 under its own source id', async () => {
    stub(json({ error: true, reason: 'boom' }, 500))
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({
      name: 'SourceError',
      source: 'open-meteo-models',
      code: 'http_500',
    })
  })

  it('rejects with http_400 without leaking the upstream reason', async () => {
    stub(json({ error: true, reason: 'secret detail' }, 400))
    const { getOpenMeteoModels } = await load()
    const err = await getOpenMeteoModels().then(
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
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({ code: 'network' })
  })

  it('rejects with timeout on an AbortSignal timeout', async () => {
    stub(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({ code: 'timeout' })
  })

  it('rejects with schema when the body is not JSON', async () => {
    stub(async () => new Response('<html>', { status: 200 }))
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when arrays differ in length', async () => {
    const broken = {
      ...fixture,
      hourly: {
        ...fixture.hourly,
        precipitation_gfs_seamless: fixture.hourly.precipitation_gfs_seamless.slice(2),
      },
    }
    stub(json(broken))
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema on another timezone', async () => {
    stub(json({ ...fixture, timezone: 'UTC' }))
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when none of the 4 models has its columns', async () => {
    const empty = {
      ...fixture,
      hourly: { time: fixture.hourly.time },
      daily: { time: fixture.daily.time },
    }
    stub(json(empty))
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when no model has rain and temperatures together', async () => {
    stub(json({ ...fixture, daily: { time: fixture.daily.time } }))
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when a model column holds something other than numbers', async () => {
    const broken = {
      ...fixture,
      daily: {
        ...fixture.daily,
        temperature_2m_max_gfs_seamless: fixture.daily.time.map(() => 'x'),
      },
    }
    stub(json(broken))
    const { getOpenMeteoModels } = await load()
    await expect(getOpenMeteoModels()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema when every model column is null, so an empty result is never cached', async () => {
    stub(json(noData))
    const { fetchOpenMeteoModelsRaw } = await load()
    await expect(fetchOpenMeteoModelsRaw()).rejects.toMatchObject({
      name: 'SourceError',
      source: 'open-meteo-models',
      code: 'schema',
    })
  })

  it('rejects with schema when the columns have no rows at all', async () => {
    const noRows = (block: object) =>
      Object.fromEntries(Object.keys(block).map((key) => [key, []]))
    stub(json({ ...fixture, hourly: noRows(fixture.hourly), daily: noRows(fixture.daily) }))
    const { fetchOpenMeteoModelsRaw } = await load()
    await expect(fetchOpenMeteoModelsRaw()).rejects.toMatchObject({ code: 'schema' })
  })

  it('a response with no usable day leaves the last good value: stale, or error with none', async () => {
    const { deriveSourceStatus } = await import('@/lib/weather/status')
    const { readThrough } = await import('./readThrough')
    const { getOpenMeteoModels, getOpenMeteoModelsFresh } = await load()
    stub(json(noData))
    const nowMs = Date.parse('2026-11-02T15:00:00Z')
    const lastGood = { data: [{ date: '2026-11-02', votes: [{ tMaxC: 20, tMinC: 10, rainMm: 0 }] }], fetchedAt: '2026-11-02T06:00:00.000Z' }

    const kept = await Promise.allSettled([
      readThrough({ getCached: async () => lastGood, getFresh: getOpenMeteoModelsFresh, ttlS: 3600, nowMs }),
    ])
    expect(deriveSourceStatus(kept[0])).toBe('stale')
    expect(kept[0]).toMatchObject({ value: { value: lastGood, refreshError: 'schema' } })

    const none = await Promise.allSettled([
      readThrough({ getCached: getOpenMeteoModels, getFresh: getOpenMeteoModelsFresh, ttlS: 3600, nowMs }),
    ])
    expect(deriveSourceStatus(none[0])).toBe('error')
  })

  it.each([1, 11])('rejects with schema when truncated to %i usable days', async (days) => {
    stub(json(firstDays(days)))
    const { fetchOpenMeteoModelsRaw } = await load()
    await expect(fetchOpenMeteoModelsRaw()).rejects.toMatchObject({
      name: 'SourceError',
      source: 'open-meteo-models',
      code: 'schema',
    })
  })

  it('accepts exactly 12 usable days, so a delayed run does not read as a failure', async () => {
    stub(json(firstDays(12)))
    const { fetchOpenMeteoModelsRaw } = await load()
    const r = await fetchOpenMeteoModelsRaw()
    expect(r.data).toHaveLength(12)
  })

  it('a truncated response leaves the last good value as stale', async () => {
    const { deriveSourceStatus } = await import('@/lib/weather/status')
    const { readThrough } = await import('./readThrough')
    const { getOpenMeteoModelsFresh } = await load()
    stub(json(firstDays(1)))
    const nowMs = Date.parse('2026-11-02T15:00:00Z')
    const lastGood = { data: [{ date: '2026-11-02', votes: [{ tMaxC: 20, tMinC: 10, rainMm: 0 }] }], fetchedAt: '2026-11-02T06:00:00.000Z' }

    const kept = await Promise.allSettled([
      readThrough({ getCached: async () => lastGood, getFresh: getOpenMeteoModelsFresh, ttlS: 3600, nowMs }),
    ])
    expect(deriveSourceStatus(kept[0])).toBe('stale')
    expect(kept[0]).toMatchObject({ value: { value: lastGood, refreshError: 'schema' } })
  })

  it('getOpenMeteoModelsFresh(bucket) resolves the same shape', async () => {
    const fetchMock = stub(json(fixture))
    const { getOpenMeteoModelsFresh } = await load()
    const r = await getOpenMeteoModelsFresh(7)
    expect(r.data).toHaveLength(14)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
