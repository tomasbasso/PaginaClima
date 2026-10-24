import { describe, expect, it } from 'vitest'
import {
  parseSkyLabParams,
  SKY_LAB_PRESETS,
  SKY_LAB_WMO_CODES,
  type SkyLabState,
  toSkyAstro,
  toSkyLabQuery,
  toSkyState,
} from './devParams'

const DEFAULTS: SkyLabState = {
  alt: 30,
  lado: 'tarde',
  clima: 'despejado',
  wmo: null,
  i: null,
  viento: 10,
  dir: null,
  nubes: null,
  escala: 0.5,
}

describe('parseSkyLabParams', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseSkyLabParams({})).toEqual(DEFAULTS)
  })

  it.each([
    ['1e309', 30],
    ['-50', -20],
    ['80', 70],
    ['-3.3', -3.5],
    ['abc', 30],
    ['', 30],
    ['Infinity', 30],
    ['12.74', 12.5],
  ])('alt %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ alt: raw }).alt).toBe(expected)
  })

  it.each([
    ['1.7', 1],
    ['-1', 0],
    ['0.33', 0.35],
    ['0.6', 0.6],
    ['nope', null],
    ['', null],
  ])('i %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ i: raw }).i).toBe(expected)
  })

  it.each([
    ['200', 90],
    ['-5', 0],
    ['18.4', 18],
    ['x', 10],
  ])('viento %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ viento: raw }).viento).toBe(expected)
  })

  it.each([
    ['33', 35],
    ['101', 100],
    ['-3', 0],
    ['abc', null],
  ])('nubes %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ nubes: raw }).nubes).toBe(expected)
  })

  it.each([
    ['225', 225],
    ['0', 0],
    ['315', 315],
    ['10', null],
    ['360', null],
    ['abc', null],
  ])('dir %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ dir: raw }).dir).toBe(expected)
  })

  it.each([
    ['<script>', 'despejado'],
    ['tormenta', 'tormenta'],
    ['niebla', 'niebla'],
    ['TORMENTA', 'despejado'],
  ])('clima %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ clima: raw }).clima).toBe(expected)
  })

  it.each([
    ['x', 'tarde'],
    ['mañana', 'mañana'],
    ['tarde', 'tarde'],
  ])('lado %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ lado: raw }).lado).toBe(expected)
  })

  it.each([
    ['63', 63],
    ['999', null],
    ['4', null],
    ['63.5', null],
    ['', null],
  ])('wmo %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ wmo: raw }).wmo).toBe(expected)
  })

  it.each([
    ['0.75', 0.75],
    ['0.5', 0.5],
    ['2', 0.5],
    ['1', 0.5],
  ])('escala %s → %s', (raw, expected) => {
    expect(parseSkyLabParams({ escala: raw }).escala).toBe(expected)
  })

  it('takes the first value of repeated params', () => {
    const s = parseSkyLabParams({ alt: ['-10', '50'], clima: ['lluvia', 'tormenta'] })
    expect(s.alt).toBe(-10)
    expect(s.clima).toBe('lluvia')
  })

  it('never returns query text (malicious values fall back)', () => {
    const s = parseSkyLabParams({
      alt: '"><img src=x>',
      lado: '<b>',
      clima: '<script>alert(1)</script>',
      wmo: 'javascript:',
      i: '<i>',
      viento: '<v>',
      dir: '<d>',
      nubes: '<n>',
      escala: '<e>',
    })
    expect(s).toEqual(DEFAULTS)
  })
})

describe('toSkyLabQuery', () => {
  it.each(SKY_LAB_PRESETS.map((p) => [p.name, p.state] as const))(
    'round-trips preset %s',
    (_name, state) => {
      const q = toSkyLabQuery(state)
      const parsed = parseSkyLabParams(Object.fromEntries(new URLSearchParams(q)))
      expect(parsed).toEqual(state)
      expect(toSkyLabQuery(parsed)).toBe(q)
    },
  )

  it('omits null fields', () => {
    expect(toSkyLabQuery(DEFAULTS)).toBe('alt=30&lado=tarde&clima=despejado&viento=10&escala=0.5')
  })
})

