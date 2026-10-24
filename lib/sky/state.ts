// Sky state for Winifreda (UI-SPEC "Estados del cielo" steps 1–2 + phase-3 contract). Pure:
// callers always pass `now`, so server render and client recompute share one code path.
import { describeWeather, type WeatherGroup } from '@/lib/weather/wmo'
import { getSolarPhase, type SolarPhase } from './phase'

/** Phase-3 weather enum (subset of WeatherGroup: llovizna → lluvia, nieve → cubierto). */
export type SkyWeather = 'despejado' | 'cubierto' | 'lluvia' | 'tormenta' | 'niebla'

/** Phase-3 contract: `<SkyBackdrop state={SkyState} />`. */
export type SkyState = { phase: SolarPhase; weather: SkyWeather; sunAltitude: number }

/** The six `data-sky` token sets of the UI-SPEC (closed union, never upstream text). */
export type SkyToken = 'noche' | 'amanecer' | 'dia' | 'atardecer' | 'cubierto' | 'tormenta'

function toSkyWeather(group: WeatherGroup | null): SkyWeather {
  switch (group) {
    case 'tormenta':
    case 'cubierto':
    case 'lluvia':
    case 'niebla':
      return group
    case 'llovizna':
      return 'lluvia'
    case 'nieve':
      return 'cubierto'
    default:
      return 'despejado'
  }
}

export function resolveSkyState(now: Date, group: WeatherGroup | null): SkyState {
  return { ...getSolarPhase(now), weather: toSkyWeather(group) }
}

/**
 * Client recompute every 60 s (Pitfall 9): refreshes phase and sunAltitude for `now` and keeps
 * every other field of the server state (weather and any later optional field).
 */
export function refreshSolar(state: SkyState, now: Date): SkyState {
  return { ...state, ...getSolarPhase(now) }
}

export function skyToken(state: SkyState): SkyToken {
  if (state.weather === 'tormenta') return 'tormenta'
  if (state.weather === 'cubierto' || state.weather === 'lluvia' || state.weather === 'niebla') {
    return state.phase === 'noche' ? 'noche' : 'cubierto'
  }
  return state.phase
}

/**
 * Shared by app/layout.tsx (data-sky on <html>) and app/page.tsx (SkyBackdrop) so both resolve
 * the same state. Without current data the group is null → sky by solar phase only ("Sin datos").
 */
export function skyFromSnapshot(
  snapshot: { now: { weatherCode: number | null } | null },
  now: Date,
): SkyState {
  const night = getSolarPhase(now).phase === 'noche'
  const { group } = describeWeather(snapshot.now?.weatherCode ?? null, { night })
  return resolveSkyState(now, group)
}
