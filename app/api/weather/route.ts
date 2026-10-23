import { getWeatherSnapshot } from '@/lib/weather/snapshot'

export const revalidate = 600
export const runtime = 'nodejs'

// No query params: a single cache key for everyone.
export async function GET() {
  const snapshot = await getWeatherSnapshot()
  return Response.json({
    ...snapshot,
    region: process.env.VERCEL_REGION ?? 'local',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
  })
}
