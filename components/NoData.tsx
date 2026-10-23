// "Sin datos" block (UI-SPEC "Estados de interacción y de datos"). No hooks: renders on the
// server (page) and inside the client error boundary alike. Fixed copy only.
import type { ReactNode } from 'react'

export function NoData({ action }: { action?: ReactNode }) {
  return (
    <div className="mt-12 flex flex-col" role="status">
      <h2 className="font-serif text-[24px] font-normal italic leading-[1.33] text-ink">
        Ahora no tenemos el tiempo de Winifreda.
      </h2>
      <p className="mt-2 text-[15px] leading-[1.6] text-ink/75">
        El servicio del pronóstico no está respondiendo. Probá de nuevo en unos minutos.
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
