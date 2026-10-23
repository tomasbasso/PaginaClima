import type { Metadata } from "next";
import type React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clima en Winifreda",
  description: "El tiempo de Winifreda, La Pampa: ahora, en hora argentina.",
};

// Explicit props type (not the generated global LayoutProps) so `tsc --noEmit` works
// on a clean checkout before `next build`/`next typegen` has run.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
