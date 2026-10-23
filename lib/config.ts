// Fixed location and data-layer constants. Pure: safe to import from tests and client code.

export const LAT = -36.23
export const LON = -64.23
export const ALTITUDE_M = 169
export const TZ = 'America/Argentina/Buenos_Aires'

/** Cache lifetimes in seconds (D-07). MET 2100 s lands after its ~1815 s `Expires`. */
export const TTL = {
  openMeteoForecast: 900,
  metNorway: 2100,
  page: 600,
} as const

/** Identifies the app to upstream APIs. Repo URL only, no personal contact committed (D-12). */
export const USER_AGENT =
  process.env.WEATHER_USER_AGENT ?? 'ClimaWinifreda/1.0 github.com/tomasbasso/PaginaClima'

/** One call, best-match model: current + 48 h hourly + 14 days daily (D-04). */
export const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
  latitude: String(LAT),
  longitude: String(LON),
  current: [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'pressure_msl',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'weather_code',
    'is_day',
    'precipitation',
  ].join(','),
  hourly: [
    'temperature_2m',
    'apparent_temperature',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'relative_humidity_2m',
    'is_day',
  ].join(','),
  daily: [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'sunrise',
    'sunset',
    'wind_gusts_10m_max',
  ].join(','),
  forecast_hours: '48',
  forecast_days: '14',
  timezone: TZ,
  wind_speed_unit: 'kmh',
}).toString()}`
