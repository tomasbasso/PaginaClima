import 'server-only'
import { unstable_cache } from 'next/cache'
import { OPEN_METEO_MODELS_URL, TTL, USER_AGENT } from '@/lib/config'
import { aggregateModels, type ModelsDay } from '@/lib/forecast/agreement'
import { ModelsDto } from './openMeteoModels.schema'
import { SourceError, type Cached } from './errors'

/**
 * Raw fetch + validation + per-day votes of the independent models, no caching. Throws SourceError
 * so a failed refresh is never cached. The votes stay in the Data Cache and the verdict is computed
 * when the snapshot is built, so changing a threshold needs no cache bump and values per model never
 * reach the snapshot (D-18). Render code never calls this directly (see getOpenMeteoModelsFresh).
 */
export async function fetchOpenMeteoModelsRaw(): Promise<Cached<ModelsDay[]>> {
  let res: Response
  try {
    res = await fetch(OPEN_METEO_MODELS_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    throw new SourceError(
      'open-meteo-models',
      name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    )
  }
  if (!res.ok) throw new SourceError('open-meteo-models', `http_${res.status}`)

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new SourceError('open-meteo-models', 'schema')
  }
  const parsed = ModelsDto.safeParse(body)
  if (!parsed.success) throw new SourceError('open-meteo-models', 'schema')

  console.info('[upstream] open-meteo models fetched')
  return {
    data: aggregateModels(parsed.data.hourly, parsed.data.daily),
    fetchedAt: new Date().toISOString(),
  }
}

// Bump the key version on any change to the shape of ModelsDay (Pitfall 8).
export const getOpenMeteoModels = unstable_cache(
  fetchOpenMeteoModelsRaw,
  ['open-meteo-models', 'v1'],
  { revalidate: TTL.openMeteoModels, tags: ['open-meteo'] },
)

/** Time-bucketed getter for readThrough: `bucket` only feeds the cache key. */
export const getOpenMeteoModelsFresh = unstable_cache(
  (bucket: number) => {
    void bucket
    return fetchOpenMeteoModelsRaw()
  },
  ['open-meteo-models', 'v1', 'fresh'],
  { revalidate: TTL.openMeteoModels, tags: ['open-meteo'] },
)
