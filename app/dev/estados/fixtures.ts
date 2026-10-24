// Fixtures for /dev/estados (D-14). Pure: every snapshot is built relative to `nowMs`, so the
// "ACTUALIZADO HACE X MIN" ages and the Desactualizado threshold stay meaningful on each request.
import { buildHeadline } from '@/lib/forecast/headline'
import { makeDaily, makeHourly } from '@/lib/forecast/__fixtures__/build'
import type { SkyState, SkyToken } from '@/lib/sky/state'
import { addDaysToKey, localDateKey } from '@/lib/time'
import type { DailyPoint, HourlyPoint, NowData, SourceInfo, WeatherSnapshot } from '@/lib/weather/types'

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
  hourly48: HourlyPoint[] = [],
  daily: DailyPoint[] = [],
): WeatherSnapshot {
  return {
    generatedAt: new Date(nowMs).toISOString(),
    now,
    hourly48,
    daily,
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

// ---------------------------------------------------------------------------------------------
// Phase 2 (headline, meteogram, daily list). Hourly fixtures start at the current local hour
// (except `degradado`, which starts 5 h earlier and is filtered by selectFutureHours on the page);
// daily fixtures start today (ART) except `pasados`. Headlines are evaluated at fixed instants.

export type HourlyFixtureKey = 'lluviaTormenta' | 'helada' | 'rafagas' | 'nulos' | 'degradado' | 'vacio'
export type DailyFixtureKey = 'semana' | 'nulos' | 'pasados'

/** Smooth daily cycle: `min` at 05 h, `max` at 15 h (cosine, local hour). */
function cycle(hour: number, min: number, max: number): number {
  const mid = (min + max) / 2
  const amp = (max - min) / 2
  return Math.round((mid + amp * Math.cos(((hour - 15) / 24) * 2 * Math.PI)) * 10) / 10
}

/** Day index (0 = the start day) of point i for a series whose first local hour is `h0`. */
const dayIndex = (h0: number, i: number) => Math.floor((h0 + i) / 24)

export function buildForecastFixtures(nowMs: number): {
  hourly: Record<HourlyFixtureKey, HourlyPoint[]>
  daily: Record<DailyFixtureKey, DailyPoint[]>
  headlines: { largo: string | null; manana: string | null }
} {
  const start = localIso(nowMs)
  const h0 = Number(start.slice(11, 13))
  const todayKey = localDateKey(new Date(nowMs))

  const lluviaTormenta = makeHourly(start, 48, (_i, h) => ({
    tempC: cycle(h, 14, 27),
    feelsC: cycle(h, 13, 28),
    ...(h >= 14 && h <= 18
      ? { precipMm: [1, 2.5, 6, 3.5, 1.2][h - 14], weatherCode: h === 16 ? 63 : 61 }
      : {}),
    ...(h >= 21 && h <= 23 ? { precipMm: 4, weatherCode: 95, windKmh: 28, gustKmh: 46 } : {}),
    windDirDeg: 315,
  }))

  const helada = makeHourly(start, 48, (_i, h) => ({
    tempC: cycle(h, -3, 9),
    feelsC: cycle(h, -6, 8),
    weatherCode: 0,
    windKmh: 6,
    gustKmh: 11,
    windDirDeg: 200,
  }))

  const rafagas = makeHourly(start, 48, (i, h) => {
    const tomorrowAfternoon = dayIndex(h0, i) === 1 && h >= 14 && h <= 19
    return {
      tempC: cycle(h, 12, 24),
      windDirDeg: 250,
      ...(tomorrowAfternoon
        ? { windKmh: 34 + (h - 14) * 2, gustKmh: 55 + Math.round(((h - 14) * 13) / 5), weatherCode: 3 }
        : {}),
    }
  })

  const nulos = makeHourly(start, 48, (i, h) => ({
    tempC: i >= 20 && i < 26 ? null : cycle(h, 10, 22),
    ...(i === 9 || i === 12 ? { windKmh: null } : {}),
    ...(i === 30 ? { windDirDeg: null } : {}),
  }))

  const degradado = makeHourly(localIso(nowMs - 5 * 60 * MIN), 48, (_i, h) => ({
    tempC: cycle(h, 11, 23),
    weatherCode: 2,
  }))

  const vacio = makeHourly(start, 8, (_i, h) => ({ tempC: cycle(h, 11, 23) }))

  const codes = [0, 1, 2, 3, 61, 63, 95, 45, 80, 0, 2, 3, 61, 0]
  const semana = makeDaily(todayKey, 14, (i) => ({
    weatherCode: codes[i],
    tMaxC: [27, 29, 24, 18, 12, 15, 22, 20, 26, 31, 28, 21, 17, 23][i],
    tMinC: [12, 14, 9, 6, -2, 3, 11, 8, 10, 15, 13, 9, 5, 7][i],
    precipSumMm: i === 4 ? 4 : i === 6 ? 12 : i === 8 ? 0.6 : 0,
  }))

  const dailyNulos = makeDaily(todayKey, 7, (i) =>
    i === 2 || i === 4 ? { tMaxC: null, tMinC: null, weatherCode: null } : { weatherCode: i % 2 ? 2 : 0 },
  )

  const pasados = makeDaily(addDaysToKey(todayKey, -2), 9, (i) => ({
    weatherCode: i < 2 ? 95 : 1,
    tMaxC: 22 + i,
    tMinC: 8 + (i % 3),
    precipSumMm: i < 2 ? 20 : 0,
  }))

  // Fixed instants: 10:00 ART (34-character headline) and 21:30 ART ("Mañana: …").
  const largoAt = new Date('2026-10-23T10:00:00-03:00')
  const largo = buildHeadline(
    {
      hourly48: makeHourly('2026-10-23T10:00:00-03:00', 48, (i, h) => ({
        ...(i < 14 && h === 15 ? { tempC: 36 } : {}),
        ...(i < 14 && h === 21 ? { weatherCode: 95 } : {}),
      })),
    },
    largoAt,
  )
  const mananaAt = new Date('2026-10-23T21:30:00-03:00')
  const manana = buildHeadline(
    {
      hourly48: makeHourly('2026-10-23T21:00:00-03:00', 48, (i, h) =>
        i >= 3 && i < 27 && h === 15 ? { weatherCode: 95 } : {},
      ),
    },
    mananaAt,
  )

  return {
    hourly: { lluviaTormenta, helada, rafagas, nulos, degradado, vacio },
    daily: { semana, nulos: dailyNulos, pasados },
    headlines: { largo, manana },
  }
}
