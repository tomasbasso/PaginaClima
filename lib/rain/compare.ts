// Comparison text against the prorated normal (D-03, UI-SPEC "Texto comparativo [default]"). Pure.
// Conditions are evaluated in the UI-SPEC table order: normal < 2 first, then observed < 0.5,
// then the ratio r = observed / normal.

/** Below this normal (mm) a ratio is meaningless: "Todavía es pronto para comparar". */
export const EARLY_NORMAL_MM = 2
/** Observed under this (mm) reads as no rain at all. */
export const NOTHING_MM = 0.5
/** ±10 % around the normal reads as "Casi lo normal" (edges included). */
export const NEAR_BAND = 0.1

const NBSP = ' '

/** Nearest multiple of 5. */
export function round5(p: number): number {
  return Math.round(p / 5) * 5
}

export function compareRain(observedMm: number, normalMm: number): string {
  if (normalMm < EARLY_NORMAL_MM) {
    return observedMm >= normalMm + EARLY_NORMAL_MM
      ? 'Más de lo normal para esta altura'
      : 'Todavía es pronto para comparar'
  }
  if (observedMm < NOTHING_MM) return 'Nada de lluvia todavía'
  const r = observedMm / normalMm
  if (r >= 1 - NEAR_BAND && r <= 1 + NEAR_BAND) return 'Casi lo normal'
  if (r < 1 - NEAR_BAND) return `${round5((1 - r) * 100)}${NBSP}% menos de lo normal`
  if (r < 2) return `${round5((r - 1) * 100)}${NBSP}% más de lo normal`
  if (r < 3) return 'Más del doble de lo normal'
  return 'Más del triple de lo normal'
}
