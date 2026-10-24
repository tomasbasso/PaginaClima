'use client'
// The sky behind the Hero. Phase-1 base: the six static CSS-gradient token sets of the UI-SPEC,
// crossfaded between two layers (gradients do not interpolate). They stay mounted as the
// no-WebGL fallback (D-02); on top, after hydration, the phase-3 WebGL renderer is loaded with
// import() and draws the continuous sky into its own canvas (single replacement point, D-01).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { astroAt, type SkyAstro } from '@/lib/sky/astro'
import { refreshSolar, type SkyState, type SkyToken, skyToken } from '@/lib/sky/state'
import type { SkyFailReason, SkyRendererHandle, SkyStats } from './sky/renderer'

const RECOMPUTE_MS = 60_000

type Layers = { a: SkyToken; b: SkyToken; active: 'a' | 'b' }

export function SkyBackdrop({
  state,
  live = false,
  renderer,
  className = '',
  astro,
  paused = false,
  bufferScale,
  onStats,
  onStatus,
}: {
  state: SkyState
  live?: boolean
  /**
   * WebGL canvas: 'auto' (animated), 'static' (one frame per state) or 'off' (CSS only).
   * Default: 'auto' for the live Hero, 'off' otherwise, so /dev/estados frames never create a
   * WebGL context (WebKit caps them at ~16 per page).
   */
  renderer?: 'auto' | 'static' | 'off'
  className?: string
  /** /dev/sky: forced sun side/moon instead of astroAt(new Date()). */
  astro?: SkyAstro
  /** /dev/sky: manual pause of the animated canvas. */
  paused?: boolean
  /** /dev/sky: canvas buffer scale (0.5 default, 0.75 max). Changing it recreates the renderer. */
  bufferScale?: 0.5 | 0.75
  /** /dev/sky: fps / ms / quality reading. */
  onStats?: (s: SkyStats) => void
  /** /dev/sky: 'ok' on the first frame, or the failure reason (the CSS fallback stays). */
  onStatus?: (s: 'ok' | SkyFailReason, message?: string) => void
}) {
  const rendererMode = renderer ?? (live ? 'auto' : 'off')
  const initial = skyToken(state)
  // Identical on server and client: layer A visible with the server token.
  const [layers, setLayers] = useState<Layers>({ a: initial, b: initial, active: 'a' })
  const weather = state.weather
  // Recomputed by every server render: a router.refresh() that brings a new render (and with it
  // a possibly older server data-sky, which React patches back onto <html>/<main>) re-runs the
  // sync below right away instead of waiting for the next 60 s tick (WR-10).
  const renderedSunAltitude = state.sunAltitude
  const rootRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)
  const handleRef = useRef<SkyRendererHandle | null>(null)
  // Dev props live in refs so new callbacks / a new astro object never recreate the renderer.
  const astroRef = useRef(astro)
  const pausedRef = useRef(paused)
  const onStatsRef = useRef(onStats)
  const onStatusRef = useRef(onStatus)
  const astroNow = () => astroRef.current ?? astroAt(new Date())

  useLayoutEffect(() => {
    stateRef.current = state
    astroRef.current = astro
    pausedRef.current = paused
    onStatsRef.current = onStats
    onStatusRef.current = onStatus
  })

  // Layout effect: runs after React patched the server attributes and before paint, so the
  // accent never shows a stale token, not even for one frame.
  useLayoutEffect(() => {
    if (!live) return
    // refreshSolar keeps every field of the server state (Pitfall 9); the token only ever comes
    // from skyToken() (closed union), never from upstream text.
    const current = () => refreshSolar(stateRef.current, new Date())
    const applyAccent = (token: SkyToken) => {
      // --accent (tab bar, diamond, focus ring) follows the sky: <html> and the hosting <main>.
      document.documentElement.dataset.sky = token
      // closest(): after the phase-2 Hero refactor the backdrop's parent is the sky box, not <main>.
      const host = rootRef.current?.parentElement?.closest<HTMLElement>('[data-sky]')
      if (host) host.dataset.sky = token
    }
    applyAccent(skyToken(current()))
    const tick = () => {
      const now = new Date()
      const nextState = refreshSolar(stateRef.current, now)
      const next = skyToken(nextState)
      setLayers((cur) => {
        const shown = cur.active === 'a' ? cur.a : cur.b
        if (shown === next) return cur
        return cur.active === 'a'
          ? { a: cur.a, b: next, active: 'b' }
          : { a: next, b: cur.b, active: 'a' }
      })
      applyAccent(next)
      // The canvas follows the real sun even without a router.refresh().
      handleRef.current?.setState(nextState, astroAt(now))
    }
    const first = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, RECOMPUTE_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [live, weather, renderedSunAltitude])

  // WebGL renderer: separate chunk, loaded after hydration. Any failure (chunk, context, shader)
  // leaves the CSS layers below visible and never throws into React (Pitfall 11).
  useEffect(() => {
    if (rendererMode === 'off') return
    let disposed = false
    let handle: SkyRendererHandle | null = null
    import('./sky/renderer')
      .then(({ createSkyRenderer }) => {
        if (disposed || !hostRef.current) return
        handle = createSkyRenderer(hostRef.current, {
          state: stateRef.current,
          astro: astroNow(),
          mode: rendererMode === 'static' ? 'static' : 'animated',
          bufferScale,
          onFirstFrame: () => onStatusRef.current?.('ok'),
          onFail: (reason, message) => onStatusRef.current?.(reason, message),
          onStats: (s) => onStatsRef.current?.(s),
        })
        handleRef.current = handle
        if (handle && pausedRef.current) handle.setPaused(true)
      })
      .catch((err: unknown) => {
        // ChunkLoadError or similar: the fallback stays.
        onStatusRef.current?.('error', err instanceof Error ? err.message : undefined)
      })
    return () => {
      disposed = true
      handle?.dispose()
      handleRef.current = null
    }
    // astroNow only reads refs: it is deliberately not a dependency.
  }, [rendererMode, bufferScale])

  // /dev/sky manual pause.
  useEffect(() => {
    handleRef.current?.setPaused(paused)
  }, [paused])

  // New server state (router.refresh() with new data or a new render): redraw.
  useEffect(() => {
    handleRef.current?.setState(stateRef.current, astroNow())
  }, [
    state.weather,
    state.sunAltitude,
    state.phase,
    state.intensity,
    state.windKmh,
    state.windDirDeg,
    state.cloudCover,
    astro?.morning,
    astro?.sunAzimuth,
    astro?.moonAltitude,
    astro?.moonAzimuth,
    astro?.moonFraction,
  ])

  // data-sky-weather / data-sky-night: the static weather layer of the CSS fallback (SKY-05).
  // Closed unions only (SkyWeather, phase === 'noche'), identical on server and client.
  return (
    <div
      ref={rootRef}
      data-sky-root
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div
        data-sky={layers.a}
        data-sky-weather={state.weather}
        data-sky-night={state.phase === 'noche' ? '' : undefined}
        className="sky-layer absolute inset-0"
        style={{ opacity: layers.active === 'a' ? 1 : 0 }}
      />
      <div
        data-sky={layers.b}
        data-sky-weather={state.weather}
        data-sky-night={state.phase === 'noche' ? '' : undefined}
        className="sky-layer absolute inset-0"
        style={{ opacity: layers.active === 'b' ? 1 : 0 }}
      />
      {/* Canvas host: empty in SSR (identical hydration), the renderer appends its canvas here. */}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
