import 'server-only'
import { cache } from 'react'
import { TTL } from '@/lib/config'
import { SourceError } from '@/lib/sources/errors'
import { getSatelliteLatest, getSatelliteLatestFresh } from '@/lib/sources/gibs'
import { readThrough } from '@/lib/sources/readThrough'
import type { SatelliteLatest } from './frame'

/**
 * Latest good GOES-East pass for /cielo (D-07, SAT-01), memoized per render. Goes through
 * unstable_cache + readThrough, so the page only ever holds { stamp, timeISO } and the client
 * asks our own /api/satelite/{stamp}.jpg. Never fails the page: no good pass → null (the block
 * shows "Sin imagen" and keeps the SMN link). Logs carry the coarse code only (T-05-16).
 */
export const getSatelliteSafe = cache(async (): Promise<SatelliteLatest | null> => {
  try {
    const { value } = await readThrough({
      getCached: () => getSatelliteLatest(),
      getFresh: (bucket) => getSatelliteLatestFresh(bucket),
      ttlS: TTL.gibsLatest,
      nowMs: Date.now(),
    })
    return value.data
  } catch (err) {
    const code = err instanceof SourceError ? err.code : 'unknown'
    console.error(`[satellite] unavailable: ${code}`)
    return null
  }
})
