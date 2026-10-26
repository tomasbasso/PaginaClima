import { Ahora } from '@/components/Ahora'
import { Hero } from '@/components/Hero'
import { MeteogramSection } from '@/components/MeteogramSection'
import { buildHeadline } from '@/lib/forecast/headline'
import { selectFutureHours } from '@/lib/forecast/hours'
import { HOME_TITLE, SITE_DESCRIPTION, buildJsonLd, pageMetadata, serializeJsonLd } from '@/lib/seo'
import { skyFromSnapshot } from '@/lib/sky/state'
import { localDateKey } from '@/lib/time'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'
import { selectAhoraVariant } from '@/lib/weather/status'

export const revalidate = 600

export const metadata = pageMetadata({
  path: '/',
  title: { absolute: HOME_TITLE },
  description: SITE_DESCRIPTION,
})

// Never fails: getWeatherSnapshot() resolves even with every source down, so the build and ISR
// regenerations survive upstream outages (DATA-03). Without `now` the sky uses the solar phase.
export default async function Page() {
  const snapshot = await getWeatherSnapshot()
  const now = new Date() // server render instant (ISR)
  const renderedAt = now.toISOString()
  // Recomputed on every ISR render, so it follows the forecast (D-16). null → no slot (D-13).
  const headline = buildHeadline(snapshot, now) ?? undefined
  const sky = skyFromSnapshot(snapshot, now)
  const variant = selectAhoraVariant(snapshot)

  // Meteogram under the horizon (D-01); hidden when Ahora is empty: one error message per screen.
  const below = snapshot.now ? (
    <MeteogramSection points={selectFutureHours(snapshot.hourly48, now)} todayKey={localDateKey(now)} />
  ) : undefined

  // JSON-LD dated by the forecast fetch; only our constants + an ISO date, '<' escaped (T-SEO-01).
  const jsonLd = serializeJsonLd(
    buildJsonLd({ dateModified: snapshot.sources[0]?.fetchedAt ?? snapshot.generatedAt }),
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Hero sky={sky} below={below}>
        <Ahora snapshot={snapshot} renderedAt={renderedAt} variant={variant} headline={headline} />
      </Hero>
    </>
  )
}
