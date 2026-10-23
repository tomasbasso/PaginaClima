'use client'

// Bottom navigation (UI-SPEC "Barra de pestañas" + "Íconos"). Client component: the active tab
// follows the current route (usePathname), and next/link keeps tab changes client-side (WR-07).
// Disabled sections are spans, not links: no route, no focus, no click feedback.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { isActiveSection, SECTIONS, type SectionId } from '@/lib/sections'

// Renders viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
// stroke-linecap="square" stroke-linejoin="miter" (camelCase props in JSX).
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

const ICONS: Record<SectionId, React.ReactNode> = {
  // Half sun over a horizon line with 3 short rays.
  ahora: (
    <Icon>
      <path d="M3 17H21" />
      <path d="M7 17A5 5 0 0 1 17 17" />
      <path d="M12 7V9" />
      <path d="M6.5 10.5L7.5 11.5" />
      <path d="M17.5 10.5L16.5 11.5" />
    </Icon>
  ),
  // Rectangular calendar with 2 rings and a row of small squares.
  pronostico: (
    <Icon>
      <rect x="4" y="6" width="16" height="14" />
      <path d="M9 4V8" />
      <path d="M15 4V8" />
      <rect x="7" y="13" width="2" height="2" />
      <rect x="11" y="13" width="2" height="2" />
      <rect x="15" y="13" width="2" height="2" />
    </Icon>
  ),
  // Zigzag polyline with 4 marked vertices.
  modelos: (
    <Icon>
      <path d="M3 17L8 9L14 14L21 6" />
      <rect x="2" y="16" width="2" height="2" />
      <rect x="7" y="8" width="2" height="2" />
      <rect x="13" y="13" width="2" height="2" />
      <rect x="20" y="5" width="2" height="2" />
    </Icon>
  ),
  // Crescent moon.
  cielo: (
    <Icon>
      <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5A6.5 6.5 0 0 0 19.5 14.5Z" />
    </Icon>
  ),
}

const ITEM =
  'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center text-[12px] font-semibold leading-[1.33] tracking-[0.02em]'

export function TabBar() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-10 h-[calc(56px+env(safe-area-inset-bottom))] border-t border-ink/12 bg-bar pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-full max-w-[560px]">
        {SECTIONS.map((s) => {
          if (s.enabled) {
            const active = isActiveSection(pathname, s.href)
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={active ? 'page' : undefined}
                className={`${ITEM} ${active ? 'text-[var(--accent)]' : 'text-ink/75'}`}
              >
                {ICONS[s.id]}
                <span className="mt-1">{s.label}</span>
                <span
                  className={`mt-1 h-px w-4 ${active ? 'bg-[var(--accent)]' : ''}`}
                  aria-hidden="true"
                />
              </Link>
            )
          }
          return (
            <span key={s.id} aria-disabled="true" className={`${ITEM} text-ink/30`}>
              {ICONS[s.id]}
              <span className="mt-1">
                {s.label}
                <span className="sr-only"> (próximamente)</span>
              </span>
              <span className="mt-1 h-px w-4" aria-hidden="true" />
            </span>
          )
        })}
      </div>
    </nav>
  )
}
