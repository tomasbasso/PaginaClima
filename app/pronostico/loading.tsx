// CARGANDO for /pronostico (UI-SPEC): same compact hero, real sky by solar phase and real header,
// and CARGANDO where the list goes. No shimmer or skeleton rows.
import { Hero } from '@/components/Hero'
import { Pronostico } from '@/components/Pronostico'
import { skyFromSnapshot } from '@/lib/sky/state'

export default function Loading() {
  const now = new Date()
  return (
    <Hero
      sky={skyFromSnapshot({ now: null }, now)}
      compact
      below={
        <p className="pb-12 pt-8 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink/75">
          CARGANDO
        </p>
      }
    >
      <Pronostico snapshot={null} variant="loading" renderedAt={now.toISOString()} />
    </Hero>
  )
}
