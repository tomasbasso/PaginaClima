// "Ahora" screen (UI-SPEC Layout). Server component: only zod-validated numbers reach it;
// every label comes from local tables (wmo.ts, wind.ts), never from upstream strings.
import { Freshness } from '@/components/client/Freshness'
import { LiveClock } from '@/components/client/LiveClock'
import { getSolarPhase } from '@/lib/sky/phase'
import { formatInt, formatTemp } from '@/lib/weather/format'
import type { WeatherSnapshot } from '@/lib/weather/types'
import { describeWind } from '@/lib/weather/wind'
import { describeWeather } from '@/lib/weather/wmo'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const BODY = 'text-[15px] leading-[1.6]'
const HEADING = 'font-serif text-[24px] leading-[1.33]'

function Header({ renderedAt }: { renderedAt: string }) {
  return (
    <header className="flex flex-col items-center text-center">
      <p className="text-[12px] font-semibold leading-[1.33] tracking-[0.18em] text-ink">
        WINIFREDA, LA PAMPA
      </p>
      <div className="my-2 h-px w-40 bg-ink/30" aria-hidden="true" />
      <LiveClock renderedAt={renderedAt} />
    </header>
  )
}

function DataItem({
  label,
  value,
  unit,
  first = false,
}: {
  label: string
  value: string
  unit?: string
  first?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 py-4 text-center ${first ? '' : 'border-l border-ink/12'}`}
    >
      <dt className={`${LABEL} text-ink/75`}>{label}</dt>
      <dd className="nums">
        <span className={`${HEADING} text-ink`}>{value}</span>
        {unit ? <span className={`${BODY} ml-1 text-ink/75`}>{unit}</span> : null}
      </dd>
    </div>
  )
}

export function Ahora({
  snapshot,
  renderedAt,
  headline,
  autoRefresh = true,
}: {
  snapshot: WeatherSnapshot
  renderedAt: string
  headline?: string
  /** false on fixture pages (/dev/estados) that would otherwise refresh in a loop */
  autoRefresh?: boolean
}) {
  const { now } = snapshot
  const fetchedAt = snapshot.sources[0]?.fetchedAt

  return (
    <section className="flex flex-col">
      <h1 className="sr-only">Clima en Winifreda, La Pampa</h1>
      <Header renderedAt={renderedAt} />

      {now ? (
        <>
          <NowBlock now={now} renderedAt={renderedAt} headline={headline} />
          {fetchedAt ? (
            <Freshness fetchedAt={fetchedAt} renderedAt={renderedAt} autoRefresh={autoRefresh} />
          ) : null}
        </>
      ) : (
        <h2 className={`${HEADING} mt-12 italic text-ink`}>
          Ahora no tenemos el tiempo de Winifreda.
        </h2>
      )}
    </section>
  )
}

function NowBlock({
  now,
  renderedAt,
  headline,
}: {
  now: NonNullable<WeatherSnapshot['now']>
  renderedAt: string
  headline?: string
}) {
  const night = getSolarPhase(new Date(renderedAt)).phase === 'noche'
  const weather = describeWeather(now.weatherCode, { night })
  const wind = describeWind(now.windKmh, now.windDirDeg, now.gustKmh)
  const temp = formatTemp(now.tempC)
  const feels = formatTemp(now.feelsC)

  // "18 km/h NE" → value "18" + unit "km/h NE"; "Calma" stays a single value.
  const [windValue, ...windRest] = wind.value.split(' ')
  const windUnit = windRest.length ? windRest.join(' ') : undefined

  return (
    <div className="mt-12 flex flex-col">
      {headline && (
        <p className="mb-6 font-serif text-[24px] italic leading-[1.33] text-ink">{headline}</p>
      )}

      {/* justify-between: when the state column wraps onto its own line it sits at the left */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p
          className="nums flex items-start font-serif text-ink"
          aria-label={`${temp} grados, sensación térmica ${feels} grados`}
        >
          <span className="text-[112px] leading-none tracking-[-0.03em]">{temp}</span>
          <span className="ml-1 mt-3.5 text-[24px] leading-[1.33]">°</span>
        </p>

        <div className="flex flex-col items-end gap-2 pb-1 text-right" aria-hidden="true">
          {weather.label ? (
            <p className={`${LABEL} flex items-center gap-2 text-ink`}>
              <span className="inline-block size-1.5 rotate-45 bg-accent" />
              {weather.label}
            </p>
          ) : null}
          <p className={`${BODY} nums text-ink/75`}>
            sensación <span className="text-ink">{feels}°</span>
          </p>
        </div>
      </div>
      {weather.label ? <p className="sr-only">{weather.label}</p> : null}

      <dl className="mt-8 grid grid-cols-3 border-y border-ink/20">
        <DataItem first label="HUMEDAD" value={formatInt(now.humidityPct)} unit="%" />
        <DataItem label="PRESIÓN" value={formatInt(now.pressureHpa)} unit="hPa" />
        <DataItem label="VIENTO" value={windValue} unit={windUnit} />
      </dl>

      {wind.gustLine ? <p className={`${BODY} pt-4 text-ink/75`}>{wind.gustLine}</p> : null}

      <div className="mt-4 h-px w-full bg-ink/12" aria-hidden="true" />
    </div>
  )
}
