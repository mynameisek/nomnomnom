"use client";

import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import FoodImage from "@/components/ui/FoodImage";
import PhoneDemo from "@/components/sections/PhoneDemo";

export default function Hero() {
  return (
    <section className="pt-[90px] pb-4 relative">
      <div className="mx-auto max-w-content px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
          {/* Left column — text content */}
          <div>
            {/* Capability pills */}
            <div className="flex gap-1.5 flex-wrap mb-[18px]">
              <Pill glow>📸 QR · Photo · Lien · Voix</Pill>
              <Pill>🔓 Sans inscription</Pill>
              <Pill>🌍 50+ langues</Pill>
            </div>

            {/* Tagline */}
            <h1
              className="font-black leading-none tracking-tighter mb-4"
              style={{ fontSize: "clamp(34px, 4.5vw, 56px)" }}
            >
              Scanne le menu.
              <br />
              <span className="bg-gradient-to-br from-brand-orange to-brand-red bg-clip-text text-transparent">
                Comprends chaque plat.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-base leading-[1.65] mb-6"
              style={{ color: "rgba(255,255,255,0.45)", maxWidth: "48ch" }}
            >
              <b style={{ color: "rgba(255,255,255,0.8)" }}>NŌM</b> transforme
              n&apos;importe quel menu en fiches claires, traduites et illustrées.
              Dis ce que tu veux manger, l&apos;app te propose le{" "}
              <b style={{ color: "rgba(255,255,255,0.8)" }}>Top 3</b> du menu.
            </p>

            {/* CTA row */}
            <div className="flex gap-2.5 flex-wrap mb-7">
              <Btn primary big href="/scan">
                Scanner un menu
              </Btn>
              <Btn big href="#features">
                Comment ça marche ↓
              </Btn>
            </div>

            {/* Food mosaic */}
            <div className="flex gap-1.5 mb-2 items-center">
              {[0, 5, 3, 6, 2].map((idx, i) => (
                <FoodImage
                  key={i}
                  index={idx}
                  size={48}
                  className="rounded-[14px] border-2 border-white/[0.06]"
                />
              ))}
              <div
                className="flex items-center justify-center text-[11px] font-extrabold rounded-[14px] flex-shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  background: "rgba(255,107,53,0.1)",
                  border: "2px solid rgba(255,107,53,0.2)",
                  color: "#ff6b35",
                }}
              >
                200+
              </div>
            </div>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              Plus de 200 cuisines du monde couvertes
            </p>
          </div>

          {/* Right column — phone demo */}
          <div className="flex justify-center animate-float">
            <PhoneDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
