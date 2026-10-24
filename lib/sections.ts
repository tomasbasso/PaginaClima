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
  { id: 'pronostico', label: 'Pronóstico', href: '/pronostico', enabled: true },
  { id: 'modelos', label: 'Modelos', href: '/modelos', enabled: false },
  { id: 'cielo', label: 'Cielo', href: '/cielo', enabled: false },
]

/**
 * Route-aware active tab (WR-07). '/' only matches itself; other sections also match their
 * sub-routes ('/pronostico/7d'). Unknown routes (404, /dev/*) have no active tab.
 */
export function isActiveSection(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (href === '/') return path === '/'
  return path === href || path.startsWith(`${href}/`)
}
