// Head of /pronostico (UI-SPEC "/pronostico"): the shared header, the "Los próximos días" title in
// the Headline role and the freshness row / degraded notice. The daily list itself renders under
// the horizon (Hero `below`). Server component, hook-free; only local copy and formatted numbers.
import { Header } from '@/components/Header'
import { Notice } from '@/components/Notice'
import { Freshness } from '@/components/client/Freshness'
import { formatHHmm } from '@/lib/time'
import type { AhoraVariant } from '@/lib/weather/status'
import type { WeatherSnapshot } from '@/lib/weather/types'

// Same Headline role as Ahora's headline (28/1.21 fallback applied in 02-01).
const HEADLINE = 'font-serif text-[28px] italic leading-[1.21] tracking-[-0.01em]'

export function Pronostico({
  snapshot,
  renderedAt,
  variant = 'normal',
  autoRefresh = true,
}: {
  snapshot: WeatherSnapshot | null
  renderedAt: string
  variant?: AhoraVariant
  autoRefresh?: boolean
}) {
  const fetchedAt = snapshot?.sources[0]?.fetchedAt ?? null
  // Freshness only describes data on screen: not while loading, not when there are no rows.
  const showFreshness = fetchedAt !== null && (variant === 'normal' || variant === 'degraded')

  return (
    <section className="flex flex-col" aria-busy={variant === 'loading' || undefined}>
      <Header renderedAt={renderedAt} />
      <h1 className={`mt-8 text-ink ${HEADLINE}`}>Los próximos días</h1>
      {showFreshness && fetchedAt ? (
        <Freshness
          fetchedAt={fetchedAt}
          renderedAt={renderedAt}
          autoRefresh={autoRefresh}
          suppressOutdatedNotice={variant === 'degraded'}
        />
      ) : null}
      {variant === 'degraded' && fetchedAt ? (
        <Notice role="status">
          No pudimos actualizar el pronóstico. Te mostramos el último dato bueno, de las{' '}
          {formatHHmm(new Date(fetchedAt))}.
        </Notice>
      ) : null}
    </section>
  )
}
