// Agreement glyph of /pronostico (UI-SPEC "Rombos", D-11, D-14): shape and color code together, so a
// reader without color vision still tells full, half and empty apart. Decorative (aria-hidden): the
// meaning is in the row's srText. Server-safe, no hooks. sinDato has no glyph: never a false agreement.
import type { ReactNode } from 'react'
import type { Verdict } from '@/lib/forecast/agreement'

type RomboKind = Exclude<Verdict, 'sinDato'>

// Literal classes: Tailwind does not generate interpolated ones.
const COLORS: Record<RomboKind, string> = {
  coinciden: 'text-azure',
  dudan: 'text-sun',
  desacuerdo: 'text-ember',
  solo: 'text-ink/55',
}

const SHAPES: Record<RomboKind, ReactNode> = {
  coinciden: <path d="M6 1.25 10.75 6 6 10.75 1.25 6Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />,
  // The lower half is full, like the horizon.
  dudan: (
    <>
      <path d="M6 1.25 10.75 6 6 10.75 1.25 6Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.25 6H10.75L6 10.75Z" fill="currentColor" />
    </>
  ),
  desacuerdo: <path d="M6 1.5 10.5 6 6 10.5 1.5 6Z" stroke="currentColor" strokeWidth="2" />,
  // A faint dash, not a rhombus: one model cannot agree with anything.
  solo: <path d="M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="butt" />,
}

export function Rombo({ kind }: { kind: RomboKind }) {
  return (
    <svg
      data-rombo={kind}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${COLORS[kind]}`}
    >
      {SHAPES[kind]}
    </svg>
  )
}
