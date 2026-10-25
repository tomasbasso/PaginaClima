import { describe, expect, it } from 'vitest'
import { compareRain, EARLY_NORMAL_MM, NEAR_BAND, NOTHING_MM } from './compare'

const NB = ' '

describe('compareRain', () => {
  it('exports the named thresholds', () => {
    expect(EARLY_NORMAL_MM).toBe(2)
    expect(NOTHING_MM).toBe(0.5)
    expect(NEAR_BAND).toBe(0.1)
  })

  it('normal < 2: too early unless observed ≥ normal + 2', () => {
    expect(compareRain(0, 0)).toBe('Todavía es pronto para comparar')
    expect(compareRain(1, 1.5)).toBe('Todavía es pronto para comparar')
    expect(compareRain(3.4, 1.5)).toBe('Todavía es pronto para comparar')
    expect(compareRain(3.5, 1.5)).toBe('Más de lo normal para esta altura')
  })

  it('observed < 0.5 with normal ≥ 2 is nothing yet', () => {
    expect(compareRain(0.4, 10)).toBe('Nada de lluvia todavía')
    expect(compareRain(0, 2)).toBe('Nada de lluvia todavía')
  })

  it('near band includes 0.9 and 1.1', () => {
    expect(compareRain(9, 10)).toBe('Casi lo normal')
    expect(compareRain(10, 10)).toBe('Casi lo normal')
    expect(compareRain(11, 10)).toBe('Casi lo normal')
  })

  it('less than normal, rounded to multiples of 5 with a no-break space', () => {
    expect(compareRain(8, 10)).toBe(`20${NB}% menos de lo normal`)
    expect(compareRain(6.8, 10)).toBe(`30${NB}% menos de lo normal`)
    expect(compareRain(0.6, 10)).toBe(`95${NB}% menos de lo normal`)
  })

  it('more than normal below double, then double and triple', () => {
    expect(compareRain(13.4, 10)).toBe(`35${NB}% más de lo normal`)
    expect(compareRain(19.9, 10)).toBe(`100${NB}% más de lo normal`)
    expect(compareRain(20, 10)).toBe('Más del doble de lo normal')
    expect(compareRain(29.9, 10)).toBe('Más del doble de lo normal')
    expect(compareRain(30, 10)).toBe('Más del triple de lo normal')
    expect(compareRain(100, 10)).toBe('Más del triple de lo normal')
  })
})
