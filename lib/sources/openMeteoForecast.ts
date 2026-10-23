import 'server-only'
import { unstable_cache } from 'next/cache'
import { OPEN_METEO_URL, TTL, USER_AGENT } from '@/lib/config'
import { ForecastDto } from './openMeteoForecast.schema'
import { SourceError, type Cached } from './errors'

export type { Cached } from './errors'

/**
 * Raw fetch + validation, no caching. Exported so plan 06 can wrap it in a second,
 * time-bucketed getter for the read-through refresh. Render code never calls it directly.
 * Throws SourceError so a failed refresh is never cached.
 */
export async function fetchOpenMeteoForecastRaw(): Promise<Cached<ForecastDto>> {
  let res: Response
  try {
    res = await fetch(OPEN_METEO_URL, {
      cache: 'no-store', // explicit; forced anyway inside unstable_cache
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
  const parsed = ForecastDto.safeParse(body)
  if (!parsed.success) throw new SourceError('open-meteo', 'schema')

  console.info('[upstream] open-meteo forecast fetched')
  return { data: parsed.data, fetchedAt: new Date().toISOString() }
}

// unstable_cache, not fetch `next.revalidate`: it keeps serving the last good value when a
// refresh throws, even during ISR regeneration (RESEARCH Pitfall 2, D-03).
export const getOpenMeteoForecast = unstable_cache(
  fetchOpenMeteoForecastRaw,
  ['open-meteo-forecast', 'v1'],
  { revalidate: TTL.openMeteoForecast, tags: ['open-meteo'] },
)

/**
 * Time-bucketed getter for the read-through refresh (plan 06). `bucket` only feeds the cache
 * key (unstable_cache keys include JSON(args)), so the first read in each 15-min bucket is a
 * guaranteed, awaited miss and every later render in that bucket shares the result.
 * Never call `fetchOpenMeteoForecastRaw()` directly from render code: an un-cached no-store
 * fetch outside unstable_cache would turn the ISR page dynamic.
 */
export const getOpenMeteoForecastFresh = unstable_cache(
  (bucket: number) => {
    void bucket
    return fetchOpenMeteoForecastRaw()
  },
  ['open-meteo-forecast', 'v1', 'fresh'],
  { revalidate: TTL.openMeteoForecast, tags: ['open-meteo'] },
)
