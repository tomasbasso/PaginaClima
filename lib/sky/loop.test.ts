import { describe, expect, it } from 'vitest'
import {
  clampDt,
  createGovernor,
  easeInOut,
  FRAME_MS,
  GOV_CPU_LIMIT_MS,
  GOV_INTERVAL_LIMIT_MS,
  GOV_SUSTAIN_MS,
  GOV_WARMUP_MS,
  type GovernorState,
  governorResume,
  governorStep,
  MAX_DT_MS,
  progress,
  shouldDrawFrame,
  SLACK_MS,
  simTimeStart,
  TIME_PERIOD_S,
  wrapTime,
} from './loop'

/** Deterministic PRNG (mulberry32) for the rAF jitter: tests never use Math.random. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Counts the frames drawn in `durationMs` of synthetic rAF timestamps at `periodMs` ± jitter. */
function drawnFrames(periodMs: number, jitterMs: number, durationMs: number, seed = 1): number {
  const rnd = mulberry32(seed)
  let lastDrawn = -Infinity
  let drawn = 0
  for (let i = 1; ; i++) {
    const ts = i * periodMs + (rnd() * 2 - 1) * jitterMs
    if (ts > durationMs) break
    if (shouldDrawFrame(ts, lastDrawn)) {
      lastDrawn = ts
      drawn++
    }
  }
  return drawn
}

describe('constants', () => {
  it('match the plan', () => {
    expect(FRAME_MS).toBeCloseTo(1000 / 30, 6)
    expect(SLACK_MS).toBe(4)
    expect(MAX_DT_MS).toBe(100)
    expect(TIME_PERIOD_S).toBe(420)
    expect(GOV_CPU_LIMIT_MS).toBe(28)
    expect(GOV_INTERVAL_LIMIT_MS).toBe(45)
    expect(GOV_WARMUP_MS).toBe(2000)
    expect(GOV_SUSTAIN_MS).toBe(2000)
  })
})

describe('shouldDrawFrame (30 fps cap with slack, Pitfall 1)', () => {
  it.each([1, 2, 3])('60 Hz with ±1 ms jitter → ~30 fps (seed %i)', (seed) => {
    const n = drawnFrames(1000 / 60, 1, 10_000, seed)
    expect(n).toBeGreaterThanOrEqual(290)
    expect(n).toBeLessThanOrEqual(310)
  })
  it.each([1, 2, 3])('120 Hz (ProMotion) with ±1 ms jitter → ~30 fps (seed %i)', (seed) => {
    const n = drawnFrames(1000 / 120, 1, 10_000, seed)
    expect(n).toBeGreaterThanOrEqual(290)
    expect(n).toBeLessThanOrEqual(310)
  })
  it.each([1, 2, 3])('30 Hz (Low Power Mode) with ±1 ms jitter never drops to ~20 fps (seed %i)', (seed) => {
    const n = drawnFrames(1000 / 30, 1, 10_000, seed)
    expect(n).toBeGreaterThanOrEqual(290)
    expect(n).toBeLessThanOrEqual(301)
  })
  it('always draws the very first frame', () => {
    expect(shouldDrawFrame(0, -Infinity)).toBe(true)
    expect(shouldDrawFrame(12345, -Infinity)).toBe(true)
  })
})

describe('clampDt (Pitfall 2)', () => {
  it('first frame → 0', () => {
    expect(clampDt(5000, null)).toBe(0)
  })
  it('after a 5-minute pause → 100', () => {
    expect(clampDt(300_000 + 1000, 1000)).toBe(100)
  })
  it('normal frame → ts − prevTs', () => {
    expect(clampDt(1033.3, 1000)).toBeCloseTo(33.3, 6)
  })
  it('never negative', () => {
    expect(clampDt(900, 1000)).toBe(0)
  })
})

/** Feeds the governor one sample every 33 ms from `from` to `to` (inclusive start). */
function feed(
  state: GovernorState,
  from: number,
  to: number,
  sample: { cpuMs: number; intervalMs: number },
): GovernorState {
  let s = state
  for (let ts = from; ts < to; ts += 33) s = governorStep(s, { ts, ...sample })
  return s
}

