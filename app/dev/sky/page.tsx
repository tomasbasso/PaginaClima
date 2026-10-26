// /dev/sky (D-14): force any sun height, weather, intensity and wind, compare the animated canvas,
// the static frame (reduced motion) and the CSS fallback side by side, and read fps / ms /
// quality on screen. Hidden in production: VERCEL_ENV is undefined locally and 'preview' on
// preview deployments (T-03-13). The query is validated by parseSkyLabParams (T-03-14).
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Ahora } from '@/components/Ahora'
import { parseSkyLabParams } from '@/lib/sky/devParams'
import { buildFixtures, buildForecastFixtures } from '../estados/fixtures'
import { SkyLab } from './SkyLab'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cielo — Clima en Winifreda',
  robots: { index: false, follow: false },
}

export default async function SkyLabPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const initial = parseSkyLabParams(await searchParams)
  const now = new Date() // request instant (force-dynamic)
  const nowMs = now.getTime()
  const renderedAt = now.toISOString()
  const { states } = buildFixtures(nowMs)
  const headline = buildForecastFixtures(nowMs).headlines.largo ?? undefined
  // Ahora is a server component: both variants (day / night label) are rendered here and the
  // client lab picks one by the forced solar phase.
  const content = (night: boolean) => (
    <Ahora
      snapshot={states.normal}
      renderedAt={renderedAt}
      variant="normal"
      autoRefresh={false}
      night={night}
      headline={headline}
    />
  )

  return <SkyLab initial={initial} contentDay={content(false)} contentNight={content(true)} />
}
