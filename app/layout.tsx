import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blynk | Conexiones reales",
  description: "Una comunidad de video para conocer, conectar y conversar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
