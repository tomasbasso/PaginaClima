import { Ahora } from '@/components/Ahora'
import { PampaHorizon } from '@/components/PampaHorizon'
import { SkyBackdrop } from '@/components/client/SkyBackdrop'
import { skyFromSnapshot } from '@/lib/sky/state'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'

export const revalidate = 600

export default async function Page() {
  const snapshot = await getWeatherSnapshot()
  const now = new Date() // server render instant (ISR)
  const renderedAt = now.toISOString()
  const sky = skyFromSnapshot(snapshot, now)

  return (
    <main className="relative isolate flex min-h-svh flex-col bg-ground pb-[calc(56px+env(safe-area-inset-bottom))]">
      {/* One gradient behind the whole hero: S1 → S3 in the content zone, S3 → S5 in the band. */}
      <SkyBackdrop state={sky} live />

      <div className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="mx-auto w-full max-w-[calc(560px+48px)] pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))]">
          <Ahora snapshot={snapshot} renderedAt={renderedAt} />
        </div>

        <div className="min-h-16 flex-1" />
      </div>

      <div className="relative h-60 w-full shrink-0" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0">
          <PampaHorizon />
        </div>
      </div>
    </main>
  )
}
