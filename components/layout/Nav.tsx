"use client";

import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-brand-bg/90 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-content px-6 h-16 flex items-center justify-between" aria-label="Navigation principale">
        <span className="font-bold text-xl text-brand-white tracking-tight">
          NŌM
        </span>
        <button className="bg-brand-orange hover:bg-brand-orange/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Rejoindre la liste d&apos;attente
        </button>
      </nav>
    </header>
  );
}
