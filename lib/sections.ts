// Bottom tab bar sections (UI-SPEC "Barra de pestañas", D-19): the app's three routes.
export type SectionId = 'ahora' | 'pronostico' | 'cielo'

export const SECTIONS: ReadonlyArray<{
  id: SectionId
  label: string
  href: string
}> = [
  { id: 'ahora', label: 'Ahora', href: '/' },
  { id: 'pronostico', label: 'Pronóstico', href: '/pronostico' },
  { id: 'cielo', label: 'Cielo', href: '/cielo' },
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
