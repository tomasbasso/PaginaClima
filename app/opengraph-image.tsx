// /opengraph-image: 1200×630 share card with the current weather, inherited by /pronostico and
// /cielo. Never fails (T-SEO-02): the snapshot read is guarded, ogSummary is null-safe, and the
// default ImageResponse font is used (no runtime font fetch). revalidate keeps crawlers on the
// cache, not upstream. Node runtime (default).
import { ImageResponse } from 'next/og'
import { ogSummary } from '@/lib/seo'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'

export const revalidate = 600
export const alt = 'Clima actual en Winifreda, La Pampa: temperatura y estado del cielo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#f1ead8'

export default async function OpengraphImage() {
  const now = new Date()
  let summary = ogSummary({ now: null }, now)
  try {
    summary = ogSummary(await getWeatherSnapshot(), now)
  } catch {
    // keep the fallback card
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '64px 80px',
          color: INK,
          background:
            'linear-gradient(180deg, #0e131c 0%, #1b2a4a 52%, #3d4f78 80%, #c98a5e 100%)',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, opacity: 0.8 }}>
          CLIMA WINIFREDA
        </div>
        {summary.temp ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
            <div style={{ display: 'flex', fontSize: 52 }}>{summary.place}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', fontSize: 220, lineHeight: 1, letterSpacing: -6 }}>
                {summary.temp}
              </div>
              {summary.label ? (
                <div style={{ display: 'flex', fontSize: 48, marginLeft: 40, marginBottom: 36 }}>
                  {summary.label}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 120 }}>
            <div style={{ display: 'flex', fontSize: 96 }}>{summary.place}</div>
            <div style={{ display: 'flex', fontSize: 44, opacity: 0.8 }}>La Pampa, Argentina</div>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: 90,
            display: 'flex',
            background: '#0a0e15',
            borderTop: '3px solid rgba(241, 234, 216, 0.55)',
          }}
        />
      </div>
    ),
    size,
  )
}
