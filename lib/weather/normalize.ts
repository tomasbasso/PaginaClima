// Open-Meteo DTO → snapshot parts. Pure. Every naive local time goes through withOffset.
import type { ForecastDto } from '@/lib/sources/openMeteoForecast.schema'
import { withOffset } from '@/lib/time'
import type { DailyPoint, HourlyPoint, NowData, WeatherSnapshot } from './types'

const at = (arr: (number | null)[], i: number): number | null => arr[i] ?? null

export function normalizeForecast(
  dto: ForecastDto,
): Pick<WeatherSnapshot, 'now' | 'hourly48' | 'daily'> {
  const off = dto.utc_offset_seconds
  const c = dto.current

  const now: NowData = {
    time: withOffset(c.time, off),
    tempC: c.temperature_2m,
    feelsC: c.apparent_temperature,
    humidityPct: c.relative_humidity_2m,
    pressureHpa: c.pressure_msl,
    windKmh: c.wind_speed_10m,
    gustKmh: c.wind_gusts_10m,
    windDirDeg: c.wind_direction_10m,
    weatherCode: c.weather_code,
    isDay: c.is_day,
    precipMm: c.precipitation,
  }

  const h = dto.hourly
  const hourly48: HourlyPoint[] = h.time.slice(0, 48).map((t, i) => ({
    time: withOffset(t, off),
    tempC: at(h.temperature_2m, i),
    feelsC: at(h.apparent_temperature, i),
    precipMm: at(h.precipitation, i),
    weatherCode: at(h.weather_code, i),
    windKmh: at(h.wind_speed_10m, i),
    gustKmh: at(h.wind_gusts_10m, i),
    windDirDeg: at(h.wind_direction_10m, i),
    humidityPct: at(h.relative_humidity_2m, i),
    isDay: at(h.is_day, i),
  }))

  const d = dto.daily
  const daily: DailyPoint[] = d.time.map((date, i) => ({
    date, // already the local key, never parsed
    weatherCode: at(d.weather_code, i),
    tMaxC: at(d.temperature_2m_max, i),
    tMinC: at(d.temperature_2m_min, i),
    precipSumMm: at(d.precipitation_sum, i),
    sunrise: withOffset(d.sunrise[i], off),
    sunset: withOffset(d.sunset[i], off),
    gustMaxKmh: at(d.wind_gusts_10m_max, i),
  }))

  return { now, hourly48, daily }
}
