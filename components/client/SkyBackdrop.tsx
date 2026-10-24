'use client'
// The sky behind the Hero. Phase-1 base: the six static CSS-gradient token sets of the UI-SPEC,
// crossfaded between two layers (gradients do not interpolate). They stay mounted as the
// no-WebGL fallback (D-02); on top, after hydration, the phase-3 WebGL renderer is loaded with
// import() and draws the continuous sky into its own canvas (single replacement point, D-01).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { astroAt } from '@/lib/sky/astro'
import { refreshSolar, type SkyState, type SkyToken, skyToken } from '@/lib/sky/state'
import type { SkyRendererHandle } from './sky/renderer'

const RECOMPUTE_MS = 60_000

type Layers = { a: SkyToken; b: SkyToken; active: 'a' | 'b' }

export function SkyBackdrop({
  state,
  live = false,
  renderer,
  className = '',
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

  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

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
          astro: astroAt(new Date()),
          mode: rendererMode === 'static' ? 'static' : 'animated',
        })
        handleRef.current = handle
      })
      .catch(() => {
        // ChunkLoadError or similar: the fallback stays.
      })
    return () => {
      disposed = true
      handle?.dispose()
      handleRef.current = null
    }
  }, [rendererMode])

  // New server state (router.refresh() with new data or a new render): redraw.
  useEffect(() => {
    handleRef.current?.setState(stateRef.current, astroAt(new Date()))
  }, [state.weather, state.sunAltitude, state.phase])

  return (
    <div
      ref={rootRef}
      data-sky-root
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div
        data-sky={layers.a}
        className="sky-layer absolute inset-0"
        style={{ opacity: layers.active === 'a' ? 1 : 0 }}
      />
      <div
        data-sky={layers.b}
        className="sky-layer absolute inset-0"
        style={{ opacity: layers.active === 'b' ? 1 : 0 }}
      />
      {/* Canvas host: empty in SSR (identical hydration), the renderer appends its canvas here. */}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
