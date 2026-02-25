import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nomnomnom-delta.vercel.app'),
  title: 'NŌM — Scanne le menu. Comprends chaque plat.',
  description: "Scanne n'importe quel menu, comprends chaque plat en 50+ langues. Traductions, explications, recommandations — instantanément.",
  openGraph: {
    title: 'NŌM — Scanne le menu. Comprends chaque plat.',
    description: "Scanne n'importe quel menu, comprends chaque plat en 50+ langues.",
    locale: 'fr_FR',
    type: 'website',
    siteName: 'NŌM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NŌM — Scanne le menu. Comprends chaque plat.',
    description: "Scanne n'importe quel menu, comprends chaque plat en 50+ langues.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={outfit.variable} data-scroll-behavior="smooth">
      <body className="bg-brand-bg text-brand-white font-sans antialiased min-h-screen">
        <Nav />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
