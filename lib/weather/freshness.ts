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

/** First retry delay after a refresh that brought back the same (stale ISR) data. */
export const AUTO_REFRESH_RETRY_MS = 60 * 1000

/** Retry delay after `attempts` refreshes for the same fetchedAt: 1, 2, 4, 8 min… capped at 15 min. */
export function autoRefreshBackoffMs(attempts: number): number {
  return Math.min(AUTO_REFRESH_RETRY_MS * 2 ** Math.max(0, attempts - 1), AUTO_REFRESH_MS)
}

/**
 * Time-based backoff instead of a one-shot latch (CR-01). ISR is stale-while-revalidate: the
 * first router.refresh() after an idle period can return the very same stale entry while the
 * regeneration runs in the background, so a later retry must still be allowed.
 * `attempts` = refreshes already made for the current fetchedAt; `sinceLastMs` = time since
 * the last one.
 */
export function shouldTriggerAutoRefresh({
  ageMs,
  attempts,
  sinceLastMs,
}: {
  ageMs: number
  attempts: number
  sinceLastMs: number
}): boolean {
  if (!shouldAutoRefresh(ageMs)) return false
  if (attempts <= 0) return true
  return sinceLastMs >= autoRefreshBackoffMs(attempts)
}
