'use client'

// "Reintentar" (UI-SPEC "Botón: reposo / hover / activo"). Default action re-renders the route
// through router.refresh(), which hits ISR/unstable_cache, never upstream directly (T-01-25).
// Disabled while pending so repeated taps cannot pile up requests.
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function RetryButton({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(() => {
          if (onRetry) onRetry()
          else router.refresh()
        })
      }
      className="h-11 border border-ink/30 bg-transparent px-6 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink transition-colors hover:border-accent hover:bg-ink/8 focus-visible:border-accent focus-visible:bg-ink/8 active:bg-ink/12 disabled:cursor-default"
    >
      {pending ? 'REINTENTANDO…' : 'REINTENTAR'}
    </button>
  )
}
