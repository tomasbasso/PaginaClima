// /pronostico (FCST-02): compact sky with the header and title, the 120px Pampa horizon, and the
// 7/14-day list on ground. ISR over the same cached snapshot as the home: no query params (that
// would make the page dynamic and hit the cache per visit), never throws (DATA-03).
import { Hero } from '@/components/Hero'
import { NoData } from '@/components/NoData'
import { Pronostico } from '@/components/Pronostico'
import { DailyList } from '@/components/client/DailyList'
import { RetryButton } from '@/components/client/RetryButton'
import { buildDailyRows } from '@/lib/forecast/daily'
import { pageMetadata } from '@/lib/seo'
import { skyFromSnapshot } from '@/lib/sky/state'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'
import { selectAhoraVariant } from '@/lib/weather/status'

export const revalidate = 600

// Absolute titles (not the layout template) keep them within 60 chars.
export const metadata = pageMetadata({
  path: '/pronostico',
  title: { absolute: 'Pronóstico extendido en Winifreda, La Pampa' },
  description:
    'Pronóstico extendido de 7 a 14 días para Winifreda, La Pampa: máximas y mínimas, lluvia prevista y ráfagas de viento, todo en hora argentina.',
})

export default async function PronosticoPage() {
  const snapshot = await getWeatherSnapshot()
  const now = new Date() // server render instant (ISR)
  const renderedAt = now.toISOString()
  const sky = skyFromSnapshot(snapshot, now)
  const variant = selectAhoraVariant(snapshot)
  // Past days of a stale snapshot are dropped here (D-12): the first row is always today (ART).
  const rows = buildDailyRows(snapshot.daily, now)

  return (
    <Hero
      sky={sky}
      compact
      below={
        rows.length > 0 ? (
          <DailyList rows={rows} />
        ) : (
          <div className="pb-12 pt-8">
            <NoData action={<RetryButton />} />
          </div>
        )
      }
    >
      <Pronostico snapshot={snapshot} renderedAt={renderedAt} variant={rows.length > 0 ? variant : 'empty'} />
    </Hero>
  )
}
