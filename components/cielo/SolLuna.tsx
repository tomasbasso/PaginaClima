// "Sol y luna" block of /cielo (ASTRO-01, ASTRO-02, D-08). Server component: everything comes
// from pure suncalc helpers, so it has no error state. The ruler is decorative (aria-hidden); the
// data is in visible text and in the sr-only sentence.
import { useId } from 'react'
import type { SunDay } from '@/lib/sky/sun'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const FIGURE = 'font-serif text-[28px] leading-[1.21] nums text-ink'
const BODY = 'text-[15px] leading-[1.6]'
const pct = (f: number) => `${(f * 100).toFixed(3)}%`

export function SolLuna({ sun }: { sun: SunDay }) {
  // Several instances live on /dev/estados: the id must be unique and a valid selector.
  const id = `sol-luna-${useId().replace(/:/g, '')}`
  const { riseFrac, setFrac, nowFrac } = sun.ruler
  return (
    <section aria-labelledby={id} className="pb-12 pt-8">
      <h2 id={id} className={`${LABEL} text-ink/75`}>
        Sol y luna
      </h2>
      <p className="sr-only">{sun.srText}</p>
      <div aria-hidden="true" className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`${LABEL} text-ink/75`}>Salida del sol</p>
            <p className={FIGURE}>{sun.sunrise}</p>
          </div>
          <div>
            <p className={`${LABEL} text-ink/75`}>Puesta del sol</p>
            <p className={FIGURE}>{sun.sunset}</p>
          </div>
        </div>
        <p className={`mt-2 ${BODY} text-ink`}>
          {sun.durationText} de luz<span className="text-ink/75"> · {sun.deltaText}</span>
        </p>
        <div className="mt-4 flex justify-between text-[12px] font-semibold leading-[1.33] nums text-ink/75">
          <span>00</span>
          <span>12</span>
          <span>24</span>
        </div>
        <div className="relative mt-1 h-3">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/12" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 bg-ink"
            style={{ left: pct(riseFrac), width: pct(Math.max(0, setFrac - riseFrac)) }}
          />
          <div className="absolute inset-y-0 w-px bg-ink/55" style={{ left: pct(nowFrac) }} />
        </div>
      </div>
    </section>
  )
}
