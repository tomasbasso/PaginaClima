// /pronostico (FCST-02): compact sky with the header and title, the 120px Pampa horizon, and the
// 7/14-day list on ground. ISR over the same cached snapshot as the home: no searchParams (that
// would make the page dynamic and hit the cache per visit), never throws (DATA-03).
import type { Metadata } from 'next'
import { Hero } from '@/components/Hero'
import { NoData } from '@/components/NoData'
import { Pronostico } from '@/components/Pronostico'
import { DailyList } from '@/components/client/DailyList'
import { RetryButton } from '@/components/client/RetryButton'
import { buildDailyRows } from '@/lib/forecast/daily'
import { skyFromSnapshot } from '@/lib/sky/state'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'
import { selectAhoraVariant } from '@/lib/weather/status'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Pronóstico en Winifreda',
  description: 'Pronóstico de 7 a 14 días para Winifreda, La Pampa, en hora argentina.',
}

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
