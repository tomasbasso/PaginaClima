'use client'
// Daily list of /pronostico (UI-SPEC "Anatomía de la fila", "Botón ver 14 días"). The only client
// island of the page: it toggles between 7 and 14 days (D-08). Rows arrive precomputed and plain
// (lib/forecast/daily.ts); both range scales come from the server, so expanding only swaps
// bar7 → bar14 (D-09, no animation). Rows are static: no links, buttons or hover (D-11).
import { useId, useState } from 'react'
import type { DailyBar, DailyRow } from '@/lib/forecast/daily'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const BODY = 'text-[15px] leading-[1.6]'
const BUTTON =
  'h-11 border border-ink/30 bg-transparent px-6 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink transition-colors hover:border-accent hover:bg-ink/8 focus-visible:border-accent focus-visible:bg-ink/8 active:bg-ink/12'

function RangeBar({ bar, tentative }: { bar: DailyBar | null; tentative: boolean }) {
  return (
    <div className="relative h-4">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/12" />
      {bar ? (
        <div
          className={`absolute top-1/2 h-1 -translate-y-1/2 ${tentative ? 'bg-ink/55' : 'bg-ink'}`}
          style={{ left: `${bar.lo * 100}%`, width: `max(4px, ${(bar.hi - bar.lo) * 100}%)` }}
        />
      ) : null}
    </div>
  )
}

function Row({ row, bar, first }: { row: DailyRow; bar: DailyBar | null; first: boolean }) {
  return (
    <li className={`py-4 ${first ? '' : 'border-t border-ink/12'}`}>
      <span className="sr-only">{row.srText}</span>
      <div aria-hidden="true">
        <div className="grid grid-cols-[64px_36px_1fr_36px_48px] items-center gap-x-2">
          <span className={`${BODY} text-ink`}>{row.label}</span>
          <span className={`${BODY} nums text-right text-ink/75`}>{row.minText}</span>
          <RangeBar bar={bar} tentative={row.tentative} />
          <span className={`${BODY} nums ${row.tentative ? 'text-ink/75' : 'text-ink'}`}>{row.maxText}</span>
          <span className={`${BODY} nums text-right text-azure`}>{row.rainText ?? ''}</span>
        </div>
        {row.stateLabel ? <p className={`${LABEL} mt-1 text-ink/75`}>{row.stateLabel}</p> : null}
      </div>
    </li>
  )
}

export function DailyList({
  rows,
  initialExpanded = false,
}: {
  rows: DailyRow[]
  /** Only the /dev/estados 14-day frame passes true; the real page always starts collapsed. */
  initialExpanded?: boolean
}) {
  // SSR-stable initial state: the same value on the server and on hydration.
  const [expanded, setExpanded] = useState(initialExpanded)
  // Unique per instance: /dev/estados renders several lists on one page.
  const tailId = `dias-8-14-${useId().replace(/:/g, '')}`
  const head = rows.slice(0, 7)
  const tail = rows.slice(7)
  const barOf = (r: DailyRow) => (expanded ? r.bar14 : r.bar7)

  return (
    <div className="pb-12 pt-8">
      <ol aria-label="Pronóstico por día">
        {head.map((r, i) => (
          <Row key={r.key} row={r} bar={barOf(r)} first={i === 0} />
        ))}
      </ol>
      {tail.length > 0 ? (
        <>
          <div id={tailId} hidden={!expanded}>
            <p className={`${LABEL} border-t border-ink/20 py-4 text-ink/75`}>
              DEL DÍA 8 EN ADELANTE, ORIENTATIVO
            </p>
            <ol aria-label="Pronóstico orientativo, días 8 a 14" start={8}>
              {tail.map((r, i) => (
                <Row key={r.key} row={r} bar={r.bar14} first={i === 0} />
              ))}
            </ol>
          </div>
          {/* Always after the lists, so focus stays on it when toggling. */}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={tailId}
            onClick={() => setExpanded((v) => !v)}
            className={`${BUTTON} mt-6 w-full`}
          >
            {expanded ? 'VER 7 DÍAS' : 'VER 14 DÍAS'}
          </button>
        </>
      ) : null}
    </div>
  )
}
