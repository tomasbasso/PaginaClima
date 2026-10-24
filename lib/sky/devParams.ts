// /dev/sky query ⇄ forced sky state (UI-SPEC "/dev/sky", D-14). Pure.
// Input validation (T-03-14): every number goes through Number + Number.isFinite + clamp + step,
// every enum through a closed `as const` list, and the WMO code through the phase-1 table. No
// text from the query is ever returned, so nothing user-controlled reaches the render.
import { describeWeather, type WeatherGroup } from '@/lib/weather/wmo'
import type { SkyAstro } from './astro'
import { coverFromCode, intensityFromCode } from './params'
import type { SolarPhase } from './phase'
import type { SkyState, SkyWeather } from './state'

export const SKY_LAB_CLIMAS = ['despejado', 'cubierto', 'lluvia', 'tormenta', 'niebla'] as const
export const SKY_LAB_LADOS = ['mañana', 'tarde'] as const
/** The 8 wind directions (degrees the wind blows FROM), SMN order N, NE, E, … NO. */
export const SKY_LAB_DIRS = [0, 45, 90, 135, 180, 225, 270, 315] as const
export const SKY_LAB_ESCALAS = [0.5, 0.75] as const

export type SkyLabLado = (typeof SKY_LAB_LADOS)[number]
export type SkyLabEscala = (typeof SKY_LAB_ESCALAS)[number]

export type SkyLabState = {
  alt: number
  lado: SkyLabLado
  clima: SkyWeather
  wmo: number | null
  i: number | null
  viento: number
  dir: number | null
  nubes: number | null
  escala: SkyLabEscala
}

/** Ranges of the UI-SPEC controls. */
export const SKY_LAB_RANGES = {
  alt: { min: -30, max: 70, step: 0.5 },
  i: { min: 0, max: 1, step: 0.05 },
  viento: { min: 0, max: 90, step: 1 },
  nubes: { min: 0, max: 100, step: 5 },
} as const

export const SKY_LAB_DEFAULTS: SkyLabState = {
  alt: 30,
  lado: 'tarde',
  clima: 'despejado',
  wmo: null,
  i: null,
  viento: 10,
  dir: null,
  nubes: null,
  escala: 0.5,
}

type Raw = string | string[] | undefined
export type SkyLabSearchParams = Record<string, Raw>

const first = (v: Raw): string | undefined => (Array.isArray(v) ? v[0] : v)

