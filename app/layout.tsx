import type { Metadata, Viewport } from "next";
import type React from "react";
import { skyFromSnapshot, skyToken } from "@/lib/sky/state";
import { getWeatherSnapshot } from "@/lib/weather/snapshot";
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
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // React cache() dedupes this with the page's call; the sky is resolved at render time and
  // recomputed on the client by <SkyBackdrop live>. Without data: sky by solar phase only.
  const snapshot = await getWeatherSnapshot();
  const sky = skyFromSnapshot(snapshot, new Date());
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
