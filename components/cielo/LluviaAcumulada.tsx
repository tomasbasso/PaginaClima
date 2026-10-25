// "Lluvia acumulada" block of /cielo (RAIN-01, RAIN-03, D-01, D-05, UI-SPEC "Bloque 2").
// Server component: figures arrive computed from lib/rain. Each row has a full sr-only sentence
// and an aria-hidden visual (label + figure). 05-03 adds the normal bar, the comparison text,
// "Última lluvia" and the second sentence of the footnote.
//
// Error state has NO RetryButton on purpose (deliberate deviation from DATA-03, documented in
// the UI-SPEC): /cielo is ISR, retrying from the client cannot refresh the archive, and the rest
// of the page stays useful.
import { useId } from 'react'
import { Notice } from '@/components/Notice'
import type { RainView } from '@/lib/rain/view'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const FIGURE = 'font-serif text-[28px] leading-[1.21] nums text-ink'
const BODY = 'text-[15px] leading-[1.6]'

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
                </div>
              </li>
            ))}
          </ul>
          <p className={`${BODY} text-ink/75`}>Estimado por reanálisis, no pluviómetro.</p>
        </>
      )}
    </section>
  )
}
