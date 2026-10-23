import 'server-only'
import { cache } from 'react'
import { TTL } from '@/lib/config'
import { getMetNorway } from '@/lib/sources/metNorway'
import { getOpenMeteoForecast, getOpenMeteoForecastFresh } from '@/lib/sources/openMeteoForecast'
import { SourceError } from '@/lib/sources/errors'
import { readThrough } from '@/lib/sources/readThrough'
import { normalizeForecast } from './normalize'
import { applyFault, readFault } from './faults'
import { deriveSourceStatus } from './status'
import type { SourceInfo, WeatherSnapshot } from './types'

function errorCodeOf(reason: unknown): string {
  return reason instanceof SourceError ? reason.code : 'unknown'
}

/**
 * Single entry point for the page and /api/weather. Memoized per render with React cache().
 * Never throws: a build or render must not fail because upstream is down.
 *
 * Last-good comes from unstable_cache returning the stale entry when revalidation throws
 * (D-01 implemented through the D-03 fallback). 'stale' is set only from readThrough's
 * refreshError, never from age (checker revision; see plan 06 Design note).
 * MET Norway gets no read-through (ToS: no repeat before `Expires`, Pitfall 7) and only feeds
 * sources[] in phase 1 (D-05).
 */
export const getWeatherSnapshot = cache(async (): Promise<WeatherSnapshot> => {
  const nowMs = Date.now()
  const generatedAt = new Date(nowMs).toISOString()
  const [om, met] = await Promise.allSettled([
    readThrough({
      getCached: getOpenMeteoForecast,
      getFresh: getOpenMeteoForecastFresh,
      ttlS: TTL.openMeteoForecast,
      nowMs,
    }),
    getMetNorway(),
  ])

  let omInfo: SourceInfo
  if (om.status === 'fulfilled') {
    const status = deriveSourceStatus(om)
    omInfo = { id: 'open-meteo', status, fetchedAt: om.value.value.fetchedAt }
    if (status === 'stale') omInfo.errorCode = om.value.refreshError
  } else {
    const errorCode = errorCodeOf(om.reason)
    console.error(`[snapshot] open-meteo unavailable: ${errorCode}`)
    omInfo = { id: 'open-meteo', status: 'error', fetchedAt: null, errorCode }
  }

  let metInfo: SourceInfo
  if (met.status === 'fulfilled') {
    metInfo = { id: 'met-norway', status: 'ok', fetchedAt: met.value.fetchedAt }
  } else {
    const errorCode = errorCodeOf(met.reason)
    console.error(`[snapshot] met-norway unavailable: ${errorCode}`)
    metInfo = { id: 'met-norway', status: 'error', fetchedAt: null, errorCode }
  }

  const sources = [omInfo, metInfo]
  let built: WeatherSnapshot
  if (om.status === 'fulfilled') {
    built = { generatedAt, ...normalizeForecast(om.value.value.data), sources }
  } else {
    built = { generatedAt, now: null, hourly48: [], daily: [], sources }
  }
  const fault = readFault({
    VERCEL_ENV: process.env.VERCEL_ENV,
    WEATHER_FAULT: process.env.WEATHER_FAULT,
  })
  return applyFault(built, fault, nowMs)
})
