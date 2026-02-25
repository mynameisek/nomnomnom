"use client";

import { useState, useEffect } from "react";
import FoodImage from "@/components/ui/FoodImage";

const FULL_QUERY = "boulettes sauce yaourt turquie";

const RESULTS = [
  {
    name: "Yogurtlu Kofte",
    match: 96,
    flag: "🇹🇷",
    desc: "Boulettes en sauce yaourt, menthe et beurre paprika",
    img: 4,
  },
  {
    name: "Kibbeh bil Laban",
    match: 74,
    flag: "🇱🇧",
    desc: "Boulettes de boulgour dans un yaourt chaud",
    img: 4,
  },
  {
    name: "Koufteh Tabrizi",
    match: 38,
    flag: "🇮🇷",
    desc: "Grosses boulettes farcies aux herbes iraniennes",
    img: 4,
  },
];

export default function ReverseSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof RESULTS>([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const allTimeouts: ReturnType<typeof setTimeout>[] = [];
    const allIntervals: ReturnType<typeof setInterval>[] = [];

    const run = () => {
      setQuery("");
      setResults([]);
      setTyping(false);

      const startTimeout = setTimeout(() => {
        setTyping(true);
        let i = 0;
        const iv = setInterval(() => {
          if (i <= FULL_QUERY.length) {
            setQuery(FULL_QUERY.slice(0, i));
            i++;
          } else {
            clearInterval(iv);
            setTyping(false);
            const showTimeout = setTimeout(() => setResults(RESULTS), 280);
            allTimeouts.push(showTimeout);
          }
        }, 48);
        allIntervals.push(iv);
      }, 1400);
      allTimeouts.push(startTimeout);
    };

    run();
    const loop = setInterval(run, 10500);
    allIntervals.push(loop);

    return () => {
      allTimeouts.forEach(clearTimeout);
      allIntervals.forEach(clearInterval);
    };
  }, []);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-content px-6">
        <div className="flex flex-wrap-reverse gap-9 items-center justify-center">
          {/* Left: text + food grid */}
          <div className="max-w-[380px]">
            <p className="text-[11px] text-brand-orange uppercase tracking-[2px] font-bold mb-2">
              Recherche inversee
            </p>
            <h2
              className="font-extrabold leading-tight tracking-tight mb-2"
              style={{ fontSize: "clamp(24px, 3.5vw, 38px)" }}
            >
              Tu te souviens du gout, pas du nom ?
            </h2>
            <p className="text-sm text-white/40 max-w-[50ch] leading-relaxed mb-4">
              Decris le plat par memoire — ingredients, texture, pays — et l&apos;IA le retrouve parmi des milliers de plats du monde.
            </p>
            {/* Food image grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {[4, 7, 2].map((idx, i) => (
                <FoodImage
                  key={i}
                  index={idx}
                  className="w-full h-[72px] rounded-xl object-cover"
                />
              ))}
            </div>
          </div>

          {/* Right: ReverseDemo widget */}
          <div className="animate-float" style={{ animationDelay: "1s" }}>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-[22px] p-5 max-w-[370px] w-full">
              <p className="text-[10px] text-brand-orange uppercase tracking-[2px] font-bold mb-2.5">
                RECHERCHE INVERSEE
              </p>
              {/* Input display */}
              <div
                className="bg-white/[0.04] rounded-xl p-2.5 px-3 mb-3 min-h-[38px] transition-all duration-300"
                style={{
                  border: typing
                    ? "1px solid rgba(255, 107, 53, 0.3)"
                    : "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <p
                  className="text-[13px] m-0"
                  style={{ color: query ? "#fff" : "rgba(255,255,255,0.2)" }}
                >
                  {query || "Decris un plat de memoire..."}
                  {typing && (
                    <span className="text-brand-orange animate-blink">|</span>
                  )}
                </p>
              </div>
              {/* Results */}
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 items-center rounded-2xl p-2.5 px-3 mb-1.5 animate-fade-up"
                  style={{
                    background:
                      i === 0
                        ? "rgba(255, 107, 53, 0.05)"
                        : "rgba(255, 255, 255, 0.02)",
                    border:
                      i === 0
                        ? "1px solid rgba(255, 107, 53, 0.12)"
                        : "1px solid rgba(255, 255, 255, 0.04)",
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  <FoodImage
                    index={r.img}
                    size={38}
                    className="rounded-[9px] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-bold">
                        {r.flag} {r.name}
                      </span>
                      <span
                        className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md"
                        style={{
                          background:
                            i === 0
                              ? "rgba(66, 211, 146, 0.12)"
                              : "rgba(255, 255, 255, 0.04)",
                          color:
                            i === 0
                              ? "#42d392"
                              : "rgba(255, 255, 255, 0.3)",
                        }}
                      >
                        {r.match}%
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 m-0 mt-0.5">
                      {r.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
