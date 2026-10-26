// /manifest.webmanifest. short_name ≤ 12 chars so the iOS home-screen label is not truncated.
// Icons are the generated app/icon.tsx and app/apple-icon.tsx routes.
import type { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/config'
import { SITE_DESCRIPTION } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'Winifreda',
    description: SITE_DESCRIPTION,
    lang: 'es-AR',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0e131c',
    theme_color: '#0e131c',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
