import { getWeatherSnapshot } from '@/lib/weather/snapshot'

export const revalidate = 600
export const runtime = 'nodejs'

// No query params: a single cache key for everyone. No runtime-only env vars either: this is
// ISR, so they would describe the build/regeneration. Deployment info lives in /api/health.
export async function GET() {
  return Response.json(await getWeatherSnapshot())
}
