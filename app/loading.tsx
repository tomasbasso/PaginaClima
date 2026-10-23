// CARGANDO (UI-SPEC): same hero, real sky by solar phase and real header, "—" values,
// no freshness row, no shimmer or skeleton cards.
import { Ahora } from '@/components/Ahora'
import { Hero } from '@/components/Hero'
import { skyFromSnapshot } from '@/lib/sky/state'

export default function Loading() {
  const now = new Date()
  return (
    <Hero sky={skyFromSnapshot({ now: null }, now)}>
      <Ahora snapshot={null} variant="loading" renderedAt={now.toISOString()} />
    </Hero>
  )
}
