import { describe, expect, it } from 'vitest'
import { localDateKey } from '@/lib/time'
import { moonGeometry, moonInfo, moonPath, moonPhaseName, nextFullMoon } from './moon'

const OCT_25 = new Date('2026-10-25T14:00:00Z')
const FULL_DISC = 'M 32 1 A 31 31 0 1 1 32 63 A 31 31 0 1 1 32 1 Z'

describe('moonGeometry (southern hemisphere)', () => {
  it('lights the left side while waxing and the right side while waning', () => {
    expect(moonGeometry(0.25, true)).toEqual({ litSide: 'left', rx: 15.5 })
    expect(moonGeometry(0.25, false)).toEqual({ litSide: 'right', rx: 15.5 })
  })
})

describe('moonPath', () => {
  it('draws the waxing quarter lit on the left', () => {
    expect(moonPath(0.25, true)).toBe('M 32 1 A 31 31 0 0 0 32 63 A 15.5 31 0 0 1 32 1 Z')
  })

  it('draws the waxing gibbous adding past the center', () => {
    expect(moonPath(0.75, true)).toBe('M 32 1 A 31 31 0 0 0 32 63 A 15.5 31 0 0 0 32 1 Z')
  })

  it('draws the waning shapes lit on the right', () => {
    expect(moonPath(0.25, false)).toBe('M 32 1 A 31 31 0 0 1 32 63 A 15.5 31 0 0 0 32 1 Z')
    expect(moonPath(0.75, false)).toBe('M 32 1 A 31 31 0 0 1 32 63 A 15.5 31 0 0 1 32 1 Z')
  })

  it('handles the new and full moon extremes', () => {
    expect(moonPath(0.01, true)).toBeNull()
    expect(moonPath(0, false)).toBeNull()
    expect(moonPath(0.99, true)).toBe(FULL_DISC)
    expect(moonPath(0.99, false)).toBe(FULL_DISC)
  })
})

describe('moonPhaseName', () => {
  it.each([
    [0, 'Luna nueva'],
    [0.97, 'Luna nueva'],
    [0.1, 'Luna creciente'],
    [0.25, 'Cuarto creciente'],
    [0.35, 'Gibosa creciente'],
    [0.5, 'Luna llena'],
    [0.6, 'Gibosa menguante'],
    [0.75, 'Cuarto menguante'],
    [0.85, 'Luna menguante'],
  ])('phase %s → %s', (phase, name) => {
    expect(moonPhaseName(phase)).toBe(name)
  })
})

describe('nextFullMoon', () => {
  it('finds the full moon of 2026-10-26 (ART)', () => {
    const d = nextFullMoon(OCT_25)
    expect(d).not.toBeNull()
    expect(localDateKey(d as Date)).toBe('2026-10-26')
  })
})

describe('moonInfo (ASTRO-02)', () => {
  it('names the phase, the illuminated percent, and omits "Llena el" while it is full', () => {
    const m = moonInfo(OCT_25)
    expect(m.name).toBe('Luna llena')
    expect(m.illuminatedText).toBe('Iluminada al 99 %')
    expect(m.fullMoonText).toBeNull()
    expect(m.path).toBe(FULL_DISC)
  })

  it('gives "Llena el …" with the long day when the moon is not full', () => {
    const m = moonInfo(new Date('2026-11-05T15:00:00Z'))
    expect(m.name).not.toBe('Luna llena')
    expect(m.fullMoonText).toMatch(/^Llena el \S+ \d{1,2} de \S+$/)
  })

  it('writes the moon rise and set times when suncalc has them', () => {
    expect(moonInfo(OCT_25).timesText).toBe('Sale 07:29 · se pone 05:37')
    expect(moonInfo(OCT_25).srText).toContain('Luna llena')
  })
})
