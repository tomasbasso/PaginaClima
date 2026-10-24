import { describe, expect, it } from 'vitest'
import { rotorPeriodS } from './windmill'

describe('rotorPeriodS (UI-SPEC "Molino": clamp(36 / km/h, 1,5 s, 12 s))', () => {
  it.each([
    [null, null],
    [undefined, null],
    [0, null],
    [1.9, null],
    [Number.NaN, null],
    [2, 12],
    [5, 7.2],
    [20, 1.8],
    [24, 1.5],
    [90, 1.5],
  ])('%s km/h → %s s', (kmh, expected) => {
    const p = rotorPeriodS(kmh)
    if (expected === null) expect(p).toBeNull()
    else expect(p).toBeCloseTo(expected, 10)
  })
})
