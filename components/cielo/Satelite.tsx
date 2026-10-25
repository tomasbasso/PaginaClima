// "Satélite" block of /cielo (SAT-01, SAT-02, D-07, UI-SPEC "Bloque 3"). Server component: the
// pass, its ART time and the marker position arrive computed from lib/satellite/frame. The image
// comes from our own /api/satelite/{stamp}.jpg (never NASA directly), lazy, in a 1:1 box so it
// loads without layout shift. The SMN radar link is always there, also when the image fails.
import { useId } from 'react'
import { SateliteImg } from '@/components/client/SateliteImg'
import { SATELLITE_SIDE_KM, SMN_RADAR_URL } from '@/lib/config'
import type { SatelliteView } from '@/lib/satellite/frame'

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase'
const BODY = 'text-[15px] leading-[1.6]'
/** Phase 2 button (DailyList); the accent border on hover/focus is the block's only accent. */
const BUTTON =
  'h-11 border border-ink/30 bg-transparent px-6 text-[12px] font-semibold uppercase leading-[1.33] tracking-[0.14em] text-ink transition-colors hover:border-accent hover:bg-ink/8 focus-visible:border-accent focus-visible:bg-ink/8 active:bg-ink/12'
const BOX = 'relative aspect-square w-full border border-ink/12 bg-[#090e17]'

const EMPTY_TITLE = 'No hay imagen satelital en este momento.'
const EMPTY_BODY = 'Mientras tanto, podés ver el radar del SMN.'

function Marker({ x, y }: { x: number; y: number }) {
  // Label to the left when it would not fit on the right (marker near the edge).
  const labelSide = x > 0.75 ? 'right-3' : 'left-3'
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      {/* 6 px square rotated 45° ≈ 8 px diamond, 1 px #090e17 outline. */}
      <span className="absolute left-0 top-0 block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink shadow-[0_0_0_1px_#090e17]" />
      <span
        className={`${LABEL} absolute top-0 ${labelSide} -translate-y-1/2 whitespace-nowrap bg-[#090e17]/80 px-1 text-ink`}
      >
        Winifreda
      </span>
    </div>
  )
}

export function Satelite({ view, showImage = true }: { view: SatelliteView | null; showImage?: boolean }) {
  // Several instances may live on /dev/estados: unique id, valid selector.
  const id = `satelite-${useId().replace(/:/g, '')}`
  return (
    <section aria-labelledby={id} className="pb-12 pt-8">
      <h2 id={id} className={`${LABEL} text-ink/75`}>
        Satélite
      </h2>
      {view ? (
        <>
          <p className={`${LABEL} nums mt-4 ${view.stale ? 'text-peach' : 'text-ink/75'}`}>{view.timeText}</p>
          <div className={`${BOX} mt-2`}>
            {/* Behind the image, no JS: the opaque JPEG covers it once loaded. */}
            <p className={`${LABEL} absolute inset-0 flex items-center justify-center text-ink/75`}>
              Cargando imagen
            </p>
            {showImage ? (
              <SateliteImg src={view.src} alt={view.alt} emptyTitle={EMPTY_TITLE} emptyBody={EMPTY_BODY} />
            ) : null}
            <Marker x={view.marker.x} y={view.marker.y} />
          </div>
          <p className={`${BODY} mt-2 text-ink/75`}>
            Los colores fuertes marcan topes de nube muy fríos, típicos de las tormentas. El cuadro abarca
            unos {SATELLITE_SIDE_KM} km de lado. GOES-East, NASA GIBS.
          </p>
        </>
      ) : (
        <div className={`${BOX} mt-4 flex flex-col items-center justify-center p-6 text-center`}>
          <p className={`${BODY} text-ink`}>{EMPTY_TITLE}</p>
          <p className={`${BODY} text-ink/75`}>{EMPTY_BODY}</p>
        </div>
      )}
      <a
        href={SMN_RADAR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${BUTTON} mt-4 flex w-full items-center justify-center`}
      >
        Ver radar del SMN
        <span aria-hidden="true">&nbsp;↗</span>
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
    </section>
  )
}
