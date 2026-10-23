import 'server-only'
import { cache } from 'react'
import { getMetNorway } from '@/lib/sources/metNorway'
import { getOpenMeteoForecast } from '@/lib/sources/openMeteoForecast'
import { SourceError } from '@/lib/sources/errors'
import { normalizeForecast } from './normalize'
import type { SourceId, SourceInfo, WeatherSnapshot } from './types'

function errorCodeOf(reason: unknown): string {
  return reason instanceof SourceError ? reason.code : 'unknown'
}

function sourceInfo(
  id: SourceId,
  result: PromiseSettledResult<{ fetchedAt: string }>,
): SourceInfo {
  if (result.status === 'fulfilled') return { id, status: 'ok', fetchedAt: result.value.fetchedAt }
  const errorCode = errorCodeOf(result.reason)
  console.error(`[snapshot] ${id} unavailable: ${errorCode}`)
  return { id, status: 'error', fetchedAt: null, errorCode }
}

/**
 * Single entry point for the page and /api/weather. Memoized per render with React cache().
 * Never throws: a build or render must not fail because upstream is down. Sources are fetched
 * in parallel and independently, so one failing source never hides the other.
 * MET Norway only feeds sources[] in phase 1 (D-05): none of its data is displayed.
 */
export const getWeatherSnapshot = cache(async (): Promise<WeatherSnapshot> => {
  const generatedAt = new Date().toISOString()
  const [om, met] = await Promise.allSettled([getOpenMeteoForecast(), getMetNorway()])

  const sources = [sourceInfo('open-meteo', om), sourceInfo('met-norway', met)]

  if (om.status === 'fulfilled') {
    return { generatedAt, ...normalizeForecast(om.value.data), sources }
  }
  return { generatedAt, now: null, hourly48: [], daily: [], sources }
})
