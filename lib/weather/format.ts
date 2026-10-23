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
