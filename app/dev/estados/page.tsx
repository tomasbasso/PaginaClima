// /dev/estados (D-14): every data state and every sky token of the UI-SPEC, rendered from
// fixtures in contained 390×844 frames, plus the phase-2 states (headline, meteogram, daily list).
// Precursor of /dev/sky (phase 3). Hidden in production: VERCEL_ENV is undefined locally and
// 'preview' on preview deployments.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { Ahora } from '@/components/Ahora'
import { MeteogramSection } from '@/components/MeteogramSection'
import { NoData } from '@/components/NoData'
import { PampaHorizon } from '@/components/PampaHorizon'
import { Pronostico } from '@/components/Pronostico'
import { DailyList } from '@/components/client/DailyList'
import { SkyBackdrop } from '@/components/client/SkyBackdrop'
import { buildDailyRows } from '@/lib/forecast/daily'
import { selectFutureHours } from '@/lib/forecast/hours'
import { type SkyState, skyFromSnapshot, skyToken } from '@/lib/sky/state'
import { localDateKey } from '@/lib/time'
import type { AhoraVariant } from '@/lib/weather/status'
import type { HourlyPoint, WeatherSnapshot } from '@/lib/weather/types'
import { LluviaAcumulada } from '@/components/cielo/LluviaAcumulada'
import { MoonDisc } from '@/components/cielo/MoonDisc'
import { Satelite } from '@/components/cielo/Satelite'
import { SolLuna } from '@/components/cielo/SolLuna'
import { buildCieloFixtures, buildFixtures, buildForecastFixtures } from './fixtures'

// Fixtures are relative to the request time, so the ages ("HACE X MIN") stay meaningful.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estados — Clima en Winifreda',
  robots: { index: false },
}

const CAPTION = 'text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75'

function Frame({
  name,
  sky,
  snapshot,
  variant,
  renderedAt,
  headline,
}: {
  name: string
  sky: SkyState
  snapshot: WeatherSnapshot | null
  variant: AhoraVariant
  renderedAt: string
  headline?: string
}) {
  const token = skyToken(sky)
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className={CAPTION}>
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
              headline={headline}
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

/** One 390-px meteogram frame on ground, as under the home horizon. */
function MeteogramFrame({ name, points, now }: { name: string; points: HourlyPoint[]; now: Date }) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className={CAPTION}>Meteograma · {name}</figcaption>
      <section aria-label={`Meteograma ${name}`} className="w-[390px] shrink-0 bg-ground px-6">
        <MeteogramSection points={selectFutureHours(points, now)} todayKey={localDateKey(now)} />
      </section>
    </figure>
  )
}

/** One 390-px /cielo block frame on ground, as below the compact horizon. */
function CieloFrame({ section, name, children }: { section: string; name: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className={CAPTION}>
        {section} · {name}
      </figcaption>
      <section aria-label={`${section} ${name}`} className="w-[390px] shrink-0 bg-ground px-6">
        {children}
      </section>
    </figure>
  )
}

