// Which notice goes above the daily list when a confidence source fails (D-17, UI-SPEC "Fallas por
// fuente"). Pure, because the page has no tests. Only local copy and a formatted hour reach the
// screen: errorCode and anything else from upstream never do. The main source is not looked at: its
// notice lives in the header and stays independent.
import { formatDayMonth, formatHHmm, localDateKey } from '@/lib/time'
import type { SourceInfo } from '@/lib/weather/types'

type Health = { kind: 'ok' } | { kind: 'error' } | { kind: 'stale'; fetchedMs: number }

/** Whether each source has data on a visible day. Any row carries both flags (see DailyRow). */
export interface VisibleData {
  ensembleUp: boolean
  modelsUp: boolean
}

/**
 * A source missing from the list has not failed. A stale one counts as error when it has no usable
 * date to cite, or when its last good value covers no visible day: the page has nothing of it to show.
 */
function healthOf(sources: SourceInfo[], id: SourceInfo['id'], onScreen: boolean): Health {
  const source = sources.find((s) => s.id === id)
  if (!source || source.status === 'ok') return { kind: 'ok' }
  if (source.status === 'error' || !onScreen) return { kind: 'error' }
  const fetchedMs = source.fetchedAt === null ? NaN : Date.parse(source.fetchedAt)
  return Number.isNaN(fetchedMs) ? { kind: 'error' } : { kind: 'stale', fetchedMs }
}

/** The age of a last good value has no upper limit: an hour alone would read as today. */
function dataFrom(ms: number, now: Date): string {
  const fetched = new Date(ms)
  if (localDateKey(fetched) === localDateKey(now)) return `de las ${formatHHmm(fetched)}`
  return `del ${formatDayMonth(fetched)} a las ${formatHHmm(fetched)}`
}

export function confidenceNotice(sources: SourceInfo[], now: Date, visible: VisibleData): string | null {
  const ensemble = healthOf(sources, 'open-meteo-ensemble', visible.ensembleUp)
  const models = healthOf(sources, 'open-meteo-models', visible.modelsUp)

  if (ensemble.kind === 'error' && models.kind === 'error') {
    return 'Ahora no tenemos la probabilidad de lluvia ni la comparación entre modelos. Te mostramos el pronóstico principal.'
  }
  // Error wins over stale: the stale source still shows its full row, the other one shows nothing.
  if (ensemble.kind === 'error') {
    return 'Ahora no tenemos la probabilidad de lluvia ni el rango de temperatura. El resto del pronóstico sigue al día.'
  }
  if (models.kind === 'error') {
    return 'Ahora no podemos comparar los modelos, así que esta vez no hay rombos. El resto del pronóstico sigue al día.'
  }
  if (ensemble.kind === 'stale' && models.kind === 'stale') {
    // Outside the contract, built from the approved pieces. One hour only: the oldest is the honest one.
    return `No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, ${dataFrom(Math.min(ensemble.fetchedMs, models.fetchedMs), now)}.`
  }
  if (ensemble.kind === 'stale') {
    return `No pudimos actualizar la probabilidad de lluvia. Te mostramos la última que tenemos, ${dataFrom(ensemble.fetchedMs, now)}.`
  }
  if (models.kind === 'stale') {
    return `No pudimos actualizar la comparación entre modelos. Te mostramos la última que tenemos, ${dataFrom(models.fetchedMs, now)}.`
  }
  return null
}
