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
  title: "NŌM — Découvrez chaque menu",
  description:
    "NŌM transforme n'importe quel menu de restaurant en fiches claires, traduites et illustrées. Scanner, comprendre, savourer.",
  openGraph: {
    title: "NŌM — Découvrez chaque menu",
    description:
      "NŌM transforme n'importe quel menu de restaurant en fiches claires, traduites et illustrées.",
    locale: "fr_FR",
    type: "website",
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
