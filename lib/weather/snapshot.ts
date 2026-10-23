import 'server-only'
import { cache } from 'react'
import { getOpenMeteoForecast } from '@/lib/sources/openMeteoForecast'
import { SourceError } from '@/lib/sources/errors'
import { normalizeForecast } from './normalize'
import type { WeatherSnapshot } from './types'

/**
 * Single entry point for the page and /api/weather. Memoized per render with React cache().
 * Never throws: a build or render must not fail because upstream is down.
 */
export const getWeatherSnapshot = cache(async (): Promise<WeatherSnapshot> => {
  const generatedAt = new Date().toISOString()
  try {
    const { data, fetchedAt } = await getOpenMeteoForecast()
    return {
      generatedAt,
      ...normalizeForecast(data),
      sources: [{ id: 'open-meteo', status: 'ok', fetchedAt }],
    }
  } catch (err) {
    const errorCode = err instanceof SourceError ? err.code : 'unknown'
    console.error(`[snapshot] open-meteo unavailable: ${errorCode}`)
    return {
      generatedAt,
      now: null,
      hourly48: [],
      daily: [],
      sources: [{ id: 'open-meteo', status: 'error', fetchedAt: null, errorCode }],
    }
  }
})
