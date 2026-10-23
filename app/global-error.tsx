'use client'

// Root error boundary (WR-05): catches what app/error.tsx cannot, i.e. errors thrown by the root
// layout itself. It replaces the layout, so it renders its own <html>/<body>, fonts, CSS and tab
// bar. Same UI-SPEC "Sin datos" copy as app/error.tsx; only the digest is logged (T-01-23).
import { useEffect, useState } from 'react'
import { Ahora } from '@/components/Ahora'
import { Hero } from '@/components/Hero'
import { TabBar } from '@/components/TabBar'
import { RetryButton } from '@/components/client/RetryButton'
import { skyFromSnapshot, skyToken } from '@/lib/sky/state'
import { jakarta, playfair } from './fonts'
import './globals.css'

export default function GlobalError({
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
  const [now] = useState(() => new Date())
  const sky = skyFromSnapshot({ now: null }, now)

  useEffect(() => {
    console.error(`[global-error] digest=${error.digest ?? 'none'}`)
  }, [error.digest])

  return (
    <html lang="es-AR" data-sky={skyToken(sky)} className={`${playfair.variable} ${jakarta.variable}`}>
      <body>
        <title>Clima en Winifreda</title>
        <Hero sky={sky}>
          <Ahora
            snapshot={null}
            variant="empty"
            renderedAt={now.toISOString()}
            retry={<RetryButton onRetry={unstable_retry ?? reset} />}
          />
        </Hero>
        <TabBar />
      </body>
    </html>
  )
}
