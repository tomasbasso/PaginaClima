'use client'
// 48 h meteogram renderer (FCST-01, UI-SPEC "Home: sección del meteograma"). Hand-made SVG over
// the pure geometry of lib/forecast/meteogram.ts. SSR and the first client render use the
// constant DEFAULT_WIDTH (342 px, identical HTML); a ResizeObserver re-lays out afterwards
// (RESEARCH Pattern 3). Nothing here reads the clock: "now" comes from the server's points.
import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_WIDTH, layoutMeteogram, meteogramSummary, PLOT_H } from '@/lib/forecast/meteogram'
import type { HourlyPoint } from '@/lib/weather/types'

// Labels are positioned by the top of their 16 px box; 12 px text with a hanging baseline + 2.
const TEXT_DY = 2
const LABEL_TEXT = 'text-[12px] font-semibold'

export function Meteogram({ points, todayKey }: { points: HourlyPoint[]; todayKey: string }) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const ref = useRef<HTMLDivElement>(null)

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

  const layout = useMemo(() => layoutMeteogram(points, width, todayKey), [points, width, todayKey])
  const summary = useMemo(() => meteogramSummary(points), [points])

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={layout.width}
        height={layout.height}
        role="img"
        aria-label={summary}
        className="block select-none"
      >
        {layout.nightBands.map((b, i) => (
          <rect key={`n${i}`} x={b.x} y={0} width={b.w} height={PLOT_H} className="fill-ink/5" />
        ))}
        {layout.daySeparators.map((x, i) => (
          <line key={`s${i}`} x1={x} x2={x} y1={0} y2={PLOT_H} strokeWidth={1} className="stroke-ink/20" />
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
        {layout.rainBars.map((b, i) => (
          <rect key={`r${i}`} x={b.x} y={b.y} width={b.w} height={b.h} opacity={0.75} className="fill-azure" />
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
        {layout.dayLabels.map((d, i) => (
          <text
            key={`d${i}`}
            x={d.x}
            y={d.y + TEXT_DY}
            dominantBaseline="hanging"
            className={`${LABEL_TEXT} fill-ink/75 tracking-[0.14em]`}
          >
            {d.text.toUpperCase()}
          </text>
        ))}
        {layout.hourTicks.map((t, i) => (
          <text
            key={`h${i}`}
            x={t.x}
            y={t.y + TEXT_DY}
            textAnchor="middle"
            dominantBaseline="hanging"
            className={`${LABEL_TEXT} nums fill-ink/75`}
          >
            {t.text}
          </text>
        ))}
        {layout.tempLabels.map((t, i) => (
          <text
            key={`t${i}`}
            x={t.x}
            y={t.y + TEXT_DY}
            textAnchor="middle"
            dominantBaseline="hanging"
            className={`${LABEL_TEXT} nums ${t.kind === 'max' ? 'fill-ink' : 'fill-ink/75'}`}
          >
            {t.text}
          </text>
        ))}
      </svg>
    </div>
  )
}
