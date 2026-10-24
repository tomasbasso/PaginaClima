// Wind direction and copy (UI-SPEC "Direcciones del viento"). Pure. SMN spelling: 'O', not 'W'.

const SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const
const LONG = ['norte', 'noreste', 'este', 'sudeste', 'sur', 'sudoeste', 'oeste', 'noroeste'] as const

export type WindSectorShort = (typeof SHORT)[number]

/** 8 sectors of 45° centred on each direction (N = 337.5–22.5). */
export function windSector(deg: number): { short: WindSectorShort; long: string } {
  const norm = ((deg % 360) + 360) % 360
  const i = Math.floor((norm + 22.5) / 45) % 8
  return { short: SHORT[i], long: LONG[i] }
}

export const CALM_KMH = 2

/** Missing values (WR-09): no speed → "—"; no direction → speed only; either → no gust line. */
export function describeWind(
  kmh: number | null,
  deg: number | null,
  gustKmh: number | null,
): { value: string; gustLine: string | null } {
  if (kmh === null) return { value: '—', gustLine: null }
  if (kmh < CALM_KMH) return { value: 'Calma', gustLine: null }
  if (deg === null) return { value: `${Math.round(kmh)} km/h`, gustLine: null }
  const { short, long } = windSector(deg)
  return {
    value: `${Math.round(kmh)} km/h ${short}`,
    gustLine:
      gustKmh === null ? null : `Ráfagas de ${Math.round(gustKmh)} km/h · viento del ${long}`,
  }
}
