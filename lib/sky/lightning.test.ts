import { describe, expect, it } from 'vitest'
import {
  CONTENT_FLASH_FACTOR,
  FLASH_MAX_DELTA_L,
  FLASH_RGB_LINEAR,
  RISE_MS,
  forcedLightningPlan,
  lightningEnvelope,
  lightningPlan,
  mulberry32,
  peakAmplitude,
} from './lightning'
import { LMAX_CONTENT, luminance } from './palette'

const SEEDS = Array.from({ length: 20 }, (_, i) => 1000 + i * 7919)

function gaps(seed: number, intensity: number, duration = 600): number[] {
  const { events } = lightningPlan(seed, intensity, duration)
  return events.slice(1).map((e, i) => e.t - events[i].t)
}

describe('mulberry32', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('lightningPlan: intervals', () => {
  it('intensity 1 → every gap in [8, 16] s', () => {
    for (const seed of SEEDS) {
      const g = gaps(seed, 1)
      expect(g.length).toBeGreaterThan(20)
      for (const d of g) {
        expect(d).toBeGreaterThanOrEqual(8)
        expect(d).toBeLessThanOrEqual(16)
      }
    }
  })
  it('intensity 0.5 → every gap in [12, 24] s', () => {
    for (const seed of SEEDS) {
      for (const d of gaps(seed, 0.5)) {
        expect(d).toBeGreaterThanOrEqual(12)
        expect(d).toBeLessThanOrEqual(24)
      }
    }
  })
  it('intensity below 0.5 is floored at the 0.5 range', () => {
    for (const d of gaps(7, 0.1)) {
      expect(d).toBeGreaterThanOrEqual(12)
      expect(d).toBeLessThanOrEqual(24)
    }
  })
  it('intensity 0 or negative → no events', () => {
    expect(lightningPlan(1, 0, 600).events).toHaveLength(0)
    expect(lightningPlan(1, -1, 600).events).toHaveLength(0)
  })
  it('every event lies inside the window', () => {
    for (const seed of SEEDS) {
      for (const e of lightningPlan(seed, 1, 600).events) {
        expect(e.t).toBeGreaterThanOrEqual(0)
        expect(e.t).toBeLessThan(600)
      }
    }
  })
})

describe('lightningPlan: pulses and position', () => {
  it('1 or 2 pulses; the 2nd 150–250 ms later at 0.6; x in [0.15, 0.85]', () => {
    let seenTwo = false
    let seenOne = false
    for (const seed of SEEDS) {
      for (const e of lightningPlan(seed, 1, 600).events) {
        expect(e.pulses.length === 1 || e.pulses.length === 2).toBe(true)
        expect(e.x).toBeGreaterThanOrEqual(0.15)
        expect(e.x).toBeLessThanOrEqual(0.85)
        expect(e.pulses[0].t0).toBe(e.t)
        for (const p of e.pulses) {
          expect(p.decayMs).toBeGreaterThanOrEqual(300)
          expect(p.decayMs).toBeLessThanOrEqual(500)
        }
        if (e.pulses.length === 2) {
          seenTwo = true
          const delay = (e.pulses[1].t0 - e.pulses[0].t0) * 1000
          expect(delay).toBeGreaterThanOrEqual(150 - 1e-9)
          expect(delay).toBeLessThanOrEqual(250 + 1e-9)
          expect(e.pulses[1].amp).toBeCloseTo(e.pulses[0].amp * 0.6, 12)
        } else seenOne = true
      }
    }
    expect(seenOne && seenTwo).toBe(true)
  })
})

describe('lightningPlan: frequency (WCAG 2.3.1)', () => {
  it('never more than 2 pulse starts in any 1 s window (3600 s × 20 seeds, step 50 ms)', () => {
    for (const seed of SEEDS) {
      const starts = lightningPlan(seed, 1, 3600)
        .events.flatMap((e) => e.pulses.map((p) => p.t0))
        .sort((a, b) => a - b)
      let lo = 0
      let hi = 0
      for (let w = 0; w <= 3600; w += 0.05) {
        while (lo < starts.length && starts[lo] < w) lo++
        if (hi < lo) hi = lo
        while (hi < starts.length && starts[hi] < w + 1) hi++
        expect(hi - lo).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe('lightningEnvelope', () => {
  const plan = forcedLightningPlan(10, 0.4, 400)
  const peak = peakAmplitude()

  it('is 0 before the pulse and peaks 40 ms after its start', () => {
    expect(lightningEnvelope(plan, 9.999).amp).toBe(0)
    expect(lightningEnvelope(plan, 10 + RISE_MS / 1000).amp).toBeCloseTo(peak, 12)
    expect(lightningEnvelope(plan, 10 + RISE_MS / 1000).x).toBe(0.4)
  })
  it('never jumps from 0 to the peak (t0 + 10 ms < half the peak)', () => {
    expect(lightningEnvelope(plan, 10.01).amp).toBeLessThan(0.5 * peak)
    expect(lightningEnvelope(plan, 10.01).amp).toBeGreaterThan(0)
  })
  it('decays below 10 % of the peak after decayMs (300–500 ms) for every planned pulse', () => {
    for (const seed of SEEDS) {
      const p = lightningPlan(seed, 1, 600)
      for (const e of p.events) {
        if (e.pulses.length !== 1) continue
        const pulse = e.pulses[0]
        const at = pulse.t0 + (RISE_MS + pulse.decayMs) / 1000
        expect(lightningEnvelope(p, at).amp).toBeLessThan(0.1 * pulse.amp)
      }
    }
  })
  it('is monotonic during the decay', () => {
    let prev = Infinity
    for (let ms = RISE_MS; ms <= 1200; ms += 5) {
      const a = lightningEnvelope(plan, 10 + ms / 1000).amp
      expect(a).toBeLessThanOrEqual(prev)
      prev = a
    }
    expect(prev).toBe(0)
  })
  it('summed pulses never exceed the peak amplitude', () => {
    for (const seed of SEEDS) {
      const p = lightningPlan(seed, 1, 600)
      for (let t = 0; t < 600; t += 0.005) {
        expect(lightningEnvelope(p, t).amp).toBeLessThanOrEqual(peak + 1e-12)
      }
    }
  })
  it('writes into the out object when given (no per-frame allocation)', () => {
    const out = { amp: -1, x: -1 }
    const r = lightningEnvelope(plan, 10.04, out)
    expect(r).toBe(out)
    expect(out.amp).toBeCloseTo(peak, 12)
  })
})

describe('amplitude limits (C-5)', () => {
  it('FLASH_MAX_DELTA_L < 0.08', () => {
    expect(FLASH_MAX_DELTA_L).toBeLessThan(0.08)
  })
  it('the flash color is not pure white and its luminance × max amplitude ≤ FLASH_MAX_DELTA_L', () => {
    expect(FLASH_RGB_LINEAR.every((c) => c < 1)).toBe(true)
    let maxAmp = 0
    for (const seed of SEEDS) {
      for (const e of lightningPlan(seed, 1, 600).events) {
        for (const p of e.pulses) maxAmp = Math.max(maxAmp, p.amp)
      }
    }
    expect(luminance(FLASH_RGB_LINEAR) * maxAmp).toBeLessThanOrEqual(FLASH_MAX_DELTA_L + 1e-12)
    expect(luminance(FLASH_RGB_LINEAR) * peakAmplitude()).toBeCloseTo(FLASH_MAX_DELTA_L, 12)
  })
  it('content zone stays ≤ 0.10 at the peak', () => {
    expect(CONTENT_FLASH_FACTOR).toBeGreaterThan(0)
    expect(LMAX_CONTENT + FLASH_MAX_DELTA_L * CONTENT_FLASH_FACTOR).toBeLessThanOrEqual(0.1)
  })
})

describe('determinism', () => {
  it('same seed → same plan; different seeds → different plans', () => {
    expect(lightningPlan(123, 1, 600)).toEqual(lightningPlan(123, 1, 600))
    expect(lightningPlan(123, 1, 600)).not.toEqual(lightningPlan(124, 1, 600))
  })
})
