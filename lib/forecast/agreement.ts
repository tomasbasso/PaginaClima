// Agreement between independent models (D-13, MODL-02). Pure. Compares the maximum, the minimum and
// rain of at least 1 mm; never the weather code. Values per model stay in the adapter's cache.
import { VOTING_MODELS } from '@/lib/config'
import { RAIN_DAY_MM } from '@/lib/rain/lastRain'
import { localDayRain } from './localDayRain'

export type Verdict = 'coinciden' | 'dudan' | 'desacuerdo' | 'solo' | 'sinDato'

/** One model on one day. Carries no model id: only the verdict leaves the server (D-18). */
export interface ModelVote {
  tMaxC: number
  tMinC: number
  rainMm: number
}

export interface ModelsDay {
  date: string
  votes: ModelVote[]
}

/**
 * [coinciden up to, desacuerdo above], in °C of range per number of voters. These are the values D-13
 * leaves to calibrate, measured on 12 months of past runs at the Winifreda grid point against ERA5
 * (RESEARCH, assumption A6). Its single 3/6 °C pair was too strict and biased by the voter count:
 * "coinciden" jumped from 9 % to 33 % just where only 2 models remain. Change them here only.
 * Infinity: with 2 models there is never a disagreement (D-14).
 */
export const AGREEMENT_C: Record<2 | 3 | 4, readonly [number, number]> = {
  4: [5, 9],
  3: [4, 7.5],
  2: [2.5, Infinity],
}

/** One decimal, like the data: 16.1 − 12.1 is 4.000000000000002 and would miss the edge (Pitfall 3). */
const round1 = (n: number) => Math.round(n * 10) / 10

const range = (values: number[]) => round1(Math.max(...values) - Math.min(...values))

/**
 * Never a false agreement (D-14): one voter is 'solo' and none is 'sinDato'. The wider of the two
 * temperature ranges decides. With 3 voters rain cannot split in halves, so only temperature can
 * reach 'desacuerdo' there, which is the literal reading of D-13. A voter count with no thresholds is
 * 'sinDato': this runs outside the allSettled that isolates source failures, so it must never throw.
 */
export function verdictFor(votes: ModelVote[]): Verdict {
  const n = votes.length
  if (n === 0) return 'sinDato'
  if (n === 1) return 'solo'
  const thresholds: readonly [number, number] | undefined = AGREEMENT_C[n as keyof typeof AGREEMENT_C]
  if (!thresholds) return 'sinDato'
  const [agreeUpToC, disagreeAboveC] = thresholds
  const spread = Math.max(range(votes.map((v) => v.tMaxC)), range(votes.map((v) => v.tMinC)))
  const wet = votes.filter((v) => v.rainMm >= RAIN_DAY_MM).length
  if (n > 2 && (wet * 2 === n || spread > disagreeAboveC)) return 'desacuerdo'
  const unanimous = wet === 0 || wet === n
  return unanimous && spread <= agreeUpToC ? 'coinciden' : 'dudan'
}

type Block = { time: string[]; [column: string]: unknown }

/** Column names of one model in a multi-model response. */
export function modelColumns(model: string) {
  return {
    rain: `precipitation_${model}`,
    tMax: `temperature_2m_max_${model}`,
    tMin: `temperature_2m_min_${model}`,
  }
}

const valueAt = (block: Block, column: string, row: number): unknown =>
  (block[column] as unknown[] | undefined)?.[row]

/**
 * Takes the loose blocks of the validated DTO. A model votes on a day only with the maximum, the
 * minimum and the 24 hours of rain present, so horizons are read from the data and can move between
 * runs. Days nobody votes on are left out, like the unfinished day 15.
 */
export function aggregateModels(hourly: Block, daily: Block): ModelsDay[] {
  const models = VOTING_MODELS.map((model) => {
    const columns = modelColumns(model)
    const rain = hourly[columns.rain] as Array<number | null> | undefined
    return { ...columns, rainByDay: rain ? localDayRain(hourly.time, rain) : new Map<string, number>() }
  })

  const out: ModelsDay[] = []
  daily.time.forEach((date, row) => {
    const votes: ModelVote[] = []
    for (const model of models) {
      const tMaxC = valueAt(daily, model.tMax, row)
      const tMinC = valueAt(daily, model.tMin, row)
      const rainMm = model.rainByDay.get(date)
      if (typeof tMaxC === 'number' && typeof tMinC === 'number' && rainMm !== undefined) {
        votes.push({ tMaxC, tMinC, rainMm })
      }
    }
    if (votes.length > 0) out.push({ date, votes })
  })
  return out
}
