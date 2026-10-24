import { describe, expect, it } from 'vitest'
import {
  cloudDriftPxPerS,
  coverFromCode,
  intensityFromCode,
  rainTiltDeg,
  skyParams,
} from './params'
import type { SkyState, SkyWeather } from './state'

const base = (weather: SkyWeather, extra: Partial<SkyState> = {}): SkyState => ({
  phase: 'noche',
  weather,
  sunAltitude: -30,
  ...extra,
})

describe('intensityFromCode (UI-SPEC "Intensidad")', () => {
  it.each([
    [51, 'lluvia', 0.25],
    [53, 'lluvia', 0.25],
    [55, 'lluvia', 0.4],
    [56, 'lluvia', 0.4],
    [57, 'lluvia', 0.4],
    [61, 'lluvia', 0.5],
    [80, 'lluvia', 0.5],
    [63, 'lluvia', 0.7],
    [66, 'lluvia', 0.7],
    [81, 'lluvia', 0.7],
    [65, 'lluvia', 1],
    [67, 'lluvia', 1],
    [82, 'lluvia', 1],
    [95, 'tormenta', 0.8],
    [96, 'tormenta', 1],
    [99, 'tormenta', 1],
  ] as const)('code %s → %s', (code, weather, expected) => {
    expect(intensityFromCode(code, weather)).toBe(expected)
  })

  it.each([
    [null, 'lluvia', 0.6],
    [null, 'tormenta', 0.8],
    [null, 'despejado', 0],
    [3, 'cubierto', 0],
    [45, 'niebla', 0],
    [1234, 'lluvia', 0.6],
  ] as const)('code %s without table entry → default for %s', (code, weather, expected) => {
    expect(intensityFromCode(code, weather)).toBe(expected)
  })

  it.each([
    [61, 1.2, 0.5],
    [61, 4.2, 0.7],
    [51, 12, 1],
    [63, null, 0.7],
    [null, 3, 0.6],
    [61, -5, 0.5],
    [61, Number.NaN, 0.5],
  ] as const)('code %s with %s mm → %s', (code, mm, expected) => {
    expect(intensityFromCode(code, 'lluvia', mm)).toBeCloseTo(expected, 10)
  })
})

describe('coverFromCode', () => {
  it.each([
    [0, 'despejado', 0],
    [1, 'despejado', 0.15],
    [2, 'despejado', 0.4],
    [3, 'cubierto', 0.85],
    [63, 'lluvia', 0.9],
    [95, 'tormenta', 0.95],
    [45, 'niebla', 0.3],
    [null, 'despejado', 0],
    [null, 'cubierto', 0.85],
    [null, 'lluvia', 0.9],
    [null, 'tormenta', 0.95],
    [null, 'niebla', 0.3],
  ] as const)('code %s (%s) → %s', (code, weather, expected) => {
    expect(coverFromCode(code, weather)).toBe(expected)
  })
})

describe('cloudDriftPxPerS', () => {
  it.each([
    [null, null, 6],
    [undefined, undefined, 6],
    [0, 270, 4],
    [20, 270, 7],
    [40, 270, 10],
    [90, 270, 12],
    [20, 90, -7],
    [20, null, 7],
  ] as const)('%s km/h from %s° → %s px/s', (kmh, dir, expected) => {
    expect(cloudDriftPxPerS(kmh, dir)).toBeCloseTo(expected, 10)
  })

  it('never exceeds 12 px/s in magnitude, even with absurd upstream values', () => {
    for (const kmh of [500, 1e9, Number.POSITIVE_INFINITY]) {
      expect(Math.abs(cloudDriftPxPerS(kmh, 90))).toBeLessThanOrEqual(12)
    }
    expect(cloudDriftPxPerS(Number.NaN, 270)).toBe(6)
  })
})

describe('rainTiltDeg', () => {
  it.each([
    [null, null, 8],
    [0, 270, 8],
    [30, 270, 14],
    [60, 270, 20],
    [90, 270, 20],
    [30, 90, -14],
    [30, null, 14],
  ] as const)('%s km/h from %s° → %s°', (kmh, dir, expected) => {
    expect(rainTiltDeg(kmh, dir)).toBeCloseTo(expected, 10)
  })

  it('has the same sign as the cloud drift', () => {
    for (const dir of [0, 45, 135, 200, 270, 315]) {
      expect(Math.sign(rainTiltDeg(25, dir))).toBe(Math.sign(cloudDriftPxPerS(25, dir)))
    }
  })
})

describe('skyParams', () => {
  it('uses the UI-SPEC mean values without optional fields', () => {
    expect(skyParams(base('lluvia'))).toEqual({
      cover: 0.9,
      intensity: 0.6,
      driftPxPerS: 6,
      rainTiltDeg: 8,
      rain: 0.6,
      fog: 0,
      starsFactor: 0,
    })
    expect(skyParams(base('tormenta')).rain).toBe(0.8)
    expect(skyParams(base('despejado'))).toMatchObject({ cover: 0, rain: 0, fog: 0, starsFactor: 1 })
  })

  it('uses cloudCover / 100 when present and clamps it', () => {
    expect(skyParams(base('cubierto', { cloudCover: 60 })).cover).toBe(0.6)
    expect(skyParams(base('cubierto', { cloudCover: 250 })).cover).toBe(1)
    expect(skyParams(base('cubierto', { cloudCover: null })).cover).toBe(0.85)
  })

  it.each([
    [0, 1],
    [15, 1],
    [40, 0.5],
  ])('clear sky with cover %s %% → starsFactor %s', (cover, expected) => {
    expect(skyParams(base('despejado', { cloudCover: cover })).starsFactor).toBeCloseTo(expected, 10)
  })

  it.each(['cubierto', 'lluvia', 'tormenta', 'niebla'] as const)('%s has no stars', (w) => {
    expect(skyParams(base(w, { cloudCover: 0 })).starsFactor).toBe(0)
  })

  it('rain only for lluvia and tormenta, fog only for niebla', () => {
    expect(skyParams(base('cubierto', { intensity: 0.7 })).rain).toBe(0)
    expect(skyParams(base('tormenta', { intensity: 1 })).rain).toBe(1)
    expect(skyParams(base('niebla')).fog).toBe(1)
    expect(skyParams(base('lluvia')).fog).toBe(0)
  })

  it('clamps intensity to 0..1 and feeds wind into drift and tilt', () => {
    const p = skyParams(base('lluvia', { intensity: 7, windKmh: 30, windDirDeg: 90 }))
    expect(p.intensity).toBe(1)
    expect(p.driftPxPerS).toBeCloseTo(-8.5, 10)
    expect(p.rainTiltDeg).toBeCloseTo(-14, 10)
  })
})
