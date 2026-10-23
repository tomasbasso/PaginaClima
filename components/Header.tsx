// "WINIFREDA, LA PAMPA" header (extracted from Ahora; reused by /pronostico). No hooks and no
// server-only imports: app/error.tsx renders Ahora (and so this header) on the client.
import { LiveClock } from '@/components/client/LiveClock'

export function Header({ renderedAt }: { renderedAt: string }) {
  return (
    <header className="flex flex-col items-center text-center">
      <p className="text-[12px] font-semibold leading-[1.33] tracking-[0.18em] text-ink">
        WINIFREDA, LA PAMPA
      </p>
      <div className="my-2 h-px w-40 bg-ink/30" aria-hidden="true" />
      <LiveClock renderedAt={renderedAt} />
    </header>
  )
}
