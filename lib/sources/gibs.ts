import 'server-only'
import { unstable_cache } from 'next/cache'
import { TTL, USER_AGENT } from '@/lib/config'
import {
  BLANK_MAX_BYTES,
  FRAME_MAX_BYTES,
  gibsDomainsUrl,
  gibsWmsUrl,
  isoFromStamp,
  latestSlotFromDomains,
  stampFromIso,
  type SatelliteLatest,
} from '@/lib/satellite/frame'
import { SourceError, type Cached } from './errors'

// NASA GIBS adapter (D-07, SAT-01). GIBS answers errors and missing steps with 200 (an XML
// ServiceException or a black 3 321 B JPEG), so every check throws INSIDE the cached functions:
// a bad answer is never stored (T-05-13). Logs carry no upstream text (T-05-16).

const DOMAINS_MAX_CHARS = 20_000
const STEP_MS = 600_000
/** T, T−10, T−20: the domain announces a step a few minutes before the WMS has it (Pitfall 1). */
const CANDIDATES = 3

export type SatelliteFrame = { b64: string; stamp: string }

async function gibsFetch(url: string, accept: string): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, Accept: accept },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    throw new SourceError(
      'nasa-gibs',
      name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    )
  }
  if (!res.ok) throw new SourceError('nasa-gibs', `http_${res.status}`)
  return res
}

/** One WMS GetMap for an already validated stamp. Render code goes through getSatelliteFrame. */
export async function fetchSatelliteFrameRaw(stamp: string): Promise<Cached<SatelliteFrame>> {
  const res = await gibsFetch(gibsWmsUrl(isoFromStamp(stamp)), 'image/jpeg')
  // Check the type before reading: a 200 text/xml is a ServiceException (Pitfall 2).
  if (!(res.headers.get('content-type') ?? '').startsWith('image/jpeg')) {
    throw new SourceError('nasa-gibs', 'schema')
  }
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length <= BLANK_MAX_BYTES) throw new SourceError('nasa-gibs', 'blank')
  if (bytes.length > FRAME_MAX_BYTES) throw new SourceError('nasa-gibs', 'schema')
  console.info('[upstream] nasa-gibs frame fetched')
  return { data: { b64: bytes.toString('base64'), stamp }, fetchedAt: new Date().toISOString() }
}

/**
 * One frame per stamp, shared by the page (which picks it) and /api/satelite (which serves it).
 * The key does not include the bbox: if GIBS_BBOX_3857 changes, bump 'v1' to 'v2'.
 */
export const getSatelliteFrame = unstable_cache(fetchSatelliteFrameRaw, ['gibs-frame', 'v1'], {
  revalidate: TTL.gibsFrame,
  tags: ['nasa-gibs'],
})

/**
 * Latest good pass: DescribeDomains for the last 3 h, then T, T−10, T−20. The first candidate
 * whose frame resolves wins, which also leaves its JPEG in the Data Cache for the route.
 */
export async function fetchSatelliteLatestRaw(nowMs: number): Promise<Cached<SatelliteLatest>> {
  const res = await gibsFetch(gibsDomainsUrl(nowMs), 'text/xml')
  const xml = await res.text()
  if (xml.length > DOMAINS_MAX_CHARS) throw new SourceError('nasa-gibs', 'schema')
  const latest = latestSlotFromDomains(xml)
  if (!latest) throw new SourceError('nasa-gibs', 'schema')

  const t = Date.parse(latest)
  for (let i = 0; i < CANDIDATES; i++) {
    const timeISO = new Date(t - i * STEP_MS).toISOString().replace('.000Z', 'Z')
    const stamp = stampFromIso(timeISO)
    try {
      await getSatelliteFrame(stamp)
      console.info('[upstream] nasa-gibs latest pass picked')
      return { data: { stamp, timeISO }, fetchedAt: new Date().toISOString() }
    } catch {
      // blank, XML or network for this step: try the previous one
    }
  }
  throw new SourceError('nasa-gibs', 'blank')
}

export const getSatelliteLatest = unstable_cache(
  () => fetchSatelliteLatestRaw(Date.now()),
  ['gibs-latest', 'v1'],
  { revalidate: TTL.gibsLatest, tags: ['nasa-gibs'] },
)

/**
 * Time-bucketed getter for readThrough. The execution instant is the fetch instant (that is
 * what DescribeDomains must see); `bucket` only separates the cache keys.
 */
export const getSatelliteLatestFresh = unstable_cache(
  (bucket: number) => {
    void bucket
    return fetchSatelliteLatestRaw(Date.now())
  },
  ['gibs-latest', 'v1', 'fresh'],
  { revalidate: TTL.gibsLatest, tags: ['nasa-gibs'] },
)