describe('toSkyState', () => {
  it.each([
    [-30, 'tarde', 'noche'],
    [-6.5, 'mañana', 'noche'],
    [-6, 'mañana', 'amanecer'],
    [-2, 'mañana', 'amanecer'],
    [2, 'tarde', 'atardecer'],
    [5.5, 'tarde', 'atardecer'],
    [6, 'tarde', 'dia'],
    [60, 'mañana', 'dia'],
  ] as const)('alt %s %s → %s', (alt, lado, phase) => {
    expect(toSkyState({ ...DEFAULTS, alt, lado }).phase).toBe(phase)
  })

  it('derives intensity and cover from the code when not forced', () => {
    const s = toSkyState({ ...DEFAULTS, clima: 'lluvia', wmo: 63, viento: 25, dir: 270 })
    expect(s).toEqual({
      phase: 'dia',
      weather: 'lluvia',
      sunAltitude: 30,
      intensity: 0.7,
      cloudCover: 90,
      windKmh: 25,
      windDirDeg: 270,
    })
  })

  it('uses forced intensity and cover', () => {
    const s = toSkyState({ ...DEFAULTS, clima: 'tormenta', wmo: 95, i: 0.3, nubes: 40 })
    expect(s.intensity).toBe(0.3)
    expect(s.cloudCover).toBe(40)
  })

  it('code 1 on a clear sky gives 15 % cover; no code gives the weather default', () => {
    expect(toSkyState({ ...DEFAULTS, wmo: 1 }).cloudCover).toBe(15)
    expect(toSkyState({ ...DEFAULTS, clima: 'cubierto' }).cloudCover).toBe(85)
    expect(toSkyState({ ...DEFAULTS, clima: 'tormenta' }).intensity).toBe(0.8)
  })
})

describe('toSkyAstro', () => {
  it('morning → sun in the east (90°), afternoon → west (270°), no moon', () => {
    expect(toSkyAstro({ ...DEFAULTS, lado: 'mañana' })).toEqual({
      morning: true,
      sunAzimuth: 90,
      moonAltitude: -1,
      moonAzimuth: 0,
      moonFraction: 0,
    })
    const pm = toSkyAstro(DEFAULTS)
    expect(pm.morning).toBe(false)
    expect(pm.sunAzimuth).toBe(270)
    expect(pm.moonAltitude).toBeLessThan(0)
  })
})

describe('SKY_LAB_PRESETS', () => {
  it('has the 11 presets of the UI-SPEC with their exact values', () => {
    const rows = SKY_LAB_PRESETS.map(({ name, state: s }) => [
      name,
      s.alt,
      s.lado,
      s.clima,
      s.wmo,
      s.viento,
    ])
    expect(rows).toEqual([
      ['Noche estrellada', -30, 'tarde', 'despejado', 0, 6],
      ['Amanecer', -2, 'mañana', 'despejado', null, 8],
      ['Siesta', 60, 'tarde', 'despejado', null, 14],
      ['Día nublado', 35, 'tarde', 'cubierto', 3, 20],
      ['Atardecer', 2, 'tarde', 'despejado', 1, 10],
      ['Lluvia de día', 30, 'tarde', 'lluvia', 63, 25],
      ['Llovizna al atardecer', -1, 'tarde', 'lluvia', 51, 12],
      ['Tormenta de noche', -25, 'tarde', 'tormenta', 95, 50],
      ['Tormenta de día', 40, 'tarde', 'tormenta', 99, 60],
      ['Niebla al amanecer', 1, 'mañana', 'niebla', 45, 0],
      ['Noche nublada', -25, 'tarde', 'cubierto', null, 15],
    ])
    for (const { state: s } of SKY_LAB_PRESETS) {
      expect(s.i).toBeNull()
      expect(s.nubes).toBeNull()
      expect(s.dir).toBeNull()
      expect(s.escala).toBe(0.5)
    }
  })
})

describe('SKY_LAB_WMO_CODES', () => {
  it('lists the codes of the WMO table in order, with labels', () => {
    const codes = SKY_LAB_WMO_CODES.map((c) => c.code)
    expect(codes[0]).toBe(0)
    expect(codes).toContain(63)
    expect(codes).toContain(99)
    expect(codes).not.toContain(4)
    expect([...codes].sort((a, b) => a - b)).toEqual(codes)
    expect(SKY_LAB_WMO_CODES.find((c) => c.code === 95)?.label).toBe('Tormenta')
  })
})
