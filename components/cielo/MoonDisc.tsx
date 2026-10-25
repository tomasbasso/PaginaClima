// Moon disc of /cielo (UI-SPEC "Luna"): 64×64, shaded disc ink/8 with a 1px ink/20 outline and the
// lit part in ink. Decorative (aria-hidden): the name and percent are in text. No accent.
// Server component, pure; the path comes from lib/sky/moon.ts (southern hemisphere).
export function MoonDisc({ path }: { path: string | null }) {
  return (
    <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden="true" className="shrink-0">
      <circle cx={32} cy={32} r={31} className="fill-ink/8 stroke-ink/20" strokeWidth={1} />
      {path ? <path d={path} className="fill-ink" /> : null}
    </svg>
  )
}
