// ERA5 archive adapter fails loudly (D-15) with coarse SourceError codes and returns only the
// small { date, mm } series. fetch stubbed, unstable_cache passthrough.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/open-meteo-archive-era5.json'

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

async function load() {
  return import('./openMeteoArchive')
}

function stub(impl: (input: unknown) => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status = 200) =>
  async () => new Response(JSON.stringify(body), { status })

const START = '2026-09-26'
const END = '2026-10-25'

describe('Open-Meteo ERA5 archive adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves the real fixture as { date, mm } keeping trailing nulls', async () => {
    const fetchMock = stub(json(fixture))
    const { fetchOpenMeteoArchiveRaw } = await load()
    const r = await fetchOpenMeteoArchiveRaw(START, END)
    expect(r.data).toHaveLength(fixture.daily.time.length)
    expect(r.data[0]).toEqual({ date: fixture.daily.time[0], mm: fixture.daily.precipitation_sum[0] })
    expect(r.data.at(-1)).toEqual({ date: END, mm: null })
    expect(Number.isFinite(Date.parse(r.fetchedAt))).toBe(true)

    const raw = String(fetchMock.mock.calls[0][0])
    const url = new URL(raw)
    expect(url.hostname).toBe('archive-api.open-meteo.com')
    expect(url.searchParams.get('models')).toBe('era5')
    expect(url.searchParams.get('daily')).toBe('precipitation_sum')
    expect(url.searchParams.get('start_date')).toBe(START)
    expect(url.searchParams.get('end_date')).toBe(END)
    expect(url.searchParams.get('timezone')).toBe('America/Argentina/Buenos_Aires')
    expect(raw).toContain('America%2FArgentina%2FBuenos_Aires')
  })

  it('rejects with http_500', async () => {
    stub(json({ error: true, reason: 'boom' }, 500))
    const { getOpenMeteoArchive } = await load()
    await expect(getOpenMeteoArchive(START, END)).rejects.toMatchObject({
      name: 'SourceError',
      source: 'open-meteo-archive',
      code: 'http_500',
    })
  })

  it('rejects with http_400 without leaking the upstream reason', async () => {
    stub(json({ error: true, reason: 'secret detail' }, 400))
    const { getOpenMeteoArchive } = await load()
    const err = await getOpenMeteoArchive(START, END).then(
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
    const { getOpenMeteoArchive } = await load()
    await expect(getOpenMeteoArchive(START, END)).rejects.toMatchObject({ code: 'network' })
  })

  it('rejects with timeout on an AbortSignal timeout', async () => {
    stub(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    const { getOpenMeteoArchive } = await load()
    await expect(getOpenMeteoArchive(START, END)).rejects.toMatchObject({ code: 'timeout' })
  })

  it('rejects with schema when arrays differ in length', async () => {
    const broken = {
      ...fixture,
      daily: { ...fixture.daily, precipitation_sum: fixture.daily.precipitation_sum.slice(1) },
    }
    stub(json(broken))
    const { getOpenMeteoArchive } = await load()
    await expect(getOpenMeteoArchive(START, END)).rejects.toMatchObject({ code: 'schema' })
  })

  it('rejects with schema on another timezone', async () => {
    stub(json({ ...fixture, timezone: 'GMT' }))
    const { getOpenMeteoArchive } = await load()
    await expect(getOpenMeteoArchive(START, END)).rejects.toMatchObject({ code: 'schema' })
  })

  it('getOpenMeteoArchiveFresh(start, end, bucket) resolves the same shape', async () => {
    const fetchMock = stub(json(fixture))
    const { getOpenMeteoArchiveFresh } = await load()
    const r = await getOpenMeteoArchiveFresh(START, END, 123)
    expect(r.data).toHaveLength(fixture.daily.time.length)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
