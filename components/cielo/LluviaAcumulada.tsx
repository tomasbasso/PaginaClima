// "Lluvia acumulada" block of /cielo (RAIN-01..03, D-01..D-05, UI-SPEC "Bloque 2").
// Server component: figures arrive computed from lib/rain. Each row has a full sr-only sentence
// and an aria-hidden visual (label, figure, bar against the normal, comparison text).
//
// Error state has NO RetryButton on purpose (deliberate deviation from DATA-03, documented in
// the UI-SPEC): /cielo is ISR, retrying from the client cannot refresh the archive, and the rest
// of the page stays useful. No sky-tinted color here (UI-SPEC "Color"): rain data is azure.
import { useId } from 'react'
import { Notice } from '@/components/Notice'
import type { LastRain } from '@/lib/rain/lastRain'
import type { RainBar, RainView } from '@/lib/rain/view'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const FIGURE = 'font-serif text-[28px] leading-[1.21] nums text-ink'
const BODY = 'text-[15px] leading-[1.6]'
const LAST_RAIN_PREFIX = 'Última lluvia:'
/** Fixed box of the NORMAL label, so clamping it to the column edges is exact. */
const NORMAL_LABEL_W = 64

function LastRainLine({ lastRain }: { lastRain: LastRain }) {
  if (lastRain.mmText === null) return <p className={`${BODY} text-ink/75`}>{lastRain.lead}</p>
  const rest = lastRain.lead.startsWith(LAST_RAIN_PREFIX)
    ? lastRain.lead.slice(LAST_RAIN_PREFIX.length)
    : lastRain.lead
  return (
    <p className={`${BODY} nums text-ink`}>
      <span className="text-ink/75">{LAST_RAIN_PREFIX}</span>
      {rest}
      <span className="text-azure">{lastRain.mmText}</span>
    </p>
  )
}

/** 32 px: 16 px NORMAL label + 16 px track (hairline, 4 px observed segment, 1×12 px mark). */
function NormalBar({ bar, mm }: { bar: RainBar; mm: number }) {
  const normalPct = `${bar.normalFrac * 100}%`
  return (
    <div className="relative h-8">
      <span
        className={`${LABEL} absolute top-0 block text-center text-ink/75`}
        style={{
          width: NORMAL_LABEL_W,
          left: `clamp(0px, calc(${normalPct} - ${NORMAL_LABEL_W / 2}px), calc(100% - ${NORMAL_LABEL_W}px))`,
        }}
      >
        Normal
      </span>
      <div className="absolute inset-x-0 bottom-0 h-4">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/12" />
        {mm > 0 ? (
          <div
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-azure"
            style={{ width: `max(4px, ${bar.observedFrac * 100}%)` }}
          />
        ) : null}
        <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ink" style={{ left: normalPct }} />
      </div>
    </div>
  )
}

export function LluviaAcumulada({ view }: { view: RainView }) {
  // Several instances may live on /dev/estados: unique id, valid selector.
  const id = `lluvia-${useId().replace(/:/g, '')}`
  return (
    <section aria-labelledby={id} className="pb-12 pt-8">
      <h2 id={id} className={`${LABEL} text-ink/75`}>
        Lluvia acumulada
      </h2>
      {view.status === 'error' ? (
        <div className="mt-4">
          <p className={`${BODY} text-ink`}>No pudimos calcular la lluvia acumulada.</p>
          <p className={`${BODY} text-ink/75`}>
            El archivo histórico no está respondiendo. Probá de nuevo en un rato.
          </p>
        </div>
      ) : (
        <>
          {view.noticeText ? (
            <div className="mt-4">
              <Notice role="status">{view.noticeText}</Notice>
            </div>
          ) : null}
          <div className="mt-4">
            <LastRainLine lastRain={view.lastRain} />
          </div>
          <ul className="mt-6">
            {view.rows.map((row, i) => (
              <li key={row.id} className={i === 0 ? 'pb-6' : 'border-t border-ink/12 py-6'}>
                <span className="sr-only">{row.srText}</span>
                <div aria-hidden="true">
                  <p className={`${LABEL} text-ink/75`}>{row.label}</p>
                  <p className="mt-2 flex items-baseline">
                    <span className={FIGURE}>{row.mmText}</span>
                    <span className={`ml-1 ${BODY} text-ink/75`}>mm</span>
                  </p>
                  {row.bar ? (
                    <>
                      <div className="mt-2">
                        <NormalBar bar={row.bar} mm={row.mm} />
                      </div>
                      <p className={`mt-2 ${BODY} nums text-ink`}>{row.compareText}</p>
                      <p className={`${BODY} nums text-ink/75`}>{row.normalText}</p>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {view.missingNormalText ? (
            <p className={`${BODY} text-ink/75`}>{view.missingNormalText}</p>
          ) : null}
          <p className={`${view.missingNormalText ? 'mt-6 ' : ''}${BODY} text-ink/75`}>{view.disclaimer}</p>
        </>
      )}
    </section>
  )
}
