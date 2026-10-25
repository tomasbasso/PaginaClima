// Sun of the day for /cielo (ASTRO-01, D-08). Pure: callers pass `now`.
// Sunrise/sunset come from suncalc (upper limb, with refraction) so the whole block has one source.
import { getTimes } from 'suncalc'
import { LAT, LON } from '@/lib/config'
import { UTC_OFFSET_MIN } from '@/lib/sky/astro'
import { formatHHmm, localDateKey } from '@/lib/time'

const DAY_MS = 86_400_000
const MISSING = '—'

export interface SunDay {
  sunrise: string
  sunset: string
  durationText: string
  deltaText: string
  srText: string
  /** Positions on the 24 h ruler: minutes since 00:00 ART / 1440, clamped to [0, 1]. */
  ruler: { riseFrac: number; setFrac: number; nowFrac: number }
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** "13 h 06 min" (minutes always two digits). Rounds to the nearest minute. */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h} h ${String(m).padStart(2, '0')} min`
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function dayLengthMin(d: Date): { rise: Date; set: Date; minutes: number } | null {
  const { sunrise, sunset } = getTimes(d, LAT, LON, 0, UTC_OFFSET_MIN)
  if (!sunrise || !sunset) return null // never at −36°, but typed as nullable
  return { rise: sunrise, set: sunset, minutes: (sunset.getTime() - sunrise.getTime()) / 60_000 }
}

export function sunDay(now: Date): SunDay {
  const midnight = Date.parse(`${localDateKey(now)}T00:00:00-03:00`)
  const frac = (t: number) => clamp01((t - midnight) / DAY_MS)
  const nowFrac = frac(now.getTime())

  const today = dayLengthMin(now)
  if (!today) {
    return {
      sunrise: MISSING,
      sunset: MISSING,
      durationText: MISSING,
      deltaText: MISSING,
      srText: 'No pudimos calcular la salida y la puesta del sol.',
      ruler: { riseFrac: 0, setFrac: 0, nowFrac },
    }
  }
  const yesterday = dayLengthMin(new Date(now.getTime() - DAY_MS))

  const sunrise = formatHHmm(today.rise)
  const sunset = formatHHmm(today.set)
  const durationText = formatDuration(today.minutes)

  // Round the decimal difference, never the difference of two rounded values.
  const delta = yesterday ? Math.round(today.minutes - yesterday.minutes) : null
  let deltaText = MISSING
  let deltaSr = ''
  if (delta !== null) {
    if (delta > 0) {
      deltaText = `${delta} min más que ayer`
      deltaSr = `${plural(delta, 'minuto', 'minutos')} más que ayer`
    } else if (delta < 0) {
      deltaText = `${-delta} min menos que ayer`
      deltaSr = `${plural(-delta, 'minuto', 'minutos')} menos que ayer`
    } else {
      deltaText = 'igual que ayer'
      deltaSr = 'igual que ayer'
    }
  }

  const total = Math.round(today.minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  const lengthSr =
    m === 0 ? plural(h, 'hora', 'horas') : `${plural(h, 'hora', 'horas')} y ${plural(m, 'minuto', 'minutos')}`
  const srText = `El sol sale a las ${sunrise} y se pone a las ${sunset}. ${lengthSr} de luz${
    deltaSr ? `, ${deltaSr}` : ''
  }.`

  return {
    sunrise,
    sunset,
    durationText,
    deltaText,
    srText,
    ruler: { riseFrac: frac(today.rise.getTime()), setFrac: frac(today.set.getTime()), nowFrac },
  }
}
