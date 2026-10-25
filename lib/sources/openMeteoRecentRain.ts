import 'server-only'
import { unstable_cache } from 'next/cache'
import { OPEN_METEO_RECENT_RAIN_URL, TTL, USER_AGENT } from '@/lib/config'
import { RecentRainDto } from './openMeteoRecentRain.schema'
import { SourceError, type Cached } from './errors'

/** One hour of rain; `time` is naive local 'YYYY-MM-DDTHH:mm' (value covers the previous hour). */
export type RecentRainHour = { time: string; mm: number | null }

/**
 * Raw fetch + validation of the last 14 days of hourly rain (forecast past_days), no caching.
 * Fills the days ERA5 does not cover yet (D-10). Throws SourceError so a failed refresh is never
 * cached. Render code never calls it directly (see getOpenMeteoRecentRainFresh).
 */
export async function fetchOpenMeteoRecentRainRaw(): Promise<Cached<RecentRainHour[]>> {
  let res: Response
  try {
    res = await fetch(OPEN_METEO_RECENT_RAIN_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    throw new SourceError(
      'open-meteo',
      name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    )
  }
  if (!res.ok) throw new SourceError('open-meteo', `http_${res.status}`)

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new SourceError('open-meteo', 'schema')
  }
  const parsed = RecentRainDto.safeParse(body)
  if (!parsed.success) throw new SourceError('open-meteo', 'schema')

  const { time, precipitation } = parsed.data.hourly
  console.info('[upstream] open-meteo recent rain fetched')
  return {
    data: time.map((t, i) => ({ time: t, mm: precipitation[i] })),
    fetchedAt: new Date().toISOString(),
  }
}

export const getOpenMeteoRecentRain = unstable_cache(
  fetchOpenMeteoRecentRainRaw,
  ['open-meteo-recent-rain', 'v1'],
  { revalidate: TTL.openMeteoRecentRain, tags: ['open-meteo'] },
)

/** Time-bucketed getter for readThrough: `bucket` only feeds the cache key. */
export const getOpenMeteoRecentRainFresh = unstable_cache(
  (bucket: number) => {
    void bucket
    return fetchOpenMeteoRecentRainRaw()
  },
  ['open-meteo-recent-rain', 'v1', 'fresh'],
  { revalidate: TTL.openMeteoRecentRain, tags: ['open-meteo'] },
)
