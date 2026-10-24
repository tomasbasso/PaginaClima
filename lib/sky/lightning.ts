// Lightning pulse plan (UI-SPEC "Relámpagos", C-5/C-6; RESEARCH Pattern 4, Pitfall 8; D-07). Pure.
// A seeded PRNG builds the whole plan up front, so frequency and amplitude limits (WCAG 2.3.1)
// are provable by test. The renderer only samples lightningEnvelope() per frame → uFlash.
import { LMAX_CONTENT, hexToLinear, luminance, mixLinear, type Rgb } from './palette'

/** Gap between events (s) at intensity 1. */
export const INTERVAL_AT_1_S = [8, 16] as const
/** Gap between events (s) at intensity 0.5 (and below: floor). */
export const INTERVAL_AT_HALF_S = [12, 24] as const
/** Linear rise of each pulse. Never a square cut to the peak. */
export const RISE_MS = 40
/** Exponential decay span of each pulse: at the end of it the pulse is < 10 % of its peak. */
export const DECAY_MS = [300, 500] as const
/** The optional second pulse starts this long after the first. */
export const SECOND_PULSE_DELAY_MS = [150, 250] as const
/** Relative amplitude of the second pulse. */
export const SECOND_PULSE_REL = 0.6
/** WCAG 2.3.1 allows ≤ 3 flashes per second; we keep ≤ 2. */
export const MAX_PULSES_PER_S = 2
/** C-5: max luminance increase of any pixel (WCAG "general flash" threshold is a 10 % change). */
export const FLASH_MAX_DELTA_L = 0.075
/**
 * C-5: share of the flash that reaches the content zone, so LMAX_CONTENT + ΔL × factor ≤ 0.10
 * (0.075 + 0.075 × 0.33 ≈ 0.0998).
 */
export const CONTENT_FLASH_FACTOR = 0.33
/** Flash tint: 50/50 linear mix of storm `#b9b7f0` and ink `#fbfbf2`. Not pure white. */
export const FLASH_RGB_LINEAR: Rgb = mixLinear(hexToLinear('#b9b7f0'), hexToLinear('#fbfbf2'), 0.5)

/** Exponential time constant as a share of decayMs: exp(-3) ≈ 0.05 at the end of the decay. */
const DECAY_TAU_SHARE = 1 / 3
/** After this many decay spans the pulse is cut to exactly 0 (exp(-6) ≈ 0.0025 of the peak). */
const DECAY_CUTOFF_SPANS = 2
const X_RANGE = [0.15, 0.85] as const
const SECOND_PULSE_CHANCE = 0.4

export type LightningPulse = { t0: number; amp: number; decayMs: number }
export type LightningEvent = { t: number; x: number; pulses: LightningPulse[] }
export type LightningPlan = { events: LightningEvent[]; durationS: number }
export type LightningSample = { amp: number; x: number }

/** Tiny seeded PRNG (32-bit state), uniform in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Shader amplitude at which the flash color adds exactly FLASH_MAX_DELTA_L of luminance. */
export function peakAmplitude(): number {
  return FLASH_MAX_DELTA_L / luminance(FLASH_RGB_LINEAR)
}

function between(rand: () => number, [lo, hi]: readonly [number, number]): number {
  return lo + (hi - lo) * rand()
}

function intervalRange(intensity: number): [number, number] {
  const k = (Math.min(1, Math.max(0.5, intensity)) - 0.5) / 0.5
  return [
    INTERVAL_AT_HALF_S[0] + (INTERVAL_AT_1_S[0] - INTERVAL_AT_HALF_S[0]) * k,
    INTERVAL_AT_HALF_S[1] + (INTERVAL_AT_1_S[1] - INTERVAL_AT_HALF_S[1]) * k,
  ]
}

/**
 * Events over [0, durationS). The first one waits a full interval too, so chaining a fresh plan
 * after the previous window never makes two events closer than the minimum gap.
 */
export function lightningPlan(seed: number, intensity: number, durationS: number): LightningPlan {
  const events: LightningEvent[] = []
  if (!(intensity > 0)) return { events, durationS }
  const rand = mulberry32(seed)
  const range = intervalRange(intensity)
  const peak = peakAmplitude()
  for (let t = between(rand, range); t < durationS; t += between(rand, range)) {
    const pulses: LightningPulse[] = [{ t0: t, amp: peak, decayMs: between(rand, DECAY_MS) }]
    const x = between(rand, X_RANGE)
    if (rand() < SECOND_PULSE_CHANCE) {
      pulses.push({
        t0: t + between(rand, SECOND_PULSE_DELAY_MS) / 1000,
        amp: peak * SECOND_PULSE_REL,
        decayMs: between(rand, DECAY_MS),
      })
    }
    events.push({ t, x, pulses })
  }
  return { events, durationS }
}

/** One full-amplitude pulse at tS (the /dev/sky "FORZAR RELÁMPAGO" button). */
export function forcedLightningPlan(tS: number, x = 0.5, decayMs = 400): LightningPlan {
  return {
    events: [{ t: tS, x, pulses: [{ t0: tS, amp: peakAmplitude(), decayMs }] }],
    durationS: tS + 2,
  }
}

function pulseAt(p: LightningPulse, tS: number): number {
  const ms = (tS - p.t0) * 1000
  if (ms < 0) return 0
  if (ms < RISE_MS) return (p.amp * ms) / RISE_MS
  const d = ms - RISE_MS
  if (d >= p.decayMs * DECAY_CUTOFF_SPANS) return 0
  return p.amp * Math.exp(-d / (p.decayMs * DECAY_TAU_SHARE))
}

/** Longest span (s) a single event can stay lit: second pulse delay + rise + cutoff. */
const EVENT_SPAN_S =
  (SECOND_PULSE_DELAY_MS[1] + RISE_MS + DECAY_MS[1] * DECAY_CUTOFF_SPANS) / 1000

/**
 * Flash amplitude and x at tS. Pulses add up, capped at peakAmplitude(). Pass `out` to reuse an
 * object per frame (no allocation in the render loop).
 */
export function lightningEnvelope(
  plan: LightningPlan,
  tS: number,
  out: LightningSample = { amp: 0, x: 0.5 },
): LightningSample {
  let amp = 0
  let x = out.x
  const { events } = plan
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    if (e.t > tS) break
    if (tS - e.t > EVENT_SPAN_S) continue
    let a = 0
    for (let j = 0; j < e.pulses.length; j++) a += pulseAt(e.pulses[j], tS)
    if (a > 0) {
      amp += a
      x = e.x
    }
  }
  out.amp = Math.min(amp, peakAmplitude())
  out.x = x
  return out
}

/** Absolute content-zone luminance at the flash peak (C-5 / C-6 reference, ≤ 0.10). */
export const CONTENT_PEAK_L = LMAX_CONTENT + FLASH_MAX_DELTA_L * CONTENT_FLASH_FACTOR
