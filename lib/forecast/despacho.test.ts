import { describe, expect, it } from 'vitest'
import { addDaysToKey, weekdayLong } from '@/lib/time'
import type { Verdict } from './agreement'
import { buildDespacho, MAX_DESPACHO_CHARS, type DespachoTone } from './despacho'

const CODES: Record<string, Verdict> = {
  C: 'coinciden',
  D: 'dudan',
  X: 'desacuerdo',
  S: 'solo',
  N: 'sinDato',
}

const MON = '2026-11-02'
const WED = '2026-11-04'
const THU = '2026-11-05'
const FRI = '2026-11-06'
const SUN = '2026-11-08'

/** 'CCDX' from a start key: one letter per consecutive day. */
function week(pattern: string, start = MON) {
  return [...pattern].map((code, i) => ({ date: addDaysToKey(start, i), verdict: CODES[code] }))
}

function withinLimits(text: string) {
  expect(text.length).toBeLessThanOrEqual(MAX_DESPACHO_CHARS)
  expect(text).not.toContain('!')
  expect(text.endsWith('.')).toBe(true)
}

describe('buildDespacho (D-15) under TZ=UTC', () => {
  it('runs in UTC like Vercel', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(0)
  })

  it('the fixture week starts on a Monday', () => {
    expect(weekdayLong(MON)).toBe('lunes')
    expect(weekdayLong(WED)).toBe('miércoles')
    expect(weekdayLong(THU)).toBe('jueves')
    expect(weekdayLong(FRI)).toBe('viernes')
    expect(weekdayLong(SUN)).toBe('domingo')
  })

  it('caps the phrase at 82 characters', () => {
    expect(MAX_DESPACHO_CHARS).toBe(82)
  })

  describe('rule 0: nothing to say', () => {
    it.each([
      ['no rows', ''],
      ['every day without data', 'NNNNNNN'],
      ['two days with a verdict', 'CDNNNNN'],
      ['two solo days', 'SSNNNNN'],
    ])('%s', (_name, pattern) => {
      expect(buildDespacho(week(pattern), MON)).toBeNull()
    })

    it('three days with a verdict are enough', () => {
      expect(buildDespacho(week('CCCNNNN'), MON)).not.toBeNull()
    })
  })

  const cases: Array<[string, string, string, string, DespachoTone]> = [
    ['rule 1, four solo days', 'SSSSCCC', MON, 'Esta semana hay pocos modelos para comparar.', 'neutral'],
    ['rule 1 beats a disagreement', 'SSSSXCD', MON, 'Esta semana hay pocos modelos para comparar.', 'neutral'],

    ['rule 2, saturday', 'CCCCCXC', MON, 'El sábado los modelos no se ponen de acuerdo. El resto de la semana, coinciden.', 'ember'],
    ['rule 2, the longest phrase', 'CCXCCCC', MON, 'El miércoles los modelos no se ponen de acuerdo. El resto de la semana, coinciden.', 'ember'],
    ['rule 2, today', 'XCCCCCC', MON, 'Hoy los modelos no se ponen de acuerdo. El resto de la semana, coinciden.', 'ember'],
    ['rule 2, tomorrow', 'CXCCCCC', MON, 'Mañana los modelos no se ponen de acuerdo. El resto de la semana, coinciden.', 'ember'],

    ['rule 3, tomorrow with a mixed rest', 'CXDCCCC', MON, 'Mañana los modelos no se ponen de acuerdo.', 'ember'],
    ['rule 3, a solo day is not "coinciden"', 'CCCCCXS', MON, 'El sábado los modelos no se ponen de acuerdo.', 'ember'],
    ['rule 3, a day without data is not "coinciden"', 'CCCCCXN', MON, 'El sábado los modelos no se ponen de acuerdo.', 'ember'],

    ['rule 4', 'CCXXCCC', MON, 'Para el miércoles y el jueves no hay acuerdo entre los modelos.', 'ember'],
    ['rule 4, today and tomorrow', 'XXCCCCC', MON, 'Para hoy y mañana no hay acuerdo entre los modelos.', 'ember'],
    ['rule 4, tomorrow and wednesday', 'CXXCCCC', MON, 'Para mañana y el miércoles no hay acuerdo entre los modelos.', 'ember'],

    ['rule 5', 'CCXXXCC', MON, 'Del miércoles al viernes no hay acuerdo entre los modelos.', 'ember'],
    ['rule 5, from today', 'XXXCCCC', MON, 'De hoy al miércoles no hay acuerdo entre los modelos.', 'ember'],
    ['rule 5, from tomorrow', 'CXXXCCC', MON, 'De mañana al jueves no hay acuerdo entre los modelos.', 'ember'],

    ['rule 6, two days apart', 'XCXCCCC', MON, 'Esta semana los modelos no se ponen de acuerdo en varios días.', 'ember'],
    ['rule 6, a solo day splits the run', 'XSXCCCC', MON, 'Esta semana los modelos no se ponen de acuerdo en varios días.', 'ember'],

    ['rule 7', 'CCCCCCC', MON, 'Toda la semana los modelos coinciden.', 'azure'],
    ['rule 7, fewer than 7 rows', 'CCCCC', MON, 'Hasta el viernes los modelos coinciden.', 'azure'],

    ['rule 7b, a solo day', 'CCCCCCS', MON, 'Los días que se pueden comparar, los modelos coinciden.', 'neutral'],
    ['rule 7b, a day without data', 'CCCCCCN', MON, 'Los días que se pueden comparar, los modelos coinciden.', 'neutral'],

    ['rule 8', 'CCCCCDD', MON, 'Hasta el viernes los modelos coinciden. El fin de semana, dudan.', 'sun'],
    ['rule 8, friday is today', 'CDDCCCC', FRI, 'Hoy los modelos coinciden. El fin de semana, dudan.', 'sun'],
    ['rule 8, friday is tomorrow', 'CCDDCCC', THU, 'Hasta mañana los modelos coinciden. El fin de semana, dudan.', 'sun'],

    ['rule 9', 'CCCCDDD', MON, 'Hasta el jueves los modelos coinciden. Después, dudan.', 'sun'],
    ['rule 9, today', 'CDDDDDD', MON, 'Hoy los modelos coinciden. Después, dudan.', 'sun'],
    ['rule 9, tomorrow', 'CCDDDDD', MON, 'Hasta mañana los modelos coinciden. Después, dudan.', 'sun'],
    ['rule 9, a weekend that does not reach friday', 'CCCCCD', MON, 'Hasta el viernes los modelos coinciden. Después, dudan.', 'sun'],

    ['rule 10', 'DDDDDCC', THU, 'Hasta el lunes los modelos dudan. Desde el martes se acomodan.', 'sun'],
    ['rule 10, today', 'DCCCCCC', MON, 'Hoy los modelos dudan. Desde mañana se acomodan.', 'sun'],
    ['rule 10, today and tomorrow', 'DDCCCCC', MON, 'Hoy y mañana los modelos dudan. Desde el miércoles se acomodan.', 'sun'],

    ['rule 11', 'CDDDCDD', MON, 'Semana difícil de leer: los modelos dudan casi todos los días.', 'sun'],
    ['rule 11, every day doubts', 'DDDDDDD', MON, 'Semana difícil de leer: los modelos dudan casi todos los días.', 'sun'],

    ['rule 12', 'CDCDCDC', MON, 'Los modelos coinciden algunos días y dudan otros.', 'sun'],
    ['rule 12, doubt in the middle', 'CCDDDCC', MON, 'Los modelos coinciden algunos días y dudan otros.', 'sun'],
    ['rule 12, doubt on sunday and saturday is not a weekend', 'DCCCCCD', SUN, 'Los modelos coinciden algunos días y dudan otros.', 'sun'],
    ['rule 12, a solo day breaks "hasta"', 'CCSDDDD', MON, 'Los modelos coinciden algunos días y dudan otros.', 'sun'],
    ['rule 12, a missing day breaks "se acomodan"', 'DDCCCCN', MON, 'Los modelos coinciden algunos días y dudan otros.', 'sun'],
  ]

  it.each(cases)('%s', (_name, pattern, start, text, tone) => {
    const out = buildDespacho(week(pattern, start), start)
    expect(out).toEqual({ text, tone })
    withinLimits(out!.text)
  })

  // The table above has no phrase for these two: rule 7b and rule 12 would claim an agreement nobody saw.
  describe('never a false agreement (T-04-19)', () => {
    it('only solo days say there is little to compare', () => {
      expect(buildDespacho(week('SSSNNNN'), MON)).toEqual({
        text: 'Esta semana hay pocos modelos para comparar.',
        tone: 'neutral',
      })
    })

    it.each(['DDDDNNN', 'DDDSSSN', 'DDD'])('%s doubts and never says "coinciden"', (pattern) => {
      expect(buildDespacho(week(pattern), MON)).toEqual({
        text: 'Los días que se pueden comparar, los modelos dudan.',
        tone: 'sun',
      })
    })
  })

  describe('sweep', () => {
    const letters = Object.keys(CODES)

    function* patterns(alphabet: string[], length: number): Generator<string> {
      if (length === 0) {
        yield ''
        return
      }
      for (const head of alphabet) for (const tail of patterns(alphabet, length - 1)) yield head + tail
    }

    function honest(pattern: string, start: string) {
      const out = buildDespacho(week(pattern, start), start)
      if (out === null) return
      withinLimits(out.text)
      if (/coinciden/.test(out.text)) expect(pattern).toContain('C')
      if (/dudan/.test(out.text)) expect(pattern).toContain('D')
      if (/acuerdo/.test(out.text)) expect(pattern).toContain('X')
      // The two neutral phrases are the only ones that may leave solo days out of the count.
      if (out.tone === 'azure') expect(pattern).toMatch(/^C+$/)
    }

    it('every week starting on wednesday, the longest day name', () => {
      for (const pattern of patterns(letters, 7)) honest(pattern, WED)
    })

    it('every start day with the three comparable verdicts', () => {
      for (let i = 0; i < 7; i++) {
        const start = addDaysToKey(MON, i)
        for (const pattern of patterns(['C', 'D', 'X'], 7)) honest(pattern, start)
      }
    })
  })
})
