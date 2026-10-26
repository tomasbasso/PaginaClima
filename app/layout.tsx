import type { Metadata, Viewport } from "next";
import type React from "react";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { SITE_DESCRIPTION } from "@/lib/seo";
import { resolveSkyState, skyToken } from "@/lib/sky/state";
import { TabBar } from "@/components/TabBar";
import { jakarta, playfair } from "./fonts";
import "./globals.css";

// Site-wide defaults. No canonical here: it would leak to every route, 404s included; each page
// sets its own through pageMetadata().
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: "Clima en Winifreda", template: "%s · Clima Winifreda" },
  description: SITE_DESCRIPTION,
  keywords: ["clima Winifreda", "pronóstico Winifreda", "tiempo La Pampa", "lluvia Winifreda"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: SITE_NAME,
    title: "Clima en Winifreda",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { title: SITE_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: '#0e131c',
  viewportFit: 'cover',
  width: "device-width",
  initialScale: 1,
};

// Explicit props type (not the generated global LayoutProps) so `tsc --noEmit` works
// on a clean checkout before `next build`/`next typegen` has run.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // No data work here (WR-06): awaiting the snapshot in the root layout would make every route,
  // 404 and error pages included, depend on upstream. <html data-sky> is the solar-phase
  // fallback (404 etc.); each page's <Hero> carries the weather-aware token on <main>, and
  // <SkyBackdrop live> keeps both in sync on the client.
  const sky = resolveSkyState(new Date(), null);
  return (
    <html
      lang="es-AR"
      data-sky={skyToken(sky)}
      className={`${playfair.variable} ${jakarta.variable}`}
    >
      <body>
        {children}
        <TabBar />
      </body>
    </html>
  );
}
