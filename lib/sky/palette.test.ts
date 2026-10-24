import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  LMAX_CONTENT,
  type Rgb8,
  TOKEN_STOPS,
  hexToLinear,
  luminance,
  mixLinear,
  skyPalette,
  toLinear,
} from './palette'
import type { SkyToken, SkyWeather } from './state'

const TOKENS: SkyToken[] = ['noche', 'amanecer', 'dia', 'atardecer', 'cubierto', 'tormenta']
const WEATHERS: SkyWeather[] = ['despejado', 'cubierto', 'lluvia', 'tormenta', 'niebla']
/** UI-SPEC "Anclas de color": ±12 per sRGB channel at the anchors. */
const TOL = 12

function hexTo8(hex: string): Rgb8 {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function expectNear(actual: readonly Rgb8[], token: SkyToken) {
  TOKEN_STOPS[token].forEach((hex, i) => {
    const want = hexTo8(hex)
    for (let ch = 0; ch < 3; ch++) {
      expect(Math.abs(actual[i][ch] - want[ch]), `${token} S${i + 1} ch${ch}`).toBeLessThanOrEqual(TOL)
    }
  })
}

describe('TOKEN_STOPS', () => {
  it('matches the hex values of app/globals.css', () => {
    const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8')
    for (const token of TOKENS) {
      const block = css.match(new RegExp(`\\[data-sky="${token}"\\]\\s*\\{([^}]*)\\}`))
      expect(block, token).not.toBeNull()
      const stops = [1, 2, 3, 4, 5].map((i) => {
        const m = block![1].match(new RegExp(`--sky-${i}:\\s*(#[0-9a-fA-F]{6})`))
        return m?.[1].toLowerCase()
      })
      expect(stops, token).toEqual([...TOKEN_STOPS[token]])
    }
  })
})

describe('toLinear / luminance', () => {
  it('uses the exact piecewise sRGB transfer', () => {
    expect(toLinear(0)).toBe(0)
    expect(toLinear(255)).toBeCloseTo(1, 10)
    expect(toLinear(10)).toBeCloseTo(10 / 255 / 12.92, 10)
  })

  it('S3 of dia is ≈ 0.073, the C-1 reference', () => {
    expect(luminance(hexToLinear('#284f75'))).toBeCloseTo(0.073, 3)
  })
})

describe('skyPalette anchors (D-06)', () => {
  it.each([-12, -20, -40])('clear sky at %s° is noche', (alt) => {
    expectNear(skyPalette(alt, 'despejado', true).srgb, 'noche')
    expectNear(skyPalette(alt, 'despejado', false).srgb, 'noche')
  })

  it('clear sky at 0° is amanecer in the morning and atardecer in the evening', () => {
    expectNear(skyPalette(0, 'despejado', true).srgb, 'amanecer')
    expectNear(skyPalette(0, 'despejado', false).srgb, 'atardecer')
  })

  it.each([15, 30, 70])('clear sky at %s° is dia', (alt) => {
    expectNear(skyPalette(alt, 'despejado', true).srgb, 'dia')
    expectNear(skyPalette(alt, 'despejado', false).srgb, 'dia')
  })

  it.each([15, 40])('overcast by day (%s°) converges to cubierto', (alt) => {
    expectNear(skyPalette(alt, 'cubierto', true).srgb, 'cubierto')
    expectNear(skyPalette(alt, 'lluvia', false).srgb, 'cubierto')
  })

  it('overcast at night stays noche', () => {
    expectNear(skyPalette(-20, 'cubierto', true).srgb, 'noche')
    expectNear(skyPalette(-12, 'lluvia', false).srgb, 'noche')
  })

  it.each([-12, -6, 0, 10, 40])('tormenta at %s° converges to tormenta', (alt) => {
    expectNear(skyPalette(alt, 'tormenta', true).srgb, 'tormenta')
    expectNear(skyPalette(alt, 'tormenta', false).srgb, 'tormenta')
  })

  it('tormenta deep at night darkens towards S1 of noche', () => {
    const night = skyPalette(-30, 'tormenta', true).linear
    const storm = TOKEN_STOPS.tormenta.map(hexToLinear)
    for (let i = 0; i < 5; i++) expect(luminance(night[i])).toBeLessThan(luminance(storm[i]))
  })

  // A token switch moves a channel by ~100; near black the sRGB curve is steep, so a 0.1° step
  // may move a channel by a few units. ≤ 6 rules out jumps without fighting the transfer curve.
    it('is continuous in sunAltitude (no jumps between 0.1° steps)', () => {
    for (const w of WEATHERS) {
      for (const morning of [true, false]) {
        for (let a = -25; a <= 30; a += 0.1) {
          const p = skyPalette(a, w, morning).srgb
          const q = skyPalette(a + 0.1, w, morning).srgb
          for (let i = 0; i < 5; i++) {
            for (let ch = 0; ch < 3; ch++) {
              expect(Math.abs(p[i][ch] - q[i][ch]), `${w} ${a.toFixed(1)}° S${i + 1}`).toBeLessThanOrEqual(6)
            }
          }
        }
      }
    }
  })
})

describe('C-1: content-zone luminance', () => {
  it('S1..S3 stay ≤ LMAX_CONTENT for every altitude, weather and half of the day', () => {
    let samples = 0
    for (let i = 0; i <= 180; i++) {
      const alt = -20 + i * 0.5
      for (const w of WEATHERS) {
        for (const morning of [true, false]) {
          const { linear } = skyPalette(alt, w, morning)
          for (let s = 0; s < 3; s++) {
            expect(luminance(linear[s]), `${w} ${alt}° S${s + 1}`).toBeLessThanOrEqual(LMAX_CONTENT)
          }
          samples++
        }
      }
    }
    expect(samples).toBe(181 * 5 * 2)
  })
})

describe('C-2: linear mixing never exceeds the brighter end', () => {
  it('holds for every pair of token colors', () => {
    const colors = TOKENS.flatMap((t) => TOKEN_STOPS[t].map(hexToLinear))
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const a = colors[i]
        const b = colors[j]
        const top = Math.max(luminance(a), luminance(b))
        for (let k = 0; k <= 20; k++) {
          expect(luminance(mixLinear(a, b, k * 0.05))).toBeLessThanOrEqual(top + 1e-9)
        }
      }
    }
  })
})
