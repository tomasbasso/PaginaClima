// Deployment diagnostics (OPS-01, WR-04). Dynamic on purpose: VERCEL_REGION must describe the
// function answering *this* request, not the build or the last ISR regeneration. Touches no
// upstream API and no cache, so it costs one tiny function invocation per call.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET() {
  return Response.json(
    {
      region: process.env.VERCEL_REGION ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
