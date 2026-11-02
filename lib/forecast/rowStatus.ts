// State text of line 2 of the daily row (UI-SPEC "Presupuesto de ancho", D-04). Pure.
// The glyph, the word and the mm never give way: only the state does, first to its short form and
// then away. The result is computed for two column widths and a container query picks one, so no
// text is measured at runtime and nothing waits for hydration.

export const STATUS_WIDTH_NORMAL = 327
export const STATUS_WIDTH_COMPACT = 272

const GLYPH_W = 20 // 12-px glyph + 8 gap
const GAP = 8
const SAFETY = 4
/** Worst case of the contract's widths (Chaparrón): an unknown label just shortens earlier. */
const PER_CHAR = 10.4

/**
 * Uppercase with tracking, 600 12px Plus Jakarta Sans. Most come from the contract; Cubierto, Niebla,
 * Nevada, Tormenta, Lluvia débil, Lluvia helada and Chaparrones were measured in Chrome (04-07).
 */
const WIDTHS: Record<string, number> = {
  'Tormenta con granizo': 188.0,
  'Chaparrones de nieve': 181.2,
  'Chaparrones fuertes': 178.6,
  'Llovizna intensa': 138.6,
  'Llovizna helada': 134.3,
  'Nevadas débiles': 133.9,
  'Casi despejado': 125.5,
  'Algo nublado': 117.2,
  'Lluvia helada': 112.6,
  Chaparrones: 110.3,
  'Lluvia fuerte': 109.4,
  'Lluvia débil': 97.4,
  Chaparrón: 92.7,
  Despejado: 86.4,
  Tormenta: 78.5,
  Cubierto: 74.3,
  Llovizna: 72.4,
  Nevadas: 69.3,
  Granizo: 67.2,
  Nevada: 58.9,
  Niebla: 52.5,
  Lluvia: 51.3,
  Nubes: 49.1,
  Nieve: 43.1,
}

const SHORT: Record<string, string> = {
  'Tormenta con granizo': 'Granizo',
  'Chaparrones de nieve': 'Nieve',
  'Chaparrones fuertes': 'Chaparrón',
  Chaparrones: 'Chaparrón',
  'Llovizna intensa': 'Llovizna',
  'Llovizna helada': 'Llovizna',
  'Nevadas débiles': 'Nevadas',
  'Casi despejado': 'Despejado',
  'Algo nublado': 'Nubes',
  'Lluvia débil': 'Lluvia',
  'Lluvia fuerte': 'Lluvia',
  'Lluvia helada': 'Lluvia',
}

type StatusWord = 'Dudan' | 'Sin acuerdo' | 'Solo un modelo'

const WORD_WIDTHS: Record<StatusWord, number> = {
  Dudan: 51.9,
  'Sin acuerdo': 101.1,
  'Solo un modelo': 134.6,
}

export const statusTextWidth = (text: string): number => WIDTHS[text] ?? text.length * PER_CHAR

function mmWidth(mmText: string): number {
  const digits = mmText.match(/\d/g)?.length ?? 0
  return 24.1 + 8.6 * digits + (mmText.includes('–') ? 7.5 : 0)
}

export function rowStatus(input: {
  label: string | null // full WMO label, sentence case
  word: StatusWord | null
  hasGlyph: boolean
  mmText: string | null // only when the mm are on line 2
}): { normal: string | null; compact: string | null } {
  const { label, word, hasGlyph, mmText } = input
  if (label === null) return { normal: null, compact: null }
  const taken =
    (hasGlyph ? GLYPH_W : 0) +
    (word ? WORD_WIDTHS[word] + GAP : 0) +
    (mmText ? mmWidth(mmText) + GAP : 0) +
    SAFETY
  const pick = (width: number): string | null => {
    const available = width - taken
    if (statusTextWidth(label) <= available) return label
    const short = SHORT[label]
    return short !== undefined && statusTextWidth(short) <= available ? short : null
  }
  return { normal: pick(STATUS_WIDTH_NORMAL), compact: pick(STATUS_WIDTH_COMPACT) }
}
