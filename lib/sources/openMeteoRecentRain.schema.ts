// zod schema for the Open-Meteo forecast with past_days (hourly rain). No server-only.
import { z } from 'zod'
import { TZ } from '@/lib/config'
import { localDT, nums, sameLengthAsTime } from './openMeteoForecast.schema'

export const RecentRainDto = z.object({
  utc_offset_seconds: z.number().int(),
  timezone: z.literal(TZ),
  hourly: z
    .object({
      time: z.array(localDT),
      precipitation: nums,
    })
    .superRefine(sameLengthAsTime),
})

export type RecentRainDto = z.infer<typeof RecentRainDto>
