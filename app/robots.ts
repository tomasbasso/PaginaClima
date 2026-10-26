// /robots.txt: everything public is crawlable; the JSON API and the /dev review pages are not.
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dev/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
