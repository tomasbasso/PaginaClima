'use client'
// 48 h meteogram renderer (FCST-01, UI-SPEC "Home: sección del meteograma"). Hand-made SVG over
// the pure geometry of lib/forecast/meteogram.ts. SSR and the first client render use the
// constant DEFAULT_WIDTH (342 px, identical HTML); a ResizeObserver re-lays out afterwards
// (RESEARCH Pattern 3). Nothing here reads the clock: "now" comes from the server's points and
// the initial selection is index 0 (the current hour), so SSR and hydration match.
//
// Scrubber (D-04): a <div role="slider"> over the 160 px plot (not an SVG rect). Pointer capture
// + touch-action: pan-y keep vertical swipes scrolling the page; no touch handler ever calls
// preventDefault (Pitfall 6). The reading lives in a fixed line above the chart, never a tooltip.
import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_WIDTH,
  indexAtX,
  layoutMeteogram,
  meteogramSummary,
  PLOT_H,
  readoutFor,
  valueTextFor,
} from '@/lib/forecast/meteogram'
import type { HourlyPoint } from '@/lib/weather/types'

// Labels are positioned by the top of their 16 px box; 12 px text with a hanging baseline + 2.
const TEXT_DY = 2
const LABEL_TEXT = 'text-[12px] font-semibold'
const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const PAGE_STEP = 6
// Arrow glyph drawn pointing north in a 12×12 box (UI-SPEC "Fila de viento").
const ARROW_D = 'M6 11V1M2 5L6 1L10 5'
const DIAMOND = 6

