// Recent hourly rain adapter (forecast past_days=14). Same failure contract as the forecast.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/open-meteo-recent-rain.json'

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

async function load() {
  return import('./openMeteoRecentRain')
}

function stub(impl: (input: unknown) => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status = 200) =>
  async () => new Response(JSON.stringify(body), { status })

describe('Open-Meteo recent rain adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves the real fixture as hourly { time, mm } in naive local time', async () => {
    const fetchMock = stub(json(fixture))
    const { fetchOpenMeteoRecentRainRaw } = await load()
    const r = await fetchOpenMeteoRecentRainRaw()
    expect(r.data).toHaveLength(fixture.hourly.time.length)
    expect(r.data[0]).toEqual({ time: fixture.hourly.time[0], mm: fixture.hourly.precipitation[0] })
    expect(r.data[0].time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(Number.isFinite(Date.parse(r.fetchedAt))).toBe(true)

    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.searchParams.get('hourly')).toBe('precipitation')
    expect(url.searchParams.get('past_days')).toBe('14')
    expect(url.searchParams.get('timezone')).toBe('America/Argentina/Buenos_Aires')
  })

  it('rejects with http_500', async () => {
    stub(json({ error: true, reason: 'boom' }, 500))
    const { getOpenMeteoRecentRain } = await load()
    await expect(getOpenMeteoRecentRain()).rejects.toMatchObject({
      name: 'SourceError',
      source: 'open-meteo',
      code: 'http_500',
    })
  })

  it('rejects with http_400 without leaking the upstream reason', async () => {
    stub(json({ error: true, reason: 'secret detail' }, 400))
    const { getOpenMeteoRecentRain } = await load()
    const err = await getOpenMeteoRecentRain().then(
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
    const { getOpenMeteoRecentRain } = await load()
    await expect(getOpenMeteoRecentRain()).rejects.toMatchObject({ code: 'network' })
  })

  it('rejects with timeout on an AbortSignal timeout', async () => {
    stub(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    const { getOpenMeteoRecentRain } = await load()
    await expect(getOpenMeteoRecentRain()).rejects.toMatchObject({ code: 'timeout' })
  })

  it('rejects with schema when arrays differ in length', async () => {
    const broken = {
      ...fixture,
      hourly: { ...fixture.hourly, precipitation: fixture.hourly.precipitation.slice(2) },
    }
    stub(json(broken))
    const { getOpenMeteoRecentRain } = await load()
    await expect(getOpenMeteoRecentRain()).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema on another timezone', async () => {
    stub(json({ ...fixture, timezone: 'UTC' }))
    const { getOpenMeteoRecentRain } = await load()
    await expect(getOpenMeteoRecentRain()).rejects.toMatchObject({ code: 'schema' })
  })

  it('getOpenMeteoRecentRainFresh(bucket) resolves the same shape', async () => {
    const fetchMock = stub(json(fixture))
    const { getOpenMeteoRecentRainFresh } = await load()
    const r = await getOpenMeteoRecentRainFresh(7)
    expect(r.data).toHaveLength(fixture.hourly.time.length)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
