import { FEATURES } from "@/lib/data";

export default function Features() {
  return (
    <section id="features" className="py-12">
      <div className="mx-auto max-w-content px-6">
        <p className="text-[11px] text-brand-orange uppercase tracking-[2px] font-bold mb-2">
          Fonctionnalites
        </p>
        <h2
          className="font-extrabold leading-tight tracking-tight mb-2"
          style={{ fontSize: "clamp(24px, 3.5vw, 38px)" }}
        >
          Le menu devient une experience
        </h2>
        <p className="text-sm text-white/40 max-w-[50ch] leading-relaxed mb-6">
          Meme QR code que d&apos;habitude — mais une interface 10x plus claire pour choisir.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3.5"
            >
              {/* Icon container */}
              <div className="w-[42px] h-[42px] rounded-xl bg-brand-orange/[0.06] border border-brand-orange/10 flex items-center justify-center text-xl flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold mb-0.5">{f.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed m-0">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
