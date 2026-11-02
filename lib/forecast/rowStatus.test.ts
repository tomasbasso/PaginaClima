import { describe, expect, it } from 'vitest'
import { describeWeather, WMO_CODES } from '@/lib/weather/wmo'
import { rowStatus, STATUS_WIDTH_COMPACT, STATUS_WIDTH_NORMAL, statusTextWidth } from './rowStatus'

// Hard space between number and unit, as the row sends it.
const mm = (text: string) => text.replace(' ', String.fromCharCode(0xa0))

type Word = 'Dudan' | 'Sin acuerdo' | 'Solo un modelo'

const normal = (label: string, word: Word | null, mmText: string | null, hasGlyph = true) =>
  rowStatus({ label, word, hasGlyph, mmText: mmText && mm(mmText) }).normal

const compact = (label: string, word: Word | null, mmText: string | null, hasGlyph = true) =>
  rowStatus({ label, word, hasGlyph, mmText: mmText && mm(mmText) }).compact

describe('rowStatus: variante normal, tabla "Casos a 390 px"', () => {
  it.each([
    ['Tormenta con granizo', null, '15–120 mm', 'Tormenta con granizo'],
    ['Tormenta con granizo', 'Dudan', '5–15 mm', 'Granizo'],
    ['Chaparrones fuertes', 'Dudan', '15–120 mm', 'Chaparrón'],
    ['Tormenta con granizo', 'Sin acuerdo', '15–120 mm', 'Granizo'],
    ['Lluvia fuerte', 'Sin acuerdo', '15–120 mm', 'Lluvia fuerte'],
    ['Casi despejado', 'Solo un modelo', '5–15 mm', 'Despejado'],
    ['Tormenta', 'Solo un modelo', '15–120 mm', null],
    ['Llovizna', 'Solo un modelo', '15–120 mm', 'Llovizna'],
  ] as const)('%s + %s + %s da %s', (label, word, mmText, expected) => {
    expect(normal(label, word, mmText)).toBe(expected)
  })
})

describe('rowStatus: variante compacta, tabla "A 320 px"', () => {
  it.each([
    ['Tormenta con granizo', null, '15–120 mm', 'Granizo'],
    ['Chaparrones fuertes', 'Dudan', '15–120 mm', 'Chaparrón'],
    ['Lluvia fuerte', 'Sin acuerdo', '4 mm', 'Lluvia'],
    ['Tormenta', 'Sin acuerdo', '5–15 mm', null],
    ['Despejado', 'Solo un modelo', null, 'Despejado'],
    ['Despejado', 'Solo un modelo', '5–15 mm', null],
    ['Nieve', 'Solo un modelo', '5–15 mm', null],
    ['Despejado', 'Solo un modelo', '120–250 mm', null],
  ] as const)('%s + %s + %s da %s', (label, word, mmText, expected) => {
    expect(compact(label, word, mmText)).toBe(expected)
  })

  it('el caso que se recortaba a 320 px usa el corto', () => {
    expect(compact('Chaparrones', 'Sin acuerdo', '2 mm')).toBe('Chaparrón')
  })
})

describe('rowStatus: bordes', () => {
  it('sin etiqueta no hay texto en ninguna variante', () => {
    expect(rowStatus({ label: null, word: 'Dudan', hasGlyph: true, mmText: null })).toEqual({
      normal: null,
      compact: null,
    })
  })

  it('sin glifo ni palabra, todo el ancho es del estado', () => {
    expect(compact('Tormenta con granizo', null, null, false)).toBe('Tormenta con granizo')
  })

  it('una etiqueta desconocida no lanza y se mide por carácter', () => {
    expect(statusTextWidth('Abc')).toBeCloseTo(31.2)
    expect(rowStatus({ label: 'Etiqueta nueva', word: null, hasGlyph: true, mmText: null }).normal).toBe(
      'Etiqueta nueva',
    )
  })
})

describe('rowStatus: producto cartesiano del UI-SPEC', () => {
  // Written out on purpose: the budget is computed here apart from the implementation.
  const WORDS: [Word | null, number][] = [
    [null, 0],
    ['Dudan', 51.9 + 8],
    ['Sin acuerdo', 101.1 + 8],
    ['Solo un modelo', 134.6 + 8],
  ]
  const MMS: [string | null, number][] = [
    [null, 0],
    ['4 mm', 32.7 + 8],
    ['120 mm', 49.9 + 8],
    ['5–15 mm', 57.4 + 8],
    ['15–120 mm', 74.6 + 8],
    ['120–250 mm', 83.2 + 8],
  ]
  const GLYPH = 20
  const SAFETY = 4
  const labels = [...new Set(WMO_CODES.map((c) => describeWeather(c, { night: false }).label))]

  it('recorre todos los códigos WMO', () => {
    expect(WMO_CODES.length).toBeGreaterThan(0)
    expect(labels).not.toContain(null)
  })

  it.each([
    ['normal', STATUS_WIDTH_NORMAL],
    ['compact', STATUS_WIDTH_COMPACT],
  ] as const)('a %s el presupuesto no da negativo y el texto elegido entra', (variant, width) => {
    for (const code of WMO_CODES) {
      const label = describeWeather(code, { night: false }).label
      for (const [word, wordW] of WORDS) {
        for (const [mmText, mmW] of MMS) {
          const budget = width - GLYPH - wordW - mmW - SAFETY
          expect(budget).toBeGreaterThanOrEqual(0)
          const chosen = rowStatus({ label, word, hasGlyph: true, mmText: mmText && mm(mmText) })[variant]
          if (chosen !== null) expect(statusTextWidth(chosen)).toBeLessThanOrEqual(budget)
        }
      }
    }
  })

  it('los anchos de la función valen para 327 y 272 px', () => {
    expect(STATUS_WIDTH_NORMAL).toBe(327)
    expect(STATUS_WIDTH_COMPACT).toBe(272)
  })
})
