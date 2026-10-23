// MET Norway adapter: real trimmed fixture → zod → tiny summary. fetch stubbed, cache passthrough.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/met-norway-compact.json'

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

async function load() {
  const mod = await import('./metNorway')
  return mod.getMetNorway()
}

function stub(impl: () => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('getMetNorway()', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns only the summary of the fixture', async () => {
    const fetchMock = stub(async () => new Response(JSON.stringify(fixture), { status: 200 }))

    const { data, fetchedAt } = await load()

    const first = fixture.properties.timeseries[0]
    expect(data).toEqual({
      updatedAt: fixture.properties.meta.updated_at,
      firstTime: first.time,
      firstTempC: first.data.instant.details.air_temperature,
    })
    expect(Number.isFinite(Date.parse(fetchedAt))).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('identifies itself and sends trimmed coordinates', async () => {
    const fetchMock = stub(async () => new Response(JSON.stringify(fixture), { status: 200 }))
    await load()

    const [input, init] = fetchMock.mock.calls[0] as unknown as [unknown, RequestInit]
    const url = new URL(String(input))
    expect(url.host).toBe('api.met.no')
    expect(url.searchParams.get('lat')).toBe('-36.23')
    expect(url.searchParams.get('lon')).toBe('-64.23')
    expect(url.searchParams.get('altitude')).toBe('169')
    for (const k of ['lat', 'lon']) {
      const decimals = (url.searchParams.get(k) ?? '').split('.')[1] ?? ''
      expect(decimals.length).toBeLessThanOrEqual(4)
    }
    const headers = new Headers(init.headers)
    expect(headers.get('User-Agent')?.startsWith('ClimaWinifreda/1.0')).toBe(true)
  })

  it.each([500, 429])('rejects with http_%i', async (status) => {
    stub(async () => new Response('nope', { status }))
    await expect(load()).rejects.toMatchObject({ name: 'SourceError', code: `http_${status}` })
  })

  it('rejects with network when fetch throws', async () => {
    stub(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(load()).rejects.toMatchObject({ name: 'SourceError', code: 'network' })
  })

  it('rejects with schema on an unexpected body', async () => {
    stub(async () => new Response('{}', { status: 200 }))
    await expect(load()).rejects.toMatchObject({ name: 'SourceError', code: 'schema' })
  })
})
