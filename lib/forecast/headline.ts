// Editorial headline (UI-SPEC 'Titular editorial', D-13..D-16). Pure: callers pass now.
// Only numbers and WMO codes come from upstream; every word comes from the local table below.
import { addDaysToKey, localDateKey, localHour } from '@/lib/time'
import type { HourlyPoint, WeatherSnapshot } from '@/lib/weather/types'
import { describeWeather, type WeatherGroup } from '@/lib/weather/wmo'
import { windSector } from '@/lib/weather/wind'
import { DAY_PART_PHRASE, dayKeyOf, dayPart, hourOf, selectFutureHours } from './hours'

// Thresholds (UI-SPEC "Umbrales").
export const RAIN_SUM_MM = 1
export const RAIN_HOUR_MM = 0.5
export const FROST_C = 0
export const STRONG_FROST_C = -3
export const HEAT_C = 32
export const STRONG_HEAT_C = 35
export const COLD_MAX_C = 12
export const COOL_MORNING_C = 5
export const STRONG_WIND_KMH = 40
export const STRONG_GUST_KMH = 60

// D-16 says "unas 6"; the UI-SPEC example 'Día de calor, tormentas a la noche' has 7.
export const MAX_WORDS = 7
export const MAX_CHARS = 34

const MIN_WINDOW_POINTS = 3
const RAINY_HOUR_MM = 0.1
const PREFIX = 'Mañana: '

type EventKind = 'tormenta' | 'lluvia' | 'llovizna' | 'chaparrones' | 'nevadas'

const EVENT_NOUN: Record<EventKind, string> = {
  tormenta: 'tormentas',
  lluvia: 'lluvia',
  llovizna: 'llovizna',
  chaparrones: 'chaparrones',
  nevadas: 'nevadas',
}

const EVENT_NOW: Record<EventKind, string> = {
  tormenta: 'tormenta ahora',
  lluvia: 'llueve ahora',
  llovizna: 'llovizna ahora',
  chaparrones: 'chaparrones ahora',
  nevadas: 'nieva ahora',
}

type GeneralNoun = 'día' | 'tarde' | 'noche'

const CLEAR: Record<GeneralNoun, string> = {
  día: 'día despejado',
  tarde: 'tarde despejada',
  noche: 'noche despejada',
}

const OVERCAST: Record<GeneralNoun, string> = {
  día: 'día nublado',
  tarde: 'tarde nublada',
  noche: 'noche nublada',
}

const groupOf = (code: number | null): WeatherGroup | null =>
  describeWeather(code, { night: false }).group

const nums = (xs: Array<number | null>): number[] => xs.filter((x): x is number => x !== null)

function timing(kind: EventKind, hours: HourlyPoint[], window: HourlyPoint[], isNow: boolean): string {
  if (isNow && hours[0] === window[0]) return EVENT_NOW[kind]
  const parts = new Set(hours.map((p) => dayPart(hourOf(p.time))))
  if (parts.size >= 3) return `${EVENT_NOUN[kind]} todo el día`
  return `${EVENT_NOUN[kind]} ${DAY_PART_PHRASE[dayPart(hourOf(hours[0].time))]}`
}

function buildEvent(window: HourlyPoint[], isNow: boolean): string | null {
  const storm = window.filter((p) => groupOf(p.weatherCode) === 'tormenta')
  if (storm.length > 0) return timing('tormenta', storm, window, isNow)

  const precip = window.map((p) => p.precipMm)
  const sum = nums(precip).reduce((a, b) => a + b, 0)
  const hasRain = sum >= RAIN_SUM_MM || nums(precip).some((mm) => mm >= RAIN_HOUR_MM)
  if (!hasRain) return null

  let rainy = window.filter((p) => p.precipMm !== null && p.precipMm >= RAINY_HOUR_MM)
  if (rainy.length === 0) rainy = window.filter((p) => p.precipMm !== null && p.precipMm > 0)

  const known = rainy.filter((p) => groupOf(p.weatherCode) !== null)
  let kind: EventKind = 'lluvia'
  if (known.length > 0 && known.every((p) => groupOf(p.weatherCode) === 'llovizna')) kind = 'llovizna'
  else if (known.length > 0 && known.every((p) => groupOf(p.weatherCode) === 'nieve')) kind = 'nevadas'
  else if (rainy.some((p) => p.weatherCode !== null && p.weatherCode >= 80 && p.weatherCode <= 82)) {
    kind = 'chaparrones'
  }
  return timing(kind, rainy, window, isNow)
}

