import { Ahora } from '@/components/Ahora'
import { Hero } from '@/components/Hero'
import { buildHeadline } from '@/lib/forecast/headline'
import { skyFromSnapshot } from '@/lib/sky/state'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'
import { selectAhoraVariant } from '@/lib/weather/status'

export const revalidate = 600

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

  return (
    <Hero sky={sky}>
      <Ahora snapshot={snapshot} renderedAt={renderedAt} variant={variant} headline={headline} />
    </Hero>
  )
}
