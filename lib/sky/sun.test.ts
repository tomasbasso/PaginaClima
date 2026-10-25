import { describe, expect, it } from 'vitest'
import { formatDuration, sunDay } from './sun'

// Instants in UTC; Winifreda days in ART (UTC−3, no DST).
const OCT_25 = new Date('2026-10-25T14:00:00Z')
const JUN_10 = new Date('2026-06-10T15:00:00Z')
const DEC_10 = new Date('2026-12-10T15:00:00Z')
const DEC_21 = new Date('2026-12-21T15:00:00Z')

describe('sunDay (ASTRO-01)', () => {
  it('gives sunrise, sunset, day length and the delta for 2026-10-25', () => {
    const s = sunDay(OCT_25)
    expect(s.sunrise).toBe('06:20')
    expect(s.sunset).toBe('19:42')
    expect(s.durationText).toBe('13 h 22 min')
    expect(s.deltaText).toBe('2 min más que ayer')
  })

  it('writes the screen-reader sentence with full words', () => {
    expect(sunDay(OCT_25).srText).toBe(
      'El sol sale a las 06:20 y se pone a las 19:42. 13 horas y 22 minutos de luz, 2 minutos más que ayer.',
    )
  })

  it('shortens the days in June and lengthens them in December', () => {
    expect(sunDay(JUN_10).deltaText).toMatch(/^\d+ min menos que ayer$/)
    const [h] = sunDay(DEC_10).durationText.split(' h ')
    expect(Number(h)).toBeGreaterThanOrEqual(14)
  })

  it('says "igual que ayer" next to the solstice', () => {
    expect(sunDay(DEC_21).deltaText).toBe('igual que ayer')
  })

  it.each([OCT_25, JUN_10, DEC_10, DEC_21])('keeps the ruler fractions in [0, 1] (%s)', (t) => {
    const { riseFrac, setFrac, nowFrac } = sunDay(t).ruler
    for (const f of [riseFrac, setFrac, nowFrac]) {
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
    }
    expect(riseFrac).toBeLessThan(setFrac)
  })

  it('places the ruler marks as minutes since 00:00 ART / 1440', () => {
    const { riseFrac, setFrac, nowFrac } = sunDay(OCT_25).ruler
    // 14:00Z = 11:00 ART
    expect(nowFrac).toBeCloseTo(660 / 1440, 6)
    expect(riseFrac * 1440).toBeGreaterThanOrEqual(6 * 60 + 20)
    expect(riseFrac * 1440).toBeLessThan(6 * 60 + 21)
    expect(setFrac * 1440).toBeGreaterThanOrEqual(19 * 60 + 42)
    expect(setFrac * 1440).toBeLessThan(19 * 60 + 43)
  })
})

describe('formatDuration', () => {
  it('pads the minutes to two digits', () => {
    expect(formatDuration(786)).toBe('13 h 06 min')
    expect(formatDuration(801.78)).toBe('13 h 22 min')
  })
})
