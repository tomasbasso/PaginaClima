// Living-sky WebGL renderer (UI-SPEC "Capas del cielo", "Transiciones", "Rendimiento"; D-02/D-09).
// Plain module, no React: SkyBackdrop loads it with import() after hydration. It creates its own
// canvas on every call (a fresh context per mount, Strict Mode safe), draws one full-screen
// triangle and never throws: any failure calls onFail and leaves the CSS fallback visible.
import type { SkyAstro } from '@/lib/sky/astro'
import { skyPalette } from '@/lib/sky/palette'
import type { SkyState } from '@/lib/sky/state'
import { FRAGMENT_SRC, VERTEX_SRC } from './shader'

/** Canvas buffer = CSS size × this, whatever the DPR (D-09). Never above 1. */
export const BUFFER_SCALE = 0.5

/** Band height when the box has no [data-sky-band] (compact Hero value). */
const DEFAULT_BAND_PX = 120

export type SkyRendererMode = 'animated' | 'static'
export type SkyFailReason = 'no-webgl' | 'shader' | 'context-lost' | 'error'
export type SkyRendererOptions = {
  state: SkyState
  astro: SkyAstro
  mode: SkyRendererMode
  onFirstFrame?: () => void
  onFail?: (reason: SkyFailReason, message?: string) => void
}
export type SkyRendererHandle = {
  setState(state: SkyState, astro: SkyAstro): void
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

const UNIFORMS = ['uRes', 'uBandTop', 'uHorizon', 'uScale', 'uS1', 'uS2', 'uS3', 'uS4', 'uS5', 'uGrain'] as const
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

export function createSkyRenderer(host: HTMLElement, opts: SkyRendererOptions): SkyRendererHandle | null {
  const fail = (reason: SkyFailReason, message?: string) => {
    try {
      opts.onFail?.(reason, message)
    } catch {
      // a failing callback must not reach React either
    }
  }

  let canvas: HTMLCanvasElement | null = null
  let ro: ResizeObserver | null = null
  let disposed = false
  let onLost: ((e: Event) => void) | null = null
  let onRestored: (() => void) | null = null

  const teardown = () => {
    if (disposed) return
    disposed = true
    ro?.disconnect()
    ro = null
    if (canvas) {
      if (onLost) canvas.removeEventListener('webglcontextlost', onLost)
      if (onRestored) canvas.removeEventListener('webglcontextrestored', onRestored)
      canvas.remove()
    }
  }

  try {
    canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    const cs = canvas.style
    cs.position = 'absolute'
    cs.inset = '0'
    cs.width = '100%'
    cs.height = '100%'
    cs.pointerEvents = 'none'
    cs.opacity = '0'
    // globals.css's reduced-motion block (transition: none !important) removes the fade.
    cs.transition = 'opacity 600ms ease-out'
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

    // Preallocated uniform storage: no allocations per draw.
    const stops = [new Float32Array(3), new Float32Array(3), new Float32Array(3), new Float32Array(3), new Float32Array(3)]
    const stopNames: UniformName[] = ['uS1', 'uS2', 'uS3', 'uS4', 'uS5']
    let state = opts.state
    let astro = opts.astro
    let lost = false
    let restoredOnce = false
    let firstFrame = false
    let cssW = 0
    let cssH = 0
    let bandH = DEFAULT_BAND_PX

    // Sky box = parent of SkyBackdrop's root; the band is its direct child (Pitfall 7: measured,
    // never read from the CSS custom property, never assumed 844).
    const box = host.closest('[data-sky-root]')?.parentElement ?? host
    const band = box.querySelector<HTMLElement>(':scope > [data-sky-band]')

    const measure = () => {
      cssW = host.clientWidth
      cssH = host.clientHeight
      bandH = band ? band.getBoundingClientRect().height : DEFAULT_BAND_PX
    }

    const draw = () => {
      if (disposed || lost) return
      const w = Math.max(1, Math.round(cssW * BUFFER_SCALE))
      const h = Math.max(1, Math.round(cssH * BUFFER_SCALE))
      if (c.width !== w) c.width = w
      if (c.height !== h) c.height = h
      gl.viewport(0, 0, w, h)
      const { linear } = skyPalette(state.sunAltitude, state.weather, astro.morning)
      for (let i = 0; i < 5; i++) {
        const s = stops[i]
        s[0] = linear[i][0]
        s[1] = linear[i][1]
        s[2] = linear[i][2]
        gl.uniform3fv(prog.loc[stopNames[i]], s)
      }
      gl.uniform2f(prog.loc.uRes, w, h)
      gl.uniform1f(prog.loc.uBandTop, Math.max(0, cssH - bandH) * BUFFER_SCALE)
      gl.uniform1f(prog.loc.uHorizon, cssH * BUFFER_SCALE)
      gl.uniform1f(prog.loc.uScale, BUFFER_SCALE)
      gl.uniform1f(prog.loc.uGrain, 1)
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

    const safeDraw = () => {
      try {
        draw()
      } catch (err) {
        c.style.opacity = '0'
        fail('error', err instanceof Error ? err.message : undefined)
      }
    }

    onLost = (e: Event) => {
      e.preventDefault() // without this there is no webglcontextrestored
      lost = true
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
        c.style.transition = 'opacity 600ms ease-out'
        firstFrame = false
        measure()
        draw()
      } catch (err) {
        fail('shader', err instanceof Error ? err.message : undefined)
      }
    }
    c.addEventListener('webglcontextlost', onLost)
    c.addEventListener('webglcontextrestored', onRestored)

    measure()
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measure()
        safeDraw()
      })
      ro.observe(box)
      if (band) ro.observe(band)
    }
    safeDraw()

    return {
      setState(next: SkyState, nextAstro: SkyAstro) {
        state = next
        astro = nextAstro
        safeDraw()
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
