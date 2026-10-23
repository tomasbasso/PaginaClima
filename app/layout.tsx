import type { Metadata, Viewport } from "next";
import type React from "react";
import { resolveSkyState, skyToken } from "@/lib/sky/state";
import { TabBar } from "@/components/TabBar";
import { jakarta, playfair } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clima en Winifreda",
  description: "El tiempo de Winifreda, La Pampa: ahora, en hora argentina.",
  appleWebApp: { statusBarStyle: "black-translucent" },
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
  // No data work here (WR-06): awaiting the snapshot in the root layout would block streaming,
  // so app/loading.tsx could never show. <html data-sky> is the solar-phase fallback (404 etc.);
  // each page's <Hero> carries the weather-aware token on <main>, and <SkyBackdrop live> keeps
  // both in sync on the client.
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
