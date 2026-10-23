// readThrough: last-good entry, or a foreground bucketed refresh once the entry is past TTL.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SourceError, type Cached } from './errors'
import { readThrough } from './readThrough'

const T0 = Date.parse('2026-10-23T15:00:00Z')
const TTL_S = 900
const MIN = 60_000

function entry(fetchedAtMs: number, data = 'x'): Cached<string> {
  return { data, fetchedAt: new Date(fetchedAtMs).toISOString() }
}

function run(cached: Cached<string> | Error, fresh?: Cached<string> | Error) {
  const getCached = vi.fn(async () => {
    if (cached instanceof Error) throw cached
    return cached
  })
  const getFresh = vi.fn(async (bucket: number) => {
    void bucket
    if (fresh === undefined) throw new Error('getFresh should not be called')
    if (fresh instanceof Error) throw fresh
    return fresh
  })
  const result = readThrough({ getCached, getFresh, ttlS: TTL_S, nowMs: Date.now() })
  return { result, getCached, getFresh }
}

describe('readThrough()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns the cached entry while it is younger than TTL', async () => {
    const cached = entry(T0 - 14 * MIN)
    const { result, getFresh } = run(cached)
    await expect(result).resolves.toEqual({ value: cached })
    expect(getFresh).not.toHaveBeenCalled()
  })

  it('does not refresh at exactly TTL, refreshes 1 ms past it', async () => {
    const atTtl = run(entry(T0 - 900_000))
    await atTtl.result
    expect(atTtl.getFresh).not.toHaveBeenCalled()

    const past = run(entry(T0 - 900_001), entry(T0))
    await past.result
    expect(past.getFresh).toHaveBeenCalledTimes(1)
  })

  it('idle-then-visit with a healthy upstream returns the fresh value (no refreshError)', async () => {
    const fresh = entry(T0, 'fresh')
    const { result, getFresh } = run(entry(T0 - 3 * 60 * MIN, 'old'), fresh)
    const r = await result
    expect(r).toEqual({ value: fresh })
    expect(r.refreshError).toBeUndefined()
    expect(getFresh).toHaveBeenCalledWith(Math.floor(T0 / 900_000))
  })

  it('idle + upstream down keeps the cached value and records the SourceError code', async () => {
    const cached = entry(T0 - 3 * 60 * MIN)
    const { result } = run(cached, new SourceError('open-meteo', 'http_500'))
    await expect(result).resolves.toEqual({ value: cached, refreshError: 'http_500' })
  })

  it('records "unknown" for a non-SourceError rejection', async () => {
    const cached = entry(T0 - 3 * 60 * MIN)
    const { result } = run(cached, new TypeError('secret detail'))
    const r = await result
    expect(r).toEqual({ value: cached, refreshError: 'unknown' })
    expect(JSON.stringify(r)).not.toContain('secret detail')
  })

  it('propagates a getCached rejection without calling getFresh', async () => {
    const err = new SourceError('open-meteo', 'network')
    const { result, getFresh } = run(err)
    await expect(result).rejects.toBe(err)
    expect(getFresh).not.toHaveBeenCalled()
  })

  it('keeps the newer entry if getFresh returns an older fetchedAt', async () => {
    const cached = entry(T0 - 20 * MIN, 'cached')
    const { result } = run(cached, entry(T0 - 40 * MIN, 'older'))
    await expect(result).resolves.toEqual({ value: cached })
  })

  it('uses the next bucket after the clock advances 16 min', async () => {
    const old = entry(T0 - 3 * 60 * MIN)
    const first = run(old, entry(T0))
    await first.result
    expect(first.getFresh).toHaveBeenCalledWith(Math.floor(T0 / 900_000))

    vi.advanceTimersByTime(16 * MIN)
    const second = run(old, entry(Date.now()))
    await second.result
    expect(second.getFresh).toHaveBeenCalledWith(Math.floor(T0 / 900_000) + 1)
  })
})
