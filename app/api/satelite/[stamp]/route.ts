// GOES-East IR frame for /cielo (D-07, SAT-01). The client only ever asks for this URL, never
// NASA. The stamp is untrusted input: parseStamp is a strict allowlist (format, 10-min grid,
// 24 h window) and an invalid one is a 404 without any fetch (T-05-11, T-05-12). Host, layer and
// bbox are fixed server-side. A stamp never changes its image, so the CDN keeps it immutable.
// No `export const revalidate`: caching is controlled by the response headers.
import { parseStamp } from '@/lib/satellite/frame'
import { getSatelliteFrame } from '@/lib/sources/gibs'

// Buffer + the shared Data Cache entry need the Node runtime.
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(_req: Request, { params }: { params: Promise<{ stamp: string }> }) {
  const raw = (await params).stamp.replace(/\.jpg$/, '')
  if (!parseStamp(raw, Date.now())) return new Response(null, { status: 404, headers: NO_STORE })

  try {
    const frame = await getSatelliteFrame(raw)
    return new Response(Buffer.from(frame.data.b64, 'base64'), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    // Coarse status only, no upstream detail (T-05-16).
    return new Response(null, { status: 502, headers: NO_STORE })
  }
}
