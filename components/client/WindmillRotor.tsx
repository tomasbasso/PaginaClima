'use client'
// The windmill rotor of the Pampa silhouette (UI-SPEC "Horizonte pampeano", D-13): the 12 blades
// and the hub turn around the hub with the real wind; the tail vane stays in PampaHorizon. One
// Web Animation on the compositor whose speed changes with updatePlaybackRate, so a new wind
// never makes the rotor jump. In SSR (and until the effect runs) the rotor sits at angle 0.
import { useEffect, useRef } from 'react'
import { rotorPeriodS } from '@/lib/sky/windmill'

const BLADES = Array.from({ length: 12 }, (_, i) => i * 30)
const REDUCE = '(prefers-reduced-motion: reduce)'

export function WindmillRotor({ windKmh }: { windKmh?: number | null }) {
  const rotorRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const el = rotorRef.current
    if (!el || typeof el.animate !== 'function') return
    // 1 s per turn at playbackRate 1, so playbackRate = 1 / period.
    const anim = el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: 1000,
      iterations: Infinity,
    })
    // WAAPI ignores the global reduced-motion CSS (Pitfall 10): read the preference in JS.
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCE) : null
    const apply = () => {
      if (mq?.matches) {
        anim.pause()
        anim.currentTime = 0
        return
      }
      const period = rotorPeriodS(windKmh)
      if (period === null) {
        anim.pause()
        return
      }
      anim.updatePlaybackRate(1 / period)
      anim.play()
    }
    apply()
    mq?.addEventListener('change', apply)
    return () => {
      mq?.removeEventListener('change', apply)
      anim.cancel()
    }
  }, [windKmh])

  return (
    <g ref={rotorRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      {BLADES.map((a) => (
        <path key={a} d="M-1 -4 L-2.5 -17 L2.5 -17 L1 -4 Z" transform={`rotate(${a})`} />
      ))}
      <circle r={3.5} />
    </g>
  )
}
