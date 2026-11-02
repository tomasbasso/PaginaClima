import 'server-only'
import { cache } from 'react'
import { TTL } from '@/lib/config'
import { getMetNorway } from '@/lib/sources/metNorway'
import { getOpenMeteoEnsemble, getOpenMeteoEnsembleFresh } from '@/lib/sources/openMeteoEnsemble'
import { getOpenMeteoForecast, getOpenMeteoForecastFresh } from '@/lib/sources/openMeteoForecast'
import { SourceError } from '@/lib/sources/errors'
import { readThrough, type ReadThroughResult } from '@/lib/sources/readThrough'
import { normalizeForecast } from './normalize'
import { applyFault, readFault } from './faults'
import { deriveSourceStatus } from './status'
import type { DayConfidence, SourceId, SourceInfo, WeatherSnapshot } from './types'

function errorCodeOf(reason: unknown): string {
  return reason instanceof SourceError ? reason.code : 'unknown'
}

/** Status of a read-through source. Status is outcome-based: see deriveSourceStatus. */
function infoFrom(id: SourceId, settled: PromiseSettledResult<ReadThroughResult<unknown>>): SourceInfo {
  if (settled.status === 'rejected') {
    const errorCode = errorCodeOf(settled.reason)
    console.error(`[snapshot] ${id} unavailable: ${errorCode}`)
    return { id, status: 'error', fetchedAt: null, errorCode }
  }
  const status = deriveSourceStatus(settled)
  const info: SourceInfo = { id, status, fetchedAt: settled.value.value.fetchedAt }
  if (status === 'stale') info.errorCode = settled.value.refreshError
  return info
}

/**
 * Single entry point for the page and /api/weather. Memoized per render with React cache().
 * Never throws: a build or render must not fail because upstream is down.
 *
 * Last-good comes from unstable_cache returning the stale entry when revalidation throws
 * (D-01 implemented through the D-03 fallback). 'stale' is set only from readThrough's
 * refreshError, never from age (checker revision; see plan 06 Design note).
 * MET Norway gets no read-through (ToS: no repeat before `Expires`, Pitfall 7) and only feeds
 * sources[] in phase 1 (D-05). An ensemble failure only empties `confidence` (D-17).
 */
export const getWeatherSnapshot = cache(async (): Promise<WeatherSnapshot> => {
  const nowMs = Date.now()
  const generatedAt = new Date(nowMs).toISOString()
  const [om, met, ensemble] = await Promise.allSettled([
    readThrough({
      getCached: getOpenMeteoForecast,
      getFresh: getOpenMeteoForecastFresh,
      ttlS: TTL.openMeteoForecast,
      nowMs,
    }),
    getMetNorway(),
    readThrough({
      getCached: getOpenMeteoEnsemble,
      getFresh: getOpenMeteoEnsembleFresh,
      ttlS: TTL.openMeteoEnsemble,
      nowMs,
    }),
  ])

  const omInfo = infoFrom('open-meteo', om)
  const ensembleInfo = infoFrom('open-meteo-ensemble', ensemble)

  let metInfo: SourceInfo
  if (met.status === 'fulfilled') {
    metInfo = { id: 'met-norway', status: 'ok', fetchedAt: met.value.fetchedAt }
  } else {
    const errorCode = errorCodeOf(met.reason)
    console.error(`[snapshot] met-norway unavailable: ${errorCode}`)
    metInfo = { id: 'met-norway', status: 'error', fetchedAt: null, errorCode }
  }

  const sources = [omInfo, metInfo, ensembleInfo]
  const confidence: DayConfidence[] =
    ensemble.status === 'fulfilled'
      ? ensemble.value.value.data.map(({ date, ...day }) => ({ date, ensemble: day }))
      : []
  let built: WeatherSnapshot
  if (om.status === 'fulfilled') {
    built = { generatedAt, ...normalizeForecast(om.value.value.data), sources, confidence }
  } else {
    built = { generatedAt, now: null, hourly48: [], daily: [], sources, confidence }
  }
  const fault = readFault({
    VERCEL_ENV: process.env.VERCEL_ENV,
    WEATHER_FAULT: process.env.WEATHER_FAULT,
  })
  return applyFault(built, fault, nowMs)
})
