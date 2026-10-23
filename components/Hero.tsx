// Hero shell shared by app/page.tsx, app/loading.tsx and app/error.tsx: sky backdrop, content
// column with safe-area padding, flexible spacer and the Pampa horizon band. No hooks and no
// server-only imports, so the client error boundary can render it too.
import type { ReactNode } from 'react'
import { PampaHorizon } from '@/components/PampaHorizon'
import { SkyBackdrop } from '@/components/client/SkyBackdrop'
import { type SkyState, skyToken } from '@/lib/sky/state'

export function Hero({ sky, children }: { sky: SkyState; children: ReactNode }) {
  return (
    // data-sky here (WR-06): the weather-aware token is in the server HTML, so the accent of the
    // content (diamond, focus ring) and, through globals.css :has(), of the tab bar is right
    // before hydration. <SkyBackdrop live> keeps it current afterwards.
    <main
      data-sky={skyToken(sky)}
      className="relative isolate flex min-h-svh flex-col bg-ground pb-[calc(56px+env(safe-area-inset-bottom))]"
    >
      {/* One gradient behind the whole hero: S1 → S3 in the content zone, S3 → S5 in the band. */}
      <SkyBackdrop state={sky} live />

      <div className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="mx-auto w-full max-w-[calc(560px+48px)] pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))]">
          {children}
        </div>

        <div className="min-h-16 flex-1" />
      </div>

      <div className="relative h-(--band-h) w-full shrink-0" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0">
          <PampaHorizon />
        </div>
      </div>
    </main>
  )
}
