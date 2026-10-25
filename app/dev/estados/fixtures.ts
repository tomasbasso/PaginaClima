// Fixtures for /dev/estados (D-14). Pure: every snapshot is built relative to `nowMs`, so the
// "ACTUALIZADO HACE X MIN" ages and the Desactualizado threshold stay meaningful on each request.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildHeadline } from '@/lib/forecast/headline'
import { makeDaily, makeHourly } from '@/lib/forecast/__fixtures__/build'
import { doyIndex, loadClimatology } from '@/lib/rain/normal'
import { seriesStart } from '@/lib/rain/periods'
import type { RainDay, StitchedRain } from '@/lib/rain/stitch'
import { buildRainView, type RainData, type RainView } from '@/lib/rain/view'
import {
  type SatelliteLatest,
  type SatelliteView,
  satelliteView,
  stampFromIso,
} from '@/lib/satellite/frame'
import { type MoonInfo, moonInfo, moonPath, moonPhaseName } from '@/lib/sky/moon'
import type { SkyState, SkyToken } from '@/lib/sky/state'
import { type SunDay, sunDay } from '@/lib/sky/sun'
import { addDaysToKey, localDateKey, localHour, weekdayLong } from '@/lib/time'
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

// ---------------------------------------------------------------------------------------------
// Phase 5 (/cielo: Luna, Sol, Lluvia, Satélite). Every instant is derived from nowMs or is a
// fixed UTC constant. Rain series are synthetic StitchedRain built against the real 1991–2020
// climatology, so the comparisons land exactly where each frame says. The satellite image is the
// local GIBS fixture as a data URI: never a GIBS URL nor /api/satelite.

export interface MoonFrame {
  label: string
  name: string
  path: string | null
}

export interface RainFrame {
  name: string
  view: RainView
}

export interface SatelliteFrame {
  name: string
  view: SatelliteView | null
  showImage: boolean
}

const HOUR = 60 * MIN
const STEP = 10 * MIN

/** The GIBS pass on the 10-min grid at or before `ms`. */
function passAt(ms: number): SatelliteLatest {
  const t = Math.floor(ms / STEP) * STEP
  const timeISO = new Date(t).toISOString().replace('.000Z', 'Z')
  return { stamp: stampFromIso(timeISO), timeISO }
}

