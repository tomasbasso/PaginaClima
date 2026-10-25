// /cielo (D-06, D-09): compact sky with the header and title, the 120px Pampa horizon, and the
// blocks on ground (Sol y luna first; Lluvia acumulada and Satélite join in later plans). ISR: no
// query params (that would make the page dynamic and hit the cache per visit), never throws
// (DATA-03). The snapshot only drives the sky; sun and moon are local suncalc math, no network.
import type { Metadata } from 'next'
import { SolLuna } from '@/components/cielo/SolLuna'
import { CieloHead } from '@/components/cielo/CieloHead'
import { Hero } from '@/components/Hero'
import { skyFromSnapshot } from '@/lib/sky/state'
import { sunDay } from '@/lib/sky/sun'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'El cielo en Winifreda',
  description: 'Lluvia acumulada contra lo normal, imagen satelital, sol y luna en Winifreda, La Pampa.',
}

export default async function CieloPage() {
  const snapshot = await getWeatherSnapshot()
  const now = new Date() // server render instant (ISR)
  const sky = skyFromSnapshot(snapshot, now)

  return (
    <Hero
      sky={sky}
      compact
      below={
        // divide-y draws the hairline between blocks (48 + hairline + 32).
        <div className="divide-y divide-ink/12">
          <SolLuna sun={sunDay(now)} />
        </div>
      }
    >
      <CieloHead renderedAt={now.toISOString()} />
    </Hero>
  )
}
