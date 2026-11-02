// Agreement between independent models (D-13, MODL-02). Pure. Compares the maximum, the minimum and
// rain of at least 1 mm; never the weather code. Values per model stay in the adapter's cache.
import { VOTING_MODELS } from '@/lib/config'
import { localDayRain } from './localDayRain'

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
