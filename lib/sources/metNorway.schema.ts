// zod schema for MET Norway Locationforecast 2.0 compact. Only the fields we read are required;
// everything else is stripped (default behavior). No server-only: testable in isolation.
import { z } from 'zod'

export const MetDto = z.object({
  type: z.literal('Feature'),
  properties: z.object({
    meta: z.object({ updated_at: z.iso.datetime() }),
    timeseries: z
      .array(
        z.object({
          time: z.iso.datetime(), // UTC "Z"
          data: z.object({
            instant: z.object({
              details: z.object({ air_temperature: z.number() }),
            }),
          }),
        }),
      )
      .min(1),
  }),
})

export type MetDto = z.infer<typeof MetDto>
