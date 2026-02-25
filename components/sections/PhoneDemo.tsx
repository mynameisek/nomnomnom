"use client";

import { useState, useEffect } from "react";
import { FOOD } from "@/lib/data";
import FoodImage from "@/components/ui/FoodImage";

export default function PhoneDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setPhase(0);
      timeouts.push(setTimeout(() => setPhase(1), 1300));
      timeouts.push(setTimeout(() => setPhase(2), 2800));
      timeouts.push(setTimeout(() => setPhase(3), 4200));
    };

    run();
    const loop = setInterval(() => {
      setPhase(0);
      run();
    }, 9000);

    return () => {
      clearInterval(loop);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      className="relative"
      style={{
        width: 280,
        background: "#0a0a0c",
        borderRadius: 36,
        border: "2.5px solid rgba(255,255,255,0.1)",
        padding: "7px 6px",
        boxShadow: "0 50px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      {/* Notch */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
        style={{
          width: 76,
          height: 22,
          background: "#0a0a0c",
          borderRadius: "0 0 13px 13px",
        }}
      />

      {/* Screen */}
      <div
        className="flex flex-col overflow-hidden relative"
        style={{
          borderRadius: 29,
          height: 540,
          background: "#09090b",
        }}
      >
        {/* Phone Nav */}
        <div
          className="flex justify-between items-center px-3 py-[9px]"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-[5px]">
            <div
              className="flex items-center justify-center text-white font-black"
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: "linear-gradient(135deg, #ff6b35, #e8453c)",
                fontSize: 8,
              }}
            >
              N
            </div>
            <span className="text-[11px] font-extrabold tracking-[0.3px]">NŌM</span>
          </div>
          <span
            className="text-[9px] font-semibold px-[7px] py-[2px] rounded-md"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            📍 Sur place
          </span>
        </div>

        {/* Content */}
        {phase < 2 ? (
          /* Scan View */
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            {/* QR frame */}
            <div
              className="relative overflow-hidden flex items-center justify-center transition-all duration-500"
              style={{
                width: 130,
                height: 130,
                border: `2px solid ${phase >= 1 ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 18,
              }}
            >
              {/* Scan line overlay */}
              {phase >= 1 && (
                <div
                  className="absolute inset-0 animate-scan-line"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 25%, rgba(255,107,53,0.1) 50%, transparent 75%)",
                  }}
                />
              )}
              {/* QR grid */}
              <div
                className="grid gap-[2px] p-[5px]"
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 7,
                  background:
                    phase >= 1
                      ? "rgba(255,107,53,0.1)"
                      : "rgba(255,255,255,0.03)",
                  gridTemplateColumns: "repeat(4, 1fr)",
                }}
              >
                {Array(16)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="rounded-[1px] transition-all duration-300"
                      style={{
                        transitionDelay: `${i * 20}ms`,
                        background: [0, 1, 3, 4, 5, 7, 8, 10, 12, 13, 15].includes(i)
                          ? phase >= 1
                            ? "rgba(255,107,53,0.5)"
                            : "rgba(255,255,255,0.12)"
                          : "transparent",
                      }}
                    />
                  ))}
              </div>
            </div>
            <p
              className="text-xs font-semibold transition-colors duration-400"
              style={{
                color:
                  phase >= 1 ? "#ff6b35" : "rgba(255,255,255,0.22)",
              }}
            >
              {phase === 0 ? "Scanne le QR du resto" : "Menu détecté…"}
            </p>
          </div>
        ) : (
          /* Menu View */
          <div className="flex-1 overflow-y-auto px-2 py-2 animate-fade-up">
            {/* Resto header */}
            <div
              className="rounded-[14px] overflow-hidden mb-2"
              style={{ border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="h-[60px] relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{ background: FOOD[7].grad }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={FOOD[7].url}
                  alt=""
                  className="w-full h-full object-cover opacity-70"
                  loading="lazy"
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(transparent 20%, rgba(9,9,11,0.95))",
                  }}
                />
                <div className="absolute bottom-[6px] left-[10px] right-[10px] flex justify-between items-end">
                  <div>
                    <p className="text-[13px] font-extrabold m-0">Umai Ramen</p>
                    <p
                      className="text-[9px] m-0"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      Japonais · Neudorf
                    </p>
                  </div>
                  <span
                    className="text-[9px] px-[7px] py-[2px] rounded-md font-bold"
                    style={{
                      background: "rgba(255,107,53,0.2)",
                      color: "#ff6b35",
                    }}
                  >
                    ⭐ 4.3
                  </span>
                </div>
              </div>
              <div
                className="px-[10px] py-[6px] flex gap-[3px] flex-wrap"
              >
                {[
                  { label: "🥬 Végé", green: true },
                  { label: "🚫 Porc", green: false },
                  { label: "🌶️ Épicé", green: false },
                  { label: "💰 <18€", green: false },
                ].map((f, i) => (
                  <span
                    key={i}
                    className="text-[8px] px-[6px] py-[2px] rounded-lg font-bold"
                    style={{
                      background: f.green
                        ? "rgba(66,211,146,0.08)"
                        : "rgba(255,255,255,0.03)",
                      color: f.green ? "#42d392" : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Dish cards */}
            {[
              {
                name: "Tori Paitan",
                price: "15,80€",
                desc: "Bouillon poulet crémeux, œuf mariné",
                tag: "consistant · riche",
                img: 0,
              },
              {
                name: "Shio Ramen",
                price: "15,50€",
                desc: "Bouillon clair, sel, umami léger",
                tag: "léger · safe pick",
                img: 0,
              },
              {
                name: "Udon Karaage",
                price: "16,00€",
                desc: "Udon épais + poulet frit croustillant",
                tag: "copieux · croustillant",
                img: 4,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-2 p-[7px] rounded-xl mb-[5px] animate-fade-up"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  animationDelay: `${i * 70 + 80}ms`,
                }}
              >
                <FoodImage
                  index={item.img}
                  size={42}
                  className="rounded-[9px] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className="text-[11px] font-bold">{item.name}</span>
                    <span
                      className="text-[11px] font-extrabold"
                      style={{ color: "#ff6b35" }}
                    >
                      {item.price}
                    </span>
                  </div>
                  <p
                    className="text-[9px] mt-[1px]"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {item.desc}
                  </p>
                  <p
                    className="text-[8px] mt-[1px]"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    {item.tag}
                  </p>
                </div>
              </div>
            ))}

            {/* AI suggestion panel */}
            {phase >= 3 && (
              <div
                className="rounded-xl p-[8px_10px] mt-[3px] animate-fade-up"
                style={{
                  background: "rgba(255,107,53,0.04)",
                  border: "1px dashed rgba(255,107,53,0.15)",
                }}
              >
                <p
                  className="text-[9px] italic mb-[5px]"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  &ldquo;consistant, chaud, poulet, pas épicé&rdquo;
                </p>
                <div
                  className="rounded-[9px] p-[7px_9px]"
                  style={{
                    background: "rgba(255,107,53,0.06)",
                    border: "1px solid rgba(255,107,53,0.1)",
                  }}
                >
                  <p className="text-[10px] font-bold mb-[2px]">🧠 Top 3 :</p>
                  <p
                    className="text-[9px] leading-[1.6]"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    ① Tori Paitan — crémeux, très consistant
                    <br />
                    ② Udon Karaage — copieux + croustillant
                    <br />
                    ③ Shio — léger mais réconfortant
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
