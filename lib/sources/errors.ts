import type { SourceId } from '@/lib/weather/types'

/** Value stored in the Data Cache by every source adapter. Plain JSON only (no Date objects). */
export type Cached<T> = { data: T; fetchedAt: string }

/**
 * Coarse upstream failure. `code` is one of 'network' | 'timeout' | `http_${status}` | 'schema'.
 * Never carries upstream `reason` text or stacks: those stay in server logs (ASVS V7).
 */
export class SourceError extends Error {
  readonly source: SourceId
  readonly code: string

  constructor(source: SourceId, code: string) {
    super(`${source}: ${code}`)
    this.name = 'SourceError'
    this.source = source
    this.code = code
  }
}
