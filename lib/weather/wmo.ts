// WMO weather_code → Rioplatense label + sky group (UI-SPEC NOW-02 table). Pure.
// Labels are sentence case; the UI uppercases them with CSS.

export type WeatherGroup =
  | 'despejado'
  | 'cubierto'
  | 'niebla'
  | 'llovizna'
  | 'lluvia'
  | 'nieve'
  | 'tormenta'

type Entry = { label: string; group: WeatherGroup }

const e = (label: string, group: WeatherGroup): Entry => ({ label, group })

const WMO: Record<number, Entry> = {
  0: e('Despejado', 'despejado'),
  1: e('Casi despejado', 'despejado'),
  2: e('Algo nublado', 'despejado'),
  3: e('Cubierto', 'cubierto'),
  45: e('Niebla', 'niebla'),
  48: e('Niebla', 'niebla'),
  51: e('Llovizna', 'llovizna'),
  53: e('Llovizna', 'llovizna'),
  55: e('Llovizna intensa', 'llovizna'),
  56: e('Llovizna helada', 'llovizna'),
  57: e('Llovizna helada', 'llovizna'),
  61: e('Lluvia débil', 'lluvia'),
  63: e('Lluvia', 'lluvia'),
  65: e('Lluvia fuerte', 'lluvia'),
  66: e('Lluvia helada', 'lluvia'),
  67: e('Lluvia helada', 'lluvia'),
  71: e('Nevadas débiles', 'nieve'),
  73: e('Nevadas débiles', 'nieve'),
  77: e('Nevadas débiles', 'nieve'),
  75: e('Nevada', 'nieve'),
  80: e('Chaparrones', 'lluvia'),
  81: e('Chaparrones', 'lluvia'),
  82: e('Chaparrones fuertes', 'lluvia'),
  85: e('Chaparrones de nieve', 'nieve'),
  86: e('Chaparrones de nieve', 'nieve'),
  95: e('Tormenta', 'tormenta'),
  96: e('Tormenta con granizo', 'tormenta'),
  99: e('Tormenta con granizo', 'tormenta'),
}

/**
 * `night` is decided by the caller from the solar phase ('noche' = sun below −6°), not `is_day`.
 * Unknown or null codes return nulls so the UI hides the diamond and label.
 */
export function describeWeather(
  code: number | null,
  opts: { night: boolean },
): { label: string | null; group: WeatherGroup | null } {
  if (code === null) return { label: null, group: null }
  const entry = WMO[code]
  if (!entry) return { label: null, group: null }
  if (opts.night && (code === 0 || code === 1)) {
    return { label: 'Noche despejada', group: 'despejado' }
  }
  return { label: entry.label, group: entry.group }
}
