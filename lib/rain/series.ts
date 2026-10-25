import 'server-only'
import { cache } from 'react'
import { TTL } from '@/lib/config'
import { SourceError } from '@/lib/sources/errors'
import { getOpenMeteoArchive, getOpenMeteoArchiveFresh } from '@/lib/sources/openMeteoArchive'
import { getOpenMeteoRecentRain, getOpenMeteoRecentRainFresh } from '@/lib/sources/openMeteoRecentRain'
import { readThrough } from '@/lib/sources/readThrough'
import { localDateKey } from '@/lib/time'
import { seriesStart } from './periods'
import { stitchDailyRain } from './stitch'
import type { RainData } from './view'

export type { RainData } from './view'

function errorCodeOf(reason: unknown): string {
  return reason instanceof SourceError ? reason.code : 'unknown'
}

/**
 * Observed rain series for /cielo (RAIN-01, D-10). Memoized per render with React cache().
 * Never fails the page: ERA5 down → { status: 'error' } (block shows Sin datos, the rest of
 * /cielo stays); only the recent adapter down → series up to the last ERA5 day + lagging Notice.
 * Both sources go through unstable_cache + readThrough: the client never calls Open-Meteo.
 * Logs carry coarse SourceError codes only, never upstream text (T-05-06).
 */
export const getRainData = cache(async (): Promise<RainData> => {
  const nowMs = Date.now()
  const now = new Date(nowMs)
  const todayKey = localDateKey(now) // end_date ≤ today ART (Pitfall 5)
  const start = seriesStart(todayKey)

  const [archive, recent] = await Promise.allSettled([
    readThrough({
      getCached: () => getOpenMeteoArchive(start, todayKey),
      getFresh: (bucket) => getOpenMeteoArchiveFresh(start, todayKey, bucket),
      ttlS: TTL.openMeteoArchive,
      nowMs,
    }),
    readThrough({
      getCached: () => getOpenMeteoRecentRain(),
      getFresh: (bucket) => getOpenMeteoRecentRainFresh(bucket),
      ttlS: TTL.openMeteoRecentRain,
      nowMs,
    }),
  ])

  if (archive.status === 'rejected') {
    const code = errorCodeOf(archive.reason)
    console.error(`[rain] archive unavailable: ${code}`)
    return { status: 'error', code }
  }

  let recentError: string | null = null
  if (recent.status === 'rejected') {
    recentError = errorCodeOf(recent.reason)
    console.error(`[rain] recent unavailable: ${recentError}`)
  }

  try {
    const stitched = stitchDailyRain(
      archive.value.value.data,
      recent.status === 'fulfilled' ? recent.value.value.data : null,
      now,
      start,
    )
    return { status: 'ok', stitched, recentError }
  } catch {
    console.error('[rain] stitch failed')
    return { status: 'error', code: 'unknown' }
  }
})
