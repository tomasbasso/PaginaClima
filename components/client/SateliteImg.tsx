'use client'

// The only client island of the Satélite block: it exists just for the image's onError. If
// /api/satelite fails in the browser (purged cache while GIBS is down), the box shows the same
// "Sin imagen" content as the server state instead of a broken image. `failed` starts false so
// SSR and hydration render the same markup.
import { useEffect, useRef, useState } from 'react'

export function SateliteImg({
  src,
  alt,
  emptyTitle,
  emptyBody,
}: {
  src: string
  alt: string
  emptyTitle: string
  emptyBody: string
}) {
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // The error may have fired before hydration attached onError.
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) setFailed(true)
  }, [])

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090e17] p-6 text-center">
        <p className="text-[15px] leading-[1.6] text-ink">{emptyTitle}</p>
        <p className="text-[15px] leading-[1.6] text-ink/75">{emptyBody}</p>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- our own immutable JPEG route, already 720² and cached by the CDN
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={720}
      height={720}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full"
    />
  )
}
