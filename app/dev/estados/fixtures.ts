// Fixtures for /dev/estados (D-14). Pure: every snapshot is built relative to `nowMs`, so the
// "ACTUALIZADO HACE X MIN" ages and the Desactualizado threshold stay meaningful on each request.
import type { SkyState, SkyToken } from '@/lib/sky/state'
import type { NowData, SourceInfo, WeatherSnapshot } from '@/lib/weather/types'

const MIN = 60_000

/** Local ISO with the fixed Argentina offset (UTC−3, no DST), on the hour like Open-Meteo. */
function localIso(ms: number): string {
  const d = new Date(ms - 3 * 60 * MIN)
  d.setUTCMinutes(0, 0, 0)
  return `${d.toISOString().slice(0, 16)}-03:00`
}

function nowData(nowMs: number, over: Partial<NowData> = {}): NowData {
  return {
    time: localIso(nowMs),
    tempC: 24,
    feelsC: 23,
    humidityPct: 38,
    pressureHpa: 1012,
    windKmh: 18,
    gustKmh: 32,
    windDirDeg: 45,
    weatherCode: 0,
    isDay: 1,
    precipMm: 0,
    ...over,
  }
}

function snapshot(
  nowMs: number,
  now: NowData | null,
  sources: SourceInfo[],
): WeatherSnapshot {
  return {
    generatedAt: new Date(nowMs).toISOString(),
    now,
    hourly48: [],
    daily: [],
    sources,
  }
}

function okSources(fetchedMs: number): SourceInfo[] {
  const fetchedAt = new Date(fetchedMs).toISOString()
  return [
    { id: 'open-meteo', status: 'ok', fetchedAt },
    { id: 'met-norway', status: 'ok', fetchedAt },
  ]
}

export type StateFixtureKey = 'normal' | 'desactualizado' | 'fuenteCaida' | 'sinDatos'

export interface SkyFrame {
  token: SkyToken
  sky: SkyState
  snapshot: WeatherSnapshot
}

export function buildFixtures(nowMs: number): {
  states: Record<StateFixtureKey, WeatherSnapshot>
  skies: SkyFrame[]
} {
  const normal = snapshot(nowMs, nowData(nowMs), okSources(nowMs - 6 * MIN))

  const desactualizado = snapshot(nowMs, nowData(nowMs), okSources(nowMs - 45 * MIN))

  const fuenteCaidaAt = new Date(nowMs - 50 * MIN).toISOString()
  const fuenteCaida = snapshot(nowMs, nowData(nowMs), [
    { id: 'open-meteo', status: 'stale', fetchedAt: fuenteCaidaAt, errorCode: 'fetch_failed' },
    { id: 'met-norway', status: 'ok', fetchedAt: fuenteCaidaAt },
  ])

  const sinDatos = snapshot(nowMs, null, [
    { id: 'open-meteo', status: 'error', fetchedAt: null, errorCode: 'fetch_failed' },
    { id: 'met-norway', status: 'error', fetchedAt: null, errorCode: 'fetch_failed' },
  ])

  const fresh = okSources(nowMs - 6 * MIN)
  const frame = (token: SkyToken, sky: SkyState, over: Partial<NowData>): SkyFrame => ({
    token,
    sky,
    snapshot: snapshot(nowMs, nowData(nowMs, over), fresh),
  })

  const skies: SkyFrame[] = [
    // Two negative cases: −3.2 → "−3" (U+2212) and −0.4 → "0" (no "−0").
    frame(
      'noche',
      { phase: 'noche', weather: 'despejado', sunAltitude: -20 },
      { tempC: -3.2, feelsC: -6.8, humidityPct: 92, windKmh: 6, gustKmh: 11, windDirDeg: 200, isDay: 0 },
    ),
    frame(
      'amanecer',
      { phase: 'amanecer', weather: 'despejado', sunAltitude: 2 },
      { tempC: -0.4, feelsC: -2.9, humidityPct: 88, windKmh: 4, gustKmh: 9, windDirDeg: 180 },
    ),
    frame('dia', { phase: 'dia', weather: 'despejado', sunAltitude: 45 }, { weatherCode: 0 }),
    frame(
      'atardecer',
      { phase: 'atardecer', weather: 'despejado', sunAltitude: 2 },
      { tempC: 19.6, feelsC: 19, weatherCode: 1, windKmh: 9, gustKmh: 17, windDirDeg: 315 },
    ),
    frame(
      'cubierto',
      { phase: 'dia', weather: 'cubierto', sunAltitude: 45 },
      { tempC: 16.3, feelsC: 15.1, humidityPct: 71, weatherCode: 3, windKmh: 22, gustKmh: 41, windDirDeg: 135 },
    ),
    frame(
      'tormenta',
      { phase: 'dia', weather: 'tormenta', sunAltitude: 45 },
      {
        tempC: 21.8,
        feelsC: 22.4,
        humidityPct: 84,
        pressureHpa: 1003,
        weatherCode: 95,
        windKmh: 38,
        gustKmh: 74,
        windDirDeg: 270,
        precipMm: 6.2,
      },
    ),
  ]

  return { states: { normal, desactualizado, fuenteCaida, sinDatos }, skies }
}
