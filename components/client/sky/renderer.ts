// Living-sky WebGL renderer (UI-SPEC "Capas del cielo", "Transiciones", "Rendimiento"; D-02/D-09).
// Plain module, no React: SkyBackdrop loads it with import() after hydration. It creates its own
// canvas on every call (a fresh context per mount, Strict Mode safe), draws one full-screen
// triangle and never throws: any failure calls onFail and leaves the CSS fallback visible.
//
// Animated mode: rAF loop capped at 30 fps (shouldDrawFrame), dt-based motion (clampDt), paused
// while hidden / on pagehide / off-screen, quality governor. Static mode (opts.mode 'static',
// prefers-reduced-motion or governor level 3): one frame per state change, no fade (SKY-05).
import type { SkyAstro } from '@/lib/sky/astro'
import {
  clampDt,
  createGovernor,
  easeInOut,
  type GovernorSample,
  type GovernorState,
  governorResume,
  governorStep,
  progress,
  type QualityLevel,
  shouldDrawFrame,
  simTimeStart,
  TIME_PERIOD_S,
  wrapTime,
} from '@/lib/sky/loop'
import { moonGlow, starsAlpha, sunGlow } from '@/lib/sky/glow'
import { skyPalette, smoothstep } from '@/lib/sky/palette'
import { type SkyParams, skyParams } from '@/lib/sky/params'
import type { SkyState } from '@/lib/sky/state'
import { CLOUD_PERIOD_PX, FOG_PERIOD_PX, FRAGMENT_SRC, RAIN_PERIOD_PX, VERTEX_SRC } from './shader'

/** Default canvas buffer = CSS size × this, whatever the DPR (D-09). */
export const BUFFER_SCALE = 0.5
/** Allowed range for opts.bufferScale (UI-SPEC: up to 0.75, never above 1; T-03-10). */
export const BUFFER_SCALE_MIN = 0.5
export const BUFFER_SCALE_MAX = 0.75

/** Band height when the box has no [data-sky-band] (compact Hero value). */
const DEFAULT_BAND_PX = 120
/** D-06 interpolation durations. */
const SUN_TRANSITION_MS = 1500
const WEATHER_TRANSITION_MS = 2000
/** onStats cadence. */
const STATS_EVERY_MS = 500
/** EMA weight of the per-frame CPU time. */
const CPU_EMA = 0.1
/** The far cloud layer drifts at this fraction of the near one (parallax). */
const CLOUD_FAR_FACTOR = 0.6
/** Fog undulation: a quarter of the cloud drift, never above 3 px/s (UI-SPEC "Movimiento"). */
const FOG_DRIFT_FACTOR = 0.25
const FOG_DRIFT_MAX_PX_S = 3
/** Rain fall speeds (CSS px/s, UI-SPEC capa 6: 400–600). */
const RAIN_SPEED_NEAR_PX_S = 600
const RAIN_SPEED_FAR_PX_S = 400
/** Governor level 2: half the rain streaks (UI-SPEC "Rendimiento"). */
const RAIN_QUALITY2_FACTOR = 0.5

// Weather scalars interpolated over WEATHER_TRANSITION_MS (index into the Float64Arrays below).
const P_COVER = 0
const P_DRIFT = 1
const P_RAIN = 2
const P_FOG = 3
const P_STARS = 4
const P_TILT = 5
const P_COUNT = 6

function writeParams(out: Float64Array, p: SkyParams) {
  out[P_COVER] = p.cover
  out[P_DRIFT] = p.driftPxPerS
  out[P_RAIN] = p.rain
  out[P_FOG] = p.fog
  out[P_STARS] = p.starsFactor
  out[P_TILT] = p.rainTiltDeg
}

function sameParams(a: Float64Array, b: Float64Array): boolean {
  for (let i = 0; i < P_COUNT; i++) if (a[i] !== b[i]) return false
  return true
}

