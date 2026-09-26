import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blynk | Conexiones reales",
  description: "Una comunidad de video para conocer, conectar y conversar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="border-t border-white/10 bg-[#090914] px-4 py-6 text-center text-xs text-white/45">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <a className="hover:text-pink-200" href="/privacy">Privacy</a>
            <a className="hover:text-pink-200" href="/terms">Terms</a>
            <a className="hover:text-pink-200" href="/community-guidelines">Community Guidelines</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
