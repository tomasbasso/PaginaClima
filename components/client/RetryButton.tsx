'use client'

// "Reintentar" (UI-SPEC "Botón: reposo / hover / activo"). Disabled while pending so repeated
// taps cannot pile up requests.
//
// Default action (WR-08): a plain router.refresh() would just get the same ISR "Sin datos" entry
// back for up to 600 s. Instead, first ask our own /api/weather (a separate ISR entry, so it can
// already hold data) and, if it has data, refresh twice: the first refresh also kicks the
// background regeneration of the page, the second one picks it up. Everything goes through our
// ISR/unstable_cache layer, never upstream directly (T-01-25). Error boundaries pass `onRetry`.
import { useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { snapshotHasNow } from '@/lib/weather/status'

/** Time given to the page's background ISR regeneration before the second refresh. */
const REGEN_WAIT_MS = 2_500

async function weatherApiHasData(): Promise<boolean> {
  try {
    const res = await fetch('/api/weather', { headers: { Accept: 'application/json' } })
    return res.ok && snapshotHasNow(await res.json())
  } catch {
    return false
  }
}

export function RetryButton({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // Still mounted after the first refresh = the page still shows the empty state.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const retryDefault = async () => {
    const hasData = await weatherApiHasData()
    startTransition(() => router.refresh())
    if (!hasData) return
    await new Promise((r) => setTimeout(r, REGEN_WAIT_MS))
    if (mounted.current) startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          if (onRetry) onRetry()
          else await retryDefault()
        })
      }
      className="h-11 border border-ink/30 bg-transparent px-6 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink transition-colors hover:border-accent hover:bg-ink/8 focus-visible:border-accent focus-visible:bg-ink/8 active:bg-ink/12 disabled:cursor-default"
    >
      {pending ? 'REINTENTANDO…' : 'REINTENTAR'}
    </button>
  )
}
