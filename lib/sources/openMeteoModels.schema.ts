// zod schema for the Open-Meteo multi-model forecast. No server-only: testable in isolation.
// Columns are dynamic per model, so the blocks are loose and a refine checks them. A missing model
// is not an error (it just does not vote), but at least one has to be usable.
import { z } from 'zod'
import { TZ, VOTING_MODELS } from '@/lib/config'
import { modelColumns } from '@/lib/forecast/agreement'
import { localDT, nums, sameLengthAsTime } from './openMeteoForecast.schema'

export const ModelsDto = z
  .object({
    timezone: z.literal(TZ),
    hourly: z.looseObject({ time: z.array(localDT) }).superRefine(sameLengthAsTime),
    daily: z.looseObject({ time: z.array(z.iso.date()) }).superRefine(sameLengthAsTime),
  })
  .superRefine((dto, ctx) => {
    const checkColumn = (block: 'hourly' | 'daily', key: string): boolean => {
      const value = dto[block][key]
      if (value === undefined) return false
      if (nums.safeParse(value).success) return true
      ctx.addIssue({ code: 'custom', path: [block, key], message: `${key} is not numeric` })
      return false
    }

    const usable = VOTING_MODELS.filter((model) => {
      const { rain, tMax, tMin } = modelColumns(model)
      // Not short-circuited: every column of every model gets its type checked.
      const present = [checkColumn('hourly', rain), checkColumn('daily', tMax), checkColumn('daily', tMin)]
      return present.every(Boolean)
    })
    if (usable.length === 0) {
      ctx.addIssue({ code: 'custom', path: [], message: 'no voting model has its three columns' })
    }
  })

export type ModelsDto = z.infer<typeof ModelsDto>
