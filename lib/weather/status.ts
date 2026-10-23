// Source status and UI variant (D-02, RESEARCH Pattern 2 + checker revision). Pure.
// Status is outcome-based: 'stale' means a refresh attempt really failed. Age is NOT an input;
// the 30-min "Desactualizado" notice stays client-side and purely age-based (plan 05).
import type { SourceStatus, WeatherSnapshot } from './types'

export type AhoraVariant = 'normal' | 'loading' | 'degraded' | 'empty'

export function deriveSourceStatus(
  settled: PromiseSettledResult<{ refreshError?: string }>,
): SourceStatus {
  if (settled.status === 'rejected') return 'error'
  return settled.value.refreshError ? 'stale' : 'ok'
}

export function selectAhoraVariant(s: WeatherSnapshot): Exclude<AhoraVariant, 'loading'> {
  if (!s.now) return 'empty'
  return s.sources[0]?.status === 'ok' ? 'normal' : 'degraded'
}

/**
 * True when a /api/weather JSON body carries current data (WR-08). Takes `unknown` because it
 * reads a network response on the client; anything malformed counts as "no data".
 */
export function snapshotHasNow(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false
  const now = (json as { now?: unknown }).now
  return !!now && typeof now === 'object' && typeof (now as { tempC?: unknown }).tempC === 'number'
}
