// Satellite geometry, stamps and texts (D-07, SAT-01). Pure: no fetch, no Date.now().
// Everything the server and the page need to pick, validate and label a GOES-East IR pass.
import { GIBS_BBOX_3857, GIBS_LAYER, LAT, LON, SATELLITE_SIZE_PX } from '@/lib/config'
import { formatHHmm, localDateKey } from '@/lib/time'

/** The black 720² JPEG GIBS returns for a step it does not have yet weighs 3 321 B (Pitfall 1). */
export const BLANK_MAX_BYTES = 8_000
/** A real frame weighs 19–46 KB; anything over 1 MB is not what we asked for. */
export const FRAME_MAX_BYTES = 1_000_000
/** UI-SPEC: past 90 min the time label turns peach. */
export const STALE_AFTER_MIN = 90

const STEP_MS = 600_000
const DAY_MS = 86_400_000
const R = 6_378_137 // Web Mercator sphere radius

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

function isoFromParts(y: number, mo: number, d: number, h: number, mi: number): string {
  return `${pad(y, 4)}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00Z`
}

/** '2026-10-25T13:20:00Z' → '20261025T1320Z'. */
export function stampFromIso(iso: string): string {
  const t = new Date(iso)
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}Z`
}

/** '20261025T1320Z' → '2026-10-25T13:20:00Z' (no validation: use parseStamp for input). */
export function isoFromStamp(stamp: string): string {
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:00Z`
}

/**
 * Strict allowlist for the untrusted route segment (T-05-11): exact format, 10-min grid, a real
 * calendar instant and now − 24 h ≤ t ≤ now. The ISO is rebuilt from the parsed numbers, never
 * from the raw string. Returns null on anything else.
 */
export function parseStamp(stamp: string, nowMs: number): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})Z$/.exec(stamp)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  if (mi % 10 !== 0) return null
  const t = Date.UTC(y, mo - 1, d, h, mi)
  const iso = isoFromParts(y, mo, d, h, mi)
  // Date.UTC rolls 2026-13-32 over silently: re-serialize and compare to reject it.
  if (!Number.isFinite(t) || new Date(t).toISOString() !== iso.replace(':00Z', ':00.000Z')) return null
  if (t > nowMs || t < nowMs - DAY_MS) return null
  return iso
}

export type MarkerPosition = { x: number; y: number }

/** Fractions (0–1) of the bbox, x to the right and y downward, via Web Mercator. */
export function markerPosition(
  lat: number,
  lon: number,
  bbox: readonly [number, number, number, number],
): MarkerPosition {
  const [minx, miny, maxx, maxy] = bbox
  const mx = (R * lon * Math.PI) / 180
  const my = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
  return { x: (mx - minx) / (maxx - minx), y: (maxy - my) / (maxy - miny) }
}

/** WMS GetMap: one 720² JPEG already cropped to the bbox. Always with an explicit TIME. */
export function gibsWmsUrl(timeIso: string): string {
  return `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?${new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: GIBS_LAYER,
    STYLES: '',
    CRS: 'EPSG:3857',
    BBOX: GIBS_BBOX_3857.join(','),
    WIDTH: String(SATELLITE_SIZE_PX),
    HEIGHT: String(SATELLITE_SIZE_PX),
    FORMAT: 'image/jpeg',
    TIME: timeIso,
  }).toString()}`
}

/**
 * WMTS DescribeDomains for the last 3 h. CloudFront caches it 30 min, so the window end is
 * rounded to the current 10-min bucket and the URL changes every step (Pitfall 12).
 */
export function gibsDomainsUrl(nowMs: number): string {
  const endMs = Math.floor(nowMs / STEP_MS) * STEP_MS
  const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z')
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/${GIBS_LAYER}/default/GoogleMapsCompatible_Level6/all/${iso(endMs - 3 * 3_600_000)}--${iso(endMs)}.xml`
}

/** `<Domain>start/end/PT10M[,…]</Domain>` → end of the last range, or null. */
export function latestSlotFromDomains(xml: string): string | null {
  const m = /<Domain>([^<]{1,20000})<\/Domain>/.exec(xml)
  if (!m) return null
  const last = m[1].split(',').at(-1)?.trim() ?? ''
  const end = last.split('/')[1] ?? last.split('/')[0]
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/.test(end) ? end : null
}

export type SatelliteLatest = { stamp: string; timeISO: string }

export type SatelliteView = {
  src: string
  timeText: string
  stale: boolean
  alt: string
  marker: MarkerPosition
}

/** Copy of the UI-SPEC "Bloque 3 · Satélite" (sentence case; CSS uppercases the label). */
export function satelliteView(latest: SatelliteLatest | null, now: Date): SatelliteView | null {
  if (!latest) return null
  const t = new Date(latest.timeISO)
  const hhmm = formatHHmm(t)
  const yesterday = localDateKey(t) !== localDateKey(now)
  let timeText = yesterday ? `Imagen infrarroja de ayer a las ${hhmm}` : `Imagen infrarroja de las ${hhmm}`
  const ageMin = Math.floor((now.getTime() - t.getTime()) / 60_000)
  const stale = ageMin > STALE_AFTER_MIN
  if (stale) timeText += ageMin < 120 ? ` · hace ${ageMin} min` : ` · hace ${Math.floor(ageMin / 60)} h`
  return {
    src: `/api/satelite/${latest.stamp}.jpg`,
    timeText,
    stale,
    alt: `Imagen satelital infrarroja de La Pampa de las ${hhmm}, centrada en Winifreda`,
    marker: markerPosition(LAT, LON, GIBS_BBOX_3857),
  }
}
