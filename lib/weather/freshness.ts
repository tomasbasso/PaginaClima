// Freshness copy and thresholds (DATA-02, UI-SPEC "Etiqueta de frescura"). Pure: the caller
// supplies the age, so server render and client ticker produce the same text.
import { formatDayMonth, formatHHmm } from '@/lib/time'

const MIN = 60_000
const HOUR = 60 * MIN

/** Outdated = 2 × the 15 min Open-Meteo TTL (UI-SPEC "Desactualizado"). */
export const OUTDATED_MS = 30 * MIN
/** Client asks for fresh RSC data once the shown data is older than one TTL. */
export const AUTO_REFRESH_MS = 15 * MIN

export function formatFreshness(ageMs: number, fetchedAt: Date): string {
  if (!(ageMs >= MIN)) return 'ACTUALIZADO RECIÉN' // also NaN and negative (clock skew)
  if (ageMs < HOUR) return `ACTUALIZADO HACE ${Math.floor(ageMs / MIN)} MIN`
  if (ageMs < 24 * HOUR) return `ACTUALIZADO HACE ${Math.floor(ageMs / HOUR)} H`
  return `ACTUALIZADO EL ${formatDayMonth(fetchedAt)} A LAS ${formatHHmm(fetchedAt)}`
}

export function isOutdated(ageMs: number): boolean {
  return ageMs > OUTDATED_MS
}

export function shouldAutoRefresh(ageMs: number): boolean {
  return ageMs > AUTO_REFRESH_MS
}
