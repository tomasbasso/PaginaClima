---
phase: quick-261026-g5s
plan: 01
status: complete
subsystem: seo
tags: [seo, metadata, robots, sitemap, manifest, opengraph, json-ld, search-console]
requires: []
provides:
  - "SITE_URL / SITE_NAME / SCHEMA_GEO (lib/config.ts)"
  - "Pure SEO builders: pageMetadata, buildJsonLd, serializeJsonLd, ogSummary, SITEMAP_PATHS, SITE_DESCRIPTION, HOME_TITLE, OG_IMAGE_ALT (lib/seo.ts)"
  - "/robots.txt, /sitemap.xml, /manifest.webmanifest, /icon, /apple-icon, /opengraph-image"
affects: [app/layout.tsx, app/page.tsx, app/pronostico/page.tsx, app/cielo/page.tsx, proxy.ts]
tech-stack:
  added: []
  patterns:
    - "next/og ImageResponse for static icons and the dynamic OG card (no @vercel/og)"
    - "Per-page metadata through one helper, since page openGraph/twitter replace the layout's"
key-files:
  created:
    - lib/seo.ts
    - lib/seo.test.ts
    - lib/brand-mark.tsx
    - app/robots.ts
    - app/sitemap.ts
    - app/manifest.ts
    - app/icon.tsx
    - app/apple-icon.tsx
    - app/opengraph-image.tsx
  modified:
    - lib/config.ts
    - lib/config.test.ts
    - app/layout.tsx
    - app/page.tsx
    - app/pronostico/page.tsx
    - app/cielo/page.tsx
    - app/dev/estados/page.tsx
    - app/dev/sky/page.tsx
    - proxy.ts
    - components/Ahora.tsx
    - components/Hero.tsx
  deleted:
    - app/loading.tsx
    - app/pronostico/loading.tsx
    - app/cielo/loading.tsx
decisions:
  - "loading.tsx deleted on /, /pronostico and /cielo: the Suspense fallback shipped CARGANDO, '—' and a second h1 ahead of the real ISR content"
  - "OG image listed explicitly in pageMetadata (openGraph.images + twitter.images), because a page-level openGraph drops the root file-based image on child segments"
metrics:
  duration: ~25 min
  completed: 2026-10-26
  tasks: 3
---

# Quick 261026-g5s: Technical SEO for Search Console Summary

This task adds the SEO pieces the site was missing: metadataBase and per-page title, description, canonical, OG and Twitter tags. It also adds robots.txt, sitemap.xml, a web manifest with generated PNG icons, an OG image at `next/og` that shows the current temperature and sky label, and WebSite/WebPage/City JSON-LD on the home. The three `loading.tsx` files are gone, so the raw HTML now starts with the real data under a single `<h1>`.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (RED) | 160628e | test(quick-261026-g5s): add failing tests for SEO builders and resolveSiteUrl |
| 1 (GREEN) | acc46dc | feat(quick-261026-g5s): add SITE_URL config and pure SEO builders |
| 2 | 0dd85b0 | feat(quick-261026-g5s): wire metadata, robots, sitemap, manifest, icons, OG image and JSON-LD |
| 3 (fix found in verification) | dac470d | fix(quick-261026-g5s): list the OG image explicitly so child pages keep og:image |
| 3 | 92bf5f5 | fix(quick-261026-g5s): drop streaming loading fallbacks so raw HTML has one h1 and real data |

## Why the loading.tsx files were deleted

A `loading.tsx` always wraps its segment in a Suspense boundary. Even a fully prerendered ISR page therefore shipped the fallback first: CARGANDO, "—" values and an extra sr-only `<h1>`. The real content arrived later in `<div hidden id="S:0">`. Keeping the file but removing its h1 would still have served "—" first to crawlers and on first paint.

The three pages are ISR and are served prerendered from the cache with stale-while-revalidate, so visitors never wait on a blocking render. The TabBar uses `next/link`, which in production prefetches the full RSC payload of static routes, so client navigation does not need the fallback either. The `loading` variants of Ahora, Pronostico and CieloHead stay, because /dev/estados still renders them. The comments that mentioned `app/loading.tsx` were rewritten in `app/layout.tsx` (WR-06), `proxy.ts`, `components/Ahora.tsx` and `components/Hero.tsx`. The behavior of `proxy.ts` did not change.

## Verification evidence

`npm run typecheck`, `npm run lint`, `npm test` (42 files, 698 tests passed) and `npm run build` all passed on the final tree.

In the build route table, `/`, `/pronostico`, `/cielo` and `/opengraph-image` are `○` with 10m revalidate, `/sitemap.xml` has 10m revalidate, and `/robots.txt`, `/manifest.webmanifest`, `/icon` and `/apple-icon` are `○` static. `/dev/*` stays `ƒ`.

Checks ran with `npx next start -p 3123` in the background, which was stopped afterwards. Downloaded files went to the scratchpad.

