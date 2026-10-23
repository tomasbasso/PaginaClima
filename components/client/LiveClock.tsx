'use client'

import { useEffect, useState } from 'react'
import { formatHeaderDate } from '@/lib/time'

/**
 * Argentina-time header date. First render uses the server's renderedAt so SSR and
 * hydration produce identical text; the client then ticks every 60 s.
 */
export function LiveClock({ renderedAt }: { renderedAt: string }) {
  const [date, setDate] = useState(() => new Date(renderedAt))

  useEffect(() => {
    const tick = () => setDate(new Date())
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="nums text-[15px] leading-[1.6] text-ink/75">
      <time dateTime={date.toISOString()}>{formatHeaderDate(date)}</time>{' '}
      <span className="text-[12px] font-semibold leading-[1.33] tracking-[0.14em]">ART</span>
    </p>
  )
}
