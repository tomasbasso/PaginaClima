'use client'

// Route error boundary (UI-SPEC "Sin datos"). Fixed copy only: the error text never reaches
// the DOM; only the digest is logged so it can be matched with server logs (T-01-23).
import { useEffect, useState } from 'react'
import { Ahora } from '@/components/Ahora'
import { Hero } from '@/components/Hero'
import { RetryButton } from '@/components/client/RetryButton'
import { skyFromSnapshot } from '@/lib/sky/state'

export default function RouteError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string }
  /** Next 16: re-fetches and re-renders the segment (preferred) */
  unstable_retry?: () => void
  /** clears the error state without re-fetching (fallback) */
  reset?: () => void
}) {
  // One instant for the whole boundary render, so header and sky agree.
  const [now] = useState(() => new Date())

  useEffect(() => {
    console.error(`[error-boundary] digest=${error.digest ?? 'none'}`)
  }, [error.digest])

  return (
    <Hero sky={skyFromSnapshot({ now: null }, now)}>
      <Ahora
        snapshot={null}
        variant="empty"
        renderedAt={now.toISOString()}
        retry={<RetryButton onRetry={unstable_retry ?? reset} />}
      />
    </Hero>
  )
}
