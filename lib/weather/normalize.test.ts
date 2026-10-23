import { describe, expect, it } from 'vitest'
import fixture from '@/lib/sources/__fixtures__/open-meteo-forecast.json'
import { ForecastDto } from '@/lib/sources/openMeteoForecast.schema'
import { withOffset } from '@/lib/time'
import { normalizeForecast } from './normalize'

describe('normalizeForecast with the real fixture (NOW-01, DATA-04)', () => {
  const dto = ForecastDto.parse(fixture)
  const { now, hourly48, daily } = normalizeForecast(dto)
  const c = dto.current

  it('maps current fields', () => {
    expect(now).not.toBeNull()
    expect(now!.tempC).toBe(c.temperature_2m)
    expect(now!.feelsC).toBe(c.apparent_temperature)
    expect(now!.humidityPct).toBe(c.relative_humidity_2m)
    expect(now!.windKmh).toBe(c.wind_speed_10m)
    expect(now!.gustKmh).toBe(c.wind_gusts_10m)
    expect(now!.windDirDeg).toBe(c.wind_direction_10m)
    expect(now!.weatherCode).toBe(c.weather_code)
  })

  it('uses pressure_msl, not surface pressure', () => {
    expect(now!.pressureHpa).toBe(c.pressure_msl)
  })

  it('attaches the -03:00 offset to times', () => {
    expect(now!.time).toBe(withOffset(c.time, -10800))
    expect(now!.time.endsWith('-03:00')).toBe(true)
    expect(hourly48).toHaveLength(48)
    expect(hourly48[0].time.endsWith('-03:00')).toBe(true)
    expect(daily[0].date).toBe(dto.daily.time[0])
    expect(daily[0].sunrise.endsWith('-03:00')).toBe(true)
  })

  it('preserves hourly nulls instead of coercing to 0', () => {
    const copy = structuredClone(fixture) as typeof fixture
    ;(copy.hourly.temperature_2m as (number | null)[])[5] = null
    const r = normalizeForecast(ForecastDto.parse(copy))
    expect(r.hourly48[5].tempC).toBeNull()
  })
})