describe('quality governor (Pitfall 5, UI-SPEC "Rendimiento")', () => {
  const good = { cpuMs: 2, intervalMs: 33 }
  const slowCpu = { cpuMs: 30, intervalMs: 33 }
  const slowGpu = { cpuMs: 2, intervalMs: 50 }

  it('starts at level 1', () => {
    expect(createGovernor().level).toBe(1)
  })

  it('stays at 1 with intervalMs 33 and cpuMs 2', () => {
    const s = feed(createGovernor(), 0, 20_000, good)
    expect(s.level).toBe(1)
  })

  it('cpuMs 30 sustained 2 s after the warm-up → 2, then 2 s more → 3', () => {
    let s = feed(createGovernor(), 0, 2000, good) // warm-up
    s = feed(s, 2000, 3900, slowCpu)
    expect(s.level).toBe(1)
    s = feed(s, 3900, 4300, slowCpu)
    expect(s.level).toBe(2)
    s = feed(s, 4300, 6500, slowCpu)
    expect(s.level).toBe(3)
  })

  it('intervalMs 50 sustained 2 s also degrades', () => {
    let s = feed(createGovernor(), 0, 2000, good)
    s = feed(s, 2000, 4300, slowGpu)
    expect(s.level).toBe(2)
  })

  it('bad samples during the warm-up do not count', () => {
    let s = feed(createGovernor(), 0, 2000, slowCpu)
    expect(s.level).toBe(1)
    // Only 1.5 s of bad samples after the warm-up: still 1.
    s = feed(s, 2000, 3500, slowCpu)
    expect(s.level).toBe(1)
  })

  it('a good sample resets the sustain window', () => {
    let s = feed(createGovernor(), 0, 2000, good)
    s = feed(s, 2000, 3800, slowCpu)
    s = governorStep(s, { ts: 3800, ...good })
    s = feed(s, 3833, 5600, slowCpu)
    expect(s.level).toBe(1)
  })

  it('never goes back up', () => {
    let s = feed(createGovernor(), 0, 2000, good)
    s = feed(s, 2000, 4300, slowCpu)
    expect(s.level).toBe(2)
    s = feed(s, 4300, 30_000, good)
    expect(s.level).toBe(2)
    s = feed(s, 30_000, 32_500, slowCpu)
    expect(s.level).toBe(3)
    s = feed(s, 32_500, 60_000, good)
    expect(s.level).toBe(3)
    s = governorResume(s, 60_000)
    expect(s.level).toBe(3)
  })

  it('governorResume restarts the window: the pause is not a slow frame', () => {
    let s = feed(createGovernor(), 0, 3000, good)
    s = feed(s, 3000, 4000, slowCpu) // 1 s of bad samples, then the page is hidden
    s = governorResume(s, 300_000)
    expect(s.badSince).toBeNull()
    expect(s.startTs).toBe(300_000)
    // The first frame after the pause has a huge interval: it falls inside the new warm-up.
    s = governorStep(s, { ts: 300_000, cpuMs: 2, intervalMs: 296_000 })
    s = feed(s, 300_033, 301_900, slowGpu)
    expect(s.level).toBe(1)
  })

  it('returns the same object when nothing changes (no per-frame allocation)', () => {
    let s = feed(createGovernor(), 0, 3000, good)
    const before = s
    s = governorStep(s, { ts: 3100, ...good })
    expect(s).toBe(before)
  })
})

describe('wrapTime / simTimeStart (Pattern 4, Pitfall 3)', () => {
  it.each([0, 1, 419.999, 420, 421, 1e6, -1, -421, 123456.789])('wrapTime(%f, 420) ∈ [0, 420)', (t) => {
    const w = wrapTime(t, 420)
    expect(w).toBeGreaterThanOrEqual(0)
    expect(w).toBeLessThan(420)
  })
  it('wrapTime keeps values already in range', () => {
    expect(wrapTime(12.5, 420)).toBeCloseTo(12.5, 9)
    expect(wrapTime(432.5, 420)).toBeCloseTo(12.5, 9)
  })
  it('simTimeStart depends on the clock and stays in [0, TIME_PERIOD_S)', () => {
    const a = simTimeStart(Date.UTC(2026, 9, 24, 12, 0, 0))
    const b = simTimeStart(Date.UTC(2026, 9, 24, 12, 0, 10))
    expect(a).not.toBe(b)
    for (const t of [a, b, simTimeStart(0), simTimeStart(1.79e12)]) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThan(TIME_PERIOD_S)
    }
  })
})

describe('easeInOut / progress', () => {
  it('easeInOut is 0 → 0.5 → 1, clamped and monotonic', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 9)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(-1)).toBe(0)
    expect(easeInOut(2)).toBe(1)
    let prev = 0
    for (let t = 0; t <= 1; t += 0.01) {
      const v = easeInOut(t)
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = v
    }
  })
  it('progress clamps to [0, 1] and handles a zero duration', () => {
    expect(progress(0, 1500)).toBe(0)
    expect(progress(750, 1500)).toBeCloseTo(0.5, 9)
    expect(progress(3000, 1500)).toBe(1)
    expect(progress(-10, 1500)).toBe(0)
    expect(progress(5, 0)).toBe(1)
  })
})
