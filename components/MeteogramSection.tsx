// Home section under the horizon, on ground (FCST-01, D-01): title, empty copy or the 48 h chart.
// Server component, hook-free; the points are already filtered to the current hour onward.
import { Meteogram } from '@/components/client/Meteogram'
import { MIN_METEOGRAM_HOURS } from '@/lib/forecast/meteogram'
import type { HourlyPoint } from '@/lib/weather/types'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'

export function MeteogramSection({ points, todayKey }: { points: HourlyPoint[]; todayKey: string }) {
  const withTemp = points.filter((p) => p.tempC !== null).length
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
          <Meteogram points={points} todayKey={todayKey} />
        </div>
      )}
    </section>
  )
}
