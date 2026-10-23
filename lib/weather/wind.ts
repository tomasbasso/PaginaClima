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

const CALM_KMH = 2

export function describeWind(
  kmh: number,
  deg: number,
  gustKmh: number,
): { value: string; gustLine: string | null } {
  if (kmh < CALM_KMH) return { value: 'Calma', gustLine: null }
  const { short, long } = windSector(deg)
  return {
    value: `${Math.round(kmh)} km/h ${short}`,
    gustLine: `Ráfagas de ${Math.round(gustKmh)} km/h · viento del ${long}`,
  }
}
