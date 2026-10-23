// Bottom tab bar sections (UI-SPEC "Barra de pestañas"). Each later phase flips its `enabled`:
// /pronostico in phase 2, /modelos in phase 4, /cielo in phase 5.
export type SectionId = 'ahora' | 'pronostico' | 'modelos' | 'cielo'

export const SECTIONS: ReadonlyArray<{
  id: SectionId
  label: string
  href: string
  enabled: boolean
}> = [
  { id: 'ahora', label: 'Ahora', href: '/', enabled: true },
  { id: 'pronostico', label: 'Pronóstico', href: '/pronostico', enabled: false },
  { id: 'modelos', label: 'Modelos', href: '/modelos', enabled: false },
  { id: 'cielo', label: 'Cielo', href: '/cielo', enabled: false },
]
