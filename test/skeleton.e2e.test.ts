// Walking skeleton happy path: real fixture → adapter → zod → normalizer → snapshot.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from '@/lib/sources/__fixtures__/open-meteo-forecast.json'
import metFixture from '@/lib/sources/__fixtures__/met-norway-compact.json'
import ensembleFixture from '@/lib/sources/__fixtures__/open-meteo-ensemble.json'

// unstable_cache needs the Next incremental cache; in tests it is a passthrough.
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

type Reply = () => Response

/** fetch stub routed by host: each upstream answers independently. */
function stubFetch({
  om = () => new Response(JSON.stringify(fixture), { status: 200 }),
  met = () => new Response(JSON.stringify(metFixture), { status: 200 }),
  ensemble = () => new Response(JSON.stringify(ensembleFixture), { status: 200 }),
}: { om?: Reply; met?: Reply; ensemble?: Reply } = {}) {
  const fn = vi.fn(async (input: unknown) => {
    const host = new URL(String(input)).host
    if (host === 'api.open-meteo.com') return om()
    if (host === 'api.met.no') return met()
    if (host === 'ensemble-api.open-meteo.com') return ensemble()
    throw new TypeError(`unexpected host ${host}`)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

function callsTo(fn: ReturnType<typeof stubFetch>, host: string): string[] {
  return fn.mock.calls.map((c) => String(c[0])).filter((u) => new URL(u).host === host)
}

async function loadSnapshot() {
  // Fresh module graph per case so nothing is memoized across tests.
  const mod = await import('@/lib/weather/snapshot')
  return mod.getWeatherSnapshot()
}

describe('walking skeleton: getWeatherSnapshot()', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('runs in UTC (reproduces the Vercel runtime)', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(0)
  })

  it('builds the snapshot from the real Open-Meteo fixture', async () => {
    const fetchMock = stubFetch()

    const snap = await loadSnapshot()

    expect(snap.now).not.toBeNull()
    expect(snap.now!.tempC).toBe(fixture.current.temperature_2m)
    expect(snap.now!.pressureHpa).toBe(fixture.current.pressure_msl)
    expect(snap.now!.time.endsWith('-03:00')).toBe(true)
    expect(snap.hourly48).toHaveLength(48)
    expect(snap.daily).toHaveLength(14)
    expect(snap.daily[0].date).toBe(fixture.daily.time[0])
    expect(snap.sources[0].id).toBe('open-meteo')
    expect(snap.sources[0].status).toBe('ok')
    expect(Number.isFinite(Date.parse(snap.sources[0].fetchedAt ?? ''))).toBe(true)

    expect(snap.sources[1]).toMatchObject({ id: 'met-norway', status: 'ok' })

    const omCalls = callsTo(fetchMock, 'api.open-meteo.com')
    expect(omCalls).toHaveLength(1)
    expect(callsTo(fetchMock, 'api.met.no')).toHaveLength(1)
    const url = omCalls[0]
    expect(url).toContain('timezone=America%2FArgentina%2FBuenos_Aires')
    expect(url).toContain('forecast_hours=48')
    expect(url).toContain('forecast_days=14')
    expect(url).toContain('wind_speed_unit=kmh')
    expect(url).toContain('pressure_msl')
  })

  it('does not throw when Open-Meteo answers 500: now is null and status is error', async () => {
    stubFetch({
      om: () => new Response(JSON.stringify({ error: true, reason: 'boom' }), { status: 500 }),
    })

    const snap = await loadSnapshot()

    expect(snap.now).toBeNull()
    expect(snap.sources[0].id).toBe('open-meteo')
    expect(snap.sources[0].status).toBe('error')
  })

  it('keeps Open-Meteo data when MET Norway answers 500', async () => {
    stubFetch({ met: () => new Response('down', { status: 500 }) })

    const snap = await loadSnapshot()

    expect(snap.now).not.toBeNull()
    expect(snap.sources[0]).toMatchObject({ id: 'open-meteo', status: 'ok' })
    expect(snap.sources[1]).toEqual({
      id: 'met-norway',
      status: 'error',
      fetchedAt: null,
      errorCode: 'http_500',
    })
  })

  it('adds per-day confidence from the real ensemble fixture, aggregated only', async () => {
    stubFetch()

    const snap = await loadSnapshot()

    expect(snap.sources).toContainEqual(
      expect.objectContaining({ id: 'open-meteo-ensemble', status: 'ok' }),
    )
    expect(snap.confidence).toHaveLength(14)
    for (const day of snap.confidence) expect(day.ensemble?.members).toBe(51)
    // Not the bare word: EnsembleDay has the legitimate fields members and rainMembers (D-18).
    expect(JSON.stringify(snap)).not.toMatch(/_memberd|precipitation_member/)
  })

  it('asks the ensemble host once, for hourly rain and never for the daily sum', async () => {
    const fetchMock = stubFetch()

    await loadSnapshot()

    const calls = callsTo(fetchMock, 'ensemble-api.open-meteo.com')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('models=ecmwf_ifs025')
    expect(calls[0]).toContain('forecast_days=15')
    expect(calls[0]).toContain('hourly=precipitation')
    expect(calls[0]).not.toContain('precipitation_sum')
  })

  it('keeps the page data when the ensemble answers 500: no confidence, source in error', async () => {
    stubFetch({ ensemble: () => new Response('down', { status: 500 }) })

    const snap = await loadSnapshot()

    expect(snap.now).not.toBeNull()
    expect(snap.sources[0]).toMatchObject({ id: 'open-meteo', status: 'ok' })
    expect(snap.sources).toContainEqual({
      id: 'open-meteo-ensemble',
      status: 'error',
      fetchedAt: null,
      errorCode: 'http_500',
    })
    expect(snap.confidence.filter((day) => day.ensemble !== null)).toEqual([])
  })
})
