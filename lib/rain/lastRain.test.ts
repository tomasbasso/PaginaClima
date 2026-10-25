import { describe, expect, it } from 'vitest'
import { lastRainText, RAIN_DAY_MM } from './lastRain'
import type { RainDay } from './stitch'

const NB = ' '
const TODAY = '2026-10-25'
const START = '2025-10-03'
const d = (date: string, mm: number): RainDay => ({ date, mm, source: 'era5' })

describe('lastRainText', () => {
  it('uses 1 mm as a rain day', () => {
    expect(RAIN_DAY_MM).toBe(1)
  })

  it('today', () => {
    const r = lastRainText([d('2026-10-20', 5), d('2026-10-25', 3)], TODAY, START)
    expect(r).toEqual({ lead: 'Última lluvia: hoy, ', mmText: `3,0${NB}mm`, text: `Última lluvia: hoy, 3,0${NB}mm` })
  })

  it('yesterday', () => {
    const r = lastRainText([d('2026-10-24', 1), d('2026-10-25', 0.2)], TODAY, START)
    expect(r.text).toBe(`Última lluvia: ayer, 1,0${NB}mm`)
  })

  it('2 to 14 days ago', () => {
    const days = [d('2026-10-19', 12), d('2026-10-20', 0.8), d('2026-10-25', 0)]
    expect(lastRainText(days, TODAY, START).text).toBe(`Última lluvia: hace 6 días, 12${NB}mm`)
    expect(lastRainText([d('2026-10-11', 4.2)], TODAY, START).text).toBe(`Última lluvia: hace 14 días, 4,2${NB}mm`)
  })

  it('more than 14 days ago uses the date', () => {
    const r = lastRainText([d('2026-08-12', 22.4), d('2026-10-24', 0.9)], TODAY, START)
    expect(r.lead).toBe('Última lluvia: el 12 de agosto, ')
    expect(r.mmText).toBe(`22${NB}mm`)
  })

  it('none ≥ 1 mm (0.8 does not count)', () => {
    const r = lastRainText([d('2026-10-20', 0.8), d('2026-10-25', 0)], TODAY, START)
    expect(r).toEqual({
      lead: 'Sin lluvias de 1 mm o más desde el 3 de octubre',
      mmText: null,
      text: 'Sin lluvias de 1 mm o más desde el 3 de octubre',
    })
    expect(lastRainText([], TODAY, START).mmText).toBeNull()
  })
})
