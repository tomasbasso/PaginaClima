// CARGANDO for /cielo (UI-SPEC): same compact hero, real sky by solar phase and real header,
// and CARGANDO where the blocks go. No shimmer or skeleton rows.
import { CieloHead } from '@/components/cielo/CieloHead'
import { Hero } from '@/components/Hero'
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
      <CieloHead loading renderedAt={now.toISOString()} />
    </Hero>
  )
}
