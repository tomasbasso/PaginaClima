import 'server-only'
import { unstable_cache } from 'next/cache'
import { MIN_CONFIDENCE_DAYS, OPEN_METEO_ENSEMBLE_URL, TTL, USER_AGENT } from '@/lib/config'
import { aggregateEnsemble, type EnsembleDay } from '@/lib/forecast/ensemble'
import { EnsembleDto } from './openMeteoEnsemble.schema'
import { SourceError, type Cached } from './errors'

/**
 * Raw fetch + validation + aggregation of ECMWF ENS, no caching. Throws SourceError so a failed
 * refresh is never cached. The result is the per-day aggregate only: raw member columns are
 * dropped here, before the Data Cache and the snapshot (D-18). Render code never calls this
 * directly (see getOpenMeteoEnsembleFresh).
 */
export async function fetchOpenMeteoEnsembleRaw(): Promise<Cached<EnsembleDay[]>> {
  let res: Response
  try {
    res = await fetch(OPEN_METEO_ENSEMBLE_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    throw new SourceError(
      'open-meteo-ensemble',
      name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    )
  }
  if (!res.ok) throw new SourceError('open-meteo-ensemble', `http_${res.status}`)

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new SourceError('open-meteo-ensemble', 'schema')
  }
  const parsed = EnsembleDto.safeParse(body)
  if (!parsed.success) throw new SourceError('open-meteo-ensemble', 'schema')

  const data = aggregateEnsemble(parsed.data.hourly, parsed.data.daily)
  // The schema accepts null columns, a daily block with no rows and short responses, so an incomplete
  // response gets here: it is a failed refresh and must never replace the last good value in the
  // cache (D-17). A day counts only with both temperature limits, which covers both the missing
  // daily block and the truncated response.
  const usableDays = data.filter((day) => day.tMinP10C !== null && day.tMaxP90C !== null).length
  if (usableDays < MIN_CONFIDENCE_DAYS) throw new SourceError('open-meteo-ensemble', 'schema')

  console.info('[upstream] open-meteo ensemble fetched')
  return { data, fetchedAt: new Date().toISOString() }
}

// Bump the key version on any change to the shape of EnsembleDay (Pitfall 8).
export const getOpenMeteoEnsemble = unstable_cache(
  fetchOpenMeteoEnsembleRaw,
  ['open-meteo-ensemble', 'v1'],
  { revalidate: TTL.openMeteoEnsemble, tags: ['open-meteo'] },
)

/** Time-bucketed getter for readThrough: `bucket` only feeds the cache key. */
export const getOpenMeteoEnsembleFresh = unstable_cache(
  (bucket: number) => {
    void bucket
    return fetchOpenMeteoEnsembleRaw()
  },
  ['open-meteo-ensemble', 'v1', 'fresh'],
  { revalidate: TTL.openMeteoEnsemble, tags: ['open-meteo'] },
)
