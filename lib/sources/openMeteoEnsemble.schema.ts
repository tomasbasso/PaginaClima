// zod schema for the Open-Meteo ensemble (ECMWF ENS). No server-only: testable in isolation.
// Columns are dynamic per member, so the blocks are loose and a refine checks them. sameLengthAsTime
// walks every entry of the block, so the member columns are covered without another length check.
import { z } from 'zod'
import { TZ } from '@/lib/config'
import { MEMBER_RAIN } from '@/lib/forecast/ensemble'
import { localDT, nums, sameLengthAsTime } from './openMeteoForecast.schema'

/** 51 are expected; below this the "real count" would no longer be a real ensemble. */
const MIN_MEMBER_COLUMNS = 40
const DAILY_TEMPERATURE = /^temperature_2m_(max|min)(_member\d{2})?$/

export const EnsembleDto = z
  .object({
    timezone: z.literal(TZ),
    hourly: z.looseObject({ time: z.array(localDT) }).superRefine(sameLengthAsTime),
    daily: z.looseObject({ time: z.array(z.iso.date()) }).superRefine(sameLengthAsTime),
  })
  .superRefine((dto, ctx) => {
    const checkColumns = (block: 'hourly' | 'daily', pattern: RegExp): number => {
      const columns = Object.entries(dto[block]).filter(([key]) => pattern.test(key))
      for (const [key, value] of columns) {
        if (!nums.safeParse(value).success) {
          ctx.addIssue({ code: 'custom', path: [block, key], message: `${key} is not numeric` })
        }
      }
      return columns.length
    }

    const members = checkColumns('hourly', MEMBER_RAIN)
    if (members < MIN_MEMBER_COLUMNS) {
      ctx.addIssue({
        code: 'custom',
        path: ['hourly'],
        message: `${members} member columns, expected at least ${MIN_MEMBER_COLUMNS}`,
      })
    }
    checkColumns('daily', DAILY_TEMPERATURE)
  })

export type EnsembleDto = z.infer<typeof EnsembleDto>