// dayMaxC: the target day's daily max (WR-02). The remaining hours alone would call a warm
// day 'frío' in the evening; frost keeps using the window because only a coming low matters.
function buildContext(window: HourlyPoint[], prefix: boolean, dayMaxC: number | null): string | null {
  const temps = nums(window.map((p) => p.tempC))
  if (temps.length > 0) {
    const min = Math.min(...temps)
    const max = Math.max(dayMaxC ?? -Infinity, ...temps)
    if (min <= STRONG_FROST_C) return 'helada fuerte'
    if (min <= FROST_C) return 'helada'
    if (max >= STRONG_HEAT_C) return 'calor fuerte'
    if (max >= HEAT_C) return 'día de calor'
    if (max <= COLD_MAX_C) return 'día frío'
    const morning = nums(
      window.filter((p) => hourOf(p.time) >= 6 && hourOf(p.time) <= 11).map((p) => p.tempC),
    )
    if (morning.length > 0 && Math.min(...morning) <= COOL_MORNING_C) {
      return prefix ? 'arranque fresco' : 'mañana fresca'
    }
  }

  const strong = window.filter(
    (p) =>
      (p.windKmh !== null && p.windKmh >= STRONG_WIND_KMH) ||
      (p.gustKmh !== null && p.gustKmh >= STRONG_GUST_KMH),
  )
  if (strong.length > 0) {
    const sectors = new Set(nums(strong.map((p) => p.windDirDeg)).map((deg) => windSector(deg).long))
    if (sectors.size === 1) return `viento fuerte del ${[...sectors][0]}`
    return 'viento fuerte'
  }
  return null
}

function buildGeneral(window: HourlyPoint[], prefix: boolean): string | null {
  const counts = { cubierto: 0, niebla: 0, despejado: 0 }
  let code2 = 0
  let code01 = 0
  let firstFog: HourlyPoint | null = null
  for (const p of window) {
    const g = groupOf(p.weatherCode)
    if (g === null) continue
    if (g === 'despejado') {
      counts.despejado++
      if (p.weatherCode === 2) code2++
      else code01++
    } else if (g === 'niebla') {
      counts.niebla++
      firstFog ??= p
    } else {
      counts.cubierto++ // cubierto + precipitation groups that did not trigger an event
    }
  }
  if (counts.cubierto + counts.niebla + counts.despejado === 0) return null

  const h0 = hourOf(window[0].time)
  const noun: GeneralNoun = prefix || h0 < 12 ? 'día' : h0 < 20 ? 'tarde' : 'noche'

  // Tie order: cubierto > niebla > despejado.
  if (counts.cubierto >= counts.niebla && counts.cubierto >= counts.despejado) return OVERCAST[noun]
  if (counts.niebla >= counts.despejado && firstFog) {
    return `niebla ${DAY_PART_PHRASE[dayPart(hourOf(firstFog.time))]}`
  }
  if (code2 > code01) return `${noun} con algo de nubes`
  return CLEAR[noun]
}

function fits(body: string, prefix: boolean): boolean {
  const text = prefix ? `${PREFIX}${body}` : body
  return text.split(/\s+/).length <= MAX_WORDS && text.length <= MAX_CHARS
}

export function buildHeadline(
  s: Pick<WeatherSnapshot, 'hourly48'> & Partial<Pick<WeatherSnapshot, 'daily'>>,
  now: Date,
): string | null {
  const h = localHour(now)
  const todayKey = localDateKey(now)
  const prefix = h >= 21
  const target = prefix ? addDaysToKey(todayKey, 1) : todayKey

  const window = selectFutureHours(s.hourly48, now).filter((p) => dayKeyOf(p.time) === target)
  if (window.length < MIN_WINDOW_POINTS) return null

  const isNow = target === todayKey && hourOf(window[0].time) === h
  const event = buildEvent(window, isNow)
  const dayMaxC = s.daily?.find((d) => d.date === target)?.tMaxC ?? null
  const context = buildContext(window, prefix, dayMaxC)

  const candidates: string[] = []
  if (event && context) candidates.push(`${context}, ${event}`, event, context)
  else if (event) candidates.push(event)
  else if (context) {
    if (context.startsWith('helada')) {
      const general = buildGeneral(window, prefix)
      if (general) candidates.push(`${context} y ${general}`)
    }
    candidates.push(context)
  } else {
    const general = buildGeneral(window, prefix)
    if (general) candidates.push(general)
  }

  const body = candidates.find((c) => fits(c, prefix))
  if (!body) return null
  return prefix ? `${PREFIX}${body}` : body.charAt(0).toUpperCase() + body.slice(1)
}
