// Number formatting for display. Pure.

const MINUS = '−' // typographic minus "−"; a hyphen reads as a dot in Playfair at 112px

/** Rounded temperature, U+2212 for negatives, "−0" shown as "0". */
export function formatTemp(c: number): string {
  const r = Math.round(c)
  if (r === 0) return '0' // also catches -0
  return r < 0 ? `${MINUS}${Math.abs(r)}` : String(r)
}

export function formatInt(n: number): string {
  const r = Math.round(n)
  return String(r === 0 ? 0 : r)
}

/**
 * Rain figure (phase 2 rule, UI-SPEC "Cifra"): rounded to 1 decimal; under 10 with a decimal
 * comma ("3,2", "5,0"; 0 stays "0"); from 10 on an integer ("12", "143").
 */
export function formatMm(mm: number): string {
  const r = Math.round(mm * 10) / 10
  if (r === 0) return '0'
  if (r >= 10) return formatInt(r)
  return r.toFixed(1).replace('.', ',')
}
