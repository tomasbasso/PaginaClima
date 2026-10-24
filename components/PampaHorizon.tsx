// Static Pampa horizon silhouette (UI-SPEC "Silueta"): llanura, alambrado, molino, two caldenes.
// One inline SVG, flat #0f141d, no shadows or gradients, always above the sky canvas (D-12).
// Server component: only the windmill rotor is a client island that turns with the wind (D-13).
//
// The root has no viewBox: ground, wires and fence posts span 100% of the width at 1:1 px,
// and the windmill and trees are nested SVGs anchored at x = 8 % / 78 % / 88 % so they keep
// their place on any screen width without being cropped or stretched.

import { WindmillRotor } from '@/components/client/WindmillRotor'

const FILL = '#0f141d'
const GROUND_Y = 104 // 16px ground strip at the bottom of a 120px band

function Calden({ scale = 1 }: { scale?: number }) {
  // Flat, wide crown typical of the caldén; drawn centred on x = 0 with its base at y = 0.
  return (
    <g transform={`scale(${scale})`}>
      <path d="M-4 0 L-3 -24 L-14 -38 L-11 -40 L-1 -29 L7 -42 L10 -40 L3 -24 L5 0 Z" />
      <path d="M-60 -40 C-58 -52 -38 -60 -20 -58 C-10 -66 12 -67 24 -59 C40 -62 58 -54 61 -42 C49 -36 32 -38 19 -36 C5 -38 -10 -34 -24 -37 C-37 -34 -51 -35 -60 -40 Z" />
    </g>
  )
}

function Windmill({ windKmh }: { windKmh?: number | null }) {
  // ~112px tall: lattice tower, 12-blade rotor and tail vane. Base at y = 0.
  // Drawn 115 units tall, scaled 0.83 so the rotor tip sits at y ≈ 8 (≈112px above the band bottom).
  return (
    <g transform="scale(0.83)">
      {/* tower legs */}
      <path d="M-11 0 L-2 -86 L0 -86 L-8 0 Z" />
      <path d="M11 0 L2 -86 L0 -86 L8 0 Z" />
      {/* cross braces */}
      <g stroke={FILL} strokeWidth={1} fill="none">
        <path d="M-9 -16 L8 -36 M9 -16 L-8 -36" />
        <path d="M-7 -40 L6 -60 M7 -40 L-6 -60" />
        <path d="M-5 -64 L4 -82 M5 -64 L-4 -82" />
        <path d="M-10 -16 L10 -16 M-7.5 -40 L7.5 -40 M-5 -64 L5 -64" />
      </g>
      {/* platform */}
      <rect x={-6} y={-90} width={12} height={4} />
      {/* rotor (blades + hub turn with the wind; the SVG transform of this <g> stays as an
          attribute, a CSS transform on it would replace it) */}
      <g transform="translate(0 -98)">
        <WindmillRotor windKmh={windKmh} />
        {/* tail vane (does not turn) */}
        <path d="M2 -1 L26 -1 L26 1 L2 1 Z" />
        <path d="M22 -8 L32 -6 L32 6 L22 8 Z" />
      </g>
    </g>
  )
}

export function PampaHorizon({ windKmh }: { windKmh?: number | null } = {}) {
  return (
    <svg
      width="100%"
      height={120}
      preserveAspectRatio="xMidYMax slice"
      fill={FILL}
      aria-hidden="true"
      focusable="false"
      className="block"
    >
      <defs>
        <pattern id="pampa-fence-posts" width={56} height={120} patternUnits="userSpaceOnUse">
          <rect x={20} y={82} width={3} height={GROUND_Y - 82} />
        </pattern>
      </defs>

      {/* alambrado: posts every 56px + three 1px wires */}
      <rect x={0} y={0} width="100%" height={GROUND_Y} fill="url(#pampa-fence-posts)" />
      <rect x={0} y={86} width="100%" height={1} />
      <rect x={0} y={92} width="100%" height={1} />
      <rect x={0} y={98} width="100%" height={1} />

      {/* caldenes and molino, anchored by percentage */}
      <svg x="8%" y={GROUND_Y} width={1} height={1} overflow="visible">
        <Calden />
      </svg>
      <svg x="78%" y={GROUND_Y} width={1} height={1} overflow="visible">
        <Windmill windKmh={windKmh} />
      </svg>
      <svg x="88%" y={GROUND_Y} width={1} height={1} overflow="visible">
        <Calden scale={0.8} />
      </svg>

      {/* llanura: 16px ground strip */}
      <rect x={0} y={GROUND_Y} width="100%" height={120 - GROUND_Y} />
    </svg>
  )
}
