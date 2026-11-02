'use client'
// Daily list of /pronostico (UI-SPEC "Anatomía de la fila", "Botón ver 14 días"). The only client
// island of the page: it toggles between 7 and 14 days (D-08). Rows arrive precomputed and plain
// (lib/forecast/daily.ts); both range scales come from the server, so expanding only swaps
// bar7 → bar14 (D-09, no animation). Rows are static: no links, buttons or hover (D-11).
import { useId, useState } from 'react'
import type { DailyBar, DailyRow } from '@/lib/forecast/daily'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const LABEL_NUM = 'text-[12px] font-semibold leading-[1.33]'
const BODY = 'text-[15px] leading-[1.6]'
// Literal classes: Tailwind does not generate interpolated ones.
const GRID_ENSEMBLE =
  'grid-cols-[60px_40px_1fr_36px_44px] gap-x-2 @max-[327px]:grid-cols-[56px_40px_1fr_32px_44px] @max-[327px]:gap-x-1'
const GRID_FALLBACK =
  'grid-cols-[60px_40px_1fr_36px_64px] gap-x-2 @max-[327px]:grid-cols-[56px_40px_1fr_32px_64px] @max-[327px]:gap-x-1'
/** Days 8+ keep the azure and get engraved stripes: another kind of data, not weaker rain. */
const STRIPED_FILL = 'repeating-linear-gradient(to top, var(--color-azure) 0 2px, transparent 2px 4px)'
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

/** Rain gauge of one day (D-08, D-09): hangs in the right margin, outside the 342-px column. */
function Pluviometro({
  pct,
  tentative,
  hairline,
  capTop,
  capBottom,
}: {
  pct: number | null
  tentative: boolean
  hairline: boolean
  capTop: boolean
  capBottom: boolean
}) {
  return (
    <div data-pluvio className={`absolute -right-4 bottom-0 w-2 bg-ink/12 ${hairline ? '-top-px' : 'top-0'}`}>
      {pct !== null ? (
        <div
          className={`absolute inset-x-0 bottom-0 ${tentative ? '' : 'bg-azure'}`}
          style={tentative ? { height: `${pct}%`, background: STRIPED_FILL } : { height: `${pct}%` }}
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-1/2 h-px bg-ground" />
      {capTop ? <div className="absolute inset-x-0 top-0 h-px bg-ink/55" /> : null}
      {capBottom ? <div className="absolute inset-x-0 bottom-0 h-px bg-ink/55" /> : null}
    </div>
  )
}

function Row({
  row,
  bar,
  first,
  capTop = false,
  capBottom = false,
}: {
  row: DailyRow
  bar: DailyBar | null
  first: boolean
  capTop?: boolean
  capBottom?: boolean
}) {
  return (
    <li className={`relative py-4 ${first ? '' : 'border-t border-ink/12'}`}>
      <span className="sr-only">{row.srText}</span>
      <div aria-hidden="true" className="@container">
        <div className={`grid items-center ${row.ensembleUp ? GRID_ENSEMBLE : GRID_FALLBACK}`}>
          <span className={`${BODY} text-ink`}>{row.label}</span>
          <span className={`${BODY} nums text-right text-ink/75`}>{row.minText}</span>
          <RangeBar bar={bar} tentative={row.tentative} />
          <span className={`${BODY} nums ${row.tentative ? 'text-ink/75' : 'text-ink'}`}>{row.maxText}</span>
          {row.ensembleUp ? (
            <span className={`${BODY} nums text-right ${row.probPct === null ? 'text-ink/75' : 'text-azure'}`}>
              {row.probText ?? ''}
            </span>
          ) : (
            <span className={`${BODY} nums text-right text-azure`}>{row.rainText ?? ''}</span>
          )}
        </div>
        {row.ensembleUp || row.stateLabel ? (
          <div className="mt-1 flex min-h-4 items-center gap-2 whitespace-nowrap">
            <span className={`${LABEL} min-w-0 flex-1 overflow-hidden text-ink/75`}>{row.stateLabel ?? ''}</span>
            {row.ensembleUp && row.rainText ? (
              <span className={`${LABEL_NUM} nums shrink-0 text-azure`}>{row.rainText}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {row.ensembleUp ? (
        <Pluviometro
          pct={row.probPct}
          tentative={row.tentative}
          hairline={!first}
          capTop={capTop}
          capBottom={capBottom}
        />
      ) : null}
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
  // The strip ends on the last visible row: row 7 collapsed, the last of the tail expanded.
  const tailShown = expanded && tail.length > 0

  return (
    <div className="pb-12">
      <ol aria-label="Pronóstico por día">
        {head.map((r, i) => (
          <Row
            key={r.key}
            row={r}
            bar={barOf(r)}
            first={i === 0}
            capTop={i === 0}
            capBottom={!tailShown && i === head.length - 1}
          />
        ))}
      </ol>
      {tail.length > 0 ? (
        <>
          <div id={tailId} hidden={!expanded}>
            <p className={`${LABEL} relative border-t border-ink/20 py-4 text-ink/75`}>
              DEL DÍA 8 EN ADELANTE, ORIENTATIVO
              {/* Empty rail: the strip is not cut, and this gap separates the week from the rest. */}
              {rows[0].ensembleUp ? <span className="absolute -right-4 -top-px bottom-0 w-2 bg-ink/12" /> : null}
            </p>
            <ol aria-label="Pronóstico orientativo, días 8 a 14" start={8}>
              {tail.map((r, i) => (
                <Row key={r.key} row={r} bar={r.bar14} first={i === 0} capBottom={i === tail.length - 1} />
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
