// Hides the /dev/* review pages in production (D-14, T-01-27) with a real 404 status.
// The proxy guarantees a real 404 status + noindex at the edge without relying on page rendering
// (a streamed response would already carry 200 when the page calls notFound()). The page keeps
// its own check as defense in depth. VERCEL_ENV is read at request time (undefined locally, 'preview' on previews).

export const config = {
  matcher: '/dev/:path*',
}

export function proxy() {
  if (process.env.VERCEL_ENV === 'production') {
    return new Response('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' },
    })
  }
}
