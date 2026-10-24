import { describe, expect, it } from 'vitest'
import type { SkyAstro } from './astro'
import { glowX, moonGlow, starsAlpha, sunGlow } from './glow'

const astro = (extra: Partial<SkyAstro> = {}): SkyAstro => ({
  morning: false,
  sunAzimuth: 270,
  moonAltitude: 30,
  moonAzimuth: 90,
  moonFraction: 1,
  ...extra,
})

describe('glowX (suncalc 2.x azimuth, looking north)', () => {
  it.each([
    [90, 0.9],
    [270, 0.1],
    [0, 0.5],
    [180, 0.5],
    [360, 0.5],
  ])('glowX(%f) = %f', (az, x) => {
    expect(glowX(az)).toBeCloseTo(x, 9)
  })
  it('stays within [0.1, 0.9]', () => {
    for (let az = -720; az <= 720; az += 7) {
      const x = glowX(az)
      expect(x).toBeGreaterThanOrEqual(0.1)
      expect(x).toBeLessThanOrEqual(0.9)
    }
  })
})

describe('sunGlow (UI-SPEC "Resplandores": −8° to +12°, peak at 0°, no disc)', () => {
  it.each([-30, -8.01, -9, 12.01, 13, 60])('strength 0 at %f°', (alt) => {
    expect(sunGlow(alt, 90).strength).toBe(0)
  })
  it('peaks at 1 on the horizon', () => {
    expect(sunGlow(0, 90).strength).toBeCloseTo(1, 9)
  })
  it('is monotonic towards both edges', () => {
    let prev = 0
    for (let alt = -8; alt <= 0; alt += 0.25) {
      const s = sunGlow(alt, 90).strength
      expect(s).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = s
    }
    prev = 1
    for (let alt = 0; alt <= 12; alt += 0.25) {
      const s = sunGlow(alt, 90).strength
      expect(s).toBeLessThanOrEqual(prev + 1e-12)
      prev = s
    }
  })
  it('rises on the right and sets on the left', () => {
    expect(sunGlow(0, 95).x).toBeGreaterThan(0.8)
    expect(sunGlow(0, 265).x).toBeLessThan(0.2)
  })
})

describe('moonGlow', () => {
  it('strength 0 below or on the horizon', () => {
    expect(moonGlow(astro({ moonAltitude: 0 }), 'despejado').strength).toBe(0)
    expect(moonGlow(astro({ moonAltitude: -10 }), 'despejado').strength).toBe(0)
  })
  it.each(['cubierto', 'lluvia', 'tormenta', 'niebla'] as const)('strength 0 with %s', (w) => {
    expect(moonGlow(astro(), w).strength).toBe(0)
  })
  it('proportional to the illuminated fraction', () => {
    expect(moonGlow(astro({ moonFraction: 1 }), 'despejado').strength).toBeCloseTo(1, 9)
    expect(moonGlow(astro({ moonFraction: 0.5 }), 'despejado').strength).toBeCloseTo(0.5, 9)
    expect(moonGlow(astro({ moonFraction: 0 }), 'despejado').strength).toBe(0)
  })
  it('yFrac: 1 on the horizon, 0.30 at ≥ 45°', () => {
    expect(moonGlow(astro({ moonAltitude: 0.0001 }), 'despejado').yFrac).toBeCloseTo(1, 3)
    expect(moonGlow(astro({ moonAltitude: 45 }), 'despejado').yFrac).toBeCloseTo(0.3, 9)
    expect(moonGlow(astro({ moonAltitude: 80 }), 'despejado').yFrac).toBeCloseTo(0.3, 9)
    const mid = moonGlow(astro({ moonAltitude: 22.5 }), 'despejado').yFrac
    expect(mid).toBeGreaterThan(0.3)
    expect(mid).toBeLessThan(1)
  })
  it('x follows the moon azimuth', () => {
    expect(moonGlow(astro({ moonAzimuth: 90 }), 'despejado').x).toBeCloseTo(0.9, 9)
    expect(moonGlow(astro({ moonAzimuth: 270 }), 'despejado').x).toBeCloseTo(0.1, 9)
  })
})

describe('starsAlpha (fade between −6° and −12°)', () => {
  it.each([-6, -5, 0, 30])('0 at %f°', (alt) => {
    expect(starsAlpha(alt)).toBe(0)
  })
  it.each([-12, -13, -40])('1 at %f°', (alt) => {
    expect(starsAlpha(alt)).toBe(1)
  })
  it('intermediate in between', () => {
    const a = starsAlpha(-9)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(1)
  })
})
