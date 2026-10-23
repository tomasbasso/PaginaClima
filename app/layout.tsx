import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clima en Winifreda",
  description: "El tiempo de Winifreda, La Pampa: ahora, en hora argentina.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
