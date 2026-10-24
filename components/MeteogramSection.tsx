// Home section under the horizon, on ground (FCST-01, D-01): title, empty copy or the 48 h chart.
// Server component, hook-free; the points are already filtered to the current hour onward.
import { Meteogram } from '@/components/client/Meteogram'
import { MIN_METEOGRAM_HOURS, strongGustLine } from '@/lib/forecast/meteogram'
import type { HourlyPoint } from '@/lib/weather/types'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'

export function MeteogramSection({ points, todayKey }: { points: HourlyPoint[]; todayKey: string }) {
  const withTemp = points.filter((p) => p.tempC !== null).length
  const gustLine = strongGustLine(points, todayKey)
  return (
    <section aria-labelledby="meteograma-titulo" className="pb-12 pt-8">
      <h2 id="meteograma-titulo" className={`${LABEL} text-ink/75`}>
        PRÓXIMAS 48 HORAS
      </h2>
      {withTemp < MIN_METEOGRAM_HOURS ? (
        <p className="mt-4 text-[15px] leading-[1.6] text-ink/75">
          No tenemos el pronóstico por hora en este momento. Cuando vuelva el servicio, acá vas a ver las
          próximas 48 horas.
        </p>
      ) : (
        <div className="mt-4">
          {/* A new snapshot remounts the chart, so the selection returns to "Ahora" (D-04). */}
          <Meteogram key={`${points[0]?.time ?? 'none'}-${points.length}`} points={points} todayKey={todayKey} />
          {gustLine ? <p className="mt-4 text-[15px] leading-[1.6] text-peach">{gustLine}</p> : null}
        </div>
      )}
    </section>
  )
}
