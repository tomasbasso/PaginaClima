// UI-SPEC "Fuentes". Shared by app/layout.tsx and app/global-error.tsx, which replaces the root
// layout and therefore has to load the fonts itself.
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google'

export const playfair = Playfair_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
})

export const jakarta = Plus_Jakarta_Sans({
  weight: ['400', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
})
