// Hero shell shared by app/page.tsx, app/error.tsx, app/pronostico and app/cielo: a sky
// box (sky backdrop, content column with safe-area padding, spacer and the Pampa horizon band)
// and an optional `below` slot that renders under the horizon, on ground (UI-SPEC "Refactor de
// Hero"). Full (default): the sky box is at least the first screen (100svh minus the tab bar), so
// the horizon sits on the tab bar as in phase 1. Compact (/pronostico): the box is as tall as its
// content and the band is fixed at 120px (exactly the silhouette). Inside the box --bar-h is 0px,
// so the gradient's horizon is the box's bottom edge. No hooks and no server-only imports, so the
// client error boundary can render it too.
import type { ReactNode } from 'react'
import { PampaHorizon } from '@/components/PampaHorizon'
import { SkyBackdrop } from '@/components/client/SkyBackdrop'
import { type SkyState, skyToken } from '@/lib/sky/state'

export function Hero({
  sky,
  children,
  below,
  compact = false,
}: {
  sky: SkyState
  children: ReactNode
  below?: ReactNode
  compact?: boolean
}) {
  // Literal min-height (not var(--bar-h)): the sky box sets --bar-h to 0px on itself.
  const box = compact
    ? 'relative isolate flex flex-col [--bar-h:0px] [--band-h:120px]'
    : 'relative isolate flex flex-col [--bar-h:0px] min-h-[calc(100svh-56px-env(safe-area-inset-bottom))]'
  return (
    // data-sky here (WR-06): the weather-aware token is in the server HTML, so the accent of the
    // content (diamond, focus ring) and, through globals.css :has(), of the tab bar is right
    // before hydration. <SkyBackdrop live> keeps it current afterwards.
    <main
      data-sky={skyToken(sky)}
      className="relative isolate bg-ground pb-[calc(56px+env(safe-area-inset-bottom))]"
    >
      <div className={box}>
        {/* One gradient behind the sky box: S1 → S3 in the content zone, S3 → S5 in the band. */}
        <SkyBackdrop state={sky} live />

        <div className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px)]">
          <div className="mx-auto w-full max-w-[calc(560px+48px)] pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))]">
            {children}
          </div>

          <div className={compact ? 'h-6 shrink-0' : 'min-h-4 flex-1'} />
        </div>

        <div data-sky-band className="relative h-(--band-h) w-full shrink-0" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0">
            <PampaHorizon windKmh={sky.windKmh} />
          </div>
        </div>
      </div>

      {below ? (
        <div className="mx-auto w-full max-w-[calc(560px+48px)] pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))]">
          {below}
        </div>
      ) : null}
    </main>
  )
}
