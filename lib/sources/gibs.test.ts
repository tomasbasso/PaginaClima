// NASA GIBS adapter (D-07, SAT-01): content-type and size checks so a black 200 JPEG or a 200
// XML ServiceException is never cached, and the T → T−10 → T−20 blank-step fallback.
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))
const FRAME = fixture('gibs-frame.jpg')
const BLANK = fixture('gibs-blank.jpg')
const DOMAINS = fixture('gibs-domains.xml').toString('utf8') // latest slot 2026-10-25T17:20:00Z
const NOW = Date.parse('2026-10-25T17:45:00Z')

async function load() {
  return import('./gibs')
}

type Handler = (input: unknown) => Promise<Response>

function stub(...handlers: Handler[]) {
  const fn = vi.fn<Handler>()
  for (const h of handlers) fn.mockImplementationOnce(h)
  vi.stubGlobal('fetch', fn)
  return fn
}

const jpeg = (bytes: Uint8Array) => async () =>
  new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-type': 'image/jpeg' } })
const xml = (body: string, status = 200) => async () =>
  new Response(body, { status, headers: { 'content-type': 'text/xml; charset=UTF-8' } })

describe('GIBS frame adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves a real frame as base64 with its stamp, asking for the explicit TIME', async () => {
    const fetchMock = stub(jpeg(FRAME))
    const { fetchSatelliteFrameRaw } = await load()
    const r = await fetchSatelliteFrameRaw('20261025T1640Z')
    expect(r.data.stamp).toBe('20261025T1640Z')
    expect(Buffer.from(r.data.b64, 'base64').equals(FRAME)).toBe(true)
    expect(Number.isFinite(Date.parse(r.fetchedAt))).toBe(true)
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.searchParams.get('TIME')).toBe('2026-10-25T16:40:00Z')
    expect(url.searchParams.get('LAYERS')).toBe('GOES-East_ABI_Band13_Clean_Infrared')
  })

  it('rejects the black 3 321 B JPEG as blank', async () => {
    stub(jpeg(BLANK))
    const { getSatelliteFrame } = await load()
    await expect(getSatelliteFrame('20261025T1640Z')).rejects.toMatchObject({
      name: 'SourceError',
      source: 'nasa-gibs',
      code: 'blank',
    })
  })

  it('rejects a 200 XML ServiceException as schema without reading it as an image', async () => {
    stub(xml('<ServiceExceptionReport>secret detail</ServiceExceptionReport>'))
    const { getSatelliteFrame } = await load()
    const err = await getSatelliteFrame('20261025T1640Z').then(
      () => null,
      (e: unknown) => e,
    )
    expect(err).toMatchObject({ code: 'schema' })
    expect((err as Error).message).not.toContain('secret detail')
  })

  it('rejects a body over 1 MB as schema', async () => {
    stub(jpeg(new Uint8Array(1_000_001)))
    const { getSatelliteFrame } = await load()
    await expect(getSatelliteFrame('20261025T1640Z')).rejects.toMatchObject({ code: 'schema' })
  })

  it('maps http, network and timeout failures', async () => {
    stub(xml('down', 503))
    let mod = await load()
    await expect(mod.getSatelliteFrame('20261025T1640Z')).rejects.toMatchObject({ code: 'http_503' })

    vi.resetModules()
    stub(async () => {
      throw new TypeError('fetch failed')
    })
    mod = await load()
    await expect(mod.getSatelliteFrame('20261025T1640Z')).rejects.toMatchObject({ code: 'network' })

    vi.resetModules()
    stub(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    mod = await load()
    await expect(mod.getSatelliteFrame('20261025T1640Z')).rejects.toMatchObject({ code: 'timeout' })
  })
})

describe('GIBS latest pass', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('takes T when its frame is good', async () => {
    const fetchMock = stub(xml(DOMAINS), jpeg(FRAME))
    const { fetchSatelliteLatestRaw } = await load()
    const r = await fetchSatelliteLatestRaw(NOW)
    expect(r.data).toEqual({ stamp: '20261025T1720Z', timeISO: '2026-10-25T17:20:00Z' })
    expect(String(fetchMock.mock.calls[0][0])).toContain('--2026-10-25T17:40:00Z.xml')
  })

  it('falls back to T−10 when T is the black JPEG', async () => {
    const fetchMock = stub(xml(DOMAINS), jpeg(BLANK), jpeg(FRAME))
    const { fetchSatelliteLatestRaw } = await load()
    const r = await fetchSatelliteLatestRaw(NOW)
    expect(r.data).toEqual({ stamp: '20261025T1710Z', timeISO: '2026-10-25T17:10:00Z' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('throws blank when T, T−10 and T−20 are all bad (never a 4th try)', async () => {
    const fetchMock = stub(xml(DOMAINS), jpeg(BLANK), xml('<ServiceExceptionReport/>'), jpeg(BLANK), jpeg(FRAME))
    const { getSatelliteLatest } = await load()
    vi.setSystemTime(NOW)
    try {
      await expect(getSatelliteLatest()).rejects.toMatchObject({ source: 'nasa-gibs', code: 'blank' })
    } finally {
      vi.useRealTimers()
    }
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('throws schema when the domains answer has no <Domain>', async () => {
    stub(xml('<Domains></Domains>'))
    const { fetchSatelliteLatestRaw } = await load()
    await expect(fetchSatelliteLatestRaw(NOW)).rejects.toMatchObject({ code: 'schema' })
  })

  it('throws schema when the domains answer is too long', async () => {
    stub(xml(`<Domain>${'x'.repeat(20_001)}</Domain>`))
    const { fetchSatelliteLatestRaw } = await load()
    await expect(fetchSatelliteLatestRaw(NOW)).rejects.toMatchObject({ code: 'schema' })
  })
})
