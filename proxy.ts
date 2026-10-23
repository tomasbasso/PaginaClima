// Hides the /dev/* review pages in production (D-14, T-01-27) with a real 404 status.
// notFound() inside the page is not enough: the root app/loading.tsx makes the response stream,
// so the status is already 200 when the page calls notFound(). The page keeps its own check as
// defense in depth. VERCEL_ENV is read at request time (undefined locally, 'preview' on previews).

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