export type SkyRendererMode = 'animated' | 'static'
export type SkyFailReason = 'no-webgl' | 'shader' | 'context-lost' | 'error'
export type SkyStats = { fps: number; cpuMs: number; quality: QualityLevel }
export type SkyRendererOptions = {
  state: SkyState
  astro: SkyAstro
  mode: SkyRendererMode
  onFirstFrame?: () => void
  onFail?: (reason: SkyFailReason, message?: string) => void
  /** Every 500 ms while animated (and once per static draw): /dev/sky reading. */
  onStats?: (s: SkyStats) => void
  /** Buffer scale, clamped to [0.5, 0.75]. Default BUFFER_SCALE. */
  bufferScale?: number
}
export type SkyRendererHandle = {
  setState(state: SkyState, astro: SkyAstro): void
  /** Manual pause (/dev/sky). Has no effect in static mode. */
  setPaused(paused: boolean): void
  dispose(): void
}

const ATTRS: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power',
  failIfMajorPerformanceCaveat: true,
}

type GL = WebGLRenderingContext | WebGL2RenderingContext

const UNIFORMS = [
  'uRes',
  'uBandTop',
  'uHorizon',
  'uScale',
  'uS1',
  'uS2',
  'uS3',
  'uS4',
  'uS5',
  'uGrain',
  'uQuality',
  'uTwinkleT',
  'uSun',
  'uMoon',
  'uStars',
  'uCover',
  'uCloudOffset',
  'uNight',
  'uFog',
  'uFogOffset',
  'uRain',
  'uRainTilt',
  'uRainOffset',
] as const
type UniformName = (typeof UNIFORMS)[number]

class ShaderError extends Error {}

function compile(gl: GL, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)
  if (!sh) throw new ShaderError('createShader returned null')
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(sh) ?? 'compile failed'
    gl.deleteShader(sh)
    throw new ShaderError(log)
  }
  return sh
}

type Program = { program: WebGLProgram; buffer: WebGLBuffer; loc: Record<UniformName, WebGLUniformLocation | null> }

function buildProgram(gl: GL): Program {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
  const program = gl.createProgram()
  if (!program) throw new ShaderError('createProgram returned null')
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.bindAttribLocation(program, 0, 'aPos')
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new ShaderError(gl.getProgramInfoLog(program) ?? 'link failed')
  }
  const buffer = gl.createBuffer()
  if (!buffer) throw new ShaderError('createBuffer returned null')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.useProgram(program)
  const loc = {} as Record<UniformName, WebGLUniformLocation | null>
  for (const name of UNIFORMS) loc[name] = gl.getUniformLocation(program, name)
  return { program, buffer, loc }
}

