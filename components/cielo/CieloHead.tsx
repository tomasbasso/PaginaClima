// Head of /cielo (UI-SPEC "Layout de /cielo"): the shared header and the "Mirando para arriba"
// title in the Headline role. No Freshness or Notice here: each block reports its own time
// (UI-SPEC [default] 1). Server component, hook-free.
import { Header } from '@/components/Header'

// Same Headline role as Ahora and Pronóstico (28/1.21 fallback applied in 02-01).
const HEADLINE = 'font-serif text-[28px] italic leading-[1.21] tracking-[-0.01em]'

export function CieloHead({ renderedAt, loading = false }: { renderedAt: string; loading?: boolean }) {
  return (
    <section className="flex flex-col" aria-busy={loading || undefined}>
      <Header renderedAt={renderedAt} />
      <h1 className={`mt-8 text-ink ${HEADLINE}`}>Mirando para arriba</h1>
    </section>
  )
}
