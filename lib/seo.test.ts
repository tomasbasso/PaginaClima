import { describe, expect, it } from 'vitest'
import { SITE_URL } from './config'
import {
  HOME_TITLE,
  SITE_DESCRIPTION,
  SITEMAP_PATHS,
  buildJsonLd,
  ogSummary,
  pageMetadata,
  serializeJsonLd,
} from './seo'
import type { NowData } from './weather/types'

const DAY = new Date('2026-10-26T15:00:00Z') // 12:00 ART
const NIGHT = new Date('2026-10-27T04:00:00Z') // 01:00 ART

function nowData(over: Partial<NowData> = {}): NowData {
  return {
    time: '2026-10-26T12:00:00-03:00',
    tempC: 17.6,
    feelsC: 17,
    humidityPct: 50,
    pressureHpa: 1013,
    windKmh: 10,
    gustKmh: 20,
    windDirDeg: 180,
    weatherCode: 0,
    isDay: 1,
    precipMm: 0,
    ...over,
  }
}

describe('SITE_DESCRIPTION and HOME_TITLE', () => {
  it('keeps the description in the 120–160 char range', () => {
    expect(SITE_DESCRIPTION.length).toBeGreaterThanOrEqual(120)
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160)
  })

  it('keeps the home title within 60 chars', () => {
    expect(HOME_TITLE.length).toBeLessThanOrEqual(60)
  })
})

describe('pageMetadata', () => {
  it('builds canonical, openGraph and twitter from one input', () => {
    const m = pageMetadata({ path: '/pronostico', title: 'X', description: 'Y' })
    expect(m.title).toBe('X')
    expect(m.description).toBe('Y')
    expect(m.alternates?.canonical).toBe('/pronostico')
    expect(m.openGraph).toMatchObject({
      type: 'website',
      locale: 'es_AR',
      siteName: 'Clima Winifreda',
      url: '/pronostico',
      title: 'X',
      description: 'Y',
    })
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: 'X', description: 'Y' })
  })

  it('accepts an absolute title and uses its plain text for og/twitter', () => {
    const m = pageMetadata({ path: '/', title: { absolute: 'Z' }, description: 'Y' })
    expect(m.title).toEqual({ absolute: 'Z' })
    expect(m.openGraph?.title).toBe('Z')
    expect(m.twitter?.title).toBe('Z')
  })

  it('does not set images (the file-based opengraph-image supplies them)', () => {
    const m = pageMetadata({ path: '/', title: 'X', description: 'Y' })
    expect(m.openGraph?.images).toBeUndefined()
    expect(m.twitter?.images).toBeUndefined()
  })
})

describe('buildJsonLd', () => {
  const ld = buildJsonLd({ dateModified: '2026-10-26T15:00:00.000Z' })
  const graph = ld['@graph'] as Array<Record<string, unknown>>
  const byType = (t: string) => graph.filter((n) => n['@type'] === t)

  it('has the schema.org context and one node per type', () => {
    expect(ld['@context']).toBe('https://schema.org')
    expect(graph).toHaveLength(3)
    expect(byType('WebSite')).toHaveLength(1)
    expect(byType('WebPage')).toHaveLength(1)
    expect(byType('City')).toHaveLength(1)
  })

  it('describes the WebSite and the WebPage with linked @ids', () => {
    const site = byType('WebSite')[0]
    const page = byType('WebPage')[0]
    const city = byType('City')[0]
    expect(site.url).toBe(`${SITE_URL}/`)
    expect(site.inLanguage).toBe('es-AR')
    expect(site.name).toBe('Clima Winifreda')
    expect(page.url).toBe(`${SITE_URL}/`)
    expect(page.name).toBe(HOME_TITLE)
    expect(page.inLanguage).toBe('es-AR')
    expect(page.dateModified).toBe('2026-10-26T15:00:00.000Z')
    expect(page.isPartOf).toEqual({ '@id': site['@id'] })
    expect(page.about).toEqual({ '@id': city['@id'] })
  })

  it('places Winifreda with the exact schema coordinates and no postal code', () => {
    const city = byType('City')[0]
    expect(city.name).toBe('Winifreda')
    expect(city.geo).toEqual({ '@type': 'GeoCoordinates', latitude: -36.2269, longitude: -64.2339 })
    expect(city.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Winifreda',
      addressRegion: 'La Pampa',
      addressCountry: 'AR',
    })
    expect(city.containedInPlace).toEqual({
      '@type': 'AdministrativeArea',
      name: 'La Pampa',
      containedInPlace: { '@type': 'Country', name: 'Argentina' },
    })
    expect(JSON.stringify(ld)).not.toContain('postalCode')
  })
})

describe('serializeJsonLd', () => {
  it('escapes every < and round-trips through JSON.parse', () => {
    const value = { a: '</script><script>alert(1)</script>', b: [1, 2] }
    const out = serializeJsonLd(value)
    expect(out).not.toContain('<')
    expect(out).toContain('\\u003c/script>')
    expect(JSON.parse(out)).toEqual(value)
  })
})

describe('ogSummary', () => {
  it('summarizes the current weather by day', () => {
    expect(ogSummary({ now: nowData() }, DAY)).toEqual({
      place: 'Winifreda, La Pampa',
      temp: '18°',
      label: 'Despejado',
    })
  })

  it('uses the night label from the solar phase', () => {
    expect(ogSummary({ now: nowData() }, NIGHT).label).toBe('Noche despejada')
  })

  it('uses the typographic minus for negative temperatures', () => {
    expect(ogSummary({ now: nowData({ tempC: -3.2 }) }, DAY).temp).toBe('−3°')
  })

  it('falls back without data', () => {
    expect(ogSummary({ now: null }, DAY)).toEqual({ place: 'Clima en Winifreda', temp: null, label: null })
  })

  it('keeps the temperature when the weather code is unknown', () => {
    expect(ogSummary({ now: nowData({ weatherCode: 42 }) }, DAY)).toEqual({
      place: 'Winifreda, La Pampa',
      temp: '18°',
      label: null,
    })
  })
})

describe('SITEMAP_PATHS', () => {
  it('lists only the public pages', () => {
    expect(SITEMAP_PATHS.map((p) => p.path)).toEqual(['/', '/pronostico', '/cielo'])
    for (const { path } of SITEMAP_PATHS) {
      expect(path.startsWith('/dev')).toBe(false)
      expect(path.startsWith('/api')).toBe(false)
    }
  })
})