/** Compact /pronostico composition: sky box with the 120 px band, then the list on ground. */
function DailyFrame({
  name,
  sky,
  head,
  children,
}: {
  name: string
  sky: SkyState
  head: ReactNode
  children: ReactNode
}) {
  const token = skyToken(sky)
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className={CAPTION}>
        Pronóstico diario · {name} · data-sky {token}
      </figcaption>
      <section aria-label={`Pronóstico diario ${name}`} className="w-[390px] shrink-0 bg-ground">
        <div data-sky={token} className="relative isolate flex flex-col [--bar-h:0px] [--band-h:120px]">
          <SkyBackdrop state={sky} />
          <div className="flex flex-col pt-[24px]">
            <div className="w-full px-6">{head}</div>
            <div className="h-6 shrink-0" />
          </div>
          <div className="relative h-(--band-h) w-full shrink-0" aria-hidden="true">
            <div className="absolute inset-x-0 bottom-0">
              <PampaHorizon />
            </div>
          </div>
        </div>
        <div className="px-6">{children}</div>
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
  const forecast = buildForecastFixtures(nowMs)
  const { headlines } = forecast
  const cielo = buildCieloFixtures(nowMs)
  const skyOf = (s: WeatherSnapshot) => skyFromSnapshot(s, now)

  const dataFrames: {
    name: string
    snapshot: WeatherSnapshot | null
    variant: AhoraVariant
    sky: SkyState
    headline?: string
  }[] = [
    {
      name: 'Normal · titular largo',
      snapshot: states.normal,
      variant: 'normal',
      sky: skyOf(states.normal),
      headline: headlines.largo ?? undefined,
    },
    {
      name: 'Titular Mañana',
      snapshot: states.normal,
      variant: 'normal',
      sky: skyOf(states.normal),
      headline: headlines.manana ?? undefined,
    },
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

  const meteogramFrames: { name: string; points: HourlyPoint[] }[] = [
    { name: 'Lluvia y tormenta', points: forecast.hourly.lluviaTormenta },
    { name: 'Helada', points: forecast.hourly.helada },
    { name: 'Ráfagas fuertes', points: forecast.hourly.rafagas },
    { name: 'Datos nulos', points: forecast.hourly.nulos },
    { name: 'Degradado (horas pasadas)', points: forecast.hourly.degradado },
    { name: 'Vacío', points: forecast.hourly.vacio },
  ]

  const semanaRows = buildDailyRows(forecast.daily.semana, now)
  const normalSky = skyOf(states.normal)
  const head = (snapshot: WeatherSnapshot, variant: AhoraVariant = 'normal') => (
    <Pronostico snapshot={snapshot} renderedAt={renderedAt} variant={variant} autoRefresh={false} />
  )

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

      <h2 className="mb-8 mt-16 font-serif text-[24px] text-white">Meteograma</h2>
      <div className="flex flex-col gap-12">
        {meteogramFrames.map((f) => (
          <MeteogramFrame key={f.name} name={f.name} points={f.points} now={now} />
        ))}
      </div>

      <h2 className="mb-8 mt-16 font-serif text-[24px] text-white">Pronóstico diario</h2>
      <div className="flex flex-col gap-12">
        <DailyFrame name="7 días" sky={normalSky} head={head(states.normal)}>
          <DailyList rows={semanaRows} />
        </DailyFrame>
        <DailyFrame name="14 días" sky={normalSky} head={head(states.normal)}>
          <DailyList rows={semanaRows} initialExpanded />
        </DailyFrame>
        <DailyFrame name="Datos nulos" sky={normalSky} head={head(states.normal)}>
          <DailyList rows={buildDailyRows(forecast.daily.nulos, now)} />
        </DailyFrame>
        <DailyFrame name="Días pasados filtrados" sky={normalSky} head={head(states.normal)}>
          <DailyList rows={buildDailyRows(forecast.daily.pasados, now)} />
        </DailyFrame>
        <DailyFrame
          name="Degradado"
          sky={skyOf(states.fuenteCaida)}
          head={head(states.fuenteCaida, 'degraded')}
        >
          <DailyList rows={semanaRows} />
        </DailyFrame>
        <DailyFrame name="Vacío" sky={skyOf(states.sinDatos)} head={head(states.sinDatos, 'empty')}>
          <div className="pb-12 pt-8">
            <NoData />
          </div>
        </DailyFrame>
      </div>

      <h2 id="luna" className="mb-8 mt-16 font-serif text-[24px] text-white">
        Luna
      </h2>
      <figure className="flex flex-col gap-3">
        <figcaption className={CAPTION}>
          Hemisferio sur: el cuarto creciente se ve iluminado a la izquierda
        </figcaption>
        <section aria-label="Fases de la luna" className="w-[390px] shrink-0 bg-ground px-6 py-8">
          <ul className="grid grid-cols-4 gap-x-2 gap-y-6">
            {cielo.moons.map((m) => (
              <li key={`${m.label}-${m.name}`} className="flex flex-col items-center gap-2 text-center">
                <MoonDisc path={m.path} />
                <p className="text-[12px] font-semibold leading-[1.33] nums text-ink/75">{m.label}</p>
                <p className="text-[15px] leading-[1.6] text-ink">{m.name}</p>
              </li>
            ))}
          </ul>
        </section>
      </figure>

      <h2 id="sol" className="mb-8 mt-16 font-serif text-[24px] text-white">
        Sol
      </h2>
      <div className="flex flex-col gap-12">
        {cielo.suns.map((f) => (
          <CieloFrame key={f.name} section="Sol y luna" name={f.name}>
            <SolLuna sun={f.sun} moon={f.moon} />
          </CieloFrame>
        ))}
      </div>

      <h2 id="lluvia" className="mb-8 mt-16 font-serif text-[24px] text-white">
        Lluvia
      </h2>
      <div className="flex flex-col gap-12">
        {cielo.rains.map((f) => (
          <CieloFrame key={f.name} section="Lluvia" name={f.name}>
            <LluviaAcumulada view={f.view} />
          </CieloFrame>
        ))}
      </div>

      <h2 id="satelite" className="mb-8 mt-16 font-serif text-[24px] text-white">
        Satélite
      </h2>
      <div className="flex flex-col gap-12">
        {cielo.satellites.map((f) => (
          <CieloFrame key={f.name} section="Satélite" name={f.name}>
            <Satelite view={f.view} showImage={f.showImage} />
          </CieloFrame>
        ))}
      </div>
    </main>
  )
}
