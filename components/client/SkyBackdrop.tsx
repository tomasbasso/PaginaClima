'use client'
// Phase-1 sky: the six static CSS-gradient token sets of the UI-SPEC, crossfaded between two
// layers (gradients do not interpolate). Single replacement point for the phase-3 WebGL canvas,
// which keeps these tokens as its no-WebGL fallback (UI-SPEC "Contrato con la fase 3").
import { useEffect, useRef, useState } from 'react'
import { resolveSkyState, type SkyState, type SkyToken, skyToken } from '@/lib/sky/state'

const RECOMPUTE_MS = 60_000

type Layers = { a: SkyToken; b: SkyToken; active: 'a' | 'b' }

export function SkyBackdrop({
  state,
  live = false,
  className = '',
}: {
  state: SkyState
  live?: boolean
  className?: string
}) {
  const initial = skyToken(state)
  // Identical on server and client: layer A visible with the server token.
  const [layers, setLayers] = useState<Layers>({ a: initial, b: initial, active: 'a' })
  const weather = state.weather
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!live) return
    const tick = () => {
      // The token only ever comes from skyToken() (closed union), never from upstream text.
      const next = skyToken(resolveSkyState(new Date(), weather))
      setLayers((cur) => {
        const shown = cur.active === 'a' ? cur.a : cur.b
        if (shown === next) return cur
        return cur.active === 'a'
          ? { a: cur.a, b: next, active: 'b' }
          : { a: next, b: cur.b, active: 'a' }
      })
      // --accent (tab bar, diamond, focus ring) follows the sky: <html> and the hosting <main>.
      document.documentElement.dataset.sky = next
      const host = rootRef.current?.parentElement
      if (host?.hasAttribute('data-sky')) host.dataset.sky = next
    }
    const first = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, RECOMPUTE_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [live, weather])

  return (
    <div ref={rootRef} aria-hidden="true" className={`absolute inset-0 -z-10 overflow-hidden ${className}`}>
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
    </div>
  )
}
