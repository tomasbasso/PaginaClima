// One notice per screen: which copy goes for each combination of the two confidence sources (D-17).
import { describe, expect, it } from 'vitest'
import type { SourceInfo, SourceStatus } from '@/lib/weather/types'
import { confidenceNotice as build, type VisibleData } from './confidenceNotice'

const OLDER = '2026-10-23T12:40:00Z' // 09:40 in Argentina
const NEWER = '2026-10-23T15:05:00Z' // 12:05 in Argentina
const NOW = new Date('2026-10-23T18:00:00Z') // Same local day as both
const ALL_VISIBLE: VisibleData = { ensembleUp: true, modelsUp: true }

const notice = (list: SourceInfo[], now = NOW, visible = ALL_VISIBLE) => build(list, now, visible)

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
    expect(notice(sources(ens('ok'), mod('ok')))).toBeNull()
  })

  it('the contract rows', () => {
    expect(notice(sources(ens('error'), mod('ok')))).toBe(ENSEMBLE_DOWN)
    expect(notice(sources(ens('ok'), mod('error')))).toBe(MODELS_DOWN)
    expect(notice(sources(ens('stale'), mod('ok')))).toBe(ensembleStale('12:05'))
    expect(notice(sources(ens('ok'), mod('stale')))).toBe(modelsStale('12:05'))
    expect(notice(sources(ens('error'), mod('error')))).toBe(BOTH_DOWN)
  })

  it('error wins over stale: the copy names the source with nothing to show', () => {
    expect(notice(sources(ens('error'), mod('stale')))).toBe(ENSEMBLE_DOWN)
    expect(notice(sources(ens('stale'), mod('error')))).toBe(MODELS_DOWN)
  })

  it('stale and stale: one sentence with the oldest hour, whichever source holds it', () => {
    expect(notice(sources(ens('stale', OLDER), mod('stale', NEWER)))).toBe(bothStale('09:40'))
    expect(notice(sources(ens('stale', NEWER), mod('stale', OLDER)))).toBe(bothStale('09:40'))
  })

  it('a stale source without a usable fetchedAt counts as error and never throws', () => {
    expect(notice(sources(ens('stale', null), mod('ok')))).toBe(ENSEMBLE_DOWN)
    expect(notice(sources(ens('ok'), mod('stale', null)))).toBe(MODELS_DOWN)
    expect(notice(sources(ens('stale', 'no-date'), mod('ok')))).toBe(ENSEMBLE_DOWN)
    expect(notice(sources(ens('stale', null), mod('stale', null)))).toBe(BOTH_DOWN)
    expect(notice(sources(ens('stale', null), mod('stale', OLDER)))).toBe(ENSEMBLE_DOWN)
  })

  it('data from another local day says the date and the hour', () => {
    const nextDay = new Date('2026-10-24T18:00:00Z')
    expect(notice(sources(ens('stale'), mod('ok')), nextDay)).toBe(
      'No pudimos actualizar la probabilidad de lluvia. Te mostramos la última que tenemos, del 23/10 a las 12:05.',
    )
    expect(notice(sources(ens('ok'), mod('stale')), nextDay)).toBe(
      'No pudimos actualizar la comparación entre modelos. Te mostramos la última que tenemos, del 23/10 a las 12:05.',
    )
    expect(notice(sources(ens('stale', NEWER), mod('stale', OLDER)), nextDay)).toBe(
      'No pudimos actualizar la probabilidad de lluvia ni la comparación entre modelos. Te mostramos la última que tenemos, del 23/10 a las 09:40.',
    )
  })

  it('"today" is the day in Argentina, not in UTC', () => {
    const lateAtNight = '2026-10-24T02:59:00Z' // 23:59 on the 23rd
    expect(notice(sources(ens('stale', lateAtNight), mod('ok')), new Date('2026-10-24T03:01:00Z'))).toBe(
      'No pudimos actualizar la probabilidad de lluvia. Te mostramos la última que tenemos, del 23/10 a las 23:59.',
    )
    expect(notice(sources(ens('stale', lateAtNight), mod('ok')), new Date('2026-10-24T02:59:30Z'))).toBe(
      ensembleStale('23:59'),
    )
  })

  it('a stale source that covers no visible day uses the error copy', () => {
    const noEnsemble = { ensembleUp: false, modelsUp: true }
    const noModels = { ensembleUp: true, modelsUp: false }
    const nothing = { ensembleUp: false, modelsUp: false }
    expect(notice(sources(ens('stale'), mod('ok')), NOW, noEnsemble)).toBe(ENSEMBLE_DOWN)
    expect(notice(sources(ens('ok'), mod('stale')), NOW, noModels)).toBe(MODELS_DOWN)
    expect(notice(sources(ens('stale'), mod('stale')), NOW, nothing)).toBe(BOTH_DOWN)
    expect(notice(sources(ens('stale'), mod('stale')), NOW, noEnsemble)).toBe(ENSEMBLE_DOWN)
  })

  it('a stale source with a visible day keeps its copy, and an ok one without any is no failure', () => {
    const noModels = { ensembleUp: true, modelsUp: false }
    expect(notice(sources(ens('stale'), mod('ok')), NOW, noModels)).toBe(ensembleStale('12:05'))
    expect(notice(sources(ens('ok'), mod('ok')), NOW, { ensembleUp: false, modelsUp: false })).toBeNull()
  })

  it('the main source does not take part: its notice lives in the header', () => {
    const list = sources(ens('ok'), mod('ok'))
    list[0] = source('open-meteo', 'error', null)
    list[1] = source('met-norway', 'stale')
    expect(notice(list)).toBeNull()
  })

  it('a source missing from the list is not a failure', () => {
    expect(notice([source('open-meteo', 'ok')])).toBeNull()
    expect(notice([source('open-meteo', 'ok'), ens('error')])).toBe(ENSEMBLE_DOWN)
  })

  it('never reflects an upstream error code and no copy has an exclamation mark', () => {
    const statuses: SourceStatus[] = ['ok', 'stale', 'error']
    for (const a of statuses) {
      for (const b of statuses) {
        const list = sources(
          { ...ens(a), errorCode: 'http_500_secret' },
          { ...mod(b), errorCode: 'http_500_secret' },
        )
        const copy = notice(list) ?? ''
        expect(copy).not.toContain('!')
        expect(copy).not.toContain('secret')
      }
    }
  })
})
