// Sky loop numbers (UI-SPEC "Rendimiento", "Transiciones"; RESEARCH Patterns 2 and 4). Pure:
// the renderer measures every time (frame timestamps, high-resolution clock) and passes it in.

/** 30 fps cap. */
export const FRAME_MS = 1000 / 30
/**
 * Slack under FRAME_MS (Pitfall 1): rAF timestamps jitter, so a strict 33.3 ms test would skip
 * every other 30 Hz frame in Low Power Mode (→ 15–20 fps). With 4 ms, 60 Hz draws every 2nd
 * frame, 120 Hz every 4th and 30 Hz every frame.
 */
export const SLACK_MS = 4
/** Max simulated step (Pitfall 2): no jump nor catch-up burst after a pause. */
export const MAX_DT_MS = 100
/** Period (s) of every time value sent to the shader (Pattern 4, Pitfall 3: fp16 on Apple GPUs). */
export const TIME_PERIOD_S = 420

export function shouldDrawFrame(ts: number, lastDrawn: number): boolean {
  return ts - lastDrawn >= FRAME_MS - SLACK_MS
}

/** Milliseconds to advance the simulation: 0 on the first frame, never above MAX_DT_MS. */
export function clampDt(ts: number, prevTs: number | null): number {
  if (prevTs === null) return 0
  return Math.min(MAX_DT_MS, Math.max(0, ts - prevTs))
}

/** t wrapped into [0, period). */
export function wrapTime(t: number, period: number): number {
  const w = ((t % period) + period) % period
  return w >= period ? 0 : w
}

/**
 * Simulation start (s) from the wall clock (UI-SPEC "Remontaje"): a remounted canvas does not
 * restart its clouds/stars "at the beginning" on every navigation.
 */
export function simTimeStart(nowMs: number): number {
  return wrapTime(nowMs / 1000, TIME_PERIOD_S)
}

/** Ease-in-out (quadratic), clamped to [0, 1]. */
export function easeInOut(t: number): number {
  if (!(t > 0)) return 0
  if (t >= 1) return 1
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) * (-2 * t + 2)) / 2
}

/** elapsed / duration clamped to [0, 1]; a zero duration is already done. */
export function progress(elapsedMs: number, durationMs: number): number {
  if (!(durationMs > 0)) return 1
  return Math.min(1, Math.max(0, elapsedMs / durationMs))
}

// ── Quality governor (UI-SPEC "Rendimiento", Pitfall 5) ────────────────────────────────────────
// The UI-SPEC's "moving average over 28 ms" cannot be measured as such: a JS clock around
// drawArrays only measures the CPU submit (the GPU is async and Safari has no timer queries), and
// with the 30 fps cap the interval between drawn frames is ≈ 33 ms anyway. So a sample is bad if
// (a) the JS work of the frame (moving average) exceeds GOV_CPU_LIMIT_MS, or (b) the interval
// between drawn frames exceeds GOV_INTERVAL_LIMIT_MS (< ~22 real fps: saturated GPU). Bad samples
// sustained GOV_SUSTAIN_MS after a GOV_WARMUP_MS warm-up (shader compile, hydration) drop one
// level: 2 = no grain, no twinkle, half the rain; 3 = static frame. It never goes back up.
// These thresholds are confirmed on the real-iPhone checkpoint (plan 03-08).

export const GOV_WARMUP_MS = 2000
export const GOV_SUSTAIN_MS = 2000
export const GOV_CPU_LIMIT_MS = 28
export const GOV_INTERVAL_LIMIT_MS = 45

export type QualityLevel = 1 | 2 | 3
export type GovernorState = { level: QualityLevel; startTs: number | null; badSince: number | null }
export type GovernorSample = { ts: number; cpuMs: number; intervalMs: number }

export function createGovernor(): GovernorState {
  return { level: 1, startTs: null, badSince: null }
}

/** One sample per drawn frame. Returns the same object when nothing changes (no allocation). */
export function governorStep(state: GovernorState, { ts, cpuMs, intervalMs }: GovernorSample): GovernorState {
  if (state.level === 3) return state
  if (state.startTs === null) return { ...state, startTs: ts, badSince: null }
  if (ts - state.startTs < GOV_WARMUP_MS) {
    return state.badSince === null ? state : { ...state, badSince: null }
  }
  const bad = cpuMs > GOV_CPU_LIMIT_MS || intervalMs > GOV_INTERVAL_LIMIT_MS
  if (!bad) return state.badSince === null ? state : { ...state, badSince: null }
  if (state.badSince === null) return { ...state, badSince: ts }
  if (ts - state.badSince >= GOV_SUSTAIN_MS) {
    // Next level; the window restarts here, so level 3 needs another GOV_SUSTAIN_MS of bad samples.
    return { ...state, level: state.level === 1 ? 2 : 3, badSince: ts }
  }
  return state
}

/** After a pause: restart the warm-up and the window, so the pause never counts as a slow frame. */
export function governorResume(state: GovernorState, ts: number): GovernorState {
  return { ...state, startTs: ts, badSince: null }
}