1. `/`
   - Status 200, `<h1` count = **1**.
   - `id="S:0"` = 0, `<template` = 0, CARGANDO = 0, "—" never appears.
   - The first `NN°` (16°) is at offset 12984 and there is no `<template` at all.
   - Tags present:
     - `<title>Clima en Winifreda hoy · Pronóstico La Pampa</title>`
     - `<link rel="canonical" href="https://clima-winifreda.vercel.app"/>`
     - `name="description"` (×1), `property="og:title"` (×1)
     - `og:url` set to `https://clima-winifreda.vercel.app`
     - `og:image` and `twitter:image` set to `https://clima-winifreda.vercel.app/opengraph-image`, plus og:image width/height/type/alt
     - `twitter:card` set to `summary_large_image`
   - JSON-LD: exactly **1** `<script type="application/ld+json">` tag. A second `application/ld+json` string match is inside the RSC flight payload and is not a tag. It contains `"@type":"City"` with GeoCoordinates -36.2269/-64.2339, and `postalCode` = 0.
2. `/pronostico` and `/cielo`
   - Both return 200 with **1** `<h1>` each and no S:0 or template.
   - Canonicals are `https://clima-winifreda.vercel.app/pronostico` and `https://clima-winifreda.vercel.app/cielo`.
   - og:image and twitter:image are present, both `/opengraph-image`.
   - Titles are "Pronóstico extendido en Winifreda, La Pampa" and "Lluvia, satélite, sol y luna en Winifreda".
3. `/robots.txt` returns 200:
   ```
   User-Agent: *
   Allow: /
   Disallow: /api/
   Disallow: /dev/

   Sitemap: https://clima-winifreda.vercel.app/sitemap.xml
   ```
4. `/sitemap.xml` returns 200 with **3** `<loc>` entries (`/`, `/pronostico`, `/cielo` on SITE_URL) and 0 under /dev or /api.
5. `/manifest.webmanifest` returns 200 as `application/manifest+json` and parses with `JSON.parse`. Values: name "Clima Winifreda", short_name "Winifreda", lang es-AR, display standalone, both colors #0e131c. The icon `/icon` returns 200 `image/png` at **512x512**, and `/apple-icon` returns 200 `image/png` at **180x180**. The generated `<link rel="icon" href="/icon?…">` and `<link rel="apple-touch-icon" href="/apple-icon?…">` match the manifest src paths.
6. `/opengraph-image` returns 200 `image/png`. The IHDR reads **1200x630** (38810 bytes). The live render showed "CLIMA WINIFREDA / Winifreda, La Pampa / 17° Cubierto". The icon was also checked visually: night gradient, pale moon, horizon line and a dark Pampa band.

## Deviations from Plan

**1. [Rule 1 - Bug] og:image was missing on /pronostico and /cielo** (the plan expected this might happen)
- **Found during:** Task 3 curl check 2.
- **Issue:** The page-level `openGraph` from `pageMetadata` replaces the root's, which dropped the file-based image on child segments.
- **Fix:** `pageMetadata` now sets `openGraph.images` and `twitter.images` to `{ url: '/opengraph-image', width: 1200, height: 630, type: 'image/png', alt }`. A new export, `OG_IMAGE_ALT`, holds the alt text and is reused by `app/opengraph-image.tsx`. The test was updated to cover this.
- **Side effect:** On the home, the explicit config now replaces the file convention, so the og:image URL has no `?hash` cache-buster. It still points at the same route and revalidates every 600 s.
- **Commit:** dac470d

**2. [Rule 3 - Structure] Shared icon markup in `lib/brand-mark.tsx`**
- This file is not in the plan's file list. `app/icon.tsx` and `app/apple-icon.tsx` both render one `BrandMark({ size })` instead of two copies of the same Satori tree. It has no data and no fonts.

**3. `app/dev/sky/page.tsx` touched (allowed by the plan)**
- One line: `robots: { index: false, follow: false }`. `/dev/estados` received the same change.

**4. `components/Hero.tsx` comment**
- Its header comment also listed `app/loading.tsx`, so it was updated to match the code. This is a comment-only change.

**5. Commit re-split (process)**
- The `git rm` deletions were staged when I made the OG-fix commit, so they landed there by mistake. I soft-reset those two local, unpushed commits and recommitted them with the correct contents (dac470d and 92bf5f5). The file contents did not change.

## Observations

- During verification the OG card showed 17° while the home HTML showed 16°. Both are independent ISR renders of the same 10-minute-cached snapshot, generated at different moments (build vs. first request after start). This is expected behavior.
- Nothing changed in caching (revalidate values, unstable_cache, Cache-Control), `vercel.json`, X-Robots-Tag, or LAT/LON. `@vercel/og` was not installed.

## Known Stubs

None.

## Self-Check: PASSED

- Files exist: lib/seo.ts, lib/seo.test.ts, lib/brand-mark.tsx, app/robots.ts, app/sitemap.ts, app/manifest.ts, app/icon.tsx, app/apple-icon.tsx, app/opengraph-image.tsx. No loading.tsx remains under app/.
- Commits exist: 160628e, acc46dc, 0dd85b0, dac470d, 92bf5f5.
