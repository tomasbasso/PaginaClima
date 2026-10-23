// Read-through refresh (plan 06 Design note). Pure: the caller supplies `nowMs`.
//
// unstable_cache returns a stale entry immediately and revalidates in the background, so after
// an idle period a render can receive data far older than TTL with nothing failing upstream.
// readThrough reads the last-good entry first and, only when it is past TTL, awaits a second
// getter keyed by a TTL-sized time bucket. A miss on that getter is always awaited, so the
// first render in each bucket gets fresh data; later renders in the bucket share it.
import { SourceError, type Cached } from './errors'

export type ReadThroughResult<T> = { value: Cached<T>; refreshError?: string }

export async function readThrough<T>(opts: {
  getCached: () => Promise<Cached<T>>
  getFresh: (bucket: number) => Promise<Cached<T>>
  ttlS: number
  nowMs: number
}): Promise<ReadThroughResult<T>> {
  const { getCached, getFresh, ttlS, nowMs } = opts
  const ttlMs = ttlS * 1000

  // A rejection here means there is no last-good value at all: let it propagate (Sin datos).
  const cached = await getCached()
  const cachedMs = Date.parse(cached.fetchedAt)
  if (!(nowMs - cachedMs > ttlMs)) return { value: cached }

  try {
    const fresh = await getFresh(Math.floor(nowMs / ttlMs))
    return { value: Date.parse(fresh.fetchedAt) >= cachedMs ? fresh : cached }
  } catch (err) {
    // Coarse code only: never upstream text or stacks (ASVS V7, Pitfall 11).
    const refreshError = err instanceof SourceError ? err.code : 'unknown'
    console.error(`[readThrough] refresh failed: ${refreshError}`)
    return { value: cached, refreshError }
  }
}
