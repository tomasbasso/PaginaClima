// One notice per screen: which copy goes for each combination of the two confidence sources (D-17).
import { describe, expect, it } from 'vitest'
import type { SourceInfo, SourceStatus } from '@/lib/weather/types'
import { confidenceNotice } from './confidenceNotice'

const OLDER = '2026-10-23T12:40:00Z' // 09:40 in Argentina
const NEWER = '2026-10-23T15:05:00Z' // 12:05 in Argentina

const ENSEMBLE_DOWN =
  'Ahora no tenemos la probabilidad de lluvia ni el rango de temperatura. El resto del pronóstico sigue al día.'
const MODELS_DOWN =
  'Ahora no podemos comparar los modelos, así que esta vez no hay rombos. El resto del pronóstico sigue al día.'
const BOTH_DOWN =
  'Ahora no tenemos la probabilidad de lluvia ni la comparación entre modelos. Te mostramos el pronóstico principal.'
const ensembleStale = (hhmm: string) =>
  `No pudimos actualizar la probabilidad de lluvia. Te mostramos la última que tenemos, de las ${hhmm}.`
const modelsStale = (hhmm: string) =>
  `No pudimos actualizar la comparación entre modelos. Te mostramos la última que tenemos, de las ${hhmm}.`
const bothStale = (hhmm: string) =>
  `No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, de las ${hhmm}.`

function source(id: SourceInfo['id'], status: SourceStatus, fetchedAt: string | null = NEWER): SourceInfo {
  return { id, status, fetchedAt }
}

const sources = (ensemble: SourceInfo, models: SourceInfo): SourceInfo[] => [
  source('open-meteo', 'ok'),
  source('met-norway', 'ok'),
  ensemble,
  models,
]
const ens = (status: SourceStatus, fetchedAt?: string | null) =>
  source('open-meteo-ensemble', status, status === 'error' && fetchedAt === undefined ? null : fetchedAt)
const mod = (status: SourceStatus, fetchedAt?: string | null) =>
  source('open-meteo-models', status, status === 'error' && fetchedAt === undefined ? null : fetchedAt)

describe('confidenceNotice', () => {
  it('both sources ok: no notice', () => {
    expect(confidenceNotice(sources(ens('ok'), mod('ok')))).toBeNull()
  })

  it('the contract rows', () => {
    expect(confidenceNotice(sources(ens('error'), mod('ok')))).toBe(ENSEMBLE_DOWN)
    expect(confidenceNotice(sources(ens('ok'), mod('error')))).toBe(MODELS_DOWN)
    expect(confidenceNotice(sources(ens('stale'), mod('ok')))).toBe(ensembleStale('12:05'))
    expect(confidenceNotice(sources(ens('ok'), mod('stale')))).toBe(modelsStale('12:05'))
    expect(confidenceNotice(sources(ens('error'), mod('error')))).toBe(BOTH_DOWN)
  })

  it('error wins over stale: the copy names the source with nothing to show', () => {
    expect(confidenceNotice(sources(ens('error'), mod('stale')))).toBe(ENSEMBLE_DOWN)
    expect(confidenceNotice(sources(ens('stale'), mod('error')))).toBe(MODELS_DOWN)
  })

  it('stale and stale: one sentence with the oldest hour, whichever source holds it', () => {
    expect(confidenceNotice(sources(ens('stale', OLDER), mod('stale', NEWER)))).toBe(bothStale('09:40'))
    expect(confidenceNotice(sources(ens('stale', NEWER), mod('stale', OLDER)))).toBe(bothStale('09:40'))
  })

  it('a stale source without a usable fetchedAt counts as error and never throws', () => {
    expect(confidenceNotice(sources(ens('stale', null), mod('ok')))).toBe(ENSEMBLE_DOWN)
    expect(confidenceNotice(sources(ens('ok'), mod('stale', null)))).toBe(MODELS_DOWN)
    expect(confidenceNotice(sources(ens('stale', 'no-date'), mod('ok')))).toBe(ENSEMBLE_DOWN)
    expect(confidenceNotice(sources(ens('stale', null), mod('stale', null)))).toBe(BOTH_DOWN)
    expect(confidenceNotice(sources(ens('stale', null), mod('stale', OLDER)))).toBe(ENSEMBLE_DOWN)
  })

  it('the main source does not take part: its notice lives in the header', () => {
    const list = sources(ens('ok'), mod('ok'))
    list[0] = source('open-meteo', 'error', null)
    list[1] = source('met-norway', 'stale')
    expect(confidenceNotice(list)).toBeNull()
  })

  it('a source missing from the list is not a failure', () => {
    expect(confidenceNotice([source('open-meteo', 'ok')])).toBeNull()
    expect(confidenceNotice([source('open-meteo', 'ok'), ens('error')])).toBe(ENSEMBLE_DOWN)
  })

  it('never reflects an upstream error code and no copy has an exclamation mark', () => {
    const statuses: SourceStatus[] = ['ok', 'stale', 'error']
    for (const a of statuses) {
      for (const b of statuses) {
        const list = sources(
          { ...ens(a), errorCode: 'http_500_secret' },
          { ...mod(b), errorCode: 'http_500_secret' },
        )
        const copy = confidenceNotice(list) ?? ''
        expect(copy).not.toContain('!')
        expect(copy).not.toContain('secret')
      }
    }
  })
})
