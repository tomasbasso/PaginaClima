// Editorial notice (UI-SPEC "Desactualizado" / "Aviso"): 2px peach rule on the left, Body 15
// in ink/75. Server-safe (no hooks); reused by plan 06 for "fuente caída".
import type { ReactNode } from 'react'

export function Notice({ children, role }: { children: ReactNode; role?: 'status' }) {
  return (
    <div role={role} className="border-l-2 border-peach pl-4 text-[15px] leading-[1.6] text-ink/75">
      {children}
    </div>
  )
}
