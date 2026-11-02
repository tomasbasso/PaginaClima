// Which notice goes above the daily list when a confidence source fails (D-17, UI-SPEC "Fallas por
// fuente"). Pure, because the page has no tests. Only local copy and a formatted hour reach the
// screen: errorCode and anything else from upstream never do. The main source is not looked at: its
// notice lives in the header and stays independent.
import { formatHHmm } from '@/lib/time'
import type { SourceInfo } from '@/lib/weather/types'

type Health = { kind: 'ok' } | { kind: 'error' } | { kind: 'stale'; fetchedMs: number }

/** A source missing from the list has not failed. A stale one with no usable date has nothing to cite. */
function healthOf(sources: SourceInfo[], id: SourceInfo['id']): Health {
  const source = sources.find((s) => s.id === id)
  if (!source || source.status === 'ok') return { kind: 'ok' }
  if (source.status === 'error') return { kind: 'error' }
  const fetchedMs = source.fetchedAt === null ? NaN : Date.parse(source.fetchedAt)
  return Number.isNaN(fetchedMs) ? { kind: 'error' } : { kind: 'stale', fetchedMs }
}

const hhmm = (ms: number) => formatHHmm(new Date(ms))

export function confidenceNotice(sources: SourceInfo[]): string | null {
  const ensemble = healthOf(sources, 'open-meteo-ensemble')
  const models = healthOf(sources, 'open-meteo-models')

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
    return `No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, de las ${hhmm(Math.min(ensemble.fetchedMs, models.fetchedMs))}.`
  }
  if (ensemble.kind === 'stale') {
    return `No pudimos actualizar la probabilidad de lluvia. Te mostramos la última que tenemos, de las ${hhmm(ensemble.fetchedMs)}.`
  }
  if (models.kind === 'stale') {
    return `No pudimos actualizar la comparación entre modelos. Te mostramos la última que tenemos, de las ${hhmm(models.fetchedMs)}.`
  }
  return null
}
