// /dev/estados (D-14): every data state and every sky token of the UI-SPEC, rendered from
// fixtures in contained 390×844 frames. Precursor of /dev/sky (phase 3). Hidden in production:
// VERCEL_ENV is undefined locally and 'preview' on preview deployments.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Ahora } from '@/components/Ahora'
import { PampaHorizon } from '@/components/PampaHorizon'
import { SkyBackdrop } from '@/components/client/SkyBackdrop'
import { type SkyState, skyFromSnapshot, skyToken } from '@/lib/sky/state'
import type { AhoraVariant } from '@/lib/weather/status'
import type { WeatherSnapshot } from '@/lib/weather/types'
import { buildFixtures } from './fixtures'

// Fixtures are relative to the request time, so the ages ("HACE X MIN") stay meaningful.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estados — Clima en Winifreda',
  robots: { index: false },
}

function Frame({
  name,
  sky,
  snapshot,
  variant,
  renderedAt,
}: {
  name: string
  sky: SkyState
  snapshot: WeatherSnapshot | null
  variant: AhoraVariant
  renderedAt: string
}) {
  const token = skyToken(sky)
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75">
        {name} · data-sky {token}
      </figcaption>
      <section
        aria-label={name}
        data-sky={token}
        // Frames are always 844px tall and have no tab bar, so the band keeps its full 240px
        // instead of following the window's viewport height, and --bar-h is 0px (the gradient's
        // horizon sits on the band bottom).
        className="relative isolate flex h-[844px] w-[390px] shrink-0 flex-col overflow-hidden bg-ground [--band-h:240px] [--bar-h:0px]"
      >
        <SkyBackdrop state={sky} />
        <div className="flex flex-1 flex-col pt-[24px]">
          <div className="w-full px-6">
            <Ahora
              snapshot={snapshot}
              renderedAt={renderedAt}
              variant={variant}
              autoRefresh={false}
              night={sky.phase === 'noche'}
            />
          </div>
          <div className="min-h-16 flex-1" />
        </div>
        <div className="relative h-(--band-h) w-full shrink-0" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0">
            <PampaHorizon />
          </div>
        </div>
      </section>
    </figure>
  )
}

export default function EstadosPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const now = new Date() // request instant (force-dynamic)
  const nowMs = now.getTime()
  const renderedAt = now.toISOString()
  const { states, skies } = buildFixtures(nowMs)
  const skyOf = (s: WeatherSnapshot) => skyFromSnapshot(s, now)

  const dataFrames: { name: string; snapshot: WeatherSnapshot | null; variant: AhoraVariant; sky: SkyState }[] = [
    { name: 'Normal', snapshot: states.normal, variant: 'normal', sky: skyOf(states.normal) },
    { name: 'Cargando', snapshot: null, variant: 'loading', sky: skyOf(states.sinDatos) },
    {
      name: 'Desactualizado',
      snapshot: states.desactualizado,
      variant: 'normal',
      sky: skyOf(states.desactualizado),
    },
    {
      name: 'Fuente caída',
      snapshot: states.fuenteCaida,
      variant: 'degraded',
      sky: skyOf(states.fuenteCaida),
    },
    { name: 'Sin datos', snapshot: states.sinDatos, variant: 'empty', sky: skyOf(states.sinDatos) },
  ]

  return (
    <main className="min-h-svh bg-[#0e131c] px-6 pb-40 pt-[calc(env(safe-area-inset-top)+24px)]">
      <h1 className="mb-8 font-serif text-[24px] text-white">Estados de Ahora</h1>
      <div className="flex flex-col gap-12">
        {dataFrames.map((f) => (
          <Frame key={f.name} renderedAt={renderedAt} {...f} />
        ))}
        {skies.map((f) => (
          <Frame
            key={f.token}
            name={`Cielo ${f.token}`}
            sky={f.sky}
            snapshot={f.snapshot}
            variant="normal"
            renderedAt={renderedAt}
          />
        ))}
      </div>
    </main>
  )
}
