import Btn from "@/components/ui/Btn";

const TIERS = [
  {
    plan: "Gratuit",
    price: "0€",
    sub: "pour toujours",
    feats: [
      "Scan QR → fiches + traduction",
      "3 questions assistant / jour",
      "Filtres basiques",
    ],
    cta: "Commencer",
    pop: false,
    primary: false,
  },
  {
    plan: "Pass",
    price: "9,99€",
    sub: "achat unique a vie",
    feats: [
      "Assistant illimite",
      "Scan photo & PDF (OCR)",
      "Historique + favoris",
      "Prononciation audio",
      "Taste Profile",
    ],
    cta: "Acheter le Pass",
    pop: true,
    primary: true,
  },
  {
    plan: "Pro",
    price: "3,99€",
    sub: "/ mois",
    feats: [
      "Tout le Pass +",
      "Mode voyage (cache offline)",
      "Collections partagees",
      "NOM Wrapped premium",
      "Acces prioritaire",
    ],
    cta: "S'abonner",
    pop: false,
    primary: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-14">
      <div className="mx-auto max-w-content px-6">
        {/* Header */}
        <div className="text-center mb-7">
          <p className="text-[11px] text-brand-orange uppercase tracking-[2px] font-bold mb-2">
            Tarifs
          </p>
          <h2
            className="font-extrabold leading-tight tracking-tight mx-auto mb-2"
            style={{ fontSize: "clamp(24px, 3.5vw, 38px)" }}
          >
            Simple et transparent
          </h2>
          <p className="text-sm text-white/40 max-w-[50ch] leading-relaxed mx-auto">
            Scanner est gratuit. Tu ne payes que si tu veux aller plus loin.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIERS.map((t, i) => (
            <div
              key={i}
              className="rounded-[22px] p-[22px_20px] relative"
              style={{
                background: t.pop
                  ? "linear-gradient(180deg, rgba(255,107,53,0.07), rgba(9,9,11,1))"
                  : "rgba(255,255,255,0.02)",
                border: t.pop
                  ? "1.5px solid rgba(255,107,53,0.25)"
                  : "1.5px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Recommande badge */}
              {t.pop && (
                <span className="absolute top-3 right-3 bg-brand-orange/[0.12] border border-brand-orange/[0.18] rounded-full px-2.5 py-[3px] text-[9px] font-extrabold text-brand-orange">
                  Recommande
                </span>
              )}
              <p className="text-[13px] font-bold text-white/45 m-0 mb-1">
                {t.plan}
              </p>
              <p className="text-[32px] font-black tracking-tight m-0 mb-1">
                {t.price}{" "}
                <span className="text-[11px] text-white/30 font-semibold">
                  {t.sub}
                </span>
              </p>
              {/* Feature list */}
              <div className="flex flex-col gap-2 my-3.5 mb-[18px]">
                {t.feats.map((f, j) => (
                  <div key={j} className="flex gap-2 items-center">
                    <span
                      className="w-4 h-4 rounded-[5px] flex-shrink-0 flex items-center justify-center text-[9px] font-black"
                      style={{
                        background: "rgba(66,211,146,0.1)",
                        border: "1px solid rgba(66,211,146,0.12)",
                      }}
                    >
                      ✓
                    </span>
                    <span className="text-[12px] text-white/60">{f}</span>
                  </div>
                ))}
              </div>
              <Btn
                primary={t.primary}
                className="w-full rounded-xl justify-center"
              >
                {t.cta}
              </Btn>
            </div>
          ))}
        </div>

        {/* Credits bonus */}
        <div className="mt-3.5 text-center bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 px-[18px]">
          <p className="text-[12px] text-white/30 m-0">
            💡{" "}
            <strong className="text-white/50">Credits bonus</strong> : poste une
            photo, corrige une fiche, decouvre un resto → gagne des credits pour
            debloquer des features gratuitement.
          </p>
        </div>
      </div>
    </section>
  );
}
