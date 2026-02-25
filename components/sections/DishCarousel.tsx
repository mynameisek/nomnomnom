"use client";

import { useState, useEffect, useRef } from "react";
import { DISHES, FOOD } from "@/lib/data";

export default function DishCarousel() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Auto-scroll to next card every 3.2s
  useEffect(() => {
    const iv = setInterval(() => setActive((p) => (p + 1) % DISHES.length), 3200);
    return () => clearInterval(iv);
  }, []);

  // Scroll container to active card
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({ left: active * 218, behavior: "smooth" });
    }
  }, [active]);

  return (
    <section className="py-8 pb-12">
      <p className="text-center text-[10px] text-white/15 uppercase tracking-[3px] font-bold mb-3">
        Explorer les plats du monde
      </p>
      <div
        ref={ref}
        className="flex flex-row gap-3 overflow-x-auto snap-x snap-mandatory px-6 no-scrollbar pb-2"
      >
        {DISHES.map((d, i) => (
          <div
            key={i}
            onClick={() => setActive(i)}
            className={`min-w-[206px] max-w-[206px] flex-shrink-0 snap-center rounded-2xl overflow-hidden cursor-pointer border transition-all duration-400 ${
              i === active
                ? "border-brand-orange/40 scale-[1.03] opacity-100"
                : "border-white/[0.04] scale-95 opacity-40"
            }`}
          >
            {/* Image area */}
            <div className="h-[110px] relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{ background: FOOD[d.img].grad }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={FOOD[d.img].url}
                alt=""
                className="w-full h-full object-cover relative"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(9,9,11,0.95)]" style={{ background: "linear-gradient(transparent 30%, rgba(9,9,11,0.95))" }} />
              {/* Price badge */}
              <div className="absolute top-2 right-2">
                <span className="bg-black/50 backdrop-blur text-brand-orange text-[11px] font-extrabold px-2 py-1 rounded-lg">
                  {d.price}
                </span>
              </div>
              {/* Spice indicators */}
              {d.spice > 0 && (
                <div className="absolute top-2 left-2">
                  <span className="text-[12px]">
                    {"🌶️".repeat(Math.min(d.spice, 3))}
                  </span>
                </div>
              )}
            </div>
            {/* Text area */}
            <div className="px-3 pb-3" style={{ marginTop: -22, position: "relative", zIndex: 2 }}>
              <span className="text-xl">{d.country}</span>
              <h3 className="text-[15px] font-extrabold mt-0.5 mb-0.5 leading-tight">
                {d.original}
              </h3>
              <p className="text-[10px] text-white/40 leading-snug m-0">
                {d.translated}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
