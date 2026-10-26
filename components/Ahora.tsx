// "Ahora" screen (UI-SPEC Layout). Server component: only zod-validated numbers reach it;
// every label comes from local tables (wmo.ts, wind.ts), never from upstream strings.
import type { ReactNode } from 'react'
import { NoData } from '@/components/NoData'
import { Notice } from '@/components/Notice'
import { Header } from '@/components/Header'
import { Freshness } from '@/components/client/Freshness'
import { RetryButton } from '@/components/client/RetryButton'
import { getSolarPhase } from '@/lib/sky/phase'
import { formatHHmm } from '@/lib/time'
import { formatInt, formatTemp } from '@/lib/weather/format'
import type { AhoraVariant } from '@/lib/weather/status'
import type { WeatherSnapshot } from '@/lib/weather/types'
import { describeWind } from '@/lib/weather/wind'
import { describeWeather } from '@/lib/weather/wmo'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const BODY = 'text-[15px] leading-[1.6]'
const HEADING = 'font-serif text-[24px] leading-[1.33]'
// UI-SPEC fallback applied: 32/1.19 overflowed the 390×844 first screen with iPhone insets (02-01).
const HEADLINE = 'font-serif text-[28px] italic leading-[1.21] tracking-[-0.01em]'

function DataItem({
  label,
  value,
  unit,
  first = false,
  muted = false,
}: {
  label: string
  value: string
  unit?: string
  first?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 py-4 text-center ${first ? '' : 'border-l border-ink/12'}`}
    >
      <dt className={`${LABEL} text-ink/75`}>{label}</dt>
      <dd className="nums">
        <span className={`${HEADING} ${muted ? 'text-ink/55' : 'text-ink'}`}>{value}</span>
        {unit ? <span className={`${BODY} ml-1 text-ink/75`}>{unit}</span> : null}
      </dd>
    </div>
  )
}

/**
 * Data states (UI-SPEC "Estados de interacción y de datos"):
 * - normal: current data + freshness row.
 * - degraded: Open-Meteo refresh failed (or fault): same data, "No pudimos actualizar…" notice
 *   with the last good time; the age-based Desactualizado notice is suppressed (one notice).
 * - empty: Sin datos + Reintentar (header stays; sky/horizon/tab bar live outside).
 * - loading: "—" values, CARGANDO, no freshness row (/dev/estados).
 * MET Norway status never changes the UI ("Fuente secundaria caída" = nothing visible).
 * Synchronous with no server-only imports: app/error.tsx (client) renders it too.
 */
export function Ahora({
  snapshot,
  renderedAt,
  headline,
  autoRefresh = true,
  variant,
  retry,
  night,
}: {
  snapshot: WeatherSnapshot | null
  renderedAt: string
  headline?: string
  /** "NOCHE DESPEJADA" switch; defaults to the real solar phase at renderedAt. /dev/estados
   *  passes the frame's own phase so the night frame shows the night label during the day. */
  night?: boolean
  /** false on fixture pages (/dev/estados) that would otherwise refresh in a loop */
  autoRefresh?: boolean
  /** defaults to 'normal' with data, 'empty' without */
  variant?: AhoraVariant
  /** replaces the default RetryButton in the empty state (error boundary passes its retry) */
  retry?: ReactNode
}) {
  const now = snapshot?.now ?? null
  const fetchedAt = snapshot?.sources[0]?.fetchedAt ?? null
  const resolved: AhoraVariant =
    variant === 'loading' ? 'loading' : !now ? 'empty' : (variant ?? 'normal')

  return (
    <section className="flex flex-col" aria-busy={resolved === 'loading' || undefined}>
      <h1 className="sr-only">Clima en Winifreda, La Pampa</h1>
      <Header renderedAt={renderedAt} />

      {resolved === 'loading' ? <LoadingBlock /> : null}

      {resolved === 'empty' ? <NoData action={retry ?? <RetryButton />} /> : null}

      {now && (resolved === 'normal' || resolved === 'degraded') ? (
        <>
          <NowBlock now={now} renderedAt={renderedAt} headline={headline} night={night} />
          {fetchedAt ? (
            <Freshness
              fetchedAt={fetchedAt}
              renderedAt={renderedAt}
              autoRefresh={autoRefresh}
              suppressOutdatedNotice={resolved === 'degraded'}
            />
          ) : null}
          {resolved === 'degraded' && fetchedAt ? (
            <Notice role="status">
              No pudimos actualizar el pronóstico. Te mostramos el último dato bueno, de las{' '}
              {formatHHmm(new Date(fetchedAt))}.
            </Notice>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

/** CARGANDO: same layout as NowBlock, "—" in ink/55, no diamond, no gust line, no freshness. */
function LoadingBlock() {
  return (
    <div className="mt-12 flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p className="nums flex items-start font-serif text-ink/55" aria-hidden="true">
          <span className="text-[112px] leading-none tracking-[-0.03em]">—</span>
        </p>
        <div className="flex flex-col items-end gap-2 pb-1 text-right">
          <p className={`${LABEL} text-ink`}>CARGANDO</p>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-3 border-y border-ink/20" aria-hidden="true">
        <DataItem first muted label="HUMEDAD" value="—" />
        <DataItem muted label="PRESIÓN" value="—" />
        <DataItem muted label="VIENTO" value="—" />
      </dl>

      <div className="mt-4 h-px w-full bg-ink/12" aria-hidden="true" />
    </div>
  )
}

function NowBlock({
  now,
  renderedAt,
  headline,
  night: nightOverride,
}: {
  now: NonNullable<WeatherSnapshot['now']>
  renderedAt: string
  headline?: string
  night?: boolean
}) {
  const night = nightOverride ?? getSolarPhase(new Date(renderedAt)).phase === 'noche'
  const weather = describeWeather(now.weatherCode, { night })
  const wind = describeWind(now.windKmh, now.windDirDeg, now.gustKmh)
  const temp = formatTemp(now.tempC)
  // Secondary fields may be null upstream (WR-09): "—" in the data row, no sensación line.
  const feels = now.feelsC === null ? null : formatTemp(now.feelsC)
  const dash = (n: number | null) => (n === null ? '—' : formatInt(n))

  // "18 km/h NE" → value "18" + unit "km/h NE"; "Calma" stays a single value.
  const [windValue, ...windRest] = wind.value.split(' ')
  const windUnit = windRest.length ? windRest.join(' ') : undefined

  const hasHeadline = typeof headline === 'string' && headline.length > 0

  return (
    // 24px header → headline when there is one; phase-1 48px otherwise (UI-SPEC "Ajustes de Ahora").
    <div className={`${hasHeadline ? 'mt-6' : 'mt-12'} flex flex-col`}>
      {hasHeadline ? (
        <p className={`mb-4 ${HEADLINE} text-ink [text-wrap:balance]`}>{headline}</p>
      ) : null}

      {/* justify-between: when the state column wraps onto its own line it sits at the left */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p
          className="nums flex items-start font-serif text-ink"
          aria-label={
            feels === null
              ? `${temp} grados`
              : `${temp} grados, sensación térmica ${feels} grados`
          }
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
          {feels !== null ? (
            <p className={`${BODY} nums text-ink/75`}>
              sensación <span className="text-ink">{feels}°</span>
            </p>
          ) : null}
        </div>
      </div>
      {weather.label ? <p className="sr-only">{weather.label}</p> : null}

      <dl className="mt-6 grid grid-cols-3 border-y border-ink/20">
        <DataItem
          first
          label="HUMEDAD"
          value={dash(now.humidityPct)}
          unit={now.humidityPct === null ? undefined : '%'}
          muted={now.humidityPct === null}
        />
        <DataItem
          label="PRESIÓN"
          value={dash(now.pressureHpa)}
          unit={now.pressureHpa === null ? undefined : 'hPa'}
          muted={now.pressureHpa === null}
        />
        <DataItem label="VIENTO" value={windValue} unit={windUnit} muted={now.windKmh === null} />
      </dl>

      {wind.gustLine ? <p className={`${BODY} pt-4 text-ink/75`}>{wind.gustLine}</p> : null}

      <div className="mt-4 h-px w-full bg-ink/12" aria-hidden="true" />
    </div>
  )
}
