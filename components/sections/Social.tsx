"use client";

import { motion } from "motion/react";
import { BELI_FEATURES } from "@/lib/data";
import Pill from "@/components/ui/Pill";

const CUISINES = [
  { name: "Japonaise", pct: 34, color: "#ff6b35" },
  { name: "Turque", pct: 22, color: "#e8453c" },
  { name: "Italienne", pct: 18, color: "#42d392" },
  { name: "Vietnamienne", pct: 14, color: "#6366f1" },
  { name: "Autre", pct: 12, color: "rgba(255,255,255,0.15)" },
];

const SPICE_CARDS = [
  { value: "🌶️🌶️", sub: "Modere" },
  { value: "€€", sub: "12–18€" },
  { value: "🍜", sub: "Bowls & soupes" },
];

function TasteProfileDemo() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[22px] p-5 max-w-[320px] w-full animate-float" style={{ animationDelay: "2000ms" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <p className="text-[10px] text-brand-orange uppercase tracking-[2px] font-bold m-0">
            TASTE PROFILE
          </p>
          <p className="text-base font-extrabold mt-1 m-0">@mariefoodie</p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-black text-brand-orange m-0">247</p>
          <p className="text-[9px] text-white/30 m-0">plats scannes</p>
        </div>
      </div>

      {/* Bar chart */}
      {CUISINES.map((c, i) => (
        <div key={i} className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-white/50 w-[72px] text-right flex-shrink-0">
            {c.name}
          </span>
          <div className="flex-1 h-3.5 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: c.color }}
              initial={{ width: 0 }}
              animate={{ width: `${c.pct}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.1 }}
            />
          </div>
          <span className="text-[10px] text-white/30 w-7 font-bold">
            {c.pct}%
          </span>
        </div>
      ))}

      {/* Spice/Budget/Style cards */}
      <div className="flex gap-2 mt-3">
        {SPICE_CARDS.map((s, i) => (
          <div
            key={i}
            className="flex-1 bg-white/[0.03] border border-white/5 rounded-[10px] py-2 px-1.5 text-center"
          >
            <p className="text-base m-0 mb-0.5">{s.value}</p>
            <p className="text-[8px] text-white/25 m-0">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Match score teaser */}
      <div className="mt-3 bg-brand-orange/5 border border-brand-orange/10 rounded-xl p-2 px-3 flex justify-between items-center">
        <span className="text-[11px] text-white/50">Match avec @lucas</span>
        <span className="text-sm font-black text-brand-green">87%</span>
      </div>
    </div>
  );
}

export default function Social() {
  return (
    <section id="social" className="py-12">
      <div className="mx-auto max-w-content px-6">
        {/* Header row */}
        <div className="flex justify-between items-end flex-wrap gap-3.5 mb-6">
          <div>
            <p className="text-[11px] text-brand-orange uppercase tracking-[2px] font-bold mb-2">
              Social &amp; gamification
            </p>
            <h2
              className="font-extrabold leading-tight tracking-tight mb-2"
              style={{ fontSize: "clamp(24px, 3.5vw, 38px)" }}
            >
              Le social est un mode, pas un mur
            </h2>
            <p className="text-sm text-white/40 max-w-[50ch] leading-relaxed">
              Tout est optionnel. Le scan marche sans. Mais si tu veux jouer...
            </p>
          </div>
          <Pill glow>🎮 Opt-in uniquement</Pill>
        </div>

        {/* Content */}
        <div className="flex flex-wrap gap-5 items-start">
          {/* Left: 4 feature cards */}
          <div className="flex-1 min-w-[380px] flex flex-col gap-2.5">
            {BELI_FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3.5"
              >
                <div className="w-[42px] h-[42px] rounded-xl bg-brand-orange/[0.06] border border-brand-orange/10 flex items-center justify-center text-xl flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-0.5">{f.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed m-0 mb-1.5">
                    {f.desc}
                  </p>
                  <span className="text-[9px] text-brand-orange/60 bg-brand-orange/[0.06] px-1.5 py-0.5 rounded-md font-semibold">
                    {f.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: TasteProfileDemo */}
          <TasteProfileDemo />
        </div>
      </div>
    </section>
  );
}
