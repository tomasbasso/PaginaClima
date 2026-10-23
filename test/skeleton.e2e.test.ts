// Walking skeleton happy path: real fixture → adapter → zod → normalizer → snapshot.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from '@/lib/sources/__fixtures__/open-meteo-forecast.json'

// unstable_cache needs the Next incremental cache; in tests it is a passthrough.
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

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
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

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

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calls = fetchMock.mock.calls as unknown as [unknown, ...unknown[]][]
    const url = String(calls[0][0])
    expect(url).toContain('timezone=America%2FArgentina%2FBuenos_Aires')
    expect(url).toContain('forecast_hours=48')
    expect(url).toContain('forecast_days=14')
    expect(url).toContain('wind_speed_unit=kmh')
    expect(url).toContain('pressure_msl')
  })

  it('does not throw when Open-Meteo answers 500: now is null and status is error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: true, reason: 'boom' }), { status: 500 })),
    )

    const snap = await loadSnapshot()

    expect(snap.now).toBeNull()
    expect(snap.sources[0].id).toBe('open-meteo')
    expect(snap.sources[0].status).toBe('error')
  })
})
