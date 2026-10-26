// SEO builders: per-page metadata, home JSON-LD, sitemap entries and the OG image summary. Pure:
// safe to import from tests, metadata route files and pages.
import type { Metadata, MetadataRoute } from 'next'
import { SCHEMA_GEO, SITE_NAME, SITE_URL } from '@/lib/config'
import { getSolarPhase } from '@/lib/sky/phase'
import { formatTemp } from '@/lib/weather/format'
import type { WeatherSnapshot } from '@/lib/weather/types'
import { describeWeather } from '@/lib/weather/wmo'

export const SITE_DESCRIPTION =
  'Clima en Winifreda, La Pampa, actualizado cada 10 minutos: temperatura actual, pronóstico por hora y a 7 días, probabilidad de lluvia y viento.'

export const HOME_TITLE = 'Clima en Winifreda hoy · Pronóstico La Pampa'

export const OG_IMAGE_ALT = 'Clima actual en Winifreda, La Pampa: temperatura y estado del cielo'

/** The root app/opengraph-image.tsx, referenced explicitly (see pageMetadata). */
const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: OG_IMAGE_ALT,
}

type SitemapEntry = {
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}

/** Public, indexable pages only: /dev and /api never go here. */
export const SITEMAP_PATHS: readonly SitemapEntry[] = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/pronostico', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/cielo', changeFrequency: 'daily', priority: 0.8 },
]

/**
 * A page-level `openGraph`/`twitter` object replaces the layout's (no deep merge), so every page
 * carries the full set from here. That replacement also drops the root file-based image on child
 * segments (verified: no og:image on /pronostico or /cielo), so the image is listed explicitly
 * (on every page, home included: the URL then carries no cache-busting hash).
 */
export function pageMetadata({
  path,
  title,
  description,
}: {
  path: string
  title: string | { absolute: string }
  description: string
}): Metadata {
  const text = typeof title === 'string' ? title : title.absolute
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'es_AR',
      siteName: SITE_NAME,
      url: path,
      title: text,
      description,
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: text, description, images: [OG_IMAGE] },
  }
}

/** Home @graph: WebSite + WebPage + City, linked by stable @ids. No postal code on purpose. */
export function buildJsonLd({ dateModified }: { dateModified: string }): Record<string, unknown> {
  const website = `${SITE_URL}/#website`
  const webpage = `${SITE_URL}/#webpage`
  const city = `${SITE_URL}/#winifreda`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': website,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: 'es-AR',
      },
      {
        '@type': 'WebPage',
        '@id': webpage,
        url: `${SITE_URL}/`,
        name: HOME_TITLE,
        inLanguage: 'es-AR',
        dateModified,
        isPartOf: { '@id': website },
        about: { '@id': city },
      },
      {
        '@type': 'City',
        '@id': city,
        name: 'Winifreda',
        description: 'Localidad del departamento Conhelo, en el noreste de La Pampa, Argentina.',
        geo: { '@type': 'GeoCoordinates', latitude: SCHEMA_GEO.latitude, longitude: SCHEMA_GEO.longitude },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Winifreda',
          addressRegion: 'La Pampa',
          addressCountry: 'AR',
        },
        containedInPlace: {
          '@type': 'AdministrativeArea',
          name: 'La Pampa',
          containedInPlace: { '@type': 'Country', name: 'Argentina' },
        },
      },
    ],
  }
}

/** For <script type="application/ld+json">: escaping '<' keeps '</script>' from closing it. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export type OgSummary = { place: string; temp: string | null; label: string | null }

/** Text of the OG image. Night follows the same solar-phase rule as <Ahora>. */
export function ogSummary(snapshot: Pick<WeatherSnapshot, 'now'>, now: Date): OgSummary {
  const data = snapshot.now
  if (!data) return { place: 'Clima en Winifreda', temp: null, label: null }
  const night = getSolarPhase(now).phase === 'noche'
  return {
    place: 'Winifreda, La Pampa',
    temp: `${formatTemp(data.tempC)}°`,
    label: describeWeather(data.weatherCode, { night }).label,
  }
}
