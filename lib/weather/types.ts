// WeatherSnapshot contract: the single shape consumed by the page, /api/weather,
// the service worker (phase 6) and the alerts cron (phase 7).

export type SourceId = 'open-meteo' | 'met-norway'

/** 'stale' = a refresh attempt actually failed (never mere age). */
export type SourceStatus = 'ok' | 'stale' | 'error'

export interface SourceInfo {
  id: SourceId
  status: SourceStatus
  fetchedAt: string | null
  errorCode?: string
}

export interface NowData {
  time: string // ISO with -03:00 offset
  tempC: number
  feelsC: number
  humidityPct: number
  pressureHpa: number // pressure_msl
  windKmh: number
  gustKmh: number
  windDirDeg: number
  weatherCode: number
  isDay: 0 | 1
  precipMm: number
}

export interface HourlyPoint {
  time: string
  tempC: number | null
  feelsC: number | null
  precipMm: number | null
  weatherCode: number | null
  windKmh: number | null
  gustKmh: number | null
  windDirDeg: number | null
  humidityPct: number | null
  isDay: number | null
}

export interface DailyPoint {
  date: string // local key "YYYY-MM-DD", taken verbatim from daily.time
  weatherCode: number | null
  tMaxC: number | null
  tMinC: number | null
  precipSumMm: number | null
  sunrise: string
  sunset: string
  gustMaxKmh: number | null
}

export interface WeatherSnapshot {
  generatedAt: string // ISO UTC, Date.now() at build of the snapshot
  now: NowData | null
  hourly48: HourlyPoint[]
  daily: DailyPoint[]
  sources: SourceInfo[] // sources[0] is always 'open-meteo'
}