export function Meteogram({ points, todayKey }: { points: HourlyPoint[]; todayKey: string }) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [sel, setSel] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const n = points.length

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0)
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Tap outside the meteogram returns the selection to "Ahora".
  useEffect(() => {
    const onDown = (e: globalThis.PointerEvent) => {
      const root = rootRef.current
      if (root && e.target instanceof Node && !root.contains(e.target)) setSel(0)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const layout = useMemo(() => layoutMeteogram(points, width, todayKey), [points, width, todayKey])
  const summary = useMemo(() => meteogramSummary(points), [points])
  const i = Math.min(sel, Math.max(0, n - 1))
  const readout = readoutFor(points, i, todayKey)
  const selX = layout.xs[i] ?? 0
  const selY = layout.tempY[i] ?? null

  const selectAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSel(indexAtX(e.clientX - rect.left, layout.width, n))
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    selectAt(e)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) selectAt(e)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = n - 1
    let next: number | null = null
    switch (e.key) {
      case 'ArrowLeft':
        next = i - 1
        break
      case 'ArrowRight':
        next = i + 1
        break
      case 'PageUp':
        next = i - PAGE_STEP
        break
      case 'PageDown':
        next = i + PAGE_STEP
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      case 'Escape':
        next = 0
        break
      default:
        return
    }
    e.preventDefault()
    setSel(Math.min(last, Math.max(0, next)))
  }

  return (
    <div ref={rootRef}>
      <div aria-hidden="true">
        <p className={`${LABEL} nums text-ink/75`}>{readout.timeLabel}</p>
        <p className="nums text-[15px] leading-[1.6] text-ink">
          {readout.temp}
          <span className="text-ink/75"> · </span>
          {readout.rain}
          <span className="text-ink/75"> · </span>
          {readout.wind}
          {readout.gust ? (
            <>
              <span className="text-ink/75"> · </span>
              <span className="text-peach">{readout.gust}</span>
            </>
          ) : null}
        </p>
      </div>
      <div ref={ref} className="relative mt-2 w-full">
        <svg
          width={layout.width}
          height={layout.height}
          role="img"
          aria-label={summary}
          className="block select-none"
        >
          {layout.nightBands.map((b, k) => (
            <rect key={`n${k}`} x={b.x} y={0} width={b.w} height={PLOT_H} className="fill-ink/5" />
          ))}
          {layout.daySeparators.map((x, k) => (
            <line key={`s${k}`} x1={x} x2={x} y1={0} y2={PLOT_H} strokeWidth={1} className="stroke-ink/20" />
          ))}
          {layout.zeroY !== null ? (
            <line
              x1={0}
              x2={layout.width}
              y1={layout.zeroY}
              y2={layout.zeroY}
              strokeWidth={1}
              strokeDasharray="2 4"
              className="stroke-ink/30"
            />
          ) : null}
          {layout.areaPath ? <path d={layout.areaPath} className="fill-ink/8" /> : null}
          {layout.tempPath ? (
            <path d={layout.tempPath} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-ink" />
          ) : null}
          {layout.rainBars.map((b, k) => (
            <rect key={`r${k}`} x={b.x} y={b.y} width={b.w} height={b.h} opacity={0.75} className="fill-azure" />
          ))}
          <line x1={0} x2={layout.width} y1={PLOT_H} y2={PLOT_H} strokeWidth={1} className="stroke-ink/20" />
          {layout.rainPeak ? (
            <text
              x={layout.rainPeak.x}
              y={layout.rainPeak.y + TEXT_DY}
              textAnchor="middle"
              dominantBaseline="hanging"
              className="nums fill-azure text-[12px] font-normal"
            >
              {layout.rainPeak.text}
            </text>
          ) : null}
          {layout.dayLabels.map((d, k) => (
            <text
              key={`d${k}`}
              x={d.x}
              y={d.y + TEXT_DY}
              dominantBaseline="hanging"
              className={`${LABEL_TEXT} fill-ink/75 tracking-[0.14em]`}
            >
              {d.text.toUpperCase()}
            </text>
          ))}
          {layout.hourTicks.map((t, k) => (
            <text
              key={`h${k}`}
              x={t.x}
              y={t.y + TEXT_DY}
              textAnchor="middle"
              dominantBaseline="hanging"
              className={`${LABEL_TEXT} nums fill-ink/75`}
            >
              {t.text}
            </text>
          ))}
          {layout.tempLabels.map((t, k) => (
            <text
              key={`t${k}`}
              x={t.x}
              y={t.y + TEXT_DY}
              textAnchor="middle"
              dominantBaseline="hanging"
              className={`${LABEL_TEXT} nums ${t.kind === 'max' ? 'fill-ink' : 'fill-ink/75'}`}
            >
              {t.text}
            </text>
          ))}
          {layout.wind.map((c, k) => (
            <g key={`w${k}`}>
              {c.rotate !== null ? (
                <path
                  d={ARROW_D}
                  transform={`translate(${c.x - 6} ${c.arrowY - 6}) rotate(${c.rotate} 6 6)`}
                  className="stroke-ink/75"
                  strokeWidth={1.5}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  fill="none"
                />
              ) : null}
              <text
                x={c.x}
                y={c.textY}
                textAnchor="middle"
                dominantBaseline="central"
                className={`nums text-[12px] font-normal ${c.strong ? 'fill-peach' : 'fill-ink/75'}`}
              >
                {c.text}
              </text>
            </g>
          ))}
          {n > 0 ? (
            <g>
              <line x1={selX} x2={selX} y1={0} y2={PLOT_H} strokeWidth={1} className="stroke-ink/55" />
              {selY !== null ? (
                <rect
                  x={selX - DIAMOND / 2}
                  y={selY - DIAMOND / 2}
                  width={DIAMOND}
                  height={DIAMOND}
                  transform={`rotate(45 ${selX} ${selY})`}
                  className="fill-accent"
                />
              ) : null}
            </g>
          ) : null}
        </svg>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Hora del pronóstico"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, n - 1)}
          aria-valuenow={i}
          aria-valuetext={n > 0 ? valueTextFor(points[i]) : undefined}
          className="absolute left-0 top-0 w-full"
          style={{
            height: PLOT_H,
            touchAction: 'pan-y',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  )
}
