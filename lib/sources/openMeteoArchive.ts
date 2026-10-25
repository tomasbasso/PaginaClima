import 'server-only'
import { unstable_cache } from 'next/cache'
import { openMeteoArchiveUrl, TTL, USER_AGENT } from '@/lib/config'
import { ArchiveDto } from './openMeteoArchive.schema'
import { SourceError, type Cached } from './errors'

/** One local day of ERA5 rain. `mm: null` = ERA5 does not fully cover that day yet (D-10). */
export type ArchiveDay = { date: string; mm: number | null }

/**
 * Raw fetch + validation of the ERA5 daily archive, no caching. Throws SourceError so a failed
 * refresh is never cached. Only the small { date, mm } series is returned (and cached), never
 * the raw body. Render code never calls it directly (see getOpenMeteoArchiveFresh).
 * `start`/`end` are "YYYY-MM-DD" keys; `end` must be ≤ today ART (RESEARCH Pitfall 5).
 */
export async function fetchOpenMeteoArchiveRaw(start: string, end: string): Promise<Cached<ArchiveDay[]>> {
  let res: Response
  try {
    res = await fetch(openMeteoArchiveUrl(start, end), {
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      // ~455 days of archive: slower than the forecast.
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    throw new SourceError(
      'open-meteo-archive',
      name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    )
  }
  if (!res.ok) throw new SourceError('open-meteo-archive', `http_${res.status}`)

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new SourceError('open-meteo-archive', 'schema')
  }
  const parsed = ArchiveDto.safeParse(body)
  if (!parsed.success) throw new SourceError('open-meteo-archive', 'schema')

  const { time, precipitation_sum } = parsed.data.daily
  console.info('[upstream] open-meteo archive fetched')
  return {
    data: time.map((date, i) => ({ date, mm: precipitation_sum[i] })),
    fetchedAt: new Date().toISOString(),
  }
}

// Arguments are plain date strings (part of the cache key); never Date or Date.now() inside
// (RESEARCH Pitfall 9).
export const getOpenMeteoArchive = unstable_cache(
  fetchOpenMeteoArchiveRaw,
  ['open-meteo-archive', 'v1'],
  { revalidate: TTL.openMeteoArchive, tags: ['open-meteo'] },
)

/** Time-bucketed getter for readThrough: `bucket` only feeds the cache key. */
export const getOpenMeteoArchiveFresh = unstable_cache(
  (start: string, end: string, bucket: number) => {
    void bucket
    return fetchOpenMeteoArchiveRaw(start, end)
  },
  ['open-meteo-archive', 'v1', 'fresh'],
  { revalidate: TTL.openMeteoArchive, tags: ['open-meteo'] },
)
