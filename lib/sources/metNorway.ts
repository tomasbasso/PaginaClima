import 'server-only'
import { unstable_cache } from 'next/cache'
import { MET_NORWAY_URL, TTL, USER_AGENT } from '@/lib/config'
import { MetDto } from './metNorway.schema'
import { SourceError, type Cached } from './errors'

/** Tiny cached value: the ~40 KB body never enters the Data Cache (RESEARCH Pitfall 10). */
export type MetSummary = { updatedAt: string; firstTime: string; firstTempC: number }

/** Raw fetch + validation, no caching. Throws SourceError so a failed refresh is never cached. */
export async function fetchMetNorwayRaw(): Promise<Cached<MetSummary>> {
  let res: Response
  try {
    res = await fetch(MET_NORWAY_URL, {
      cache: 'no-store', // explicit; forced anyway inside unstable_cache
      // MET ToS: identifying User-Agent is mandatory (D-12).
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    throw new SourceError(
      'met-norway',
      name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    )
  }
  if (!res.ok) throw new SourceError('met-norway', `http_${res.status}`)

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new SourceError('met-norway', 'schema')
  }
  const parsed = MetDto.safeParse(body)
  if (!parsed.success) throw new SourceError('met-norway', 'schema')

  const { meta, timeseries } = parsed.data.properties
  const first = timeseries[0]
  console.info('[upstream] met-norway fetched')
  return {
    data: {
      updatedAt: meta.updated_at,
      firstTime: first.time,
      firstTempC: first.data.instant.details.air_temperature,
    },
    fetchedAt: new Date().toISOString(),
  }
}

// 2100 s ≥ 1800 s (D-05/D-07) and past MET's ~30 min `Expires` (RESEARCH Pitfall 7).
export const getMetNorway = unstable_cache(fetchMetNorwayRaw, ['met-norway-compact', 'v1'], {
  revalidate: TTL.metNorway,
  tags: ['met-norway'],
})
