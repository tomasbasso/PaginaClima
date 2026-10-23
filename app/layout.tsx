import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import type React from "react";
import "./globals.css";

const playfair = Playfair_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

const jakarta = Plus_Jakarta_Sans({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

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
  return (
    <html lang="es-AR" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