/** T-03-10: any non-finite or out-of-range value ends inside [0.5, 0.75]. */
function clampBufferScale(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return BUFFER_SCALE
  return Math.min(BUFFER_SCALE_MAX, Math.max(BUFFER_SCALE_MIN, v))
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function createSkyRenderer(host: HTMLElement, opts: SkyRendererOptions): SkyRendererHandle | null {
  const fail = (reason: SkyFailReason, message?: string) => {
    try {
      opts.onFail?.(reason, message)
    } catch {
      // a failing callback must not reach React either
    }
  }

  const scale = clampBufferScale(opts.bufferScale)

  let canvas: HTMLCanvasElement | null = null
  let ro: ResizeObserver | null = null
  let io: IntersectionObserver | null = null
  let mq: MediaQueryList | null = null
  let disposed = false
  let raf = 0
  let onLost: ((e: Event) => void) | null = null
  let onRestored: (() => void) | null = null
  let onVisibility: (() => void) | null = null
  let onPageHide: (() => void) | null = null
  let onPageShow: (() => void) | null = null
  let onMotionPref: (() => void) | null = null

  const teardown = () => {
    if (disposed) return
    disposed = true
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    ro?.disconnect()
    ro = null
    io?.disconnect()
    io = null
    if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
    if (onPageHide) window.removeEventListener('pagehide', onPageHide)
    if (onPageShow) window.removeEventListener('pageshow', onPageShow)
    if (mq && onMotionPref) mq.removeEventListener('change', onMotionPref)
    if (canvas) {
      if (onLost) canvas.removeEventListener('webglcontextlost', onLost)
      if (onRestored) canvas.removeEventListener('webglcontextrestored', onRestored)
      canvas.remove()
    }
  }

  try {
    mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const forcedStatic = opts.mode === 'static'

    canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    const cs = canvas.style
    cs.position = 'absolute'
    cs.inset = '0'
    cs.width = '100%'
    cs.height = '100%'
    cs.pointerEvents = 'none'
    cs.opacity = '0'
    // Static (reduced motion or forced): appears without a fade (SKY-05). globals.css's
    // reduced-motion block also removes it.
    cs.transition = forcedStatic || mq?.matches ? 'none' : 'opacity 600ms ease-out'
    host.appendChild(canvas)

    const gl = (canvas.getContext('webgl2', ATTRS) ?? canvas.getContext('webgl', ATTRS)) as GL | null
    if (!gl) {
      teardown()
      fail('no-webgl')
      return null
    }
    const c = canvas

    let prog: Program
    try {
      prog = buildProgram(gl)
    } catch (err) {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      teardown()
      fail(err instanceof ShaderError ? 'shader' : 'error', err instanceof Error ? err.message : undefined)
      return null
    }

    // ── Preallocated state: no allocations per frame ─────────────────────────────────────────
    const stops = new Float32Array(15) // current palette, linear RGB, 5 × vec3
    const fromStops = new Float32Array(15) // palette at the start of a weather transition
    let state = opts.state
    let astro = opts.astro
    // Sun altitude interpolation (1500 ms) and weather palette blend (2000 ms), D-06.
    let sunFrom = state.sunAltitude
    let sunTo = state.sunAltitude
    let sunStart = -Infinity
    let curSun = state.sunAltitude
    let weatherStart = -Infinity
    let weatherBlending = false
    let paramsDirty = true
    // Glow uniforms (scalars, recomputed with the palette). clear = 1 with 'despejado', 0 otherwise,
    // blended over the weather transition so stars and moon fade instead of popping.
    let sunX = 0.5
    let sunS = 0
    let moonX = 0.5
    let moonY = 1
    let moonS = 0
    let starsA = 0
    let clearFrom = state.weather === 'despejado' ? 1 : 0
    let curClear = clearFrom
    // Weather layers (skyParams): target, start of the blend and current value, preallocated.
    const pTo = new Float64Array(P_COUNT)
    const pFrom = new Float64Array(P_COUNT)
    const pCur = new Float64Array(P_COUNT)
    const pNext = new Float64Array(P_COUNT)
    writeParams(pTo, skyParams(state))
    pFrom.set(pTo)
    pCur.set(pTo)
    let nightF = 0

    let lost = false
    let restoredOnce = false
    let firstFrame = false
    let cssW = 0
    let cssH = 0
    let bandH = DEFAULT_BAND_PX

    // Loop state.
    let visible = document.visibilityState !== 'hidden'
    let pageHidden = false
    let inView = true
    let manualPaused = false
    let lastDrawn = -Infinity
    let prevTs: number | null = null
    let simTime = simTimeStart(Date.now())
    // Moving offsets (CSS px), always wrapped in CPU (Pattern 4, Pitfall 3). They accumulate dt ×
    // the interpolated speed, so a wind change never makes the clouds jump; the start depends on
    // the wall clock (UI-SPEC "Remontaje").
    let cloudNear = wrapTime(simTime * pCur[P_DRIFT], CLOUD_PERIOD_PX)
    let cloudFar = wrapTime(simTime * pCur[P_DRIFT] * CLOUD_FAR_FACTOR, CLOUD_PERIOD_PX)
    let fogOff = wrapTime(simTime * FOG_DRIFT_MAX_PX_S, FOG_PERIOD_PX)
    let rainNear = wrapTime(simTime * RAIN_SPEED_NEAR_PX_S, RAIN_PERIOD_PX)
    let rainFar = wrapTime(simTime * RAIN_SPEED_FAR_PX_S, RAIN_PERIOD_PX)
    let gov: GovernorState = createGovernor()
    const sample: GovernorSample = { ts: 0, cpuMs: 0, intervalMs: 0 }
    let cpuAvg = 0
    // Ring of drawn-frame timestamps for "frames in the last second".
    const drawTimes = new Float64Array(64)
    let drawHead = 0
    let lastStatsTs = -Infinity

    const isStatic = () => forcedStatic || (mq?.matches ?? false) || gov.level === 3

    // Sky box = parent of SkyBackdrop's root; the band is its direct child (Pitfall 7: measured,
    // never read from the CSS custom property, never assumed 844).
    const box = host.closest('[data-sky-root]')?.parentElement ?? host
    const band = box.querySelector<HTMLElement>(':scope > [data-sky-band]')

    const measure = () => {
      cssW = host.clientWidth
      cssH = host.clientHeight
      bandH = band ? band.getBoundingClientRect().height : DEFAULT_BAND_PX
    }

    /** Advances the interpolations to `ts` and rewrites the palette buffer only when needed. */
    const updateParams = (ts: number, jump: boolean) => {
      const pSun = jump ? 1 : progress(ts - sunStart, SUN_TRANSITION_MS)
      const pWeather = jump || !weatherBlending ? 1 : progress(ts - weatherStart, WEATHER_TRANSITION_MS)
      const moving = pSun < 1 || pWeather < 1
      if (!moving && !paramsDirty) return
      curSun = sunFrom + (sunTo - sunFrom) * easeInOut(pSun)
      const { linear } = skyPalette(curSun, state.weather, astro.morning)
      const k = pWeather < 1 ? easeInOut(pWeather) : 1
      for (let i = 0; i < 5; i++) {
        const col = linear[i]
        for (let j = 0; j < 3; j++) {
          const o = i * 3 + j
          stops[o] = k >= 1 ? col[j] : fromStops[o] + (col[j] - fromStops[o]) * k
        }
      }
      // Sun, moon and stars (SKY-01, UI-SPEC "Resplandores"): from the interpolated altitude.
      const clearTo = state.weather === 'despejado' ? 1 : 0
      curClear = clearFrom + (clearTo - clearFrom) * k
      for (let i = 0; i < P_COUNT; i++) pCur[i] = k >= 1 ? pTo[i] : pFrom[i] + (pTo[i] - pFrom[i]) * k
      // Night clouds (UI-SPEC "Clima"): at most +0.01 of L from -12 deg down.
      nightF = 1 - smoothstep(-12, -8, curSun)
      const sun = sunGlow(curSun, astro.sunAzimuth)
      sunX = sun.x
      sunS = sun.strength
      // During a weather blend the halo is computed as if clear and faded with curClear.
      const moon = moonGlow(astro, pWeather < 1 ? 'despejado' : state.weather)
      moonX = moon.x
      moonY = moon.yFrac
      // The halo belongs to the night sky: it fades out as the sun climbs past the horizon.
      moonS = moon.strength * curClear * (1 - smoothstep(-4, 6, curSun))
      // Stars by cloud cover (code 2 → half, more cover → none), interpolated with the weather.
      starsA = starsAlpha(curSun) * pCur[P_STARS]
      if (pWeather >= 1) weatherBlending = false
      if (pSun >= 1) sunFrom = sunTo
      paramsDirty = moving
    }

    const render = (ts: number, staticFrame: boolean) => {
      if (disposed || lost) return
      updateParams(ts, staticFrame)
      const w = Math.max(1, Math.round(cssW * scale))
      const h = Math.max(1, Math.round(cssH * scale))
      if (c.width !== w) c.width = w
      if (c.height !== h) c.height = h
      gl.viewport(0, 0, w, h)
      const loc = prog.loc
      gl.uniform3f(loc.uS1, stops[0], stops[1], stops[2])
      gl.uniform3f(loc.uS2, stops[3], stops[4], stops[5])
      gl.uniform3f(loc.uS3, stops[6], stops[7], stops[8])
      gl.uniform3f(loc.uS4, stops[9], stops[10], stops[11])
      gl.uniform3f(loc.uS5, stops[12], stops[13], stops[14])
      gl.uniform2f(loc.uRes, w, h)
      gl.uniform1f(loc.uBandTop, Math.max(0, cssH - bandH) * scale)
      gl.uniform1f(loc.uHorizon, cssH * scale)
      gl.uniform1f(loc.uScale, scale)
      // Level 2+: no grain (UI-SPEC "Rendimiento"). Reduced motion keeps the fixed grain.
      gl.uniform1f(loc.uGrain, gov.level >= 2 ? 0 : 1)
      // Static frames freeze motion: twinkle off (C-4); offsets only advance in frame(), so clouds,
      // fog and rain stay frozen.
      gl.uniform1f(loc.uQuality, staticFrame ? Math.max(2, gov.level) : gov.level)
      gl.uniform1f(loc.uTwinkleT, wrapTime(simTime, TIME_PERIOD_S))
      gl.uniform3f(loc.uSun, sunX, sunS, 0)
      gl.uniform3f(loc.uMoon, moonX, moonY, moonS)
      gl.uniform1f(loc.uStars, starsA)
      gl.uniform1f(loc.uCover, pCur[P_COVER])
      gl.uniform2f(loc.uCloudOffset, cloudNear, cloudFar)
      gl.uniform1f(loc.uNight, nightF)
      gl.uniform1f(loc.uFog, pCur[P_FOG])
      gl.uniform1f(loc.uFogOffset, fogOff)
      // Rain density: halved from governor quality level 2 on (T-03-11).
      gl.uniform1f(loc.uRain, gov.level >= 2 ? pCur[P_RAIN] * RAIN_QUALITY2_FACTOR : pCur[P_RAIN])
      gl.uniform1f(loc.uRainTilt, (pCur[P_TILT] * Math.PI) / 180)
      gl.uniform2f(loc.uRainOffset, rainNear, rainFar)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!firstFrame) {
        firstFrame = true
        c.style.opacity = '1'
        try {
          opts.onFirstFrame?.()
        } catch {
          // ignore
        }
      }
    }

    const emitStats = (fps: number) => {
      if (!opts.onStats) return
      try {
        opts.onStats({ fps, cpuMs: cpuAvg, quality: gov.level })
      } catch {
        // ignore
      }
    }

    const handleError = (err: unknown) => {
      pause()
      c.style.opacity = '0'
      fail('error', err instanceof Error ? err.message : undefined)
    }

    const drawStatic = () => {
      try {
        render(now(), true)
        emitStats(0)
      } catch (err) {
        handleError(err)
      }
    }

    const canRun = () =>
      !disposed && !lost && visible && !pageHidden && inView && !manualPaused && !isStatic()

    function pause() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      prevTs = null
    }

    function resume() {
      if (raf || !canRun()) return
      prevTs = null
      gov = governorResume(gov, now())
      raf = requestAnimationFrame(frame)
    }

    function frame(ts: number) {
      raf = requestAnimationFrame(frame)
      if (!shouldDrawFrame(ts, lastDrawn)) return
      const t0 = now()
      const dt = clampDt(ts, prevTs)
      const intervalMs = prevTs === null ? 0 : ts - prevTs
      prevTs = ts
      lastDrawn = ts
      const dtS = dt / 1000
      simTime += dtS
      const drift = pCur[P_DRIFT]
      cloudNear = wrapTime(cloudNear + dtS * drift, CLOUD_PERIOD_PX)
      cloudFar = wrapTime(cloudFar + dtS * drift * CLOUD_FAR_FACTOR, CLOUD_PERIOD_PX)
      const fogSpeed = Math.max(-FOG_DRIFT_MAX_PX_S, Math.min(FOG_DRIFT_MAX_PX_S, drift * FOG_DRIFT_FACTOR))
      fogOff = wrapTime(fogOff + dtS * fogSpeed, FOG_PERIOD_PX)
      rainNear = wrapTime(rainNear + dtS * RAIN_SPEED_NEAR_PX_S, RAIN_PERIOD_PX)
      rainFar = wrapTime(rainFar + dtS * RAIN_SPEED_FAR_PX_S, RAIN_PERIOD_PX)
      try {
        render(ts, false)
      } catch (err) {
        handleError(err)
        return
      }
      // Moving average of the JS work of the frame (Pitfall 5); never a GPU sync/read-back.
      cpuAvg += (now() - t0 - cpuAvg) * CPU_EMA
      sample.ts = ts
      sample.cpuMs = cpuAvg
      sample.intervalMs = intervalMs
      const prevLevel = gov.level
      gov = governorStep(gov, sample)
      drawTimes[drawHead] = ts
      drawHead = (drawHead + 1) % drawTimes.length
      if (gov.level === 3 && prevLevel !== 3) {
        // Level 3: static frame from here on, like reduced motion.
        pause()
        drawStatic()
        return
      }
      if (ts - lastStatsTs >= STATS_EVERY_MS) {
        lastStatsTs = ts
        let fps = 0
        for (let i = 0; i < drawTimes.length; i++) if (drawTimes[i] > 0 && ts - drawTimes[i] < 1000) fps++
        emitStats(fps)
      }
    }

    /** Draws once now in whatever mode applies (resize, state change, restore). */
    const redraw = () => {
      if (isStatic()) {
        drawStatic()
        return
      }
      try {
        render(now(), false)
      } catch (err) {
        handleError(err)
        return
      }
      resume()
    }

    // ── Context loss (Pitfall 4) ────────────────────────────────────────────────────────────
    onLost = (e: Event) => {
      e.preventDefault() // without this there is no webglcontextrestored
      lost = true
      pause()
      c.style.transition = 'opacity 300ms ease-out'
      c.style.opacity = '0'
      fail('context-lost')
    }
    onRestored = () => {
      // One restore attempt only; if it fails, the fallback stays until reload.
      if (restoredOnce || disposed) return
      restoredOnce = true
      try {
        prog = buildProgram(gl)
        lost = false
        c.style.transition = isStatic() ? 'none' : 'opacity 600ms ease-out'
        firstFrame = false
        paramsDirty = true
        measure()
        redraw()
      } catch (err) {
        fail('shader', err instanceof Error ? err.message : undefined)
      }
    }
    c.addEventListener('webglcontextlost', onLost)
    c.addEventListener('webglcontextrestored', onRestored)

    // ── Pauses (§Pausas) ────────────────────────────────────────────────────────────────────
    onVisibility = () => {
      visible = document.visibilityState !== 'hidden'
      if (visible) resume()
      else pause()
    }
    onPageHide = () => {
      pageHidden = true
      pause()
    }
    onPageShow = () => {
      pageHidden = false
      resume()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[entries.length - 1]
          if (!e) return
          inView = e.isIntersecting
          if (inView) resume()
          else pause()
        },
        { threshold: 0 },
      )
      io.observe(host)
    }

    // ── Reduced motion, live (D-09, SKY-05) ─────────────────────────────────────────────────
    if (mq) {
      onMotionPref = () => {
        if (isStatic()) {
          pause()
          c.style.transition = 'none'
          drawStatic()
        } else {
          resume()
        }
      }
      mq.addEventListener('change', onMotionPref)
    }

    measure()
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measure()
        if (isStatic()) drawStatic()
        else {
          try {
            render(now(), false)
          } catch (err) {
            handleError(err)
          }
        }
      })
      ro.observe(box)
      if (band) ro.observe(band)
    }
    redraw()

    return {
      setState(next: SkyState, nextAstro: SkyAstro) {
        if (disposed) return
        const t = now()
        if (isStatic()) {
          // Static: straight to the target, no transition.
          state = next
          astro = nextAstro
          sunFrom = sunTo = next.sunAltitude
          weatherBlending = false
          clearFrom = next.weather === 'despejado' ? 1 : 0
          writeParams(pTo, skyParams(next))
          pFrom.set(pTo)
          pCur.set(pTo)
          paramsDirty = true
          drawStatic()
          return
        }
        if (next.sunAltitude !== sunTo) {
          sunFrom = curSun
          sunTo = next.sunAltitude
          sunStart = t
        }
        // Weather change (palette) or new weather layers (cover, rain, fog, wind): blend from the
        // current values over 2000 ms, by density, never at once (D-09).
        writeParams(pNext, skyParams(next))
        if (next.weather !== state.weather || !sameParams(pNext, pTo)) {
          fromStops.set(stops)
          clearFrom = curClear
          pFrom.set(pCur)
          pTo.set(pNext)
          weatherStart = t
          weatherBlending = true
        }
        state = next
        astro = nextAstro
        paramsDirty = true
        if (!raf) redraw()
      },
      setPaused(paused: boolean) {
        manualPaused = paused
        if (paused) pause()
        else resume()
      },
      dispose() {
        if (disposed) return
        try {
          if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
        } catch {
          // ignore
        }
        teardown()
      },
    }
  } catch (err) {
    teardown()
    fail('error', err instanceof Error ? err.message : undefined)
    return null
  }
}
