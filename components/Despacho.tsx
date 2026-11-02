// Weekly confidence phrase and the key of the rhombi (UI-SPEC "Despacho", "Leyenda y crédito", D-15, D-16).
// Same left rule as Notice, in the color of the rule that fired. Server-safe, no hooks. The phrase comes
// from the local tables of buildDespacho and React escapes it.
import { Rombo } from '@/components/Rombo'
import type { DespachoTone } from '@/lib/forecast/despacho'

// Literal classes: Tailwind does not generate interpolated ones.
const RULE_COLORS: Record<DespachoTone, string> = {
  azure: 'border-azure',
  sun: 'border-sun',
  ember: 'border-ember',
  neutral: 'border-ink/30',
}

const LABEL = 'text-[12px] font-semibold leading-[1.33] tracking-[0.14em] uppercase text-ink/75'

export function Despacho({ text, tone }: { text: string; tone: DespachoTone }) {
  return (
    <div>
      <p
        data-despacho={tone}
        className={`border-l-2 pl-4 font-serif text-[24px] italic leading-[1.33] text-ink text-pretty ${RULE_COLORS[tone]}`}
      >
        {text}
      </p>
      <ul aria-label="Qué significan los rombos" className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        <li className="flex items-center gap-2">
          <Rombo kind="coinciden" />
          <span className={LABEL}>Coinciden</span>
        </li>
        <li className="flex items-center gap-2">
          <Rombo kind="dudan" />
          <span className={LABEL}>Dudan</span>
        </li>
        {/* Always on its own line, at any width: the UI-SPEC adjusts D-16 here (adjustment 1). */}
        <li className="flex basis-full items-center gap-2">
          <Rombo kind="desacuerdo" />
          <span className={LABEL}>No se ponen de acuerdo</span>
        </li>
      </ul>
    </div>
  )
}
