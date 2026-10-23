// Deterministic fault injection (D-13, RESEARCH Pattern 6). Pure.
// WEATHER_FAULT forces each data state locally and on previews. Ignored in production:
// VERCEL_ENV is 'production' there at build and runtime, and undefined locally.
import type { SourceInfo, WeatherSnapshot } from './types'

export type WeatherFault = 'openmeteo-down' | 'metno-down' | 'stale' | 'empty'

const FAULTS: readonly WeatherFault[] = ['openmeteo-down', 'metno-down', 'stale', 'empty']

export function readFault(env: {
  VERCEL_ENV?: string
  WEATHER_FAULT?: string
}): WeatherFault | undefined {
  if (env.VERCEL_ENV === 'production') return undefined
  const value = env.WEATHER_FAULT?.trim()
  return FAULTS.find((f) => f === value)
}

const STALE_SHIFT_MS = 45 * 60_000

export function applyFault(
  s: WeatherSnapshot,
  fault: WeatherFault | undefined,
  nowMs: number,
): WeatherSnapshot {
  void nowMs // kept in the signature so every fault is computed from the same render instant
  if (!fault) return s

  const mapSource = (id: SourceInfo['id'], fn: (src: SourceInfo) => SourceInfo) =>
    s.sources.map((src) => (src.id === id ? fn(src) : src))

  switch (fault) {
    case 'openmeteo-down':
      // Data and fetchedAt kept: "Fuente caída con último dato bueno" (or Sin datos if none).
      return {
        ...s,
        sources: mapSource('open-meteo', (src) => ({ ...src, status: 'error', errorCode: 'fault' })),
      }
    case 'metno-down':
      return {
        ...s,
        sources: mapSource('met-norway', (src) => ({ ...src, status: 'error', errorCode: 'fault' })),
      }
    case 'stale':
      return {
        ...s,
        sources: mapSource('open-meteo', (src) => {
          if (!src.fetchedAt) return src
          const fetchedAt = new Date(Date.parse(src.fetchedAt) - STALE_SHIFT_MS).toISOString()
          return { id: src.id, status: 'ok', fetchedAt }
        }),
      }
    case 'empty':
      return {
        ...s,
        now: null,
        hourly48: [],
        daily: [],
        sources: s.sources.map((src) => ({
          id: src.id,
          status: 'error',
          fetchedAt: null,
          errorCode: 'fault',
        })),
      }
  }
}
