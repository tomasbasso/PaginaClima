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
