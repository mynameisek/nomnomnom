import Btn from "@/components/ui/Btn";
import { FOOD } from "@/lib/data";

export default function FinalCta() {
  return (
    <>
      {/* Waitlist section */}
      <section id="waitlist" className="py-9">
        <div className="mx-auto max-w-content px-6">
          <div className="rounded-3xl overflow-hidden relative border border-brand-orange/10">
            {/* Background food collage */}
            <div className="absolute inset-0 flex flex-row opacity-[0.08] overflow-hidden">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="h-full relative"
                  style={{ flex: "0 0 25%" }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: FOOD[i].grad }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={FOOD[i].url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Content overlay */}
            <div className="relative p-8 px-6 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-extrabold mb-1">
                  Rejoins les premiers testeurs
                </h3>
                <p className="text-[13px] text-white/40 m-0">
                  Acces beta TestFlight (iOS) et Android. Gratuit, sans engagement.
                </p>
              </div>
              <Btn primary>Rejoindre la liste d&apos;attente</Btn>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-[70px] px-6 pb-[90px] text-center relative">
        {/* Radial glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 450,
            height: 450,
            bottom: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            background:
              "radial-gradient(circle, rgba(255,107,53,0.04) 0%, transparent 60%)",
          }}
        />
        <h2
          className="font-black leading-tight tracking-tight mb-3"
          style={{ fontSize: "clamp(28px, 4.2vw, 48px)" }}
        >
          Plus jamais hesiter
          <br />
          <span className="italic text-white/[0.18] font-normal">
            devant un menu.
          </span>
        </h2>
        <p className="text-[15px] text-white/30 max-w-[40ch] mx-auto mb-7 leading-relaxed">
          200 cuisines. 50 langues. Un seul geste.
        </p>
        <Btn primary big href="#waitlist">
          Rejoindre la liste d&apos;attente
        </Btn>
        <p className="text-[10px] text-white/[0.12] mt-3">
          Gratuit pour scanner. Toujours.
        </p>
      </section>
    </>
  );
}
