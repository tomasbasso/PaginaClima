// /sitemap.xml: the three public pages. No data fetch; revalidate keeps lastModified on the same
// 10-minute cadence as the ISR pages.
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'
import { SITEMAP_PATHS } from '@/lib/seo'

export const revalidate = 600

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return SITEMAP_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
