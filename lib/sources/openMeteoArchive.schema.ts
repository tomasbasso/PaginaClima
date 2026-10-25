// zod schema for the Open-Meteo ERA5 archive (daily rain). No server-only: testable in isolation.
import { z } from 'zod'
import { TZ } from '@/lib/config'
import { nums, sameLengthAsTime } from './openMeteoForecast.schema'

export const ArchiveDto = z.object({
  utc_offset_seconds: z.number().int(),
  timezone: z.literal(TZ),
  daily: z
    .object({
      time: z.array(z.iso.date()),
      // A trailing null = local day ERA5 does not fully cover yet (D-10).
      precipitation_sum: nums,
    })
    .superRefine(sameLengthAsTime),
})

export type ArchiveDto = z.infer<typeof ArchiveDto>
