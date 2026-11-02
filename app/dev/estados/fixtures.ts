// Fixtures for /dev/estados (D-14). Pure: every snapshot is built relative to `nowMs`, so the
// "ACTUALIZADO HACE X MIN" ages and the Desactualizado threshold stay meaningful on each request.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Verdict } from '@/lib/forecast/agreement'
import { confidenceNotice } from '@/lib/forecast/confidenceNotice'
import { buildDailyRows, type DailyRow } from '@/lib/forecast/daily'
import { buildDespacho, type DespachoTone } from '@/lib/forecast/despacho'
import { buildHeadline } from '@/lib/forecast/headline'
import { makeConfidence, makeDaily, makeHourly } from '@/lib/forecast/__fixtures__/build'
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
import type {
  DailyPoint,
  DayConfidence,
  HourlyPoint,
  NowData,
  SourceInfo,
  WeatherSnapshot,
} from '@/lib/weather/types'

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
    confidence: [],
  }
}

function okSources(fetchedMs: number): SourceInfo[] {
  const fetchedAt = new Date(fetchedMs).toISOString()
  return [
    { id: 'open-meteo', status: 'ok', fetchedAt },
    { id: 'met-norway', status: 'ok', fetchedAt },
    { id: 'open-meteo-ensemble', status: 'ok', fetchedAt },
    { id: 'open-meteo-models', status: 'ok', fetchedAt },
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

// ---------------------------------------------------------------------------------------------
// Phase 4 ("Pronóstico con confianza"). Rows come from buildDailyRows and the notice from
// confidenceNotice, so the frames cannot drift from the real code. Rain ranges use real-looking
// values: with real data p10 is usually 0, as in "0–17 mm" and "0–4 mm" (RESEARCH Pitfall 4).

export interface ConfidenceFrame {
  name: string
  rows: DailyRow[]
  notice: string | null
  initialExpanded?: boolean
  width?: 390 | 320
}

export interface DespachoEntry {
  rule: string
  text: string
  tone: DespachoTone
}

// One letter per day: coinciden, dudan, desacuerdo (x), solo, sinDato (n).
const VERDICT_OF: Record<string, Verdict> = { c: 'coinciden', d: 'dudan', x: 'desacuerdo', s: 'solo', n: 'sinDato' }

/** Fixed Monday: frame 16 names every weekday the same way whatever the day of the review. */
const DESPACHO_WEEK = '2026-11-02'

const DESPACHO_CASES: [rule: string, verdicts: string][] = [
  ['Regla 1 · 4 días con un solo modelo', 'ssssccc'],
  ['Regla 1 · Solo días sin comparar · Fuera del contrato', 'sssnnnn'],
  ['Regla 2 · La frase más larga', 'ccxcccc'],
  ['Regla 2', 'cccccxc'],
  ['Regla 3 · La frase más larga', 'ddxdcdd'],
  ['Regla 3 · Con mañana', 'cxdcccc'],
  ['Regla 4', 'ddxxddd'],
  ['Regla 5', 'ccxxxcc'],
  ['Regla 6', 'xcxcccc'],
  ['Regla 7', 'ccccccc'],
  ['Regla 7b', 'ccccscc'],
  ['Regla 8', 'cccccdd'],
  ['Regla 9', 'ccccddd'],
  ['Regla 10 · Con hoy y mañana', 'ddccccc'],
  ['Regla 10', 'dddcccc'],
  ['Regla 11', 'dddcddd'],
  ['Regla 12', 'cdcdccc'],
  ['Duda sin ningún acuerdo · Fuera del contrato', 'dsndsnn'],
]

export function buildConfidenceFixtures(nowMs: number): {
  frames: ConfidenceFrame[]
  despachos: DespachoEntry[]
} {
  const now = new Date(nowMs)
  const todayKey = localDateKey(now)
  const rowsOf = (daily: DailyPoint[], confidence: DayConfidence[]) => buildDailyRows(daily, now, confidence)

  const up = (id: SourceInfo['id']): SourceInfo => ({
    id,
    status: 'ok',
    fetchedAt: new Date(nowMs - 6 * MIN).toISOString(),
  })
  const down = (id: SourceInfo['id']): SourceInfo => ({
    id,
    status: 'error',
    fetchedAt: null,
    errorCode: 'fetch_failed',
  })
  const stale = (id: SourceInfo['id'], hoursAgo: number): SourceInfo => ({
    id,
    status: 'stale',
    fetchedAt: new Date(nowMs - hoursAgo * HOUR).toISOString(),
    errorCode: 'fetch_failed',
  })
  const ENSEMBLE = 'open-meteo-ensemble'
  const MODELS = 'open-meteo-models'
  const notice = (rows: DailyRow[], ensemble: SourceInfo, models: SourceInfo, main = up('open-meteo')) =>
    confidenceNotice([main, up('met-norway'), ensemble, models], now, rows[0])

  const tMax = [24, 27, 29, 22, 18, 16, 21, 25, 28, 31, 26, 19, 17, 23]
  const tMin = [11, 12, 14, 10, 7, 4, 8, 10, 12, 15, 13, 9, 5, 7]
  const codes = [2, 1, 61, 3, 63, 95, 80, 0, 2, 3, 81, 61, 2, 0]
  const precip = [0, 0, 4, 2, 12, 18, 6, 0, 0.6, 0, 8, 3, 0, 0]
  const rainMembers = [2, 8, 30, 22, 36, 40, 28, 10, 6, 14, 30, 26, 12, 6]
  const rainP10 = [0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0]
  const rainP90 = [0, 0.4, 6, 4, 17, 15, 9, 1.5, 0.8, 2, 12, 5, 0.6, 0]

  const baseDaily = makeDaily(todayKey, 14, (i) => ({
    weatherCode: codes[i],
    tMaxC: tMax[i],
    tMinC: tMin[i],
    precipSumMm: precip[i],
  }))
  // The fan opens with the lead time, as a real ensemble does.
  const ensembleOf = (i: number) => ({
    tMinP10C: Math.round(tMin[i] - (1 + i * 0.6)),
    tMaxP90C: Math.round(tMax[i] + (1 + i * 0.7)),
    rainMembers: rainMembers[i],
    rainP10Mm: rainP10[i],
    rainP90Mm: rainP90[i],
  })
  const baseEnsemble = makeConfidence(todayKey, 14, ensembleOf)
  const noEnsemble = makeConfidence(todayKey, 14, () => null)

  /** Sets one verdict per day; voters follow the verdict, as aggregateModels does. */
  const vote = (confidence: DayConfidence[], verdicts: string, voters: (i: number) => number = () => 4) =>
    confidence.map((c, i) => {
      const verdict = VERDICT_OF[verdicts[i] ?? 'n']
      return { ...c, verdict, voters: verdict === 'solo' ? 1 : verdict === 'sinDato' ? 0 : voters(i) }
    })

  const VERDICTS = 'ccdcdxddxdddcd'
  const votersByDay = (i: number) => (i < 8 ? 4 : i < 10 ? 3 : 2)
  const full = vote(baseEnsemble, VERDICTS, votersByDay)
  const fullRows = rowsOf(baseDaily, full)
  const noEnsembleRows = rowsOf(baseDaily, vote(noEnsemble, VERDICTS, votersByDay))
  const noModelsRows = rowsOf(baseDaily, baseEnsemble)
  const noConfidenceRows = rowsOf(baseDaily, [])

  const twoModels = vote(baseEnsemble, 'cdcdcdccdcdccd', () => 2)
  const onlyOne = vote(baseEnsemble, 'ssssssssssssss')

  const lowMembers = [2, 5, 6, 8, 2, 5, 6, 8, 2, 5, 6, 8, 2, 5]
  const lowProbability = vote(
    makeConfidence(todayKey, 14, (i) => ({ ...ensembleOf(i), rainMembers: lowMembers[i], rainP90Mm: 0 })),
    VERDICTS,
    votersByDay,
  )
  const highMembers: Record<number, number> = { 2: 48, 3: 50, 4: 51 }
  const highProbability = vote(
    makeConfidence(todayKey, 14, (i) => ({
      ...ensembleOf(i),
      rainMembers: highMembers[i] ?? rainMembers[i],
      rainP10Mm: i in highMembers ? 8 : rainP10[i],
      rainP90Mm: i in highMembers ? 34 : rainP90[i],
    })),
    VERDICTS,
    votersByDay,
  )
  const dryDaily = makeDaily(todayKey, 14, (i) => ({
    weatherCode: i % 3 === 0 ? 1 : 0,
    tMaxC: tMax[i],
    tMinC: tMin[i],
    precipSumMm: 0,
  }))
  const dry = vote(
    makeConfidence(todayKey, 14, (i) => ({ ...ensembleOf(i), rainMembers: 0, rainP10Mm: 0, rainP90Mm: 0 })),
    VERDICTS.replaceAll('x', 'd'),
    votersByDay,
  )
  const dayWithoutEnsemble = vote(
    makeConfidence(todayKey, 14, (i) => (i === 4 ? null : ensembleOf(i))),
    VERDICTS,
    votersByDay,
  )

  // Frames 14 and 15: the same list. The range starts on index 3 (D-07), so the tightest case goes
  // there; the first three rows cover "{n} mm", −12°, 95 % and "Mañana". Any 14 days include the 7
  // weekdays and two-digit dates.
  const LONG: { code: number; verdict: string; members: number; mm: number; p10: number; p90: number }[] = [
    { code: 99, verdict: 'c', members: 51, mm: 120, p10: 0, p90: 0 },
    { code: 82, verdict: 'd', members: 49, mm: 15, p10: 0, p90: 0 },
    { code: 65, verdict: 'x', members: 40, mm: 4, p10: 0, p90: 0 },
    { code: 3, verdict: 's', members: 51, mm: 180, p10: 120, p90: 250 },
    { code: 99, verdict: 'c', members: 45, mm: 60, p10: 15, p90: 120 },
    { code: 99, verdict: 'd', members: 36, mm: 9, p10: 5, p90: 15 },
    { code: 82, verdict: 'd', members: 42, mm: 60, p10: 15, p90: 120 },
    { code: 99, verdict: 'x', members: 40, mm: 60, p10: 15, p90: 120 },
    { code: 65, verdict: 'x', members: 38, mm: 60, p10: 15, p90: 120 },
    { code: 1, verdict: 's', members: 20, mm: 9, p10: 5, p90: 15 },
    { code: 95, verdict: 's', members: 44, mm: 60, p10: 15, p90: 120 },
    { code: 53, verdict: 's', members: 51, mm: 60, p10: 15, p90: 120 },
    { code: 95, verdict: 'x', members: 30, mm: 9, p10: 5, p90: 15 },
    { code: 0, verdict: 's', members: 0, mm: 0, p10: 0, p90: 0 },
  ]
  const longDaily = makeDaily(todayKey, 14, (i) => ({
    weatherCode: LONG[i].code,
    tMaxC: i === 1 ? -2 : i === 6 ? 38 : tMax[i],
    tMinC: i === 1 ? -12 : tMin[i],
    precipSumMm: LONG[i].mm,
  }))
  const longConfidence = vote(
    makeConfidence(todayKey, 14, (i) => ({
      ...ensembleOf(i),
      rainMembers: LONG[i].members,
      rainP10Mm: LONG[i].p10,
      rainP90Mm: LONG[i].p90,
    })),
    LONG.map((l) => l.verdict).join(''),
  )
  const longRows = rowsOf(longDaily, longConfidence)

  const frames: ConfidenceFrame[] = [
    { name: 'Cuadro 1 · Datos completos 7 días', rows: fullRows, notice: null },
    { name: 'Cuadro 2 · Datos completos 14 días', rows: fullRows, notice: null, initialExpanded: true },
    { name: 'Cuadro 3 · Falló el ensemble', rows: noEnsembleRows, notice: notice(noEnsembleRows, down(ENSEMBLE), up(MODELS)) },
    {
      name: 'Cuadro 3b · Falló el ensemble y la fuente principal quedó vieja · Frase fuera del contrato',
      rows: noEnsembleRows,
      notice: notice(noEnsembleRows, down(ENSEMBLE), up(MODELS), stale('open-meteo', 2)),
    },
    {
      name: 'Cuadro 4 · Ensemble con último dato bueno',
      rows: fullRows,
      notice: notice(fullRows, stale(ENSEMBLE, 3), up(MODELS)),
    },
    {
      name: 'Cuadro 4b · Ensemble con último dato bueno y multimodelo caído · Frase fuera del contrato',
      rows: noModelsRows,
      notice: notice(noModelsRows, stale(ENSEMBLE, 3), down(MODELS)),
    },
    {
      name: 'Cuadro 4c · Ensemble con último dato de otro día · Frase fuera del contrato',
      rows: fullRows,
      notice: notice(fullRows, stale(ENSEMBLE, 50), up(MODELS)),
    },
    {
      name: 'Cuadro 4d · Ensemble con último dato que no cubre ningún día visible',
      rows: noEnsembleRows,
      notice: notice(noEnsembleRows, stale(ENSEMBLE, 20 * 24), up(MODELS)),
    },
    { name: 'Cuadro 5 · Falló el multimodelo', rows: noModelsRows, notice: notice(noModelsRows, up(ENSEMBLE), down(MODELS)) },
    {
      name: 'Cuadro 5b · Falló el multimodelo y la fuente principal quedó vieja · Frase fuera del contrato',
      rows: noModelsRows,
      notice: notice(noModelsRows, up(ENSEMBLE), down(MODELS), stale('open-meteo', 2)),
    },
    {
      name: 'Cuadro 6 · Multimodelo con último dato bueno',
      rows: fullRows,
      notice: notice(fullRows, up(ENSEMBLE), stale(MODELS, 2)),
    },
    {
      name: 'Cuadro 6b · Multimodelo con último dato bueno y ensemble caído · Frase fuera del contrato',
      rows: noEnsembleRows,
      notice: notice(noEnsembleRows, down(ENSEMBLE), stale(MODELS, 2)),
    },
    {
      name: 'Cuadro 6c · Las dos con último dato bueno · Frase fuera del contrato',
      rows: fullRows,
      notice: notice(fullRows, stale(ENSEMBLE, 3), stale(MODELS, 2)),
    },
    {
      name: 'Cuadro 6d · Multimodelo con último dato que no cubre ningún día visible',
      rows: noModelsRows,
      notice: notice(noModelsRows, up(ENSEMBLE), stale(MODELS, 20 * 24)),
    },
    { name: 'Cuadro 7 · Fallaron los dos', rows: noConfidenceRows, notice: notice(noConfidenceRows, down(ENSEMBLE), down(MODELS)) },
    { name: 'Cuadro 8 · Solo un modelo', rows: rowsOf(baseDaily, onlyOne), notice: null },
    { name: 'Cuadro 9 · 2 modelos', rows: rowsOf(baseDaily, twoModels), notice: null },
    { name: 'Cuadro 10 · Probabilidad baja', rows: rowsOf(baseDaily, lowProbability), notice: null },
    { name: 'Cuadro 11 · Tres días seguidos con 95 %', rows: rowsOf(baseDaily, highProbability), notice: null },
    { name: 'Cuadro 12 · Semana seca', rows: rowsOf(dryDaily, dry), notice: null },
    { name: 'Cuadro 13 · Día sin dato de ensemble', rows: rowsOf(baseDaily, dayWithoutEnsemble), notice: null },
    { name: 'Cuadro 14 · Textos largos a 390', rows: longRows, notice: null, initialExpanded: true },
    { name: 'Cuadro 15 · Textos largos a 320', rows: longRows, notice: null, initialExpanded: true, width: 320 },
  ]

  const despachos = DESPACHO_CASES.flatMap(([rule, verdicts]): DespachoEntry[] => {
    const days = [...verdicts].map((v, i) => ({ date: addDaysToKey(DESPACHO_WEEK, i), verdict: VERDICT_OF[v] }))
    const despacho = buildDespacho(days, DESPACHO_WEEK)
    return despacho ? [{ rule, ...despacho }] : []
  })

  return { frames, despachos }
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
