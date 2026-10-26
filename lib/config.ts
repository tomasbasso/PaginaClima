// Fixed location and data-layer constants. Pure: safe to import from tests and client code.

export const LAT = -36.23
export const LON = -64.23
export const ALTITUDE_M = 169
export const TZ = 'America/Argentina/Buenos_Aires'

export const DEFAULT_SITE_URL = 'https://clima-winifreda.vercel.app'

/** Same fallback rule as resolveUserAgent; trailing slashes are stripped so paths join cleanly. */
export function resolveSiteUrl(raw: string | undefined): string {
  return (raw?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '')
}

/** Canonical origin. NEXT_PUBLIC_ so it is inlined at build and identical on server and client. */
export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
export const SITE_NAME = 'Clima Winifreda'

/**
 * Exact town coordinates, only for schema.org markup. LAT/LON above stay at 2 decimals on
 * purpose (MET Norway ToS) and are what every upstream request uses.
 */
export const SCHEMA_GEO = { latitude: -36.2269, longitude: -64.2339 } as const

/** Cache lifetimes in seconds (D-07). MET 2100 s lands after its ~1815 s `Expires`. */
export const TTL = {
  openMeteoForecast: 900,
  metNorway: 2100,
  page: 600,
  /** ERA5 updates once a day: 6 h keeps the ~455-day archive request cheap (D-10). */
  openMeteoArchive: 21_600,
  openMeteoRecentRain: 1_800,
  /** Latest GOES-East pass (DescribeDomains + blank-step fallback); new passes every 10 min (D-07). */
  gibsLatest: 600,
  /** One frame per stamp never changes: 1 day in the Data Cache, the CDN keeps it immutable. */
  gibsFrame: 86_400,
} as const

export const DEFAULT_USER_AGENT = 'ClimaWinifreda/1.0 github.com/tomasbasso/PaginaClima'

/**
 * Empty or whitespace-only overrides fall back to the default (WR-02): dotenv loads
 * `WEATHER_USER_AGENT=` as '', and MET Norway rejects requests without an identifying UA.
 */
export function resolveUserAgent(raw: string | undefined): string {
  return raw?.trim() || DEFAULT_USER_AGENT
}

/** Identifies the app to upstream APIs. Repo URL only, no personal contact committed (D-12). */
export const USER_AGENT = resolveUserAgent(process.env.WEATHER_USER_AGENT)

/**
 * MET Norway compact (D-05, 2nd source, not displayed in phase 1). ToS: ≤ 4 decimals, so 2 here.
 * If-Modified-Since is deliberately not sent: not implementable inside unstable_cache, and the
 * ToS only recommends it; the 2100 s TTL already exceeds MET's ~30 min `Expires`.
 */
export const MET_NORWAY_URL = `https://api.met.no/weatherapi/locationforecast/2.0/compact?${new URLSearchParams(
  { lat: LAT.toFixed(2), lon: LON.toFixed(2), altitude: String(ALTITUDE_M) },
).toString()}`

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

/**
 * ERA5 daily rain (D-10). `models: 'era5'` explicitly: best_match on the archive is IFS HRES
 * (includes forecast hours of today) and would not be coherent with the ERA5 1991–2020 normal.
 * `end` must be ≤ today ART or the archive answers 400 (RESEARCH Pitfall 5).
 */
export function openMeteoArchiveUrl(start: string, end: string): string {
  return `https://archive-api.open-meteo.com/v1/archive?${new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    start_date: start,
    end_date: end,
    daily: 'precipitation_sum',
    models: 'era5',
    timezone: TZ,
  }).toString()}`
}

/** Hourly rain of the last 14 days + today, to fill the days ERA5 does not cover yet (D-10). */
export const OPEN_METEO_RECENT_RAIN_URL = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
  latitude: String(LAT),
  longitude: String(LON),
  hourly: 'precipitation',
  past_days: '14',
  forecast_days: '1',
  timezone: TZ,
}).toString()}`

/**
 * GOES-East clean IR (10.3 µm, band 13) on NASA GIBS (D-07, SAT-01). The old name
 * `…_v0_NRT_ZENJPEG` no longer exists (verified in GetCapabilities 2026-10-25).
 */
export const GIBS_LAYER = 'GOES-East_ABI_Band13_Clean_Infrared'

/** EPSG:3857 bbox (minx, miny, maxx, maxy): 800 km on a side, centered on Winifreda. */
export const GIBS_BBOX_3857 = [-7645928, -4828193, -6654173, -3836438] as const

export const SATELLITE_SIZE_PX = 720
export const SATELLITE_SIDE_KM = 800

/** External link only (SAT-02): nothing from the SMN is scraped or embedded. */
export const SMN_RADAR_URL = 'https://www.smn.gob.ar/radar'