/** Finite number or null (empty and whitespace-only strings are "missing", not 0). */
function num(v: Raw): number | null {
  const s = first(v)
  if (s === undefined || s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Clamp to [min, max] and round to the step (with float noise removed, and no −0). */
function stepped(n: number, r: { min: number; max: number; step: number }): number {
  const c = Math.min(r.max, Math.max(r.min, n))
  const v = Math.round(c / r.step) * r.step
  return Number(v.toFixed(2)) + 0
}

function oneOf<T extends string | number>(list: readonly T[], v: T | null | undefined): T | null {
  return v !== null && v !== undefined && (list as readonly unknown[]).includes(v) ? v : null
}

/** A WMO code of the phase-1 table (the same table Ahora uses), else null. */
function validCode(n: number | null): number | null {
  if (n === null || !Number.isInteger(n)) return null
  return describeWeather(n, { night: false }).group !== null ? n : null
}

/** Every code of the phase-1 WMO table, ascending, with its day label (for the select). */
export const SKY_LAB_WMO_CODES: readonly { code: number; label: string }[] = Array.from(
  { length: 100 },
  (_, code) => ({ code, label: describeWeather(code, { night: false }).label }),
).filter((c): c is { code: number; label: string } => c.label !== null)

/** Same mapping as state.ts (llovizna → lluvia, nieve → cubierto), for the WMO select. */
export function weatherOfCode(code: number): SkyWeather | null {
  const group: WeatherGroup | null = describeWeather(code, { night: false }).group
  switch (group) {
    case null:
      return null
    case 'llovizna':
      return 'lluvia'
    case 'nieve':
      return 'cubierto'
    default:
      return group
  }
}

export function parseSkyLabParams(sp: SkyLabSearchParams): SkyLabState {
  const d = SKY_LAB_DEFAULTS
  const alt = num(sp.alt)
  const i = num(sp.i)
  const viento = num(sp.viento)
  const nubes = num(sp.nubes)
  return {
    alt: alt === null ? d.alt : stepped(alt, SKY_LAB_RANGES.alt),
    lado: oneOf(SKY_LAB_LADOS, first(sp.lado) as SkyLabLado | undefined) ?? d.lado,
    clima: oneOf(SKY_LAB_CLIMAS, first(sp.clima) as SkyWeather | undefined) ?? d.clima,
    wmo: validCode(num(sp.wmo)),
    i: i === null ? null : stepped(i, SKY_LAB_RANGES.i),
    viento: viento === null ? d.viento : stepped(viento, SKY_LAB_RANGES.viento),
    dir: oneOf<number>(SKY_LAB_DIRS, num(sp.dir)),
    nubes: nubes === null ? null : stepped(nubes, SKY_LAB_RANGES.nubes),
    escala: oneOf<number>(SKY_LAB_ESCALAS, num(sp.escala)) === 0.75 ? 0.75 : 0.5,
  }
}

/** Query string (without "?") for a state; null fields are omitted. */
export function toSkyLabQuery(s: SkyLabState): string {
  const q = new URLSearchParams()
  q.set('alt', String(s.alt))
  q.set('lado', s.lado)
  q.set('clima', s.clima)
  if (s.i !== null) q.set('i', String(s.i))
  q.set('viento', String(s.viento))
  if (s.dir !== null) q.set('dir', String(s.dir))
  if (s.wmo !== null) q.set('wmo', String(s.wmo))
  if (s.nubes !== null) q.set('nubes', String(s.nubes))
  q.set('escala', String(s.escala))
  return q.toString()
}

/** Same thresholds as getSolarPhase: < −6 noche, ≥ 6 día, else by the side of solar noon. */
function phaseOf(alt: number, lado: SkyLabLado): SolarPhase {
  if (alt < -6) return 'noche'
  if (alt >= 6) return 'dia'
  return lado === 'mañana' ? 'amanecer' : 'atardecer'
}

export function toSkyState(s: SkyLabState): SkyState {
  return {
    phase: phaseOf(s.alt, s.lado),
    weather: s.clima,
    sunAltitude: s.alt,
    intensity: s.i ?? intensityFromCode(s.wmo, s.clima, null),
    cloudCover: s.nubes ?? Math.round(coverFromCode(s.wmo, s.clima) * 100),
    windKmh: s.viento,
    windDirDeg: s.dir,
  }
}

/** Forced sun side (east in the morning, west in the afternoon), no moon. */
export function toSkyAstro(s: SkyLabState): SkyAstro {
  const morning = s.lado === 'mañana'
  return {
    morning,
    sunAzimuth: morning ? 90 : 270,
    moonAltitude: -1,
    moonAzimuth: 0,
    moonFraction: 0,
  }
}

const preset = (name: string, over: Partial<SkyLabState>) => ({
  name,
  state: { ...SKY_LAB_DEFAULTS, ...over } as SkyLabState,
})

/** UI-SPEC "/dev/sky" presets (roadmap criterion 1 + the states named in PROJECT.md). */
export const SKY_LAB_PRESETS: readonly { name: string; state: SkyLabState }[] = [
  preset('Noche estrellada', { alt: -30, clima: 'despejado', wmo: 0, viento: 6 }),
  preset('Amanecer', { alt: -2, lado: 'mañana', clima: 'despejado', viento: 8 }),
  preset('Siesta', { alt: 60, clima: 'despejado', viento: 14 }),
  preset('Día nublado', { alt: 35, clima: 'cubierto', wmo: 3, viento: 20 }),
  preset('Atardecer', { alt: 2, lado: 'tarde', clima: 'despejado', wmo: 1, viento: 10 }),
  preset('Lluvia de día', { alt: 30, clima: 'lluvia', wmo: 63, viento: 25 }),
  preset('Llovizna al atardecer', { alt: -1, lado: 'tarde', clima: 'lluvia', wmo: 51, viento: 12 }),
  preset('Tormenta de noche', { alt: -25, clima: 'tormenta', wmo: 95, viento: 50 }),
  preset('Tormenta de día', { alt: 40, clima: 'tormenta', wmo: 99, viento: 60 }),
  preset('Niebla al amanecer', { alt: 1, lado: 'mañana', clima: 'niebla', wmo: 45, viento: 0 }),
  preset('Noche nublada', { alt: -25, clima: 'cubierto', viento: 15 }),
]
