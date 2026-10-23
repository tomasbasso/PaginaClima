import { Ahora } from '@/components/Ahora'
import { PampaHorizon } from '@/components/PampaHorizon'
import { getWeatherSnapshot } from '@/lib/weather/snapshot'

export const revalidate = 600

export default async function Page() {
  const snapshot = await getWeatherSnapshot()
  const renderedAt = new Date().toISOString() // server render instant (ISR)

  return (
    <main className="flex min-h-svh flex-col bg-ground pb-[calc(56px+env(safe-area-inset-bottom))]">
      {/* Upper sky layer: S1 → S3 ends exactly where the horizon band starts (no seam). */}
      <div
        className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px)]"
        style={{
          background:
            'linear-gradient(to bottom, var(--sky-1) 0%, var(--sky-2) 40%, var(--sky-3) 100%)',
        }}
      >
        <div className="mx-auto w-full max-w-[calc(560px+48px)] pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))]">
          <Ahora snapshot={snapshot} renderedAt={renderedAt} />
        </div>

        <div className="min-h-16 flex-1" />
      </div>

      <div
        className="relative h-60 w-full shrink-0"
        style={{
          background:
            'linear-gradient(to bottom, var(--sky-3) 0%, var(--sky-4) 60%, var(--sky-5) 100%)',
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 bottom-0">
          <PampaHorizon />
        </div>
      </div>
    </main>
  )
}
