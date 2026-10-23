// zod schema for the Open-Meteo forecast response. No server-only: testable in isolation.
import { z } from 'zod'
import { TZ } from '@/lib/config'

const localDT = z.iso.datetime({ local: true }) // "2026-10-23T12:00" (naive local time)
const nums = z.array(z.number().nullable())
/** Secondary current fields: Open-Meteo sometimes sends a lone null (WR-09); not a schema change. */
const optNum = z.number().nullable()

/**
 * Parallel arrays must all match `time` (WR-03). Shorter arrays would otherwise turn into
 * silent nulls (or "undefined-03:00" for sunrise/sunset): fail loudly with 'schema' instead.
 */
function sameLengthAsTime(block: { time: unknown[] } & Record<string, unknown>, ctx: z.RefinementCtx) {
  for (const [key, value] of Object.entries(block)) {
    if (key !== 'time' && Array.isArray(value) && value.length !== block.time.length) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: `${key} has ${value.length} items, time has ${block.time.length}`,
      })
    }
  }
}

export const ForecastDto = z.object({
  utc_offset_seconds: z.number().int(),
  timezone: z.literal(TZ),
  current: z.object({
    time: localDT,
    interval: z.number(),
    // Strict: without these there is no "Ahora" worth showing.
    temperature_2m: z.number(),
    weather_code: z.number().int(),
    is_day: z.union([z.literal(0), z.literal(1)]),
    // Secondary: a null renders as "—" instead of discarding the whole response.
    apparent_temperature: optNum,
    relative_humidity_2m: optNum,
    pressure_msl: optNum,
    wind_speed_10m: optNum,
    wind_gusts_10m: optNum,
    wind_direction_10m: optNum,
    precipitation: optNum,
  }),
  hourly: z.object({
    time: z.array(localDT),
    temperature_2m: nums,
    apparent_temperature: nums,
    precipitation: nums,
    weather_code: nums,
    wind_speed_10m: nums,
    wind_gusts_10m: nums,
    wind_direction_10m: nums,
    relative_humidity_2m: nums,
    is_day: nums,
  }).superRefine(sameLengthAsTime),
  daily: z.object({
    time: z.array(z.iso.date()),
    weather_code: nums,
    temperature_2m_max: nums,
    temperature_2m_min: nums,
    precipitation_sum: nums,
    sunrise: z.array(localDT),
    sunset: z.array(localDT),
    wind_gusts_10m_max: nums,
  }).superRefine(sameLengthAsTime),
})

export type ForecastDto = z.infer<typeof ForecastDto>
