// zod schema for the Open-Meteo forecast response. No server-only: testable in isolation.
import { z } from 'zod'
import { TZ } from '@/lib/config'

const localDT = z.iso.datetime({ local: true }) // "2026-10-23T12:00" (naive local time)
const nums = z.array(z.number().nullable())

export const ForecastDto = z.object({
  utc_offset_seconds: z.number().int(),
  timezone: z.literal(TZ),
  current: z.object({
    time: localDT,
    interval: z.number(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    pressure_msl: z.number(),
    wind_speed_10m: z.number(),
    wind_gusts_10m: z.number(),
    wind_direction_10m: z.number(),
    weather_code: z.number().int(),
    is_day: z.union([z.literal(0), z.literal(1)]),
    precipitation: z.number(),
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
  }),
  daily: z.object({
    time: z.array(z.iso.date()),
    weather_code: nums,
    temperature_2m_max: nums,
    temperature_2m_min: nums,
    precipitation_sum: nums,
    sunrise: z.array(localDT),
    sunset: z.array(localDT),
    wind_gusts_10m_max: nums,
  }),
})

export type ForecastDto = z.infer<typeof ForecastDto>
