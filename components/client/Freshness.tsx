'use client'

// Freshness row (DATA-02): "ACTUALIZADO HACE X MIN · ESTIMADO POR MODELO", ticking every 60 s
// without refetching, plus the Open-Meteo credit (CC BY 4.0) and the outdated notice.
// router.refresh() when the data is older than 15 min (DATA-01), retried with a backoff while
// ISR keeps handing back the same stale entry (CR-01).
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Notice } from '@/components/Notice'
import { formatFreshness, isOutdated, shouldTriggerAutoRefresh } from '@/lib/weather/freshness'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'

export function Freshness({
  fetchedAt,
  renderedAt,
  suppressOutdatedNotice = false,
  autoRefresh = true,
}: {
  fetchedAt: string
  renderedAt: string
  suppressOutdatedNotice?: boolean
  autoRefresh?: boolean
}) {
  const router = useRouter()
  // First render uses the server's renderedAt: SSR and hydration produce the same text.
  const [now, setNow] = useState(() => Date.parse(renderedAt))
  // Backoff state for the current fetchedAt (CR-01): how many refreshes, and when the last one ran.
  const attempts = useRef(0)
  const lastRefreshAt = useRef(0)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // New fetchedAt = fresh data arrived: restart the backoff for this value (T-01-19).
    attempts.current = 0
    lastRefreshAt.current = 0
    if (!autoRefresh) return
    const fetchedAtMs = Date.parse(fetchedAt)

    const maybeRefresh = () => {
      const nowMs = Date.now()
      const go = shouldTriggerAutoRefresh({
        ageMs: nowMs - fetchedAtMs,
        attempts: attempts.current,
        sinceLastMs: nowMs - lastRefreshAt.current,
      })
      if (!go) return
      attempts.current += 1
      lastRefreshAt.current = nowMs
      router.refresh()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeRefresh()
    }

    const timeout = setTimeout(maybeRefresh, 3_000)
    // While the page stays on screen the age keeps growing: re-check every minute (WR-01).
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') maybeRefresh()
    }, 60_000)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchedAt, autoRefresh, router])

  const ageMs = now - Date.parse(fetchedAt)
  const outdated = isOutdated(ageMs)

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 py-4">
        <p className={`${LABEL} nums flex flex-wrap gap-x-4 gap-y-1 text-ink/75`}>
          <span aria-live="off" className={outdated ? 'text-peach' : undefined}>
            {formatFreshness(ageMs, new Date(fetchedAt))}
          </span>
          <span>ESTIMADO POR MODELO</span>
        </p>
        <p className={LABEL}>
          <a
            href="https://open-meteo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink/75 underline-offset-4 hover:underline"
          >
            DATOS: OPEN-METEO.COM
          </a>
        </p>
      </div>
      {outdated && !suppressOutdatedNotice ? (
        <Notice role="status">
          Estos datos tienen más de media hora. Recargá la página para traer los nuevos.
        </Notice>
      ) : null}
    </div>
  )
}