/** The committed real GIBS frame as a data URI; null when it cannot be read (no broken src). */
function fixtureJpegDataUri(): string | null {
  try {
    const buf = readFileSync(path.join(process.cwd(), 'lib', 'sources', '__fixtures__', 'gibs-frame.jpg'))
    return `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Synthetic stitched series from seriesStart(today) to `until`: every day rains `scale` × its
 * climatological normal (today prorated by the observed share), so each period's ratio is
 * `scale`. `mm` rewrites single days after the scale is applied.
 */
function stitched(
  now: Date,
  clim: readonly number[],
  opts: { scale: number; until?: string; mm?: (date: string, base: number) => number },
): StitchedRain {
  const todayKey = localDateKey(now)
  const until = opts.until ?? todayKey
  const todayIncluded = until === todayKey
  const todayFraction = todayIncluded ? (localHour(now) + 1) / 24 : 0
  const start = seriesStart(todayKey)
  const days: RainDay[] = []
  for (let d = start; d <= until; d = addDaysToKey(d, 1)) {
    const share = d === todayKey ? todayFraction : 1
    const base = Math.round(opts.scale * clim[doyIndex(d)] * share * 10) / 10
    days.push({ date: d, mm: opts.mm ? opts.mm(d, base) : base, source: 'era5' })
  }
  return {
    days,
    start,
    dataUntil: until,
    todayIncluded,
    todayFraction,
    lagging: until < addDaysToKey(todayKey, -1),
  }
}

export function buildCieloFixtures(nowMs: number): {
  moons: MoonFrame[]
  suns: { name: string; sun: SunDay; moon: MoonInfo }[]
  rains: RainFrame[]
  satellites: SatelliteFrame[]
} {
  const now = new Date(nowMs)
  const todayKey = localDateKey(now)

  // 8 phases: waxing 0 → 1, then waning 0.75 → 0.25, each with a representative phase.
  const moonSpecs: [number, boolean, number][] = [
    [0, true, 0],
    [0.25, true, 0.125],
    [0.5, true, 0.25],
    [0.75, true, 0.375],
    [1, true, 0.5],
    [0.75, false, 0.625],
    [0.5, false, 0.75],
    [0.25, false, 0.875],
  ]
  const moons: MoonFrame[] = moonSpecs.map(([fraction, waxing, phase]) => ({
    label: `${Math.round(fraction * 100)} %${fraction > 0 && fraction < 1 ? (waxing ? ' · crece' : ' · mengua') : ''}`,
    name: moonPhaseName(phase),
    path: moonPath(fraction, waxing),
  }))

  const sunAt = (iso: string) => {
    const t = new Date(iso)
    return { sun: sunDay(t), moon: moonInfo(t) }
  }
  const suns = [
    { name: 'Día largo (diciembre)', ...sunAt('2026-12-10T15:00:00Z') },
    { name: 'Día corto (junio)', ...sunAt('2026-06-10T15:00:00Z') },
    { name: 'Igual que ayer (solsticio)', ...sunAt('2026-12-21T15:00:00Z') },
  ]

  // Monday 09:00 ART of the current week: the week normal is under 2 mm.
  let monday = todayKey
  for (let i = 0; i < 6 && weekdayLong(monday) !== 'lunes'; i++) monday = addDaysToKey(monday, -1)
  const mondayMorning = new Date(Date.parse(`${monday}T09:00:00-03:00`))

  const clim = loadClimatology()
  const series = clim ?? new Array<number>(365).fill(2)
  const ok = (s: StitchedRain): RainData => ({ status: 'ok', stitched: s, recentError: null })
  const rainAt = (s: StitchedRain, at: Date = now, c: readonly number[] | null = clim) =>
    buildRainView(ok(s), at, c)
  const ago = (n: number) => addDaysToKey(todayKey, -n)
  const lastRainOn = (day: string, mm: number) => (d: string, base: number) =>
    d === day ? mm : d > day ? 0 : base

  const rains: RainFrame[] = [
    { name: 'Menos de lo normal', view: rainAt(stitched(now, series, { scale: 0.5 })) },
    { name: 'Casi lo normal', view: rainAt(stitched(now, series, { scale: 1 })) },
    { name: 'Más del doble', view: rainAt(stitched(now, series, { scale: 2.4 })) },
    {
      name: 'Pronto para comparar (lunes 09:00)',
      view: rainAt(stitched(mondayMorning, series, { scale: 1 }), mondayMorning),
    },
    { name: 'Sin climatología', view: rainAt(stitched(now, series, { scale: 1 }), now, null) },
    { name: 'Datos atrasados', view: rainAt(stitched(now, series, { scale: 1, until: ago(5) })) },
    { name: 'Sin datos', view: buildRainView({ status: 'error' }, now, clim) },
    {
      name: 'Última lluvia hoy',
      view: rainAt(stitched(now, series, { scale: 0.3, mm: lastRainOn(todayKey, 6.4) })),
    },
    {
      name: 'Última lluvia hace 6 días',
      view: rainAt(stitched(now, series, { scale: 0.3, mm: lastRainOn(ago(6), 12) })),
    },
    {
      name: 'Última lluvia hace más de 14 días',
      view: rainAt(stitched(now, series, { scale: 0.3, mm: lastRainOn(ago(20), 18) })),
    },
    { name: 'Sin lluvias en la serie', view: rainAt(stitched(now, series, { scale: 0 })) },
  ]

  const jpeg = fixtureJpegDataUri()
  const withImage = (v: SatelliteView | null) => (v && jpeg ? { ...v, src: jpeg } : v)
  const normal = withImage(satelliteView(passAt(nowMs - 40 * MIN), now))
  const vieja = withImage(satelliteView(passAt(nowMs - 3 * HOUR), now))
  const satellites: SatelliteFrame[] = [
    { name: 'Normal (imagen fixture local)', view: normal, showImage: jpeg !== null },
    { name: 'Vieja (hace 3 h)', view: vieja, showImage: jpeg !== null },
    { name: 'Sin imagen', view: null, showImage: false },
    { name: 'Cargando', view: normal, showImage: false },
  ]

  return { moons, suns, rains, satellites }
}
