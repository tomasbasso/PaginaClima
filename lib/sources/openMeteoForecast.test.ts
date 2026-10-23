// Open-Meteo adapter fails loudly (D-15): every bad upstream answer becomes a coarse SourceError
// without leaking the upstream `reason`. fetch stubbed, unstable_cache passthrough.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/open-meteo-forecast.json'
import broken from './__fixtures__/open-meteo-forecast.broken.json'

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

async function load() {
  return import('./openMeteoForecast')
}

function stub(impl: () => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status = 200) =>
  async () => new Response(JSON.stringify(body), { status })

describe('Open-Meteo forecast adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rejects with http_500', async () => {
    stub(json({ error: true, reason: 'boom' }, 500))
    const { getOpenMeteoForecast } = await load()
    await expect(getOpenMeteoForecast()).rejects.toMatchObject({
      name: 'SourceError',
      source: 'open-meteo',
      code: 'http_500',
    })
  })

  it('rejects with http_400 without leaking the upstream reason', async () => {
    stub(json({ error: true, reason: 'secret detail' }, 400))
    const { getOpenMeteoForecast } = await load()
    const err = await getOpenMeteoForecast().then(
      () => null,
      (e: unknown) => e,
    )
    expect(err).toMatchObject({ name: 'SourceError', code: 'http_400' })
    const e = err as Error
    expect(e.message).not.toContain('secret detail')
    expect(JSON.stringify({ ...e, message: e.message })).not.toContain('secret detail')
  })

  it('rejects with network when fetch throws a TypeError', async () => {
    stub(async () => {
      throw new TypeError('fetch failed')
    })
    const { getOpenMeteoForecast } = await load()
    await expect(getOpenMeteoForecast()).rejects.toMatchObject({ code: 'network' })
  })

  it('rejects with timeout on an AbortSignal timeout', async () => {
    stub(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    const { getOpenMeteoForecast } = await load()
    await expect(getOpenMeteoForecast()).rejects.toMatchObject({ code: 'timeout' })
  })

  it('rejects with schema on the broken fixture (current.temperature_2m removed)', async () => {
    stub(json(broken))
    const { getOpenMeteoForecast } = await load()
    await expect(getOpenMeteoForecast()).rejects.toMatchObject({ code: 'schema' })
  })

  it('resolves the real fixture with an ISO fetchedAt', async () => {
    stub(json(fixture))
    const { getOpenMeteoForecast } = await load()
    const r = await getOpenMeteoForecast()
    expect(r.data.current.temperature_2m).toBe(fixture.current.temperature_2m)
    expect(Number.isFinite(Date.parse(r.fetchedAt))).toBe(true)
  })

  it('getOpenMeteoForecastFresh(bucket) resolves the same shape', async () => {
    const fetchMock = stub(json(fixture))
    const { getOpenMeteoForecastFresh } = await load()
    const r = await getOpenMeteoForecastFresh(123)
    expect(r.data.current.temperature_2m).toBe(fixture.current.temperature_2m)
    expect(Number.isFinite(Date.parse(r.fetchedAt))).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
