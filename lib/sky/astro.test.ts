import { describe, expect, it } from 'vitest'
import { astroAt } from './astro'

// Instants proven in phase.test.ts for Winifreda (2026-10-23).
const DIA = new Date('2026-10-23T15:00:00Z')
const NOCHE = new Date('2026-10-23T03:00:00Z')
const AMANECER = new Date('2026-10-23T09:15:00Z')
const ATARDECER = new Date('2026-10-23T22:45:00Z')

describe('astroAt', () => {
  it('splits morning and evening at solar noon', () => {
    expect(astroAt(AMANECER).morning).toBe(true)
    expect(astroAt(ATARDECER).morning).toBe(false)
  })

  it('gives the sun azimuth in degrees, clockwise from north', () => {
    const rise = astroAt(AMANECER).sunAzimuth
    const set = astroAt(ATARDECER).sunAzimuth
    expect(rise).toBeGreaterThanOrEqual(60)
    expect(rise).toBeLessThanOrEqual(120)
    expect(set).toBeGreaterThanOrEqual(240)
    expect(set).toBeLessThanOrEqual(300)
  })

  it.each([DIA, NOCHE, AMANECER, ATARDECER])('keeps every value in range (%s)', (t) => {
    const a = astroAt(t)
    expect(a.sunAzimuth).toBeGreaterThanOrEqual(0)
    expect(a.sunAzimuth).toBeLessThan(360)
    expect(a.moonAzimuth).toBeGreaterThanOrEqual(0)
    expect(a.moonAzimuth).toBeLessThan(360)
    expect(Math.abs(a.moonAltitude)).toBeLessThanOrEqual(90)
    expect(a.moonFraction).toBeGreaterThanOrEqual(0)
    expect(a.moonFraction).toBeLessThanOrEqual(1)
  })
})
