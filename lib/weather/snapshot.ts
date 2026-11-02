import 'server-only'
import { cache } from 'react'
import { TTL } from '@/lib/config'
import { verdictFor, type ModelsDay } from '@/lib/forecast/agreement'
import type { EnsembleDay } from '@/lib/forecast/ensemble'
import { getMetNorway } from '@/lib/sources/metNorway'
import { getOpenMeteoEnsemble, getOpenMeteoEnsembleFresh } from '@/lib/sources/openMeteoEnsemble'
import { getOpenMeteoForecast, getOpenMeteoForecastFresh } from '@/lib/sources/openMeteoForecast'
import { getOpenMeteoModels, getOpenMeteoModelsFresh } from '@/lib/sources/openMeteoModels'
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
 * Joins both sources by date. The verdict is computed here and not in the adapter, so changing a
 * threshold needs no cache invalidation, and the votes stop here: only their result is public (D-18).
 */
function buildConfidence(ensembleDays: EnsembleDay[], modelsDays: ModelsDay[]): DayConfidence[] {
  const ensembleByDate = new Map(ensembleDays.map(({ date, ...day }) => [date, day]))
  const votesByDate = new Map(modelsDays.map((day) => [day.date, day.votes]))
  const dates = [...new Set([...ensembleByDate.keys(), ...votesByDate.keys()])].sort()
  return dates.map((date) => {
    const votes = votesByDate.get(date) ?? []
    return {
      date,
      ensemble: ensembleByDate.get(date) ?? null,
      verdict: verdictFor(votes),
      voters: votes.length,
    }
  })
}

/**
 * Single entry point for the page and /api/weather. Memoized per render with React cache().
 * Never throws: a build or render must not fail because upstream is down.
 *
 * Last-good comes from unstable_cache returning the stale entry when revalidation throws
 * (D-01 implemented through the D-03 fallback). 'stale' is set only from readThrough's
 * refreshError, never from age (checker revision; see plan 06 Design note).
 * MET Norway gets no read-through (ToS: no repeat before `Expires`, Pitfall 7) and only feeds
 * sources[] in phase 1 (D-05). An ensemble or models failure only touches `confidence` (D-17).
 */
export const getWeatherSnapshot = cache(async (): Promise<WeatherSnapshot> => {
  const nowMs = Date.now()
  const generatedAt = new Date(nowMs).toISOString()
  const [om, met, ensemble, models] = await Promise.allSettled([
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
    readThrough({
      getCached: getOpenMeteoModels,
      getFresh: getOpenMeteoModelsFresh,
      ttlS: TTL.openMeteoModels,
      nowMs,
    }),
  ])

  const omInfo = infoFrom('open-meteo', om)
  const ensembleInfo = infoFrom('open-meteo-ensemble', ensemble)
  const modelsInfo = infoFrom('open-meteo-models', models)

  let metInfo: SourceInfo
  if (met.status === 'fulfilled') {
    metInfo = { id: 'met-norway', status: 'ok', fetchedAt: met.value.fetchedAt }
  } else {
    const errorCode = errorCodeOf(met.reason)
    console.error(`[snapshot] met-norway unavailable: ${errorCode}`)
    metInfo = { id: 'met-norway', status: 'error', fetchedAt: null, errorCode }
  }

  const sources = [omInfo, metInfo, ensembleInfo, modelsInfo]
  const confidence = buildConfidence(
    ensemble.status === 'fulfilled' ? ensemble.value.value.data : [],
    models.status === 'fulfilled' ? models.value.value.data : [],
  )
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
